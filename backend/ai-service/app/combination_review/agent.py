import asyncio
import json

from agents import Agent, Model, ModelSettings, ModelTimeoutError, RunConfig, Runner
from openai import APITimeoutError
from openai.types.shared import Reasoning
from app.combination_review.models import AnalysisSelection, AnalyzeRequest, build_citation_options
from app.combination_review.prompt import INSTRUCTIONS


class CombinationReviewAgent:
    """Single structured call, no tools, handoffs, retries or rule fallback."""
    def __init__(self, *, model: Model, model_timeout_seconds: float, run_timeout_seconds: float):
        self._run_timeout_seconds = run_timeout_seconds
        self._agent = Agent(
            name="GovBiz Combination Review", model=model, instructions=INSTRUCTIONS,
            output_type=AnalysisSelection,
            model_settings=ModelSettings(max_tokens=6000, reasoning=Reasoning(effort="none"),
                                         store=False, timeout=model_timeout_seconds,
                                         extra_args={"timeout": model_timeout_seconds}),
        )
        self._run_config = RunConfig(tracing_disabled=True, trace_include_sensitive_data=False)

    async def analyze(self, request: AnalyzeRequest) -> AnalysisSelection:
        payload = request.model_dump(exclude={"evidence"})
        payload["citationOptions"] = [
            {
                "citationOptionIndex": index,
                "programIndex": request.evidence[option.evidenceIndex].programIndex,
                "locator": request.evidence[option.evidenceIndex].locator,
                "quote": option.quote,
            }
            for index, option in enumerate(build_citation_options(request))
        ]
        try:
            async with asyncio.timeout(self._run_timeout_seconds):
                result = await Runner.run(self._agent, json.dumps(payload, ensure_ascii=False),
                                          max_turns=1, run_config=self._run_config)
        except (ModelTimeoutError, APITimeoutError, TimeoutError) as error:
            raise TimeoutError("Combination review agent timed out") from error
        if not isinstance(result.final_output, AnalysisSelection):
            raise ValueError("invalid combination review output")
        return AnalysisSelection.model_validate(result.final_output.model_dump())
