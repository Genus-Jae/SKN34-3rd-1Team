import asyncio
import json
import logging
from time import perf_counter

from agents import (
    Agent,
    MaxTurnsExceeded,
    Model,
    ModelBehaviorError,
    ModelRefusalError,
    ModelSettings,
    ModelTimeoutError,
    RunConfig,
    Runner,
)
from openai import OpenAIError
from openai.types.shared import Reasoning
from pydantic import ValidationError

from app.support_program_evidence.errors import SupportProgramEvidenceError
from app.support_program_evidence.models import (
    SupportProgramEvidenceAnswerOutput,
    SupportProgramEvidenceAnswerRequest,
    SupportProgramEvidenceAnswerSelection,
)
from app.support_program_evidence.prompt import (
    SUPPORT_PROGRAM_EVIDENCE_ANSWER_INSTRUCTIONS,
)


logger = logging.getLogger(__name__)


class SupportProgramEvidenceAnswerAgent:
    """한 번의 structured LLM 호출로 상세 공고 근거 답변을 생성한다."""

    def __init__(
        self,
        *,
        model: Model,
        model_timeout_seconds: float,
        run_timeout_seconds: float,
    ) -> None:
        self._run_timeout_seconds = run_timeout_seconds
        self._agent: Agent[None] = Agent(
            name="GovBiz Support Program Evidence Answerer",
            instructions=SUPPORT_PROGRAM_EVIDENCE_ANSWER_INSTRUCTIONS,
            model=model,
            output_type=SupportProgramEvidenceAnswerSelection,
            model_settings=ModelSettings(
                max_tokens=2_000,
                reasoning=Reasoning(effort="none"),
                store=False,
                timeout=model_timeout_seconds,
            ),
        )
        self._run_config = RunConfig(
            workflow_name="GovBiz support program evidence answer",
            tracing_disabled=True,
            trace_include_sensitive_data=False,
        )

    async def answer(
        self,
        request: SupportProgramEvidenceAnswerRequest,
    ) -> SupportProgramEvidenceAnswerOutput:
        started_at = perf_counter()
        model_finished_at = None
        usage = None
        outcome = "failed"
        payload = {
            "question": request.question,
            "chunks": [
                {"index": index, **chunk.model_dump(by_alias=True, exclude={"id"})}
                for index, chunk in enumerate(request.chunks)
            ],
        }
        try:
            async with asyncio.timeout(self._run_timeout_seconds):
                result = await Runner.run(
                    self._agent,
                    json.dumps(payload, ensure_ascii=False),
                    max_turns=1,
                    run_config=self._run_config,
                )
            model_finished_at = perf_counter()
            usage = getattr(getattr(result, "context_wrapper", None), "usage", None)
            output = result.final_output
            if not isinstance(output, SupportProgramEvidenceAnswerSelection):
                raise SupportProgramEvidenceError()
            selection = SupportProgramEvidenceAnswerSelection.model_validate(output.model_dump(by_alias=True))
            if any(index >= len(request.chunks) for index in selection.citation_chunk_indexes):
                raise SupportProgramEvidenceError()
            answer = SupportProgramEvidenceAnswerOutput(
                answer=selection.answer,
                answerStatus=selection.answer_status,
                citationChunkIds=[request.chunks[index].id for index in selection.citation_chunk_indexes],
            )
            outcome = "completed"
            return answer
        except (
            MaxTurnsExceeded,
            ModelBehaviorError,
            ModelRefusalError,
            ModelTimeoutError,
            OpenAIError,
            TimeoutError,
            ValidationError,
        ) as error:
            raise SupportProgramEvidenceError() from error
        except asyncio.CancelledError:
            outcome = "cancelled"
            raise
        finally:
            finished_at = perf_counter()
            usage_reported = usage is not None and bool(usage.request_usage_entries)
            logger.info(
                "support_program_evidence_answer_run outcome=%s model_ms=%d validation_ms=%d elapsed_ms=%d "
                "usage_reported=%s input_tokens=%s output_tokens=%s cached_input_tokens=%s reasoning_tokens=%s",
                outcome, round(((model_finished_at or finished_at) - started_at) * 1000),
                round((finished_at - model_finished_at) * 1000) if model_finished_at is not None else 0,
                round((finished_at - started_at) * 1000), usage_reported,
                usage.input_tokens if usage_reported else None,
                usage.output_tokens if usage_reported else None,
                usage.input_tokens_details.cached_tokens if usage_reported else None,
                usage.output_tokens_details.reasoning_tokens if usage_reported else None,
            )
