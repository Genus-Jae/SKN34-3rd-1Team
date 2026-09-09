from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request
from app.combination_review.models import AnalyzeRequest
from app.combination_review.service import CombinationReviewError, CombinationReviewService

router = APIRouter(prefix="/internal/v1/combination-reviews", tags=["internal"])


def get_service(request: Request) -> CombinationReviewService:
    return request.app.state.container.combination_review_service


@router.get("/configuration")
async def configuration(service: Annotated[CombinationReviewService, Depends(get_service)]):
    return service.configuration()


@router.post("/analyze")
async def analyze(payload: AnalyzeRequest, service: Annotated[CombinationReviewService, Depends(get_service)]):
    try:
        return await service.analyze(payload)
    except CombinationReviewError as error:
        code = str(error)
        raise HTTPException(status_code=422 if code == "CONTEXT_TOO_LARGE" else 503,
                            detail={"code": code}) from error
