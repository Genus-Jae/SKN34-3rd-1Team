package ai.govbiz.core.combinationreview.client.exception

/** 공식 첨부 수집·디코딩 경계의 실패. 공개 HTTP 오류와 실행 상태 변환은 Service가 담당한다. */
class CombinationReviewSourceClientException(val reason: Reason, cause: Throwable? = null) : RuntimeException(null, cause) {
    enum class Reason { UNSUPPORTED, NOT_FOUND, UNAVAILABLE, INVALID, TOO_LARGE }
}
