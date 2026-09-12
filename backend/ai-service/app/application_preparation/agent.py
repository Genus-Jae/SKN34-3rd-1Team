import asyncio
import json

from agents import Agent, Model, ModelSettings, ModelTimeoutError, RunConfig, Runner
from openai import APITimeoutError
from openai.types.shared import Reasoning

from app.application_preparation.discovery_prompt import DISCOVERY_INSTRUCTIONS
from app.application_preparation.models import (
    DiscoverFormsRequest,
    FormDiscoverySelection,
    InterpretationSelection,
    InterpretRequest,
)
from app.application_preparation.prompt import INSTRUCTIONS


class ApplicationPreparationAgent:
    """One structured interpretation call with no tools, handoffs, retries or fallback."""

    def __init__(self, *, model: Model, model_timeout_seconds: float, run_timeout_seconds: float):
        self._run_timeout_seconds = run_timeout_seconds
        self._agent = Agent(
            name="GovBiz Application Preparation",
            model=model,
            instructions=INSTRUCTIONS,
            output_type=InterpretationSelection,
            model_settings=ModelSettings(
                max_tokens=2500,
                reasoning=Reasoning(effort="none"),
                store=False,
                timeout=model_timeout_seconds,
                extra_args={"timeout": model_timeout_seconds},
            ),
        )
        self._discovery_agent = Agent(
            name="GovBiz Application Form Discovery",
            model=model,
            instructions=DISCOVERY_INSTRUCTIONS,
            output_type=FormDiscoverySelection,
            model_settings=ModelSettings(
                max_tokens=5000,
                reasoning=Reasoning(effort="none"),
                store=False,
                timeout=model_timeout_seconds,
                extra_args={"timeout": model_timeout_seconds},
            ),
        )
        self._run_config = RunConfig(tracing_disabled=True, trace_include_sensitive_data=False)

    async def interpret(self, request: InterpretRequest) -> InterpretationSelection:
        try:
            async with asyncio.timeout(self._run_timeout_seconds):
                result = await Runner.run(
                    self._agent,
                    json.dumps(request.model_dump(), ensure_ascii=False),
                    max_turns=1,
                    run_config=self._run_config,
                )
        except (ModelTimeoutError, APITimeoutError, TimeoutError) as error:
            raise TimeoutError("Application preparation agent timed out") from error
        if not isinstance(result.final_output, InterpretationSelection):
            raise ValueError("invalid application preparation output")
        return InterpretationSelection.model_validate(result.final_output.model_dump())

    async def discover(self, request: DiscoverFormsRequest) -> FormDiscoverySelection:
        try:
            async with asyncio.timeout(self._run_timeout_seconds):
                result = await Runner.run(
                    self._discovery_agent,
                    json.dumps(request.model_dump(), ensure_ascii=False),
                    max_turns=1,
                    run_config=self._run_config,
                )
        except (ModelTimeoutError, APITimeoutError, TimeoutError) as error:
            raise TimeoutError("Application form discovery agent timed out") from error
        if not isinstance(result.final_output, FormDiscoverySelection):
            raise ValueError("invalid application form discovery output")
        return FormDiscoverySelection.model_validate(result.final_output.model_dump())
