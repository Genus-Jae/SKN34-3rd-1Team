import asyncio
from copy import deepcopy
import json
import os
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from agents.testing import ScriptedModel, assistant_message
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.combination_review.agent import CombinationReviewAgent
from app.combination_review.models import AnalyzeRequest, AnalysisSelection, validate_selection
from app.combination_review.prompt import PROMPT_VERSION
from app.combination_review.service import CombinationReviewError, CombinationReviewService
from app.config import Settings
from app.main import create_app

FIXTURES = (Path(os.environ["GOVBIZ_TEST_CONTRACT_DIR"]) if "GOVBIZ_TEST_CONTRACT_DIR" in os.environ
            else Path(__file__).resolve().parents[4] / "backend/core-api/src/test/resources/combinationreview")


def request_data():
    return json.loads((FIXTURES / "contract-request.json").read_text(encoding="utf-8"))


def response_data():
    return json.loads((FIXTURES / "contract-response.json").read_text(encoding="utf-8"))


def selection_data():
    data = response_data()
    for name in ["contractVersion", "model", "promptVersion"]:
        data.pop(name)
    for pair in data["pairs"]:
        for stage in pair["stages"]:
            for citation in stage["citations"]:
                citation["evidenceIndex"] = int(citation.pop("evidenceId")[1:])
    return data


def make_service(data=None):
    model = ScriptedModel([[assistant_message(json.dumps(data or selection_data(), ensure_ascii=False))]])
    agent = CombinationReviewAgent(model=model, model_timeout_seconds=2, run_timeout_seconds=3)
    return CombinationReviewService(agent, "test-model"), model


def test_real_runner_returns_the_same_contract_consumed_by_core():
    service, model = make_service()
    result = asyncio.run(service.analyze(AnalyzeRequest.model_validate(request_data())))
    assert result == response_data()
    assert result["promptVersion"] == PROMPT_VERSION
    assert len(model.calls) == 1
    assert service.agent._agent.tools == []
    assert service.agent._agent.model_settings.store is False
    assert service.agent._agent.model_settings.extra_args == {"timeout": 2}
    assert service.agent._run_timeout_seconds == 3
    assert service.agent._run_config.tracing_disabled is True


@pytest.mark.parametrize("change", [
    lambda d: d["programs"].append(deepcopy(d["programs"][0])),
    lambda d: d["evidence"][0].update(programIndex=2),
    lambda d: d["evidence"][0].update(programIndex="0"),
    lambda d: d["evidence"][1].update(id="E0"),
    lambda d: d["evidence"].pop(),
    lambda d: d["programs"][0]["participation"].update(selected=None),
    lambda d: d["programs"][0]["participation"].update(selected="MAYBE"),
    lambda d: d.update(evidence=[]),
    lambda d: d.update(contractVersion="unknown"),
])
def test_invalid_inputs_are_rejected_before_agent(change):
    data = request_data()
    change(data)
    with pytest.raises(ValidationError):
        AnalyzeRequest.model_validate(data)


@pytest.mark.parametrize("change", [
    lambda d: d["pairs"][0]["stages"][0].update(citations=[]),
    lambda d: d["pairs"][0]["stages"][0].update(requiresInstitutionConfirmation=True),
    lambda d: d["pairs"][0]["stages"][0].update(judgment="NEEDS_FACTS", questions=[]),
    lambda d: d["pairs"][0]["stages"].pop(),
    lambda d: d["pairs"][0]["stages"][0].update(stage="FUNDING"),
])
def test_invalid_judgments_fail_the_structured_contract(change):
    data = selection_data()
    change(data)
    with pytest.raises(ValidationError):
        AnalysisSelection.model_validate(data)


@pytest.mark.parametrize("change", [
    lambda d: d["pairs"].append(deepcopy(d["pairs"][0])),
    lambda d: d["pairs"][0].update(secondProgramIndex=2),
    lambda d: d["pairs"][0]["stages"][0]["citations"][0].update(evidenceIndex=500),
    lambda d: d["pairs"][0]["stages"][0]["citations"][0].update(quote="원문에 존재하지 않는 인용"),
])
def test_invalid_pair_or_citation_is_technical_failure_without_fallback(change):
    data = selection_data()
    change(data)
    agent = SimpleNamespace(analyze=AsyncMock(return_value=AnalysisSelection.model_validate(data)))
    service = CombinationReviewService(agent, "test-model")
    with pytest.raises(CombinationReviewError, match="COMBINATION_REVIEW_FAILED"):
        asyncio.run(service.analyze(AnalyzeRequest.model_validate(request_data())))
    assert agent.analyze.call_count == 1


