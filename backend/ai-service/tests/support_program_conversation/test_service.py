from copy import deepcopy
from unittest.mock import AsyncMock

import pytest

from app.support_program_conversation.errors import SupportProgramConversationError
from app.support_program_conversation.models import (
    SCHEMA_VERSION, SupportProgramConversationOutput, SupportProgramConversationRequest,
)
from app.support_program_conversation.service import SupportProgramConversationService


@pytest.mark.anyio
async def test_region_patch_preserves_every_unmentioned_field_and_input(request_data, output_data):
    before = deepcopy(request_data)
    request = SupportProgramConversationRequest.model_validate(request_data)
    output = SupportProgramConversationOutput.model_validate(output_data)
    agent = AsyncMock()
    agent.interpret.return_value = output
    service = SupportProgramConversationService(agent)
    response = await service.interpret(request)
    assert response.model_dump(by_alias=True) == {"schemaVersion": SCHEMA_VERSION, **output_data}
    merged = service._merge_context(request, output)
    expected = deepcopy(request_data["context"])
    expected["companyConditions"]["region"] = "부산"
    assert merged.model_dump(by_alias=True) == expected
    assert request.model_dump(by_alias=True) == before
    agent.interpret.assert_awaited_once_with(request)


@pytest.mark.anyio
async def test_followup_date_merges_from_pending_draft_not_applied_context(request_data):
    draft = deepcopy(request_data["context"])
    draft["companyConditions"].update(region="부산", establishedOn=None, supportPurpose="지원금")
    draft["query"] = "지원금"
    request_data.update(message="2024년 2월 29일", pendingClarification={"question": "정확한 설립일은?", "draftContext": draft})
    request = SupportProgramConversationRequest.model_validate(request_data)
    output = SupportProgramConversationOutput(status="READY", updates=[{
        "field": "ESTABLISHED_ON", "operation": "SET", "value": "2024-02-29", "evidence": request.message,
    }], clarificationQuestion=None)
    agent = AsyncMock()
    agent.interpret.return_value = output
    service = SupportProgramConversationService(agent)
    assert (await service.interpret(request)).status == "READY"
    merged = service._merge_context(request, output)
    assert merged.query == "지원금"
    assert merged.company_conditions.region == "부산"
    assert merged.company_conditions.support_purpose == "지원금"
    assert merged.company_conditions.established_on == "2024-02-29"
    assert request.context.company_conditions.region == "서울"
    assert request.pending_clarification.draft_context.company_conditions.established_on is None


@pytest.mark.anyio
@pytest.mark.parametrize("where", ["context", "question", "fabricated", "non_contiguous"])
async def test_only_exact_current_message_quotes_authorize_changes(request_data, output_data, where):
    request_data["message"] = "부 산으로 변경" if where == "non_contiguous" else "변경해줘"
    if where == "context":
        request_data["context"]["companyConditions"]["region"] = "부산"
    elif where == "question":
        request_data["pendingClarification"] = {"question": "부산인가요?", "draftContext": request_data["context"]}
    agent = AsyncMock()
    agent.interpret.return_value = SupportProgramConversationOutput.model_validate(output_data)
    with pytest.raises(SupportProgramConversationError):
        await SupportProgramConversationService(agent).interpret(SupportProgramConversationRequest.model_validate(request_data))


@pytest.mark.anyio
@pytest.mark.parametrize("date_value", ["1899-12-31", "2026-09-08"])
async def test_rejects_out_of_range_date_after_patch_merge(request_data, date_value):
    request_data["message"] = date_value
    agent = AsyncMock()
    agent.interpret.return_value = SupportProgramConversationOutput(status="READY", updates=[{
        "field": "ESTABLISHED_ON", "operation": "SET", "value": date_value, "evidence": date_value,
    }], clarificationQuestion=None)
    with pytest.raises(SupportProgramConversationError):
        await SupportProgramConversationService(agent).interpret(SupportProgramConversationRequest.model_validate(request_data))


