"""TEST ONLY: real AI router/service/Runner with one ScriptedModel response; no OpenAI client."""

import argparse
import json
from pathlib import Path
from types import SimpleNamespace

from agents.testing import ScriptedModel, assistant_message
from fastapi import FastAPI
import uvicorn

from app.combination_review.agent import CombinationReviewAgent
from app.combination_review.models import AnalysisSelection, CONTRACT_VERSION
from app.combination_review.prompt import PROMPT_VERSION
from app.combination_review.router import router
from app.combination_review.service import CombinationReviewService


def create_contract_app(fixture: Path) -> FastAPI:
    data = json.loads(fixture.read_text(encoding="utf-8"))
    if (data.pop("model"), data.pop("contractVersion"), data.pop("promptVersion")) != (
        "test-model", CONTRACT_VERSION, PROMPT_VERSION,
    ):
        raise ValueError("fixture must match test-model and the current contract/prompt")
    for pair in data["pairs"]:
        for stage in pair["stages"]:
            for citation in stage["citations"]:
                citation["evidenceIndex"] = int(citation.pop("evidenceId")[1:])
    output = AnalysisSelection.model_validate(data)
    model = ScriptedModel([[assistant_message(output.model_dump_json())]])
    agent = CombinationReviewAgent(model=model, model_timeout_seconds=2, run_timeout_seconds=5)
    app = FastAPI(title="GovBiz TEST ONLY contract agent")
    app.state.container = SimpleNamespace(combination_review_service=CombinationReviewService(agent, "test-model"))
    app.include_router(router)

    @app.get("/__test__/calls")
    def calls():
        return {"scriptedCalls": len(model.calls), "paidCalls": 0, "qualityMeasured": False}

    return app


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=18042)
    args = parser.parse_args()
    uvicorn.run(create_contract_app(args.fixture), host=args.host, port=args.port, access_log=False)
