import json

import pytest
from agents.testing import ScriptedModel, assistant_message
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app
from app.support_program_ranking.agent import SupportProgramRecommendationAgent, build_evidence_options
from app.support_program_ranking.errors import AgentExecutionError, AgentFailureCode
from app.support_program_ranking.models import (
    SCORING_VERSION,
    AssessedSupportProgram,
    SupportProgramCandidate,
    SupportProgramEligibilityEvidence,
    SupportProgramRankingOutput,
    SupportProgramRankingRequest,
)
from app.support_program_ranking.prompt import SUPPORT_PROGRAM_RANKING_INSTRUCTIONS
from app.support_program_ranking.service import SupportProgramRankingService


def candidate(index=1, **changes):
    return SupportProgramCandidate.model_validate({
        "id": f"BIZINFO:program-{index}", "title": "기업 사업화 지원", "organization": "기관",
        "summary": "서울 소재 중소기업의 사업화를 지원합니다.", "categories": ["사업화"],
        "regions": ["서울"], "targetDescription": "서울 소재 중소기업",
        "applicationPeriod": "상시 접수", "status": "OPEN", **changes,
    })


def request_for(candidates, *, company_conditions=False, limit=5):
    payload = {
        "originalQuery": "서울 중소기업 사업화 지원", "scoringVersion": SCORING_VERSION,
        "resultLimit": limit, "candidates": candidates,
    }
    if company_conditions:
        payload["companyConditions"] = {"region": "서울", "referenceDate": "2026-09-07"}
    return SupportProgramRankingRequest.model_validate(payload)


def assessment(index=1, *, target="MATCH", region="MATCH", semantic=40, **changes):
    return AssessedSupportProgram.model_validate({
        "programId": f"BIZINFO:program-{index}", "semanticRelevance": semantic,
        "targetAssessment": {
            "eligibility": target, "score": 0 if target == "INCOMPATIBLE" else 25,
            "evidence": [] if target == "UNKNOWN" else [{"field": "TARGET_DESCRIPTION", "quote": "중소기업"}],
            "explanation": "기업 요건 확인 필요" if target == "UNKNOWN" else "중소기업 대상 본문을 확인했습니다.",
        },
        "regionAssessment": {
            "eligibility": region, "score": 0 if region == "INCOMPATIBLE" else 15,
            "evidence": [] if region == "UNKNOWN" else [{"field": "SUMMARY", "quote": "서울 소재 중소기업"}],
            "explanation": "소재지 요건 확인 필요" if region == "UNKNOWN" else "서울 소재지 조건을 확인했습니다.",
        },
        "applicationStatusFit": 10, "supportTypeFit": 10,
        "recommendationReasons": ["사업화를 지원합니다."], **changes,
    })


class FixedAgent:
    def __init__(self, assessments):
        self.output = SupportProgramRankingOutput(rankings=assessments)
        self.calls = 0

    async def rank(self, _request):
        self.calls += 1
        return self.output


def selection_json(expected, request):
    selection = expected.model_dump(by_alias=True, exclude={"program_id"})
    options = build_evidence_options(request.candidates[0])
    for dimension in ("targetAssessment", "regionAssessment"):
        selection[dimension]["evidence"] = [
            next(index for index, option in enumerate(options)
                 if option.field == quote["field"] and quote["quote"] in option.quote)
            for quote in selection[dimension]["evidence"]
        ]
    return json.dumps({"rankings": {expected.program_id: selection}}, ensure_ascii=False)


@pytest.mark.anyio
@pytest.mark.parametrize("company_conditions", [False, True])
async def test_confirmed_bucket_precedes_higher_unknown_scores_and_combined_limit(company_conditions):
    values = [assessment(1, region="UNKNOWN"), assessment(2, semantic=20),
              assessment(3, target="UNKNOWN", semantic=39), assessment(4, semantic=25),
              assessment(5, region="INCOMPATIBLE"), assessment(6, semantic=19)]
    agent = FixedAgent(values)
    result = await SupportProgramRankingService(agent).rank(request_for(
        [candidate(index) for index in range(1, 7)], company_conditions=company_conditions, limit=3,
    ))
    assert [item.program_id for item in result.rankings] == [
        "BIZINFO:program-4", "BIZINFO:program-2", "BIZINFO:program-1",
    ]
    assert [item.total_score for item in result.rankings] == [85, 80, 100]
    assert result.rankings[-1].region_evidence == []
    assert result.rankings[-1].region_explanation == "소재지 요건 확인 필요"
    assert agent.calls == 1


