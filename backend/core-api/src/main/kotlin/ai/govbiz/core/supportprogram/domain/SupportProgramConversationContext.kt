package ai.govbiz.core.supportprogram.domain

/** 한 번의 대화 해석에 사용하는 작은 검색 상태이며 서버에 저장하지 않습니다. */
data class SupportProgramConversationContext(
    val query: String?,
    val acceptingOnly: Boolean,
    val companyConditions: SupportProgramCompanyConditions,
)

data class SupportProgramPendingClarification(
    val question: String,
    val draftContext: SupportProgramConversationContext,
)

/** 직전 완료 검색의 참고 정보이며 적용 조건이나 실행 명령이 아닙니다. */
data class SupportProgramConversationLastSearch(
    val context: SupportProgramConversationContext,
    val resultCount: Int,
)

enum class SupportProgramConversationStatus { READY, CLARIFICATION_REQUIRED, ANSWERED }

enum class SupportProgramConversationField {
    QUERY, REGION, INDUSTRY, ESTABLISHED_ON, SUPPORT_PURPOSE, ACCEPTING_ONLY,
}
