from app.application_preparation.agent import ApplicationPreparationAgent
from app.application_preparation.models import CONTRACT_VERSION, InterpretationSelection, InterpretRequest, validate_selection
from app.application_preparation.prompt import PROMPT_VERSION


class ApplicationPreparationError(RuntimeError):
    pass


class ApplicationPreparationService:
    def __init__(self, agent: ApplicationPreparationAgent, model_name: str):
        self.agent = agent
        self.model_name = model_name

    def configuration(self) -> dict:
        return {"contractVersion": CONTRACT_VERSION, "model": self.model_name, "promptVersion": PROMPT_VERSION}

    async def interpret(self, request: InterpretRequest) -> dict:
        try:
            output: InterpretationSelection = await self.agent.interpret(request)
            validate_selection(request, output)
            return {
                **self.configuration(),
                "preparationId": request.preparationId,
                "inputRevision": request.inputRevision,
                "formVersionId": request.formVersionId,
                "sectionKey": request.sectionKey,
                **output.model_dump(),
            }
        except TimeoutError as error:
            raise ApplicationPreparationError("APPLICATION_PREPARATION_TIMEOUT") from error
        except Exception as error:
            raise ApplicationPreparationError("APPLICATION_PREPARATION_FAILED") from error
