package ai.govbiz.core.applicationpreparation.controller

import ai.govbiz.core._common.test.MySqlTestContainerConfig
import ai.govbiz.core.account.domain.NewAccount
import ai.govbiz.core.account.helper.SessionCookieHelper
import ai.govbiz.core.account.repository.AccountRepository
import ai.govbiz.core.account.service.AccountSessionService
import ai.govbiz.core.applicationpreparation.client.ai.AiApplicationPreparationClient
import ai.govbiz.core.applicationpreparation.client.ai.dto.AI_APPLICATION_PREPARATION_CONTRACT_VERSION
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationConfigurationPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationInterpretPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationInterpretRequest
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationSuggestionPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationFormDiscoveryPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationFormDiscoveryRequest
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiDiscoveredApplicationFormFieldPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiDiscoveredApplicationFormPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiDiscoveredApplicationFormSectionPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AI_APPLICATION_FORM_DISCOVERY_CONTRACT_VERSION
import ai.govbiz.core.supportprogram.client.bizinfo.BizInfoAttachmentClient
import ai.govbiz.core.supportprogram.client.document.SupportProgramAttachment
import ai.govbiz.core.supportprogram.client.document.SupportProgramAttachments
import ai.govbiz.core.supportprogram.client.document.SupportProgramDocumentBlock
import ai.govbiz.core.supportprogram.client.document.SupportProgramDocumentParser
import ai.govbiz.core.supportprogram.domain.SupportProgram
import ai.govbiz.core.supportprogram.domain.SupportProgramStatus
import ai.govbiz.core.supportprogram.service.detail.SupportProgramDetailService
import jakarta.servlet.http.Cookie
import java.time.LocalDateTime
import java.util.UUID
import org.hamcrest.Matchers.endsWith
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.ObjectMapper
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.`when`
import org.mockito.Mockito.times
import org.mockito.Mockito.verify

