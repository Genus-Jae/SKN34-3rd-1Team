package ai.govbiz.core.supportprogram.service.catalog

import ai.govbiz.core.supportprogram.domain.CatalogSupportProgram
import ai.govbiz.core.supportprogram.domain.SupportProgramCatalogSort
import ai.govbiz.core.supportprogram.domain.SupportProgramStatus
import ai.govbiz.core.supportprogram.repository.SupportProgramRepository
import ai.govbiz.core.supportprogram.service.dto.SupportProgramCatalogResult
import org.springframework.stereotype.Service

/** 공개된 DB 공고를 명시적인 조건으로 조회하며 AI 검색이나 자격 판정을 실행하지 않습니다. */
@Service
class SupportProgramCatalogService(
    private val repository: SupportProgramRepository,
) {
    fun browse(
        rawKeyword: String = "",
        rawRegion: String = "",
        rawCategory: String = "",
        status: SupportProgramStatus? = SupportProgramStatus.OPEN,
        sort: SupportProgramCatalogSort = SupportProgramCatalogSort.RECENT,
        page: Int = 1,
        pageSize: Int = 12,
    ): SupportProgramCatalogResult {
        require(page in 1..1_000_000 && pageSize in 1..50) { "invalid catalog pagination" }
        val keyword = rawKeyword.trim()
        val region = rawRegion.trim()
        val category = rawCategory.trim()
        // 상태는 Repository가 서울 기준 현재 날짜로 계산합니다. 이후 색인 장애가 생겨도 공개 목록은 읽습니다.
        val snapshot = repository.findPublishedPresent()
        val filtered = snapshot.filter { candidate ->
            val program = candidate.program
            (keyword.isEmpty() || program.title.contains(keyword, ignoreCase = true) ||
                program.organization.contains(keyword, ignoreCase = true)) &&
                (region.isEmpty() || region in program.regions) &&
                (category.isEmpty() || category in program.categories) &&
                (status == null || program.status == status)
        }
        val recentOrder = compareByDescending<CatalogSupportProgram> { it.sortTimestamp.takeIf(String::isNotBlank) }
            .thenBy { it.program.sourceCode }
            .thenBy { it.program.id }
        val order = when (sort) {
            SupportProgramCatalogSort.RECENT -> recentOrder
            SupportProgramCatalogSort.DEADLINE -> compareBy<CatalogSupportProgram> { it.program.applicationEndDate == null }
                .thenBy { it.program.applicationEndDate }
                .then(recentOrder)
        }
        val total = filtered.size
        val programs = filtered.sortedWith(order)
            .drop((page - 1) * pageSize)
            .take(pageSize)
            .map { it.program.copy(matchedReasons = emptyList(), recommendationScore = null, eligibilityReview = null) }

        return SupportProgramCatalogResult(
            programs = java.util.List.copyOf(programs),
            total = total,
            page = page,
            pageSize = pageSize,
            totalPages = if (total == 0) 0 else (total - 1) / pageSize + 1,
            // 필터·페이지로 선택지가 사라지지 않도록 같은 전체 스냅샷에서 계산합니다.
            regions = snapshot.flatMap { it.program.regions }.filter(String::isNotBlank).distinct().sorted(),
            categories = snapshot.flatMap { it.program.categories }.filter(String::isNotBlank).distinct().sorted(),
        )
    }
}
