package ai.govbiz.core.applicationpreparation.facade

import ai.govbiz.core._common.exception.AiServiceCallException
import ai.govbiz.core.applicationpreparation.client.ai.AiApplicationPreparationClient
import ai.govbiz.core.applicationpreparation.client.ai.dto.AI_APPLICATION_PREPARATION_CONTRACT_VERSION
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationFactRequest
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationFieldRequest
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationInterpretRequest
import ai.govbiz.core.applicationpreparation.domain.ApplicationFactStatus
import ai.govbiz.core.applicationpreparation.domain.ApplicationFormManifest
import ai.govbiz.core.applicationpreparation.domain.ApplicationFactSuggestion
import ai.govbiz.core.applicationpreparation.domain.ApplicationInterpretation
import ai.govbiz.core.applicationpreparation.domain.ApplicationInterpretationConfiguration
import ai.govbiz.core.applicationpreparation.domain.ApplicationInterpretationInputSnapshot
import org.springframework.stereotype.Component

/** AI 계약 생성·응답 검증·내부 모델 변환을 담당하며 DB나 상위 Service를 호출하지 않습니다. */
@Component
class AiApplicationPreparationFacade(private val client: AiApplicationPreparationClient) {
    fun interpret(preparationId: Long, form: ApplicationFormManifest, snapshot: ApplicationInterpretationInputSnapshot): ApplicationInterpretation =
        try {
            interpretValidated(preparationId, form, snapshot)
        } catch (error: AiServiceCallException) {
            throw error
        } catch (error: IllegalArgumentException) {
            throw AiServiceCallException.invalidResponse("Application preparation response violated its contract", error)
        }

    private fun interpretValidated(preparationId: Long, form: ApplicationFormManifest, snapshot: ApplicationInterpretationInputSnapshot): ApplicationInterpretation {
        val section = requireNotNull(form.sections.find { it.key == snapshot.sectionKey })
        val configurationPayload = client.configuration()
        val configuration = ApplicationInterpretationConfiguration(
            configurationPayload.contractVersion,
            configurationPayload.model,
            configurationPayload.promptVersion,
        ).also(::validateConfiguration)
        val request = AiApplicationPreparationInterpretRequest(
            contractVersion = AI_APPLICATION_PREPARATION_CONTRACT_VERSION,
            preparationId = preparationId,
            inputRevision = snapshot.inputRevision,
            formVersionId = snapshot.formVersionId,
            sectionKey = snapshot.sectionKey,
            serviceField = snapshot.serviceField.name,
            userMessage = snapshot.userMessage,
            currentFacts = snapshot.currentFacts.map { AiApplicationPreparationFactRequest(it.fieldKey, it.status.name, it.value) },
            fieldOptions = section.fields.map { AiApplicationPreparationFieldRequest(it.key, it.label, it.guidance, it.required) },
        )
        val payload = client.interpret(request)
        require(
            payload.contractVersion == configuration.contractVersion && payload.model == configuration.model &&
                payload.promptVersion == configuration.promptVersion && payload.preparationId == preparationId &&
                payload.inputRevision == snapshot.inputRevision && payload.formVersionId == snapshot.formVersionId &&
                payload.sectionKey == snapshot.sectionKey,
        )
        val allowed = section.fields.map { it.key }.toSet()
        require(payload.suggestions.size <= allowed.size && payload.suggestions.map { it.fieldKey }.distinct().size == payload.suggestions.size)
        val suggestions = payload.suggestions.map { suggestion ->
            require(suggestion.fieldKey in allowed && suggestion.evidenceQuote.isNotBlank() && suggestion.evidenceQuote.length <= 1000)
            require(snapshot.userMessage.contains(suggestion.evidenceQuote))
            val status = ApplicationFactStatus.valueOf(suggestion.status)
            require((status == ApplicationFactStatus.PROVIDED && !suggestion.value.isNullOrBlank() && suggestion.value.length <= 2000) ||
                (status == ApplicationFactStatus.UNKNOWN && suggestion.value == null))
            ApplicationFactSuggestion(suggestion.fieldKey, status, suggestion.value?.trim(), suggestion.evidenceQuote)
        }
        require(payload.missingFields.distinct().size == payload.missingFields.size && payload.missingFields.all { it in allowed })
        val answered = snapshot.currentFacts.map { it.fieldKey }.toSet() + suggestions.map { it.fieldKey }
        val expectedMissing = section.fields.filter { it.required && it.key !in answered }.map { it.key }
        require(payload.missingFields == expectedMissing)
        require(
            if (expectedMissing.isEmpty()) payload.nextQuestion == null
            else payload.nextQuestion != null && payload.nextQuestion.isNotBlank() && payload.nextQuestion.length <= 300,
        )
        return ApplicationInterpretation(
            preparationId,
            snapshot.inputRevision,
            snapshot.formVersionId,
            snapshot.sectionKey,
            suggestions,
            payload.missingFields,
            payload.nextQuestion,
            configuration,
        )
    }

    private fun validateConfiguration(configuration: ApplicationInterpretationConfiguration) {
        require(configuration.contractVersion == AI_APPLICATION_PREPARATION_CONTRACT_VERSION)
        require(configuration.model.isNotBlank() && configuration.model.length <= 200)
        require(Regex("sha256:[0-9a-f]{64}").matches(configuration.promptVersion))
    }
}
