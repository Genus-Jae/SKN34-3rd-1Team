package ai.govbiz.core.applicationpreparation.controller

import ai.govbiz.core._common.test.MySqlTestContainerConfig
import ai.govbiz.core.account.domain.NewAccount
import ai.govbiz.core.account.helper.SessionCookieHelper
import ai.govbiz.core.account.repository.AccountRepository
import ai.govbiz.core.account.service.AccountSessionService
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
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.ObjectMapper

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
    private lateinit var owner: Cookie
    private lateinit var other: Cookie
    private var ownerId = 0L

    @BeforeEach
    fun prepareSessions() {
        jdbc.update("DELETE FROM application_preparation")
        val first = newSession()
        ownerId = first.first
        owner = first.second
        other = newSession().second
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

    private fun count(): Int = requireNotNull(jdbc.queryForObject("SELECT COUNT(*) FROM application_preparation", Int::class.java))

    private companion object {
        const val BASE = "/api/v1/application-preparations"
        const val ORIGIN = "http://localhost:5173"
        const val FORM_VERSION = "bizinfo-pbln-000000000118979-innovation-voucher-2026-v1"
    }
}