@pytest.mark.anyio
@pytest.mark.parametrize("clear_query", [False, True])
async def test_ready_requires_a_merged_query(request_data, clear_query):
    request_data["message"] = "검색 의도 삭제"
    updates = [{"field": "QUERY", "operation": "CLEAR", "value": None, "evidence": "삭제"}] if clear_query else []
    if not clear_query:
        request_data["context"]["query"] = None
    agent = AsyncMock()
    agent.interpret.return_value = SupportProgramConversationOutput(status="READY", updates=updates, clarificationQuestion=None)
    with pytest.raises(SupportProgramConversationError):
        await SupportProgramConversationService(agent).interpret(SupportProgramConversationRequest.model_validate(request_data))


@pytest.mark.anyio
async def test_explicit_reset_clears_all_strings_restores_boolean_and_asks_for_query(request_data):
    request_data["message"] = "전체 초기화"
    request_data["context"]["acceptingOnly"] = False
    output = SupportProgramConversationOutput(status="CLARIFICATION_REQUIRED", updates=[
        {"field": field, "operation": "CLEAR", "value": None, "evidence": "전체 초기화"}
        for field in ("QUERY", "REGION", "INDUSTRY", "ESTABLISHED_ON", "SUPPORT_PURPOSE", "ACCEPTING_ONLY")
    ], clarificationQuestion="어떤 지원사업을 찾으시나요?")
    agent = AsyncMock()
    agent.interpret.return_value = output
    request = SupportProgramConversationRequest.model_validate(request_data)
    service = SupportProgramConversationService(agent)
    response = await service.interpret(request)
    merged = service._merge_context(request, output)
    assert response.status == "CLARIFICATION_REQUIRED"
    assert merged.query is None and merged.accepting_only is True
    assert set(merged.company_conditions.model_dump().values()) == {None}


@pytest.mark.anyio
async def test_ambiguous_region_can_keep_clear_purpose_change_only(request_data):
    request_data["message"] = "부산이나 대구로, 지원금 위주"
    output = SupportProgramConversationOutput(status="CLARIFICATION_REQUIRED", updates=[
        {"field": "SUPPORT_PURPOSE", "operation": "SET", "value": "지원금", "evidence": "지원금"}
    ], clarificationQuestion="부산과 대구 중 현재 소재지를 알려주세요.")
    agent = AsyncMock()
    agent.interpret.return_value = output
    request = SupportProgramConversationRequest.model_validate(request_data)
    service = SupportProgramConversationService(agent)
    assert (await service.interpret(request)).status == "CLARIFICATION_REQUIRED"
    assert service._merge_context(request, output).company_conditions.region == "서울"


@pytest.mark.anyio
@pytest.mark.parametrize("bad_output", [None, {}, "READY"])
async def test_untyped_output_is_an_error_not_clarification(request_data, bad_output):
    agent = AsyncMock()
    agent.interpret.return_value = bad_output
    with pytest.raises(SupportProgramConversationError):
        await SupportProgramConversationService(agent).interpret(SupportProgramConversationRequest.model_validate(request_data))


@pytest.mark.anyio
async def test_revalidates_model_instances_instead_of_trusting_constructed_output(request_data, output_data):
    agent = AsyncMock()
    agent.interpret.return_value = SupportProgramConversationOutput.model_construct(**{
        "status": "READY", "updates": [], "clarification_question": "invalid ready question",
    })
    with pytest.raises(SupportProgramConversationError):
        await SupportProgramConversationService(agent).interpret(SupportProgramConversationRequest.model_validate(request_data))


@pytest.mark.anyio
@pytest.mark.parametrize("value", ["true", "false"])
async def test_accepting_only_set_uses_strict_string_values(request_data, value):
    request_data["message"] = "접수 필터 변경"
    output = SupportProgramConversationOutput(status="READY", updates=[
        {"field": "ACCEPTING_ONLY", "operation": "SET", "value": value, "evidence": "접수 필터 변경"}
    ], clarificationQuestion=None)
    agent = AsyncMock()
    agent.interpret.return_value = output
    service = SupportProgramConversationService(agent)
    request = SupportProgramConversationRequest.model_validate(request_data)
    await service.interpret(request)
    assert service._merge_context(request, output).accepting_only is (value == "true")
