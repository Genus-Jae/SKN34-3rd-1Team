from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.support_program_conversation.errors import SupportProgramConversationError
from app.support_program_conversation.models import SupportProgramConversationRequest, SupportProgramConversationResponse
from app.support_program_conversation.service import SupportProgramConversationService


router = APIRouter(prefix="/internal/v1/support-program-conversation", tags=["internal"])


def get_support_program_conversation_service(request: Request) -> SupportProgramConversationService:
    return request.app.state.container.support_program_conversation_service


@router.post("/interpret", response_model=SupportProgramConversationResponse, summary="확인 전 검색 조건 변경 해석")
async def interpret_support_program_conversation(
    payload: SupportProgramConversationRequest,
    service: Annotated[SupportProgramConversationService, Depends(get_support_program_conversation_service)],
) -> SupportProgramConversationResponse:
    try:
        return await service.interpret(payload)
    except SupportProgramConversationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Support program conversation interpretation is temporarily unavailable.",
        ) from error