@pytest.mark.anyio
@pytest.mark.parametrize("company_conditions", [False, True])
async def test_nationwide_tag_does_not_override_gyeongbuk_relocation_uncertainty(company_conditions):
    source = "경북 소재 중소기업 또는 선정 후 경북 이전 확약 기업의 사업화를 지원합니다."
    request = request_for([candidate(summary=source, regions=["전국"], targetDescription="중소기업")],
                          company_conditions=company_conditions)
    expected = assessment(regionAssessment={
        "eligibility": "UNKNOWN", "score": 0,
        "evidence": [{"field": "SUMMARY", "quote": "경북 소재 중소기업 또는 선정 후 경북 이전 확약 기업"}],
        "explanation": "서울 기업이므로 선정 후 경북 이전 확약 가능 여부를 확인해야 합니다.",
    })
    model = ScriptedModel([[assistant_message(selection_json(expected, request))]])
    agent = SupportProgramRecommendationAgent(model=model, model_timeout_seconds=3, run_timeout_seconds=4)
    result = await SupportProgramRankingService(agent).rank(request)
    assert len(result.rankings) == 1
    assert result.rankings[0].region_eligibility.value == "UNKNOWN"
    assert result.rankings[0].region_evidence[0].quote in source
    assert "이전 확약" in result.rankings[0].region_explanation
    assert len(model.calls) == 1
    assert "전국 태그" in model.first_call.system_instructions
    assert "이전 의사·확약을 사용자가 밝히지 않은 상태는 MATCH가 아니라 UNKNOWN" in model.first_call.system_instructions


@pytest.mark.anyio
async def test_explicit_regional_conflict_remains_excluded_despite_nationwide_tag_and_high_score():
    source = "경북 소재 중소기업만 지원합니다."
    value = assessment(regionAssessment={
        "eligibility": "INCOMPATIBLE", "score": 0,
        "evidence": [{"field": "SUMMARY", "quote": source}],
        "explanation": "서울 소재 조건이 경북 소재 기업 한정 조건과 충돌합니다.",
    })
    result = await SupportProgramRankingService(FixedAgent([value])).rank(request_for([
        candidate(summary=source, regions=["전국"], targetDescription="중소기업"),
    ], company_conditions=True))
    assert result.rankings == []


@pytest.mark.anyio
@pytest.mark.parametrize("company_conditions", [False, True])
async def test_actual_conditional_relocation_or_expansion_phrase_preserves_both_unknowns(company_conditions):
    # 실제 보고 문구의 전달·인용·UNKNOWN 보존 회귀이며, ScriptedModel은 의미 품질을 평가하지 않는다.
    industry_clause = "첨단소재부품산업 관련 중소·중견기업"
    conditional_clause = "지원기간 내 경상북도 지역으로 사업장 이전(또는 확장) 확약기업 신청 가능"
    source = f"{industry_clause}. {conditional_clause}"
    request = request_for([candidate(summary=source, regions=["전국"], targetDescription="중소기업")],
                          company_conditions=company_conditions)
    expected = assessment(targetAssessment={
        "eligibility": "UNKNOWN", "score": 0,
        "evidence": [{"field": "SUMMARY", "quote": industry_clause}],
        "explanation": "첨단소재부품산업 관련 기업인지 확인해야 합니다.",
    }, regionAssessment={
        "eligibility": "UNKNOWN", "score": 0,
        "evidence": [{"field": "SUMMARY", "quote": conditional_clause}],
        "explanation": "지원기간 내 경상북도 사업장 이전 또는 확장 확약 가능 여부와 적용 조건을 확인해야 합니다.",
    })
    model = ScriptedModel([[assistant_message(selection_json(expected, request))]])
    agent = SupportProgramRecommendationAgent(model=model, model_timeout_seconds=3, run_timeout_seconds=4)
    result = await SupportProgramRankingService(agent).rank(request)
    assert len(result.rankings) == 1
    ranking = result.rankings[0]
    assert ranking.target_eligibility.value == ranking.region_eligibility.value == "UNKNOWN"
    assert ranking.total_score == 60
    assert industry_clause in ranking.target_evidence[0].quote
    assert conditional_clause in ranking.region_evidence[0].quote
    assert ranking.target_evidence[0].quote in source
    assert ranking.region_evidence[0].quote in source
    assert "이전 또는 확장 확약" in ranking.region_explanation
    assert len(model.calls) == 1
    instructions = model.first_call.system_instructions
    assert conditional_clause in instructions
    assert "조건부 신청 가능 문구를 모든 기업의 무조건 신청 가능으로 일반화하지" in instructions
    assert "필수 요건인지 예외·우대·선택 조건인지" in instructions
    assert "일반적인 대상 라벨보다 본문의 구체적인 요건" in instructions
    assert "원문에 없는 '경북 기존 소재 기업만 가능' 제한" in instructions
    model_payload = json.loads(model.first_call.input[0]["content"])
    assert model_payload["candidates"][0]["summary"] == source
    assert model_payload["candidates"][0]["regions"] == ["전국"]
    assert ("companyConditions" in model_payload) is company_conditions


