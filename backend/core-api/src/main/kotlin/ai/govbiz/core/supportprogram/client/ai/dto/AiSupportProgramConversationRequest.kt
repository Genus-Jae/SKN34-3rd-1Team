package ai.govbiz.core.supportprogram.client.ai.dto

data class AiSupportProgramConversationRequest(
    val schemaVersion: String,
    val referenceDate: String,
    val message: String,
    val context: AiSupportProgramConversationContextRequest,
    val pendingClarification: AiSupportProgramPendingClarificationRequest?,
)

data class AiSupportProgramConversationContextRequest(
    val query: String?,
    val acceptingOnly: Boolean,
    val companyConditions: AiSupportProgramConversationCompanyConditionsRequest,
)

data class AiSupportProgramConversationCompanyConditionsRequest(
    val region: String?,
    val industry: String?,
    val establishedOn: String?,
    val supportPurpose: String?,
)

data class AiSupportProgramPendingClarificationRequest(
    val question: String,
    val draftContext: AiSupportProgramConversationContextRequest,
)
