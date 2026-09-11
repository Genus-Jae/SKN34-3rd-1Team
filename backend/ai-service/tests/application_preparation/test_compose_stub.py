import importlib.util
from io import BytesIO
from pathlib import Path

import httpx2
import pytest
from agents import OpenAIResponsesModel
from openai import AsyncOpenAI

from app.application_preparation.agent import ApplicationPreparationAgent
from app.application_preparation.models import InterpretRequest
from app.application_preparation.service import ApplicationPreparationService


@pytest.mark.anyio
async def test_actual_compose_stub_through_sdk_and_service(monkeypatch):
    stub_path = Path(__file__).resolve().parents[4] / "infrastructure/stubs/openai/server.py"
    spec = importlib.util.spec_from_file_location("application_preparation_compose_stub", stub_path)
    stub = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(stub)
    request = InterpretRequest.model_validate({
        "contractVersion": "application-preparation-interpret-v1",
        "preparationId": 1,
        "inputRevision": 1,
        "formVersionId": "verified-form-v1",
        "sectionKey": "company-overview",
        "serviceField": "TECHNICAL_SUPPORT",
        "userMessage": "업체명은 새봄테크입니다.",
        "currentFacts": [],
        "fieldOptions": [
            {"fieldKey": "company-name", "label": "업체명", "guidance": "공식 업체명", "required": True},
            {"fieldKey": "contact-person", "label": "담당자", "guidance": "담당자", "required": True},
        ],
    })

    def handle(http_request):
        handler = object.__new__(stub.Handler)
        handler.path = http_request.url.path
        handler.headers = {"Content-Length": str(len(http_request.content))}
        handler.rfile = BytesIO(http_request.content)
        responses = []
        monkeypatch.setattr(handler, "respond", lambda code, body: responses.append(httpx2.Response(code, json=body)))
        handler.do_POST()
        return responses[0]

    client = AsyncOpenAI(
        api_key="test-key",
        base_url="https://openai.test/v1/",
        max_retries=0,
        http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handle)),
    )
    agent = ApplicationPreparationAgent(
        model=OpenAIResponsesModel(model="gpt-5.6-luna", openai_client=client),
        model_timeout_seconds=4,
        run_timeout_seconds=5,
    )
    try:
        result = await ApplicationPreparationService(agent, "gpt-5.6-luna").interpret(request)
    finally:
        await client.close()
    assert result["suggestions"][0]["value"] == "새봄테크"
    assert result["missingFields"] == ["contact-person"]
