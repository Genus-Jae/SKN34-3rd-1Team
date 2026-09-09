package ai.govbiz.core.partner.controller

import ai.govbiz.core._common.test.MySqlTestContainerConfig
import ai.govbiz.core.account.client.bizno.BiznoClient
import ai.govbiz.core.account.client.bizno.dto.BiznoBusiness
import ai.govbiz.core.account.helper.SessionCookieHelper
import jakarta.servlet.http.Cookie
import java.time.LocalDate
import java.time.ZoneId
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.doReturn
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.ObjectMapper

/**
 * 가입 → 기업 등록 → 모집글 작성 → 상세 조회를 실제 MySQL 8.4에서 확인합니다.
 * 공고는 동기화 없이 support_program에 직접 넣고, 사업자등록번호 조회는 Bizno Client만 대역으로 바꿉니다.
 */
@SpringBootTest(
    properties = [
        "app.account.jwt-secret=test-jwt-secret-0123456789abcdef0123456789",
        "app.ai-service.base-url=http://127.0.0.1:1",
        "app.ai-service.connect-timeout=10ms",
        "app.ai-service.read-timeout=10ms",
        "app.bizinfo.sync.enabled=false",
        "app.support-program-index.enabled=false",
        "app.account.cookie-secure=false",
    ],
)
@AutoConfigureMockMvc
@Import(MySqlTestContainerConfig::class)
class PartnerRecruitmentFlowIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @MockitoBean
    private lateinit var biznoClient: BiznoClient

    private val today: LocalDate = LocalDate.now(ZoneId.of("Asia/Seoul"))

    @BeforeEach
    fun resetRows() {
        jdbcTemplate.update("DELETE FROM partner_recruitment")
        jdbcTemplate.update("DELETE FROM company")
        jdbcTemplate.update("DELETE FROM account_session")
        jdbcTemplate.update("DELETE FROM account")
        jdbcTemplate.update("DELETE FROM support_program WHERE source_code = 'TESTSRC'")
        insertProgram("open-program", today.plusDays(30), present = true)
        insertProgram("closed-program", today.minusDays(1), present = true)
        insertProgram("gone-program", today.plusDays(30), present = false)
        doReturn(listOf(BiznoBusiness("1248100998", "삼성전자(주)", "계속사업자", "01")))
            .`when`(biznoClient).findByBusinessNumber("1248100998")
    }

    @Test
    fun companyMembersCreateOneRecruitmentPerProgramAndAnyoneReadsIt() {
        val member = signUp("member@company.co.kr")
        mockMvc.perform(post("/api/v1/partners/recruitments").cookie(member).origin().json(requestBody()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("COMPANY_REQUIRED"))

        mockMvc.perform(
            post("/api/v1/me/company").cookie(member).origin()
                .json("""{"businessNumber":"124-81-00998","region":"서울특별시","industry":"정보통신업","foundedYear":2021}"""),
        ).andExpect(status().isCreated())

        mockMvc.perform(post("/api/v1/partners/recruitments").cookie(member).origin().json(requestBody(sourceProgramId = "gone-program")))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RECRUITMENT_PROGRAM_NOT_FOUND"))
        mockMvc.perform(post("/api/v1/partners/recruitments").cookie(member).origin().json(requestBody(sourceProgramId = "closed-program")))
            .andExpect(status().isUnprocessableContent())
            .andExpect(jsonPath("$.code").value("RECRUITMENT_PROGRAM_CLOSED"))
        mockMvc.perform(
            post("/api/v1/partners/recruitments").cookie(member).origin()
                .json(requestBody(recruitmentDeadline = today.plusDays(30))),
        )
            .andExpect(status().isUnprocessableContent())
            .andExpect(jsonPath("$.code").value("RECRUITMENT_DEADLINE_NOT_ALLOWED"))
            .andExpect(jsonPath("$.latestAllowedDeadline").value(today.plusDays(29).toString()))
        mockMvc.perform(post("/api/v1/partners/recruitments").cookie(member).origin().json(requestBody(ownRole = "DEMAND")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("REQUEST_VALIDATION_FAILED"))
        mockMvc.perform(post("/api/v1/partners/recruitments").cookie(member).json(requestBody()))
            .andExpect(status().isForbidden())

        val created = mockMvc.perform(post("/api/v1/partners/recruitments").cookie(member).origin().json(requestBody()))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("AI 실증 과제 참여기관 구합니다"))
            .andExpect(jsonPath("$.status").value("OPEN"))
            .andExpect(jsonPath("$.isMine").value(true))
            .andExpect(jsonPath("$.proposalCount").value(0))
            .andExpect(jsonPath("$.capabilities[0]").value("데이터 구축"))
            .andExpect(jsonPath("$.capabilities.length()").value(2))
            .andExpect(jsonPath("$.minimumCompanyAgeYears").value(3))
            .andExpect(jsonPath("$.company.companyName").value("삼성전자(주)"))
            .andExpect(jsonPath("$.company.region").value("서울특별시"))
            .andExpect(jsonPath("$.company.isEmailVerified").value(false))
            .andExpect(jsonPath("$.company.isBusinessVerified").value(true))
            .andExpect(jsonPath("$.program.sourceProgramId").value("open-program"))
            .andExpect(jsonPath("$.program.applicationEndDate").value(today.plusDays(30).toString()))
            .andReturn().response.contentAsString
        val id = objectMapper.readTree(created).get("id").asLong()

        mockMvc.perform(post("/api/v1/partners/recruitments").cookie(member).origin().json(requestBody()))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("RECRUITMENT_ALREADY_EXISTS"))

        mockMvc.perform(get("/api/v1/partners/recruitments/$id"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isMine").value(false))
            .andExpect(jsonPath("$.body").value("라벨링 운영을 맡아 주실 참여기관을 찾습니다."))
            .andExpect(jsonPath("$.company.industry").value("정보통신업"))
        val other = signUp("other@company.co.kr")
        mockMvc.perform(get("/api/v1/partners/recruitments/$id").cookie(other))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isMine").value(false))
        mockMvc.perform(get("/api/v1/partners/recruitments/$id").cookie(member))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isMine").value(true))
        mockMvc.perform(get("/api/v1/partners/recruitments/${id + 1000}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RECRUITMENT_NOT_FOUND"))
    }

    @Test
    fun listFiltersOpenRecruitmentsAndShowsClosedOnesOnlyToTheirOwner() {
        insertProgram("second-program", today.plusDays(40), present = true)
        val lead = signUp("lead@company.co.kr")
        mockMvc.perform(
            post("/api/v1/me/company").cookie(lead).origin()
                .json("""{"businessNumber":"124-81-00998","region":"서울특별시","industry":"정보통신업","foundedYear":2021}"""),
        ).andExpect(status().isCreated())
        doReturn(listOf(BiznoBusiness("2208162517", "네이버 주식회사", "계속사업자", "01")))
            .`when`(biznoClient).findByBusinessNumber("2208162517")
        val participant = signUp("participant@company.co.kr")
        mockMvc.perform(
            post("/api/v1/me/company").cookie(participant).origin()
                .json("""{"businessNumber":"220-81-62517","region":"부산광역시","industry":"제조업","foundedYear":2018}"""),
        ).andExpect(status().isCreated())

        // 서울·참여기관·마감 10일 뒤 (lead), 전국·주관기관·마감 5일 뒤 (participant), 부산·참여기관·오늘 마감 (participant)
        mockMvc.perform(post("/api/v1/partners/recruitments").cookie(lead).origin().json(requestBody()))
            .andExpect(status().isCreated())
        mockMvc.perform(
            post("/api/v1/partners/recruitments").cookie(participant).origin()
                .json(requestBody(sourceProgramId = "open-program", seekingRole = "LEAD", region = "전국", recruitmentDeadline = today.plusDays(5), title = "스마트공장 주관기관 찾습니다")),
        ).andExpect(status().isCreated())
        val closingToday = objectMapper.readTree(
            mockMvc.perform(
                post("/api/v1/partners/recruitments").cookie(participant).origin()
                    .json(requestBody(sourceProgramId = "second-program", region = "부산", recruitmentDeadline = today, title = "오늘 마감 모집")),
            ).andExpect(status().isCreated()).andReturn().response.contentAsString,
        ).get("id").asLong()

        mockMvc.perform(get("/api/v1/partners/recruitments"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.totalPages").value(1))
            .andExpect(jsonPath("$.recruitments[0].title").value("오늘 마감 모집"))
            .andExpect(jsonPath("$.recruitments[1].title").value("스마트공장 주관기관 찾습니다"))
            .andExpect(jsonPath("$.recruitments[2].title").value("AI 실증 과제 참여기관 구합니다"))
            .andExpect(jsonPath("$.recruitments[0].isMine").value(false))
            .andExpect(jsonPath("$.recruitments[0].company.companyName").value("네이버 주식회사"))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("sort", "RECENT"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.recruitments[0].title").value("오늘 마감 모집"))
            .andExpect(jsonPath("$.recruitments[2].title").value("AI 실증 과제 참여기관 구합니다"))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("keyword", "스마트공장"))
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.recruitments[0].seekingRole").value("LEAD"))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("keyword", "네이버"))
            .andExpect(jsonPath("$.total").value(2))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("keyword", "100%"))
            .andExpect(jsonPath("$.total").value(0))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("seekingRole", "PARTICIPANT"))
            .andExpect(jsonPath("$.total").value(2))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("region", "서울"))
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.recruitments[0].region").value("전국"))
            .andExpect(jsonPath("$.recruitments[1].region").value("서울"))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("region", "전국"))
            .andExpect(jsonPath("$.total").value(1))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("page", "2").param("pageSize", "2"))
            .andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.totalPages").value(2))
            .andExpect(jsonPath("$.recruitments.length()").value(1))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("pageSize", "51"))
            .andExpect(status().isBadRequest())

        mockMvc.perform(get("/api/v1/partners/recruitments").param("mine", "true"))
            .andExpect(status().isUnauthorized())
        mockMvc.perform(get("/api/v1/partners/recruitments").param("mine", "true").cookie(lead))
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.recruitments[0].isMine").value(true))

        // 어제로 마감된 글은 공개 목록에서 빠지고 내 글 목록에는 마감 상태로 남습니다.
        jdbcTemplate.update("UPDATE partner_recruitment SET recruitment_deadline = ? WHERE id = ?", today.minusDays(1), closingToday)
        mockMvc.perform(get("/api/v1/partners/recruitments"))
            .andExpect(jsonPath("$.total").value(2))
        mockMvc.perform(get("/api/v1/partners/recruitments").param("mine", "true").cookie(participant))
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.recruitments[?(@.title == '오늘 마감 모집')].status").value("CLOSED"))
    }

    private fun requestBody(
        sourceProgramId: String = "open-program",
        ownRole: String = "LEAD",
        seekingRole: String = "PARTICIPANT",
        region: String = "서울",
        title: String = " AI 실증 과제 참여기관 구합니다 ",
        recruitmentDeadline: LocalDate = today.plusDays(10),
    ): String =
        """
        {
          "sourceCode": "TESTSRC",
          "sourceProgramId": "$sourceProgramId",
          "title": "$title",
          "body": "라벨링 운영을 맡아 주실 참여기관을 찾습니다.",
          "ownRole": "$ownRole",
          "seekingRole": "$seekingRole",
          "seekingCount": 1,
          "region": "$region",
          "minimumCompanyAgeYears": 3,
          "capabilities": ["데이터 구축", "라벨링", "데이터 구축"],
          "recruitmentDeadline": "$recruitmentDeadline"
        }
        """.trimIndent()

    private fun insertProgram(sourceProgramId: String, applicationEndDate: LocalDate, present: Boolean) {
        jdbcTemplate.update(
            """
            INSERT INTO support_program (
                source_code, source_program_id, title, organization, summary, categories, regions,
                target_description, application_period_raw, application_start_date, application_end_date,
                source_url, is_source_present
            ) VALUES ('TESTSRC', ?, '서울 AI 스타트업 실증 지원사업', '서울경제진흥원', '실증 과제를 지원합니다.', '["기술"]', '["서울"]',
                '서울 소재 AI 기업', ?, ?, ?, 'https://www.bizinfo.go.kr', ?)
            """.trimIndent(),
            sourceProgramId,
            "${applicationEndDate.minusDays(60)} ~ $applicationEndDate",
            applicationEndDate.minusDays(60),
            applicationEndDate,
            present,
        )
    }

    private fun signUp(email: String): Cookie {
        val response = mockMvc.perform(
            post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"email":"$email","password":"password1"}"""),
        )
            .andExpect(status().isCreated())
            .andReturn().response
        return requireNotNull(response.getCookie(SessionCookieHelper.COOKIE_NAME))
    }

    private fun MockHttpServletRequestBuilder.origin() = header(HttpHeaders.ORIGIN, "http://localhost:5173")

    private fun MockHttpServletRequestBuilder.json(body: String) = contentType(MediaType.APPLICATION_JSON).content(body)
}
