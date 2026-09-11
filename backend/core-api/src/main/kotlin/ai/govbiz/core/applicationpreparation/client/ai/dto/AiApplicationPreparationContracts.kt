package ai.govbiz.core.applicationpreparation.client.ai.dto

const val AI_APPLICATION_PREPARATION_CONTRACT_VERSION = "application-preparation-interpret-v1"

data class AiApplicationPreparationConfigurationPayload(
    val contractVersion: String,
    val model: String,
    val promptVersion: String,
)

data class AiApplicationPreparationInterpretRequest(
    val contractVersion: String,
    val preparationId: Long,
    val inputRevision: Long,
    val formVersionId: String,
    val sectionKey: String,
    val serviceField: String,
    val userMessage: String,
    val currentFacts: List<AiApplicationPreparationFactRequest>,
    val fieldOptions: List<AiApplicationPreparationFieldRequest>,
)

data class AiApplicationPreparationFactRequest(val fieldKey: String, val status: String, val value: String?)
data class AiApplicationPreparationFieldRequest(val fieldKey: String, val label: String, val guidance: String, val required: Boolean)

data class AiApplicationPreparationInterpretPayload(
    val contractVersion: String,
    val model: String,
    val promptVersion: String,
    val preparationId: Long,
    val inputRevision: Long,
    val formVersionId: String,
    val sectionKey: String,
    val suggestions: List<AiApplicationPreparationSuggestionPayload>,
    val missingFields: List<String>,
    val nextQuestion: String?,
)

data class AiApplicationPreparationSuggestionPayload(
    val fieldKey: String,
    val status: String,
    val value: String?,
    val evidenceQuote: String,
)