@pytest.mark.anyio
@pytest.mark.parametrize("eligibility", ["MATCH", "INCOMPATIBLE", "UNKNOWN"])
@pytest.mark.parametrize("semantic", [0, 40])
async def test_every_candidate_quote_is_checked_even_when_excluded_or_below_minimum(eligibility, semantic):
    value = assessment(semantic=semantic, regionAssessment={
        "eligibility": eligibility, "score": 0,
        "evidence": [{"field": "SUMMARY", "quote": "존재하지 않는 경북 지역 제한"}],
        "explanation": "지역 제한을 확인해야 합니다.",
    })
    with pytest.raises(AgentExecutionError, match="exact quote") as captured:
        await SupportProgramRankingService(FixedAgent([value])).rank(request_for([candidate()]))
    assert captured.value.reason_code is AgentFailureCode.EXACT_QUOTE_MISMATCH


@pytest.mark.anyio
@pytest.mark.parametrize("field,quote", [
    ("SUMMARY", "기관에만 있는 문자열"), ("SUMMARY", "제목에만 있는 문자열"),
    ("SUMMARY", "전국"), ("TARGET_DESCRIPTION", "서울 소재 중소기업의 사업화를 지원합니다."),
    ("SUMMARY", "다른 후보에만 있는 문자열"), ("SUMMARY", "서울 소재...중소기업"),
])
async def test_cannot_quote_metadata_other_field_other_candidate_or_modified_source(field, quote):
    value = assessment(regionAssessment={
        "eligibility": "MATCH", "score": 15,
        "evidence": [{"field": field, "quote": quote}], "explanation": "지역 근거",
    })
    with pytest.raises(AgentExecutionError, match="exact quote"):
        await SupportProgramRankingService(FixedAgent([value, assessment(2)])).rank(request_for([
            candidate(title="제목에만 있는 문자열", organization="기관에만 있는 문자열", regions=["전국"]),
            candidate(2, summary="다른 후보에만 있는 문자열. 서울 소재 중소기업의 사업화를 지원합니다."),
        ]))


@pytest.mark.anyio
@pytest.mark.parametrize("target,region", [("MATCH", "UNKNOWN"), ("UNKNOWN", "MATCH"),
                                           ("INCOMPATIBLE", "UNKNOWN"), ("UNKNOWN", "INCOMPATIBLE")])
async def test_truncated_source_rejects_any_known_assessment(target, region):
    with pytest.raises(AgentExecutionError, match="Truncated") as captured:
        await SupportProgramRankingService(FixedAgent([assessment(target=target, region=region)])).rank(
            request_for([candidate(sourceTextTruncated=True)]))
    assert captured.value.reason_code is AgentFailureCode.TRUNCATED_SOURCE_KNOWN_ELIGIBILITY


@pytest.mark.anyio
async def test_candidate_set_failure_has_a_fixed_diagnostic_code():
    with pytest.raises(AgentExecutionError) as captured:
        await SupportProgramRankingService(FixedAgent([assessment()])).rank(
            request_for([candidate(), candidate(2)]))
    assert captured.value.reason_code is AgentFailureCode.CANDIDATE_SET_MISMATCH


@pytest.mark.anyio
async def test_missing_known_evidence_defense_has_a_fixed_diagnostic_code():
    # The real SDK validates this first; bypass only in the test to exercise the service defense.
    value = assessment()
    invalid_target = value.target_assessment.model_copy(update={"evidence": []})
    invalid_value = value.model_copy(update={"target_assessment": invalid_target})
    with pytest.raises(AgentExecutionError) as captured:
        await SupportProgramRankingService(FixedAgent([invalid_value])).rank(request_for([candidate()]))
    assert captured.value.reason_code is AgentFailureCode.MISSING_KNOWN_EVIDENCE


@pytest.mark.anyio
async def test_truncated_source_allows_only_unknown_with_confirmation_explanations():
    result = await SupportProgramRankingService(FixedAgent([assessment(target="UNKNOWN", region="UNKNOWN")])).rank(
        request_for([candidate(sourceTextTruncated=True)]))
    assert len(result.rankings) == 1
    assert result.rankings[0].target_eligibility.value == result.rankings[0].region_eligibility.value == "UNKNOWN"


