package ai.govbiz.core.applicationpreparation.facade

import ai.govbiz.core._common.exception.AiServiceCallException
import ai.govbiz.core._common.exception.AiServiceFailure
import ai.govbiz.core.applicationpreparation.client.ai.AiApplicationPreparationClient
import ai.govbiz.core.applicationpreparation.client.ai.dto.AI_APPLICATION_PREPARATION_CONTRACT_VERSION
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationConfigurationPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationInterpretPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationInterpretRequest
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationSuggestionPayload
import ai.govbiz.core.applicationpreparation.domain.ApplicationFormFieldDefinition
import ai.govbiz.core.applicationpreparation.domain.ApplicationFormManifest
import ai.govbiz.core.applicationpreparation.domain.ApplicationFormSectionDefinition
import ai.govbiz.core.applicationpreparation.domain.ApplicationInterpretationInputSnapshot
import ai.govbiz.core.applicationpreparation.domain.ApplicationServiceField
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`

class AiApplicationPreparationFacadeTest {
    private val client = mock(AiApplicationPreparationClient::class.java)
    private val facade = AiApplicationPreparationFacade(client)
    private val configuration = AiApplicationPreparationConfigurationPayload(
        AI_APPLICATION_PREPARATION_CONTRACT_VERSION,
        "test-model",
        "sha256:${"a".repeat(64)}",
    )
    private val snapshot = ApplicationInterpretationInputSnapshot(
        1,
        "verified-form-v1",
        "company-overview",
        ApplicationServiceField.TECHNICAL_SUPPORT,
        "업체명은 새봄테크입니다.",
        emptyList(),
    )

    @BeforeEach
    fun prepare() {
        `when`(client.configuration()).thenReturn(configuration)
    }

    @Test
    fun acceptsOnlyAllowedSuggestionsBackedByAnExactUserQuote() {
        `when`(client.interpret(any(AiApplicationPreparationInterpretRequest::class.java) ?: fallback())).thenReturn(payload())
        val result = facade.interpret(3, form(), snapshot)
        assertEquals("company-name", result.suggestions.single().fieldKey)
        assertEquals("새봄테크", result.suggestions.single().value)
    }

    @Test
    fun rejectsInventedEvidenceAsAnInvalidAiResponse() {
        `when`(client.interpret(any(AiApplicationPreparationInterpretRequest::class.java) ?: fallback())).thenReturn(
            payload().copy(suggestions = listOf(AiApplicationPreparationSuggestionPayload(
                "company-name", "PROVIDED", "다른 회사", "사용자가 말하지 않은 문장",
            ))),
        )
        val error = assertThrows(AiServiceCallException::class.java) { facade.interpret(3, form(), snapshot) }
        assertEquals(AiServiceFailure.INVALID_RESPONSE, error.failure)
    }

    private fun payload() = AiApplicationPreparationInterpretPayload(
        AI_APPLICATION_PREPARATION_CONTRACT_VERSION,
        "test-model",
        configuration.promptVersion,
        3,
        1,
        "verified-form-v1",
        "company-overview",
        listOf(AiApplicationPreparationSuggestionPayload("company-name", "PROVIDED", "새봄테크", "업체명은 새봄테크")),
        emptyList(),
        null,
    )

    private fun form() = ApplicationFormManifest(
        1,
        "verified-form-v1",
        "BIZINFO",
        "PBLN_1",
        "지원사업",
        "사업계획서",
        "https://www.bizinfo.go.kr/form",
        "form.hwpx",
        1,
        "a".repeat(64),
        "SOURCE_HASH_AND_LOCATORS_VERIFIED",
        false,
        listOf(ApplicationServiceField.TECHNICAL_SUPPORT),
        listOf(ApplicationFormSectionDefinition(
            "company-overview",
            "기업 개요",
            "문단 1",
            "기업을 설명합니다.",
            listOf(ApplicationFormFieldDefinition("company-name", "업체명", "업체명을 입력합니다.", true)),
        )),
    )

    private fun fallback() = AiApplicationPreparationInterpretRequest(
        AI_APPLICATION_PREPARATION_CONTRACT_VERSION,
        3,
        1,
        "verified-form-v1",
        "company-overview",
        "TECHNICAL_SUPPORT",
        "답변",
        emptyList(),
        emptyList(),
    )
}