def test_three_programs_require_all_three_pairs_and_all_six_stages():
    request = request_data()
    program = deepcopy(request["programs"][0])
    program["sourceProgramId"] = "PBLN_3"
    request["programs"].append(program)
    request["evidence"].append({**request["evidence"][0], "id":"E2", "programIndex":2})
    data = selection_data()
    for first, second in [(0,2),(1,2)]:
        data["pairs"].append({**deepcopy(data["pairs"][0]), "firstProgramIndex":first, "secondProgramIndex":second})
    validate_selection(AnalyzeRequest.model_validate(request), AnalysisSelection.model_validate(data))
    data["pairs"].pop()
    with pytest.raises(ValueError, match="missing or duplicate pair"):
        validate_selection(AnalyzeRequest.model_validate(request), AnalysisSelection.model_validate(data))


def test_too_large_context_rejected_without_model_call(monkeypatch):
    import app.combination_review.service as module
    monkeypatch.setattr(module.tiktoken, "get_encoding", lambda _: SimpleNamespace(encode=lambda *a, **kw: [0]*100001))
    agent = SimpleNamespace(analyze=AsyncMock())
    with pytest.raises(CombinationReviewError, match="CONTEXT_TOO_LARGE"):
        asyncio.run(CombinationReviewService(agent, "test-model").analyze(AnalyzeRequest.model_validate(request_data())))
    agent.analyze.assert_not_called()


def test_timeout_is_distinguished_from_a_normal_insufficient_evidence_answer():
    agent = SimpleNamespace(analyze=AsyncMock(side_effect=TimeoutError()))
    with pytest.raises(CombinationReviewError, match="COMBINATION_REVIEW_TIMEOUT"):
        asyncio.run(CombinationReviewService(agent, "test-model").analyze(AnalyzeRequest.model_validate(request_data())))


def test_execution_failure_is_not_a_normal_insufficient_evidence_answer():
    agent = SimpleNamespace(analyze=AsyncMock(side_effect=RuntimeError("private upstream detail")))
    with pytest.raises(CombinationReviewError, match="COMBINATION_REVIEW_FAILED"):
        asyncio.run(CombinationReviewService(agent, "test-model").analyze(AnalyzeRequest.model_validate(request_data())))


def test_fastapi_contract_and_generic_failure_response():
    app = create_app(settings=Settings(openai_api_key="unused-test-key", openai_model="test-model",
                                       llm_model_timeout_seconds=2, llm_run_timeout_seconds=3))
    service, _ = make_service()
    app.state.container.combination_review_service = service
    with TestClient(app) as client:
        config = client.get("/internal/v1/combination-reviews/configuration")
        assert config.status_code == 200
        assert config.json() == service.configuration()
        result = client.post("/internal/v1/combination-reviews/analyze", json=request_data())
        assert result.status_code == 200
        assert result.json() == response_data()
        assert client.post("/internal/v1/combination-reviews/analyze", json={}).status_code == 422
        service.agent = SimpleNamespace(analyze=AsyncMock(side_effect=RuntimeError("secret-detail")))
        failure = client.post("/internal/v1/combination-reviews/analyze", json=request_data())
        assert failure.status_code == 503
        assert failure.json() == {"detail":{"code":"COMBINATION_REVIEW_FAILED"}}
        assert "secret-detail" not in failure.text


def test_fastapi_timeout_response_and_safe_diagnostic_log(caplog):
    app = create_app(settings=Settings(openai_api_key="unused-test-key", openai_model="test-model",
                                       llm_model_timeout_seconds=2, llm_run_timeout_seconds=3))
    service, _ = make_service()
    service.agent = SimpleNamespace(analyze=AsyncMock(side_effect=TimeoutError("private-timeout-detail")))
    app.state.container.combination_review_service = service
    caplog.set_level("WARNING", logger="app.combination_review.router")

    with TestClient(app) as client:
        failure = client.post("/internal/v1/combination-reviews/analyze", json=request_data())

    assert failure.status_code == 504
    assert failure.json() == {"detail": {"code": "COMBINATION_REVIEW_TIMEOUT"}}
    assert "failure_kind=timeout" in caplog.text
    assert "error_type=TimeoutError" in caplog.text
    assert "program_count=2" in caplog.text
    assert "evidence_count=2" in caplog.text
    assert "private-timeout-detail" not in caplog.text