@pytest.mark.parametrize("dimension", ["targetAssessment", "regionAssessment"])
@pytest.mark.parametrize("eligibility", ["MATCH", "INCOMPATIBLE"])
def test_known_eligibility_requires_one_source_quote(dimension, eligibility):
    payload = assessment().model_dump(by_alias=True)
    payload[dimension].update(eligibility=eligibility, score=0, evidence=[])
    with pytest.raises(ValidationError):
        AssessedSupportProgram.model_validate(payload)


@pytest.mark.parametrize("field", ["TITLE", "ORGANIZATION", "REGIONS", "summary"])
def test_evidence_source_is_only_one_of_the_two_official_body_fields(field):
    with pytest.raises(ValidationError):
        SupportProgramEligibilityEvidence(field=field, quote="본문")


@pytest.mark.parametrize("value", ["", "   ", "\t", "\n", "\r", "본문\u0000", "본문\u200b", "가" * 241])
def test_quote_rejects_blank_controls_and_overlong_values(value):
    with pytest.raises(ValidationError):
        SupportProgramEligibilityEvidence(field="SUMMARY", quote=value)


@pytest.mark.parametrize("value", ["", "   ", "\t", "\n", "\r", "확인\u0000", "확인\u200b", "가" * 161])
def test_unknown_explanation_rejects_blank_controls_and_overlong_values(value):
    payload = assessment(region="UNKNOWN").model_dump(by_alias=True)
    payload["regionAssessment"]["explanation"] = value
    with pytest.raises(ValidationError):
        AssessedSupportProgram.model_validate(payload)


def test_evidence_and_explanation_preserve_raw_text_and_count_code_points():
    evidence = SupportProgramEligibilityEvidence(field="SUMMARY", quote=" " + "😀" * 238 + " ")
    assert evidence.quote == " " + "😀" * 238 + " "
    value = assessment(regionAssessment={"eligibility": "UNKNOWN", "score": 0, "evidence": [],
                                         "explanation": " " + "😀" * 158 + " "})
    assert len(value.region_assessment.explanation) == 160


def test_assessment_allows_at_most_one_quote():
    payload = assessment().model_dump(by_alias=True)
    payload["regionAssessment"]["evidence"] *= 2
    with pytest.raises(ValidationError):
        AssessedSupportProgram.model_validate(payload)


@pytest.mark.parametrize("field,maximum", [("summary", 6000), ("targetDescription", 2000)])
def test_expanded_candidate_source_limits_are_enforced_without_silent_truncation(field, maximum):
    value = candidate(**{field: "😀" * maximum})
    assert value.source_text_truncated is False
    with pytest.raises(ValidationError):
        candidate(**{field: "가" * (maximum + 1)})


@pytest.mark.parametrize("value", ["false", 0, 1, None])
def test_truncated_flag_requires_a_boolean(value):
    with pytest.raises(ValidationError):
        candidate(sourceTextTruncated=value)


def test_v3_is_not_silently_reinterpreted_as_v4():
    payload = request_for([candidate()]).model_dump(by_alias=True)
    payload["scoringVersion"] = "govbiz-support-program-ranking-v3"
    with pytest.raises(ValidationError):
        SupportProgramRankingRequest.model_validate(payload)


def test_invalid_quote_is_an_http_error_not_a_normal_empty_recommendation():
    value = assessment(regionAssessment={"eligibility": "INCOMPATIBLE", "score": 0,
                                         "evidence": [{"field": "SUMMARY", "quote": "없는 본문"}],
                                         "explanation": "확인된 제한"})
    settings = Settings(openai_api_key="test-key", openai_model="unused-model",
                        llm_model_timeout_seconds=3, llm_run_timeout_seconds=4)
    agent = FixedAgent([value])
    with TestClient(create_app(settings=settings, support_program_recommendation_agent=agent)) as client:
        result = client.post("/internal/v1/support-program-rankings/rank", json=request_for([candidate()]).model_dump(mode="json", by_alias=True))
    assert result.status_code == 503
    assert "없는 본문" not in result.text
    assert agent.calls == 1


def test_prompt_discloses_source_scope_and_does_not_use_tags_as_eligibility_evidence():
    assert "summary와 targetDescription을 우선" in SUPPORT_PROGRAM_RANKING_INSTRUCTIONS
    assert "regions는 검색용 태그" in SUPPORT_PROGRAM_RANKING_INSTRUCTIONS
    assert "sourceTextTruncated가 true이면" in SUPPORT_PROGRAM_RANKING_INSTRUCTIONS
    assert "첨부 PDF/HWP 전체 원문이 아닙니다" in SUPPORT_PROGRAM_RANKING_INSTRUCTIONS
    assert "읽지 않은 부분의 자격 충족을 추정" in SUPPORT_PROGRAM_RANKING_INSTRUCTIONS
