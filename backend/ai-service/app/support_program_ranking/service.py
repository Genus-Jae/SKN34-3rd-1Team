from pydantic import ValidationError

from app.support_program_ranking.errors import AgentExecutionError, AgentFailureCode

from .agent import SupportProgramRecommendationAgent
from .models import (
    ScoredSupportProgram,
    SupportProgramRankingRequest,
    SupportProgramRankingResponse,
    SupportProgramEligibility,
)


# 40점인 의미 관련성 항목의 절반과 100점 총점의 60%를 동시에 충족해야 추천한다.
MIN_SEMANTIC_RELEVANCE_SCORE = 20
MIN_TOTAL_RECOMMENDATION_SCORE = 60


class SupportProgramRankingService:
    """본문 자격 근거를 검증하고 확인된 자격 그룹을 우선 반환한다."""

    def __init__(self, agent: SupportProgramRecommendationAgent) -> None:
        self._agent = agent

    async def rank(
        self,
        request: SupportProgramRankingRequest,
    ) -> SupportProgramRankingResponse:
        output = await self._agent.rank(request)
        candidate_order = {
            candidate.id: index for index, candidate in enumerate(request.candidates)
        }
        expected_ids = set(candidate_order)
        actual_ids = {ranking.program_id for ranking in output.rankings}
        if actual_ids != expected_ids or len(output.rankings) != len(request.candidates):
            raise AgentExecutionError(
                "Support program recommendation agent changed the candidate id set",
                reason_code=AgentFailureCode.CANDIDATE_SET_MISMATCH,
            )

        candidates_by_id = {candidate.id: candidate for candidate in request.candidates}
        # 제외되거나 점수 미달인 후보까지 모두 검증한다. 잘못된 인용을 정상 응답으로 숨기지 않는다.
        for assessment in output.rankings:
            candidate = candidates_by_id[assessment.program_id]
            source_fields = {"SUMMARY": candidate.summary, "TARGET_DESCRIPTION": candidate.target_description}
            for eligibility in (assessment.target_assessment, assessment.region_assessment):
                if candidate.source_text_truncated and eligibility.eligibility is not SupportProgramEligibility.UNKNOWN:
                    raise AgentExecutionError(
                        "Truncated source text requires UNKNOWN eligibility",
                        reason_code=AgentFailureCode.TRUNCATED_SOURCE_KNOWN_ELIGIBILITY,
                    )
                if eligibility.eligibility is not SupportProgramEligibility.UNKNOWN and not eligibility.evidence:
                    raise AgentExecutionError(
                        "Known eligibility requires source evidence",
                        reason_code=AgentFailureCode.MISSING_KNOWN_EVIDENCE,
                    )
                for evidence in eligibility.evidence:
                    if evidence.quote not in source_fields[evidence.field]:
                        raise AgentExecutionError(
                            "Eligibility evidence is not an exact quote of the candidate source",
                            reason_code=AgentFailureCode.EXACT_QUOTE_MISMATCH,
                        )

        try:
            scored_rankings = [
                ScoredSupportProgram(
                    program_id=assessment.program_id,
                    semantic_relevance=assessment.semantic_relevance,
                    target_fit=assessment.target_assessment.score,
                    target_eligibility=assessment.target_assessment.eligibility,
                    target_evidence=assessment.target_assessment.evidence,
                    target_explanation=assessment.target_assessment.explanation,
                    region_fit=assessment.region_assessment.score,
                    region_eligibility=assessment.region_assessment.eligibility,
                    region_evidence=assessment.region_assessment.evidence,
                    region_explanation=assessment.region_assessment.explanation,
                    application_status_fit=assessment.application_status_fit,
                    support_type_fit=assessment.support_type_fit,
                    total_score=(
                        assessment.semantic_relevance
                        + assessment.target_assessment.score
                        + assessment.region_assessment.score
                        + assessment.application_status_fit
                        + assessment.support_type_fit
                    ),
                    recommendation_reasons=assessment.recommendation_reasons,
                )
                for assessment in output.rankings
            ]
        except ValidationError as error:
            raise AgentExecutionError(
                "Support program recommendation agent produced invalid score dimensions"
            ) from error

        sorted_rankings = sorted(
            scored_rankings,
            key=lambda ranking: (
                not (
                    ranking.target_eligibility is SupportProgramEligibility.MATCH
                    and ranking.region_eligibility is SupportProgramEligibility.MATCH
                ),
                -ranking.total_score,
                candidate_order[ranking.program_id],
            ),
        )
        eligible_rankings = [
            ranking
            for ranking in sorted_rankings
            if ranking.semantic_relevance >= MIN_SEMANTIC_RELEVANCE_SCORE
            and ranking.total_score >= MIN_TOTAL_RECOMMENDATION_SCORE
            and ranking.target_eligibility is not SupportProgramEligibility.INCOMPATIBLE
            and ranking.region_eligibility is not SupportProgramEligibility.INCOMPATIBLE
        ]
        return SupportProgramRankingResponse(
            original_query=request.original_query,
            scoring_version=request.scoring_version,
            rankings=eligible_rankings[: request.result_limit],
        )
