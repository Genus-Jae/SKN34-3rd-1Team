package ai.govbiz.core.supportprogram.service.search

import ai.govbiz.core.supportprogram.domain.*
import ai.govbiz.core.supportprogram.service.dto.SupportProgramSearchResult
import ai.govbiz.core.supportprogram.service.search.exception.SupportProgramSearchResultExpiredException
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mockito

class SupportProgramSearchPreviewServiceTest {
    private val search = Mockito.mock(SupportProgramSearchService::class.java)
    private val clock = MutableClock(Instant.parse("2026-09-10T03:00:00Z"))
    private val service = SupportProgramSearchPreviewService(search, clock)
    private val conditions = SupportProgramCompanyConditions("대구", "무역", LocalDate.parse("2020-01-02"), "수출")

    private fun stub(programs: List<SupportProgram>, query: String = "무역 지원", acceptingOnly: Boolean = false,
                     conditions: SupportProgramCompanyConditions? = this.conditions) {
        Mockito.`when`(search.search(query, acceptingOnly, conditions)).thenReturn(SupportProgramSearchResult(query.trim(), programs))
    }

    @Test
    fun guestReceivesOnlyTwoAndTheSameAccountCanRestoreTheExactFiveWithoutAnotherSearch() {
        val programs = (1..5).map(::program)
        stub(programs)
        val preview = service.search("무역 지원", false, conditions, null)
        assertEquals(programs.take(2), preview.programs)
        assertEquals(5, preview.totalCount)
        assertEquals(clock.instant().plus(Duration.ofMinutes(30)), preview.expiresAt)
        assertEquals(preview.resultToken, UUID.fromString(preview.resultToken).toString())
        val restored = service.restore(requireNotNull(preview.resultToken), 10L)
        assertEquals(programs, restored.result.programs)
        assertEquals(5, restored.result.totalCount)
        assertNull(restored.result.resultToken)
        assertNull(restored.result.expiresAt)
        assertEquals(SupportProgramConversationContext("무역 지원", false, conditions), restored.context)
        assertEquals(restored, service.restore(preview.resultToken, 10L))
        assertThrows(SupportProgramSearchResultExpiredException::class.java) { service.restore(preview.resultToken, 11L) }
        assertEquals(restored, service.restore(preview.resultToken, 10L))
        Mockito.verify(search, Mockito.times(1)).search("무역 지원", false, conditions)
    }

    @ParameterizedTest
    @ValueSource(ints = [0, 1, 2])
    fun guestResultsWithoutHiddenProgramsDoNotCreateTokens(count: Int) {
        val programs = (1..count).map(::program)
        stub(programs)
        val result = service.search("무역 지원", false, conditions, null)
        assertEquals(programs, result.programs)
        assertEquals(count, result.totalCount)
        assertNull(result.resultToken)
        assertNull(result.expiresAt)
    }

    @Test
    fun authenticatedSearchReturnsUpToFiveWithoutAResultToken() {
        stub((1..6).map(::program))
        val result = service.search("무역 지원", false, conditions, 1L)
        assertEquals((1..5).map(::program), result.programs)
        assertEquals(5, result.totalCount)
        assertNull(result.resultToken)
        assertNull(result.expiresAt)
    }

    @Test
    fun thirtyMinuteExpiryIsFixedEvenAfterAClaimAndUnknownTokensDoNotSearch() {
        stub((1..5).map(::program))
        val token = requireNotNull(service.search("무역 지원", false, conditions, null).resultToken)
        clock.advance(Duration.ofMinutes(29))
        service.restore(token, 1L)
        clock.advance(Duration.ofMinutes(1))
        assertThrows(SupportProgramSearchResultExpiredException::class.java) { service.restore(token, 1L) }
        assertThrows(SupportProgramSearchResultExpiredException::class.java) { service.restore(UUID.randomUUID().toString(), 1L) }
        Mockito.verify(search, Mockito.times(1)).search("무역 지원", false, conditions)
    }

