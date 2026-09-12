import asyncio
import json
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from agents.testing import ScriptedModel, assistant_message
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.application_preparation.agent import ApplicationPreparationAgent
from app.application_preparation.discovery_prompt import DISCOVERY_PROMPT_VERSION
from app.application_preparation.models import (
    DiscoverFormsRequest,
    FormDiscoverySelection,
    InterpretRequest,
    InterpretationSelection,
)
from app.application_preparation.prompt import PROMPT_VERSION
from app.application_preparation.service import ApplicationPreparationError, ApplicationPreparationService
from app.config import Settings
from app.main import create_app


def request_data():
    return {
        "contractVersion": "application-preparation-interpret-v1",
        "preparationId": 7,
        "inputRevision": 2,
        "formVersionId": "verified-form-v1",
        "sectionKey": "company-overview",
        "serviceField": "TECHNICAL_SUPPORT",
        "userMessage": "업체명은 새봄테크이고 담당자는 아직 미정입니다.",
        "currentFacts": [],
        "fieldOptions": [
            {"fieldKey": "company-name", "label": "업체명", "guidance": "공식 업체명", "required": True},
            {"fieldKey": "contact-person", "label": "담당자", "guidance": "담당자 이름과 역할", "required": True},
            {"fieldKey": "main-products", "label": "주요 생산품", "guidance": "핵심 제품", "required": True},
        ],
    }


def selection_data():
    return {
        "suggestions": [
            {"fieldKey": "company-name", "status": "PROVIDED", "value": "새봄테크", "evidenceQuote": "업체명은 새봄테크"},
            {"fieldKey": "contact-person", "status": "UNKNOWN", "value": None, "evidenceQuote": "담당자는 아직 미정"},
        ],
        "missingFields": ["main-products"],
        "nextQuestion": "현재 제공하는 주요 제품이나 서비스는 무엇인가요?",
    }


def discovery_request_data():
    return {
        "contractVersion": "application-form-discovery-v1",
        "sourceCode": "BIZINFO",
        "sourceProgramId": "PBLN_123",
        "programTitle": "지원사업 공고",
        "documents": [{
            "documentIndex": 0,
            "fileName": "사업계획서.hwpx",
            "format": "HWPX",
            "blocks": [{"blockId": "D0-B0", "locator": "HWPX section0 paragraphs 1-3", "text": "사업 개요를 작성해 주세요."}],
        }],
    }


def discovery_selection_data():
    return {"forms": [{"documentIndex": 0, "sections": [{
        "sectionKey": "business-plan",
        "title": "사업 계획",
        "description": "사업 개요를 작성합니다.",
        "fields": [{
            "fieldKey": "business-overview",
            "label": "사업 개요",
            "guidance": "사업의 목적과 내용을 입력합니다.",
            "required": True,
            "evidenceBlockId": "D0-B0",
            "evidenceQuote": "사업 개요",
        }],
    }]}]}


def make_service(data=None):
    model = ScriptedModel([[assistant_message(json.dumps(data or selection_data(), ensure_ascii=False))]])
    agent = ApplicationPreparationAgent(model=model, model_timeout_seconds=2, run_timeout_seconds=3)
    return ApplicationPreparationService(agent, "test-model"), model


def test_real_runner_returns_validated_suggestions_without_confirming_them():
    service, model = make_service()
    result = asyncio.run(service.interpret(InterpretRequest.model_validate(request_data())))
    assert result["suggestions"] == selection_data()["suggestions"]
    assert result["inputRevision"] == 2
    assert result["promptVersion"] == PROMPT_VERSION
    assert len(model.calls) == 1
    assert service.agent._agent.tools == []
    assert service.agent._agent.model_settings.store is False
    assert service.agent._run_config.tracing_disabled is True


def test_real_runner_discovers_only_fields_with_exact_document_evidence():
    model = ScriptedModel([[assistant_message(json.dumps(discovery_selection_data(), ensure_ascii=False))]])
    agent = ApplicationPreparationAgent(model=model, model_timeout_seconds=2, run_timeout_seconds=3)
    service = ApplicationPreparationService(agent, "test-model")
    result = asyncio.run(service.discover(DiscoverFormsRequest.model_validate(discovery_request_data())))
    assert result["forms"][0]["sections"][0]["fields"][0]["evidenceQuote"] == "사업 개요"
    assert result["promptVersion"] == DISCOVERY_PROMPT_VERSION
    assert len(model.calls) == 1
    assert agent._discovery_agent.tools == []


@pytest.mark.parametrize(("source_code", "source_program_id", "file_format", "document_index"), [
    ("BIZINFO", "PBLN_123", "HWPX", 0),
    ("KSTARTUP", "177911", "HWP", 1),
    ("MSIT", "3186573", "PDF", 6),
    ("CNTRADE_NOTICE", "3862", "HWPX", 7),
])
def test_discovery_contract_accepts_every_supported_provider_and_document_format(
    source_code, source_program_id, file_format, document_index,
):
    data = discovery_request_data()
    data["sourceCode"] = source_code
    data["sourceProgramId"] = source_program_id
    data["documents"][0]["documentIndex"] = document_index
    data["documents"][0]["format"] = file_format
    data["documents"][0]["blocks"][0]["blockId"] = f"D{document_index}-B0"

    request = DiscoverFormsRequest.model_validate(data)

    assert request.sourceCode == source_code
    assert request.documents[0].format == file_format


@pytest.mark.parametrize(("source_code", "source_program_id"), [
    ("BIZINFO", "177911"),
    ("KSTARTUP", "PBLN_123"),
    ("MSIT", "0"),
    ("CNTRADE_NOTICE", "01"),
])
def test_discovery_contract_rejects_provider_mismatched_ids(source_code, source_program_id):
    data = discovery_request_data()
    data["sourceCode"] = source_code
    data["sourceProgramId"] = source_program_id
    with pytest.raises(ValidationError):
        DiscoverFormsRequest.model_validate(data)


