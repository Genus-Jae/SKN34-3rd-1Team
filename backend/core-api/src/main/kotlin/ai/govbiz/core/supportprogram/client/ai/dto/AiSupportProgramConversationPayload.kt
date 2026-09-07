package ai.govbiz.core.supportprogram.client.ai.dto

import com.fasterxml.jackson.annotation.JsonProperty

/** 누락은 역직렬화에서 거부하고 명시적 null은 해석 결과 계약에 따라 검증합니다. */
data class AiSupportProgramConversationPayload(
    @param:JsonProperty(required = true) val schemaVersion: String?,
    @param:JsonProperty(required = true) val status: String?,
    @param:JsonProperty(required = true) val updates: List<AiSupportProgramConversationUpdatePayload?>?,
    @param:JsonProperty(required = true) val clarificationQuestion: String?,
)

data class AiSupportProgramConversationUpdatePayload(
    @param:JsonProperty(required = true) val field: String?,
    @param:JsonProperty(required = true) val operation: String?,
    @param:JsonProperty(required = true) val value: String?,
    @param:JsonProperty(required = true) val evidence: String?,
)
