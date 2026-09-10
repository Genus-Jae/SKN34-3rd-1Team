import asyncio
import json

from agents import (
    Agent, MaxTurnsExceeded, Model, ModelBehaviorError, ModelRefusalError,
    ModelSettings, ModelTimeoutError, RunConfig, Runner,
)
from openai import APITimeoutError, OpenAIError
from openai.types.shared import Reasoning
from pydantic import ValidationError

from app.support_program_conversation.errors import (
    SupportProgramConversationError, SupportProgramConversationTimeoutError,
)
from app.support_program_conversation.models import (
    SupportProgramConversationOutput, SupportProgramConversationRequest,
)
from app.support_program_conversation.prompt import SUPPORT_PROGRAM_CONVERSATION_INSTRUCTIONS


class SupportProgramConversationAgent:
    """한 번의 structured LLM 호출로 조건 변경을 제안하거나 검색 대화에 답한다."""

    def __init__(self, *, model: Model, model_timeout_seconds: float, run_timeout_seconds: float) -> None:
        self._run_timeout_seconds = run_timeout_seconds
        self._agent: Agent[None] = Agent(
            name="GovBiz Support Program Conversation Interpreter",
            instructions=SUPPORT_PROGRAM_CONVERSATION_INSTRUCTIONS,
            model=model,
            output_type=SupportProgramConversationOutput,
            model_settings=ModelSettings(
                max_tokens=2_000, reasoning=Reasoning(effort="none"), store=False,
                timeout=model_timeout_seconds,
                # Keep the per-request HTTP deadline aligned without mutating the shared client.
                extra_args={"timeout": model_timeout_seconds},
            ),
        )
        self._run_config = RunConfig(
            workflow_name="GovBiz support program conversation interpretation",
            tracing_disabled=True, trace_include_sensitive_data=False,
        )

    async def interpret(self, request: SupportProgramConversationRequest) -> SupportProgramConversationOutput:
        try:
            async with asyncio.timeout(self._run_timeout_seconds):
                result = await Runner.run(
                    self._agent, json.dumps(request.model_dump(by_alias=True), ensure_ascii=False),
                    max_turns=1, run_config=self._run_config,
                )
            if not isinstance(result.final_output, SupportProgramConversationOutput):
                raise SupportProgramConversationError()
            return SupportProgramConversationOutput.model_validate(result.final_output.model_dump(by_alias=True))
        except (ModelTimeoutError, APITimeoutError, TimeoutError) as error:
            raise SupportProgramConversationTimeoutError() from error
        except (
            MaxTurnsExceeded, ModelBehaviorError, ModelRefusalError,
            OpenAIError, ValidationError,
        ) as error:
            raise SupportProgramConversationError() from error