def test_discovery_normalizes_display_text_and_whitespace_only_quote_differences():
    request_data = discovery_request_data()
    request_data["documents"][0]["blocks"][0]["text"] = "사업\n개요를 작성해 주세요."
    output = discovery_selection_data()
    section = output["forms"][0]["sections"][0]
    section["title"] = "  사업 계획  "
    section["description"] = "  사업 개요를 작성합니다.  "
    section["fields"][0]["label"] = "  사업 개요  "
    section["fields"][0]["guidance"] = "  사업의 목적과 내용을 입력합니다.  "
    section["fields"][0]["evidenceQuote"] = "사업 개요"
    agent = SimpleNamespace(discover=AsyncMock(return_value=FormDiscoverySelection.model_validate(output)))

    result = asyncio.run(ApplicationPreparationService(agent, "test-model").discover(
        DiscoverFormsRequest.model_validate(request_data),
    ))

    normalized = result["forms"][0]["sections"][0]
    assert normalized["title"] == "사업 계획"
    assert normalized["fields"][0]["label"] == "사업 개요"
    assert normalized["fields"][0]["evidenceQuote"] == "사업\n개요"


def test_discovery_merges_repeated_document_candidates_and_makes_generated_keys_unique():
    output = discovery_selection_data()
    duplicate = deepcopy(output["forms"][0])
    duplicate["sections"][0]["title"] = "두 번째 사업 계획"
    output["forms"].append(duplicate)
    agent = SimpleNamespace(discover=AsyncMock(return_value=FormDiscoverySelection.model_validate(output)))

    result = asyncio.run(ApplicationPreparationService(agent, "test-model").discover(
        DiscoverFormsRequest.model_validate(discovery_request_data()),
    ))

    forms = result["forms"]
    assert len(forms) == 1
    assert [section["sectionKey"] for section in forms[0]["sections"]] == ["business-plan", "business-plan-2"]


def test_discovery_rejects_a_field_without_exact_source_evidence():
    output = discovery_selection_data()
    output["forms"][0]["sections"][0]["fields"][0]["evidenceQuote"] = "문서에 없는 항목"
    agent = SimpleNamespace(discover=AsyncMock(return_value=FormDiscoverySelection.model_validate(output)))
    with pytest.raises(ApplicationPreparationError, match="APPLICATION_PREPARATION_FAILED"):
        asyncio.run(ApplicationPreparationService(agent, "test-model").discover(
            DiscoverFormsRequest.model_validate(discovery_request_data()),
        ))


@pytest.mark.parametrize("change", [
    lambda data: data.update(contractVersion="unknown"),
    lambda data: data.update(userMessage=""),
    lambda data: data["currentFacts"].append({"fieldKey": "not-allowed", "status": "UNKNOWN", "value": None}),
    lambda data: data["fieldOptions"].append(deepcopy(data["fieldOptions"][0])),
])
def test_invalid_requests_are_rejected_before_the_agent(change):
    data = request_data()
    change(data)
    with pytest.raises(ValidationError):
        InterpretRequest.model_validate(data)


@pytest.mark.parametrize("change", [
    lambda data: data["suggestions"][0].update(fieldKey="invented-field"),
    lambda data: data["suggestions"][0].update(evidenceQuote="사용자가 말하지 않은 내용"),
    lambda data: data.update(missingFields=[]),
    lambda data: data.update(nextQuestion=None),
])
def test_invented_or_inconsistent_output_is_a_technical_failure(change):
    data = selection_data()
    change(data)
    agent = SimpleNamespace(interpret=AsyncMock(return_value=InterpretationSelection.model_validate(data)))
    with pytest.raises(ApplicationPreparationError, match="APPLICATION_PREPARATION_FAILED"):
        asyncio.run(ApplicationPreparationService(agent, "test-model").interpret(InterpretRequest.model_validate(request_data())))


def test_timeout_is_not_returned_as_an_empty_success():
    agent = SimpleNamespace(interpret=AsyncMock(side_effect=TimeoutError()))
    with pytest.raises(ApplicationPreparationError, match="APPLICATION_PREPARATION_TIMEOUT"):
        asyncio.run(ApplicationPreparationService(agent, "test-model").interpret(InterpretRequest.model_validate(request_data())))


def test_fastapi_contract_hides_private_failures():
    app = create_app(settings=Settings(openai_api_key="unused", openai_model="test-model", llm_model_timeout_seconds=2, llm_run_timeout_seconds=3))
    service, _ = make_service()
    app.state.container.application_preparation_service = service
    with TestClient(app) as client:
        assert client.get("/internal/v1/application-preparations/configuration").json() == service.configuration()
        assert client.get("/internal/v1/application-preparations/discovery/configuration").json() == service.discovery_configuration()
        response = client.post("/internal/v1/application-preparations/interpret", json=request_data())
        assert response.status_code == 200
        service.agent = SimpleNamespace(discover=AsyncMock(return_value=FormDiscoverySelection.model_validate(discovery_selection_data())))
        discovered = client.post("/internal/v1/application-preparations/discovery", json=discovery_request_data())
        assert discovered.status_code == 200
        assert discovered.json()["forms"][0]["documentIndex"] == 0
        service.agent = SimpleNamespace(interpret=AsyncMock(side_effect=RuntimeError("private failure")))
        failure = client.post("/internal/v1/application-preparations/interpret", json=request_data())
        assert failure.status_code == 503
        assert failure.json() == {"detail": {"code": "APPLICATION_PREPARATION_FAILED"}}
        assert "private failure" not in failure.text