/** 실제 세션부터 manifest·MyBatis·MySQL까지 신청 준비 기본 흐름을 연결합니다. */
@SpringBootTest(properties = [
    "app.account.jwt-secret=test-jwt-secret-0123456789abcdef0123456789",
    "app.ai-service.base-url=http://127.0.0.1:1",
    "app.bizinfo.sync.enabled=false",
    "app.support-program-index.enabled=false",
    "app.account.cookie-secure=false",
])
@AutoConfigureMockMvc
@Import(MySqlTestContainerConfig::class)
class ApplicationPreparationApiIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc
    @Autowired private lateinit var accounts: AccountRepository
    @Autowired private lateinit var sessions: AccountSessionService
    @Autowired private lateinit var jdbc: JdbcTemplate
    @Autowired private lateinit var json: ObjectMapper
    @MockitoBean private lateinit var ai: AiApplicationPreparationClient
    @MockitoBean private lateinit var details: SupportProgramDetailService
    @MockitoBean private lateinit var attachments: BizInfoAttachmentClient
    @MockitoBean private lateinit var documentParser: SupportProgramDocumentParser
    private lateinit var owner: Cookie
    private lateinit var other: Cookie
    private var ownerId = 0L

    @BeforeEach
    fun prepareSessions() {
        jdbc.update("DELETE FROM application_preparation")
        jdbc.update("DELETE FROM application_form_snapshot")
        val first = newSession()
        ownerId = first.first
        owner = first.second
        other = newSession().second
        `when`(ai.configuration()).thenReturn(
            AiApplicationPreparationConfigurationPayload(AI_APPLICATION_PREPARATION_CONTRACT_VERSION, "test-model", PROMPT_VERSION),
        )
        `when`(ai.discoveryConfiguration()).thenReturn(
            AiApplicationPreparationConfigurationPayload(AI_APPLICATION_FORM_DISCOVERY_CONTRACT_VERSION, "test-model", DISCOVERY_PROMPT_VERSION),
        )
        `when`(ai.interpret(any(AiApplicationPreparationInterpretRequest::class.java) ?: fallbackAiRequest())).thenAnswer { invocation ->
            val request = invocation.getArgument<AiApplicationPreparationInterpretRequest>(0)
            AiApplicationPreparationInterpretPayload(
                AI_APPLICATION_PREPARATION_CONTRACT_VERSION,
                "test-model",
                PROMPT_VERSION,
                request.preparationId,
                request.inputRevision,
                request.formVersionId,
                request.sectionKey,
                listOf(AiApplicationPreparationSuggestionPayload("company-name", "PROVIDED", "새봄테크", "업체명은 새봄테크")),
                listOf("contact-person", "company-history", "main-products", "main-customers"),
                "신청 업무 담당자의 이름과 역할은 무엇인가요?",
            )
        }
        val program = SupportProgram(
            DISCOVERY_PROGRAM_ID, "BIZINFO", "동적 지원사업", "지원기관", "공고 요약", emptyList(), emptyList(),
            "중소기업", "2026-01-01 ~ 2026-12-31", null, null, SupportProgramStatus.OPEN,
            "기업마당", "https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=$DISCOVERY_PROGRAM_ID",
            emptyList(),
        )
        val bytes = "official-form".toByteArray()
        `when`(details.get("BIZINFO", DISCOVERY_PROGRAM_ID)).thenReturn(program)
        `when`(attachments.collect("BIZINFO", DISCOVERY_PROGRAM_ID)).thenReturn(
            SupportProgramAttachments(
                program.title,
                listOf(SupportProgramAttachment("https://www.bizinfo.go.kr/cmm/fms/fileDown.do?atchFileId=FILE_1&fileSn=1", "사업계획서.hwpx", "HWPX", bytes)),
                listOf("원문 대조 필요"),
            ),
        )
        `when`(documentParser.parse(bytes, "HWPX")).thenReturn(
            listOf(SupportProgramDocumentBlock("HWPX section0 paragraphs 1-3", "사업 개요를 작성해 주세요.")),
        )
        `when`(ai.discover(any(AiApplicationFormDiscoveryRequest::class.java) ?: fallbackDiscoveryRequest())).thenReturn(
            AiApplicationFormDiscoveryPayload(
                AI_APPLICATION_FORM_DISCOVERY_CONTRACT_VERSION,
                "test-model",
                DISCOVERY_PROMPT_VERSION,
                listOf(AiDiscoveredApplicationFormPayload(0, listOf(
                    AiDiscoveredApplicationFormSectionPayload("business-plan", "사업 계획", "사업 개요를 작성합니다.", listOf(
                        AiDiscoveredApplicationFormFieldPayload(
                            "business-overview", "사업 개요", "사업의 목적과 내용을 입력합니다.", true,
                            "D0-B0", "사업 개요",
                        ),
                    )),
                ))),
            ),
        )
    }

    @Test
    fun listsTheVerifiedFormWithoutCreatingAPreparation() {
        mvc.perform(get("$BASE/forms").cookie(owner))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].sourceProgramId").value("PBLN_000000000118979"))
            .andExpect(jsonPath("$.items[0].verificationStatus").value("SOURCE_HASH_AND_LOCATORS_VERIFIED"))
            .andExpect(jsonPath("$.items[0].institutionReviewed").value(false))
            .andExpect(jsonPath("$.items[0].sections.length()").value(3))
            .andExpect(jsonPath("$.items[0].sections[0].status").value("NOT_STARTED"))
        assertEquals(0, count())
    }

    @Test
    fun discoversAnOfficialFormPersistsTheSnapshotAndCreatesAPreparationFromIt() {
        val response = mvc.perform(post("$BASE/forms/discover").cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"sourceCode":"BIZINFO","sourceProgramId":"$DISCOVERY_PROGRAM_ID"}"""))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.cached").value(false))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].verificationStatus").value("SOURCE_DOCUMENT_EXTRACTED"))
            .andExpect(jsonPath("$.items[0].supportedServiceFields[0]").value("GENERAL"))
            .andExpect(jsonPath("$.items[0].sections[0].fields[0].label").value("사업 개요"))
            .andReturn().response
        val formVersionId = json.readTree(response.contentAsString).path("items").path(0).path("formVersionId").asString()
        mvc.perform(post(BASE).cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN).contentType(MediaType.APPLICATION_JSON)
            .content("""{"sourceCode":"BIZINFO","sourceProgramId":"$DISCOVERY_PROGRAM_ID","formVersionId":"$formVersionId","serviceField":"GENERAL"}"""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.form.formVersionId").value(formVersionId))
            .andExpect(jsonPath("$.form.sections[0].fields[0].key").value("business-overview"))
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM application_form_snapshot WHERE form_version_id = ?", Int::class.java, formVersionId))

        mvc.perform(post("$BASE/forms/discover").cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"sourceCode":"BIZINFO","sourceProgramId":"$DISCOVERY_PROGRAM_ID"}"""))
            .andExpect(status().isOk()).andExpect(jsonPath("$.cached").value(true))
        verify(attachments, times(2)).collect("BIZINFO", DISCOVERY_PROGRAM_ID)
        verify(ai, times(1)).discover(any(AiApplicationFormDiscoveryRequest::class.java) ?: fallbackDiscoveryRequest())
    }

    @Test
    fun createsAndReadsAnOwnedPreparationWithoutCallingAi() {
        val response = mvc.perform(post(BASE).cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON).content(payload()))
            .andExpect(status().isCreated())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.inputRevision").value(1))
            .andExpect(jsonPath("$.serviceField").value("TECHNICAL_SUPPORT"))
            .andExpect(jsonPath("$.form.sections.length()").value(3))
            .andExpect(jsonPath("$.ownerAccountId").doesNotExist())
            .andExpect(jsonPath("$.createdAt", endsWith("+09:00")))
            .andReturn().response
        val id = json.readTree(response.contentAsString).path("id").asLong()
        assertEquals("$BASE/$id", response.getHeader(HttpHeaders.LOCATION))
        assertEquals(ownerId, jdbc.queryForObject("SELECT owner_account_id FROM application_preparation WHERE id = ?", Long::class.java, id))
        mvc.perform(get("$BASE/$id").cookie(owner)).andExpect(status().isOk()).andExpect(content().json(response.contentAsString))
        mvc.perform(get("$BASE/$id").cookie(other)).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("APPLICATION_PREPARATION_NOT_FOUND"))
    }

    @Test
    fun paginatesOnlyOwnedPreparations() {
        val oldest = create(owner)
        create(other)
        val middle = create(owner, "CONSULTING")
        val newest = create(owner, "MARKETING")
        mvc.perform(get(BASE).cookie(owner).param("size", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(newest))
            .andExpect(jsonPath("$.items[1].id").value(middle))
            .andExpect(jsonPath("$.nextBeforeId").value(middle))
            .andExpect(jsonPath("$.items[0].form").doesNotExist())
        mvc.perform(get(BASE).cookie(owner).param("size", "2").param("beforeId", middle.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(oldest))
            .andExpect(jsonPath("$.nextBeforeId").isEmpty())
    }

    @Test
    fun rejectsUnsupportedOrInvalidSelectionsBeforeWriting() {
        for (body in listOf(
            payload().replace("PBLN_000000000118979", "PBLN_999"),
            payload().replace(FORM_VERSION, "other-form-v1"),
        )) {
            mvc.perform(post(BASE).cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("APPLICATION_FORM_NOT_SUPPORTED"))
        }
        for (body in listOf(
            "{}",
            "{",
            payload().replace("BIZINFO", " BIZINFO"),
            payload().replace("TECHNICAL_SUPPORT", "UNKNOWN"),
            payload().replace(FORM_VERSION, "잘못된"),
        )) {
            mvc.perform(post(BASE).cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("REQUEST_VALIDATION_FAILED"))
        }
        assertEquals(0, count())
    }

    @Test
    fun requiresAnActiveSessionAndAnAllowedOrigin() {
        mvc.perform(get(BASE)).andExpect(status().isUnauthorized())
        mvc.perform(get("$BASE/forms")).andExpect(status().isUnauthorized())
        mvc.perform(post(BASE).cookie(owner).contentType(MediaType.APPLICATION_JSON).content(payload()))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("SESSION_ORIGIN_REJECTED"))
        mvc.perform(post(BASE).cookie(owner).header(HttpHeaders.ORIGIN, "https://evil.example")
            .contentType(MediaType.APPLICATION_JSON).content(payload()))
            .andExpect(status().isForbidden())
        assertEquals(0, count())
    }

    @Test
    fun interpretsWithoutSavingAndThenStoresOnlyUserConfirmedFacts() {
        val id = create(owner)
        val requestKey = "0a504895-77bd-4d34-bc61-3e6d12389042"
        val message = "업체명은 새봄테크입니다."
        mvc.perform(post("$BASE/$id/sections/company-overview/messages").cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"expectedRevision":1,"requestKey":"$requestKey","message":"$message"}"""))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.inputRevision").value(1))
            .andExpect(jsonPath("$.suggestions[0].fieldKey").value("company-name"))
            .andExpect(jsonPath("$.suggestions[0].value").value("새봄테크"))
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM application_preparation_fact", Int::class.java))
        assertEquals("SUCCEEDED", jdbc.queryForObject(
            "SELECT run_status FROM application_preparation_interpretation_run WHERE preparation_id = ?",
            String::class.java,
            id,
        ))
        assertEquals("새봄테크", jdbc.queryForObject(
            "SELECT JSON_UNQUOTE(JSON_EXTRACT(output_json, '${'$'}.suggestions[0].value')) FROM application_preparation_interpretation_run WHERE preparation_id = ?",
            String::class.java,
            id,
        ))

        mvc.perform(put("$BASE/$id/sections/company-overview/inputs").cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"expectedRevision":1,"facts":[
                {"fieldKey":"company-name","status":"PROVIDED","value":"새봄테크 & 연구소","sourceText":"$message"},
                {"fieldKey":"contact-person","status":"UNKNOWN","value":null,"sourceText":"담당자는 아직 미정입니다."}
            ]}"""))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.inputRevision").value(2))
            .andExpect(jsonPath("$.form.sections[0].status").value("IN_PROGRESS"))
            .andExpect(jsonPath("$.form.sections[0].facts[0].value").value("새봄테크 & 연구소"))
            .andExpect(jsonPath("$.form.sections[0].facts[1].status").value("UNKNOWN"))

        mvc.perform(put("$BASE/$id/sections/company-overview/inputs").cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"expectedRevision":1,"facts":[]}"""))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("APPLICATION_PREPARATION_REVISION_CONFLICT"))
        mvc.perform(post("$BASE/$id/sections/company-overview/messages").cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"expectedRevision":1,"requestKey":"$requestKey","message":"$message"}"""))
            .andExpect(status().isOk()).andExpect(jsonPath("$.inputRevision").value(1))
        verify(ai, times(1)).interpret(any(AiApplicationPreparationInterpretRequest::class.java) ?: fallbackAiRequest())
    }

    @Test
    fun rejectsUnsupportedFieldsSectionsAndOtherOwnersWithoutWriting() {
        val id = create(owner)
        mvc.perform(put("$BASE/$id/sections/company-overview/inputs").cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"expectedRevision":1,"facts":[{"fieldKey":"invented","status":"PROVIDED","value":"값","sourceText":"원문"}]}"""))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("REQUEST_VALIDATION_FAILED"))
        mvc.perform(post("$BASE/$id/sections/not-supported/messages").cookie(owner).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"expectedRevision":1,"requestKey":"0a504895-77bd-4d34-bc61-3e6d12389042","message":"답변"}"""))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("APPLICATION_PREPARATION_SECTION_NOT_FOUND"))
        mvc.perform(put("$BASE/$id/sections/company-overview/inputs").cookie(other).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON).content("""{"expectedRevision":1,"facts":[]}"""))
            .andExpect(status().isNotFound())
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM application_preparation_fact", Int::class.java))
    }

    private fun create(session: Cookie, field: String = "TECHNICAL_SUPPORT"): Long {
        val response = mvc.perform(post(BASE).cookie(session).header(HttpHeaders.ORIGIN, ORIGIN)
            .contentType(MediaType.APPLICATION_JSON).content(payload(field)))
            .andExpect(status().isCreated()).andReturn().response
        return json.readTree(response.contentAsString).path("id").asLong()
    }

    private fun newSession(): Pair<Long, Cookie> {
        val account = accounts.createAccount(NewAccount("${UUID.randomUUID()}@example.test", "test-hash", LocalDateTime.now()))
        val issued = sessions.issue(account.id, false)
        accounts.createSession(account.id, issued.session)
        return account.id to Cookie(SessionCookieHelper.COOKIE_NAME, issued.sessionToken)
    }

    private fun payload(field: String = "TECHNICAL_SUPPORT") =
        """{"sourceCode":"BIZINFO","sourceProgramId":"PBLN_000000000118979","formVersionId":"$FORM_VERSION","serviceField":"$field"}"""

    private fun fallbackAiRequest() = AiApplicationPreparationInterpretRequest(
        AI_APPLICATION_PREPARATION_CONTRACT_VERSION,
        1,
        1,
        FORM_VERSION,
        "company-overview",
        "TECHNICAL_SUPPORT",
        "답변",
        emptyList(),
        emptyList(),
    )

    private fun fallbackDiscoveryRequest() = AiApplicationFormDiscoveryRequest(
        AI_APPLICATION_FORM_DISCOVERY_CONTRACT_VERSION,
        "BIZINFO",
        DISCOVERY_PROGRAM_ID,
        "동적 지원사업",
        emptyList(),
    )

    private fun count(): Int = requireNotNull(jdbc.queryForObject("SELECT COUNT(*) FROM application_preparation", Int::class.java))

    private companion object {
        const val BASE = "/api/v1/application-preparations"
        const val ORIGIN = "http://localhost:5173"
        const val FORM_VERSION = "bizinfo-pbln-000000000118979-innovation-voucher-2026-v1"
        const val PROMPT_VERSION = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        const val DISCOVERY_PROMPT_VERSION = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        const val DISCOVERY_PROGRAM_ID = "PBLN_123456"
    }
}
