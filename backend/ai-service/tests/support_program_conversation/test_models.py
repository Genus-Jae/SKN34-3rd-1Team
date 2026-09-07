from copy import deepcopy

import pytest
from pydantic import ValidationError

from app.support_program_conversation.models import (
    ConversationUpdate, SupportProgramConversationOutput, SupportProgramConversationRequest,
)


@pytest.mark.parametrize("path", [
    ["schemaVersion"], ["message"], ["context"], ["referenceDate"],
    ["context", "query"], ["context", "acceptingOnly"], ["context", "companyConditions"],
    *[["context", "companyConditions", field] for field in ("region", "industry", "establishedOn", "supportPurpose")],
])
def test_requires_all_context_fields_even_when_nullable(request_data, path):
    target = request_data
    for key in path[:-1]:
        target = target[key]
    del target[path[-1]]
    with pytest.raises(ValidationError):
        SupportProgramConversationRequest.model_validate(request_data)


def test_nullable_fields_and_omitted_pending_are_valid(request_data):
    request_data["context"]["query"] = None
    request_data["context"]["companyConditions"] = dict.fromkeys(request_data["context"]["companyConditions"])
    del request_data["pendingClarification"]
    parsed = SupportProgramConversationRequest.model_validate(request_data)
    assert parsed.pending_clarification is None
    assert parsed.context.query is None


@pytest.mark.parametrize("value", ["", " \t\n", "a\x00", "a\u200b", "a\ud800", "a\ue000"])
@pytest.mark.parametrize("field", ["message", "query"])
def test_rejects_blank_or_forbidden_query_characters(request_data, value, field):
    (request_data if field == "message" else request_data["context"])[field] = value
    with pytest.raises(ValidationError):
        SupportProgramConversationRequest.model_validate(request_data)


def test_preserves_raw_query_and_permitted_layout_characters(request_data):
    request_data["message"] = " \n사업화\t지원\r "
    request_data["context"]["query"] = request_data["message"]
    parsed = SupportProgramConversationRequest.model_validate(request_data)
    assert parsed.message == parsed.context.query == request_data["message"]


