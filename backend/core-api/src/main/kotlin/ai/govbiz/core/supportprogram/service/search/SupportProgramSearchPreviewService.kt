package ai.govbiz.core.supportprogram.service.search

import ai.govbiz.core.supportprogram.domain.SupportProgram
import ai.govbiz.core.supportprogram.domain.SupportProgramCompanyConditions
import ai.govbiz.core.supportprogram.domain.SupportProgramConversationContext
import ai.govbiz.core.supportprogram.facade.SupportProgramRankingFacade
import ai.govbiz.core.supportprogram.service.dto.SupportProgramSearchPreviewResult
import ai.govbiz.core.supportprogram.service.dto.SupportProgramSearchRestoredResult
import ai.govbiz.core.supportprogram.service.search.exception.SupportProgramSearchResultExpiredException
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Service

/** 공개 검색은 익명에게 두 건만 제공하고, 로그인 후 같은 검색 결과를 모델 재호출 없이 복원합니다. */
@Service
class SupportProgramSearchPreviewService(
    private val searchService: SupportProgramSearchService,
    @param:Qualifier("seoulClock") private val clock: Clock,
) {
    private val lock = Any()
    private val savedResults = LinkedHashMap<String, SavedResult>()

    fun search(
        query: String,
        acceptingOnly: Boolean,
        companyConditions: SupportProgramCompanyConditions?,
        accountId: Long?,
    ): SupportProgramSearchPreviewResult {
        // 외부 조회와 모델 호출 동안에는 결과 저장소의 lock을 잡지 않습니다.
        val searched = searchService.search(query, acceptingOnly, companyConditions)
        val programs = java.util.List.copyOf(searched.programs.take(SupportProgramRankingFacade.MAX_RESULTS).map(::copyProgram))
        val full = SupportProgramSearchPreviewResult(searched.query, programs, programs.size)
        if (accountId != null || programs.size <= GUEST_RESULT_LIMIT) return full

        val context = SupportProgramConversationContext(
            searched.query.takeIf(String::isNotBlank), acceptingOnly, companyConditions ?: SupportProgramCompanyConditions(),
        )
        return synchronized(lock) {
            val now = clock.instant()
            removeExpired(now)
            while (savedResults.size >= MAX_SAVED_RESULTS) {
                savedResults.remove(savedResults.keys.first())
            }
            val token = UUID.randomUUID().toString()
            val expiresAt = now.plus(RESULT_TTL)
            savedResults[token] = SavedResult(full, context, expiresAt)
            full.copy(programs = java.util.List.copyOf(programs.take(GUEST_RESULT_LIMIT)), resultToken = token, expiresAt = expiresAt)
        }
    }

    fun restore(resultToken: String, accountId: Long): SupportProgramSearchRestoredResult = synchronized(lock) {
        removeExpired(clock.instant())
        val saved = savedResults[resultToken] ?: throw SupportProgramSearchResultExpiredException()
        if (saved.accountId != null && saved.accountId != accountId) throw SupportProgramSearchResultExpiredException()
        saved.accountId = accountId
        SupportProgramSearchRestoredResult(saved.result, saved.context)
    }

    private fun removeExpired(now: Instant) {
        savedResults.entries.removeIf { !it.value.expiresAt.isAfter(now) }
    }

    /** 내부의 목록까지 고정해 검색 호출자가 가진 컬렉션 변경이 로그인 후 결과에 섞이지 않게 합니다. */
    private fun copyProgram(program: SupportProgram): SupportProgram = program.copy(
        categories = java.util.List.copyOf(program.categories),
        regions = java.util.List.copyOf(program.regions),
        matchedReasons = java.util.List.copyOf(program.matchedReasons),
        eligibilityReview = program.eligibilityReview?.let { review ->
            review.copy(
                target = review.target.copy(evidence = java.util.List.copyOf(review.target.evidence)),
                region = review.region.copy(evidence = java.util.List.copyOf(review.region.evidence)),
            )
        },
    )

    private data class SavedResult(
        val result: SupportProgramSearchPreviewResult,
        val context: SupportProgramConversationContext,
        val expiresAt: Instant,
        var accountId: Long? = null,
    )

    private companion object {
        const val GUEST_RESULT_LIMIT = 2
        const val MAX_SAVED_RESULTS = 128
        val RESULT_TTL: Duration = Duration.ofMinutes(30)
    }
}