    @Test
    fun capacityEvictsOnlyTheOldestResultAndDoesNotReuseTokens() {
        stub((1..5).map(::program))
        val tokens = (1..129).map { requireNotNull(service.search("무역 지원", false, conditions, null).resultToken) }
        assertEquals(129, tokens.toSet().size)
        assertThrows(SupportProgramSearchResultExpiredException::class.java) { service.restore(tokens.first(), 1L) }
        assertEquals(5, service.restore(tokens[1], 1L).result.programs.size)
        assertEquals(5, service.restore(tokens.last(), 1L).result.programs.size)
    }

    @Test
    fun emptyGetQueryRestoresAsNullConversationIntentAndKeepsTheFilter() {
        stub((1..3).map(::program), query = "  ", acceptingOnly = true, conditions = null)
        val preview = service.search("  ", true, null, null)
        val restored = service.restore(requireNotNull(preview.resultToken), 1L)
        assertEquals("", restored.result.query)
        assertEquals(SupportProgramConversationContext(null, true, SupportProgramCompanyConditions()), restored.context)
    }

    @Test
    fun savedResultsDoNotChangeWhenTheSearchCallerMutatesNestedCollections() {
        val categories = mutableListOf("무역")
        val regions = mutableListOf("대구")
        val reasons = mutableListOf("수출 지원")
        val evidence = mutableListOf(SupportProgramEligibilityEvidence(SupportProgramEligibilityEvidenceField.SUMMARY, "수출 지원"))
        val assessment = SupportProgramEligibilityAssessment(SupportProgramEligibilityStatus.MATCH, "확인", evidence)
        val original = program(1).copy(categories = categories, regions = regions, matchedReasons = reasons,
            eligibilityReview = SupportProgramEligibilityReview(SupportProgramEligibilityReviewStatus.MATCH, assessment, assessment))
        val programs = mutableListOf(original, program(2), program(3))
        stub(programs)
        val token = requireNotNull(service.search("무역 지원", false, conditions, null).resultToken)
        programs.clear(); categories.clear(); regions.clear(); reasons.clear(); evidence.clear()
        val restored = service.restore(token, 1L).result.programs
        assertEquals(3, restored.size)
        assertEquals(listOf("무역"), restored[0].categories)
        assertEquals(listOf("대구"), restored[0].regions)
        assertEquals(listOf("수출 지원"), restored[0].matchedReasons)
        assertEquals(1, restored[0].eligibilityReview!!.target.evidence.size)
        assertThrows(UnsupportedOperationException::class.java) { (restored as MutableList<*>).clear() }
    }

    @Test
    fun simultaneousFirstClaimsAreOwnedByExactlyOneAccount() {
        stub((1..5).map(::program))
        val token = requireNotNull(service.search("무역 지원", false, conditions, null).resultToken)
        val start = CountDownLatch(1)
        val pool = Executors.newFixedThreadPool(2)
        try {
            val attempts = listOf(1L, 2L).map { id -> pool.submit<Boolean> {
                start.await()
                try { service.restore(token, id); true } catch (_: SupportProgramSearchResultExpiredException) { false }
            } }
            start.countDown()
            assertEquals(1, attempts.count { it.get(5, TimeUnit.SECONDS) })
        } finally {
            pool.shutdownNow()
        }
    }

    private fun program(index: Int) = SupportProgram(
        id = "program-$index", sourceCode = "BIZINFO", title = "공고 $index", organization = "기관",
        summary = "무역 지원 $index", categories = listOf("수출"), regions = listOf("대구"), targetDescription = "중소기업",
        applicationPeriod = "상시 접수", applicationStartDate = null, applicationEndDate = null,
        status = SupportProgramStatus.OPEN, sourceName = "기업마당", sourceUrl = "https://example.invalid/$index",
        matchedReasons = listOf("추천 $index"), recommendationScore = 100 - index,
    )

    private class MutableClock(private var now: Instant) : Clock() {
        override fun getZone(): ZoneId = ZoneOffset.UTC
        override fun withZone(zone: ZoneId): Clock = this
        override fun instant(): Instant = now
        fun advance(duration: Duration) { now = now.plus(duration) }
    }
}