@pytest.mark.parametrize("field,maximum", [("region", 50), ("industry", 100), ("supportPurpose", 100)])
def test_condition_limits_count_utf16_without_trimming(request_data, field, maximum):
    conditions = request_data["context"]["companyConditions"]
    conditions[field] = "😀" * (maximum // 2)
    assert SupportProgramConversationRequest.model_validate(request_data)
    conditions[field] += " "
    with pytest.raises(ValidationError):
        SupportProgramConversationRequest.model_validate(request_data)


@pytest.mark.parametrize("value", ["", " ", "\n서울", "서울\t", "서울\r", "서울\u200b"])
def test_condition_strings_reject_blanks_and_all_unicode_c(request_data, value):
    request_data["context"]["companyConditions"]["region"] = value
    with pytest.raises(ValidationError):
        SupportProgramConversationRequest.model_validate(request_data)


@pytest.mark.parametrize("value", ["true", "false", 0, 1, None, 1.0])
def test_accepting_only_is_a_strict_boolean(request_data, value):
    request_data["context"]["acceptingOnly"] = value
    with pytest.raises(ValidationError):
        SupportProgramConversationRequest.model_validate(request_data)


@pytest.mark.parametrize("value", ["1899-12-31", "2026-09-08", "2023-02-29", "2024-1-01", " 2024-01-01", "", "2024년 1월 1일"])
@pytest.mark.parametrize("pending", [False, True])
def test_dates_are_real_iso_and_bounded_in_applied_and_pending_context(request_data, value, pending):
    target = request_data["context"]
    if pending:
        request_data["pendingClarification"] = {"question": "설립일은?", "draftContext": deepcopy(target)}
        target = request_data["pendingClarification"]["draftContext"]
    target["companyConditions"]["establishedOn"] = value
    with pytest.raises(ValidationError):
        SupportProgramConversationRequest.model_validate(request_data)


@pytest.mark.parametrize("value", ["1900-01-01", "2024-02-29", "2026-09-07"])
def test_valid_date_boundaries(request_data, value):
    request_data["context"]["companyConditions"]["establishedOn"] = value
    assert SupportProgramConversationRequest.model_validate(request_data)


@pytest.mark.parametrize("field,value,evidence", [
    ("REGION", None, "부산"), ("REGION", " ", "부산"), ("REGION", "😀" * 26, "부산"),
    ("REGION", "부산\n", "부산"), ("ACCEPTING_ONLY", True, "모두"),
    ("ACCEPTING_ONLY", "True", "모두"), ("ACCEPTING_ONLY", "1", "모두"),
    ("ESTABLISHED_ON", "2024-09-07", "설립 2년"),
    ("ESTABLISHED_ON", "2024-01-01", "2025-01-01"),
    ("ESTABLISHED_ON", "2024-01-01", "설립일 2024-01-01"),
    ("ESTABLISHED_ON", "2024-01-01", "2024-01-01 또는 2025-01-01"),
    ("ESTABLISHED_ON", "2024-01-01", "2024년 1월"),
    ("ESTABLISHED_ON", "2024-01-01", "2024년\t1월 1일"),
    ("ESTABLISHED_ON", "2023-02-29", "2023년 2월 29일"),
])
def test_rejects_invalid_set_values_and_invented_dates(field, value, evidence):
    with pytest.raises(ValidationError):
        ConversationUpdate(field=field, operation="SET", value=value, evidence=evidence)


@pytest.mark.parametrize("evidence", ["2024-01-01", "2024년 1월 1일", "2024년01월01일", "2024년\u00a01월 1일"])
def test_normalizes_only_explicit_full_date_evidence(evidence):
    assert ConversationUpdate(field="ESTABLISHED_ON", operation="SET", value="2024-01-01", evidence=evidence)


@pytest.mark.parametrize("evidence", ["", " ", "부산\n", "부산\t", "부산\r", "부산\u200b", "😀" * 81])
def test_evidence_is_nonblank_utf16_bounded_and_without_controls(evidence):
    with pytest.raises(ValidationError):
        ConversationUpdate(field="REGION", operation="SET", value="부산", evidence=evidence)


@pytest.mark.parametrize("mutation", [
    {"status": "UNKNOWN"}, {"clarificationQuestion": "어디인가요?"},
    {"status": "CLARIFICATION_REQUIRED"},
    {"status": "CLARIFICATION_REQUIRED", "clarificationQuestion": " \t"},
    {"status": "CLARIFICATION_REQUIRED", "clarificationQuestion": "😀" * 81},
])
def test_output_status_and_question_must_agree(output_data, mutation):
    output_data.update(mutation)
    with pytest.raises(ValidationError):
        SupportProgramConversationOutput.model_validate(output_data)


@pytest.mark.parametrize("field", ["status", "updates", "clarificationQuestion"])
def test_output_missing_fields_are_not_defaulted(output_data, field):
    del output_data[field]
    with pytest.raises(ValidationError):
        SupportProgramConversationOutput.model_validate(output_data)


def test_rejects_duplicate_fields_and_unknown_keys(output_data):
    output_data["updates"] *= 2
    with pytest.raises(ValidationError):
        SupportProgramConversationOutput.model_validate(output_data)
    with pytest.raises(ValidationError):
        ConversationUpdate(field="REGION", operation="KEEP", value=None, evidence="부산")
    with pytest.raises(ValidationError):
        ConversationUpdate(field="REGION", operation="CLEAR", value="부산", evidence="부산")
    with pytest.raises(ValidationError):
        ConversationUpdate(field="RELOCATION", operation="SET", value="부산", evidence="부산")


@pytest.mark.parametrize("field", ["message", "query"])
def test_query_utf16_cap(request_data, field):
    target = request_data if field == "message" else request_data["context"]
    target[field] = "😀" * 250
    assert SupportProgramConversationRequest.model_validate(request_data)
    target[field] += "a"
    with pytest.raises(ValidationError):
        SupportProgramConversationRequest.model_validate(request_data)
