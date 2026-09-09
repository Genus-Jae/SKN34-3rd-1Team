package ai.govbiz.core.combinationreview.repository.mapper

import java.time.LocalDateTime
import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param

@Mapper
interface CombinationReviewRunMapper {
    fun lockOwnedReview(@Param("ownerId") ownerId: Long, @Param("reviewId") reviewId: Long): Long?
    fun findRequest(@Param("reviewId") reviewId: Long, @Param("requestKey") requestKey: String): CombinationReviewRunDbRow?
    fun countRunning(@Param("reviewId") reviewId: Long): Int
    fun insertRun(row: CombinationReviewRunDbRow): Int
    fun findOwned(@Param("ownerId") ownerId: Long, @Param("reviewId") reviewId: Long, @Param("runId") runId: Long): CombinationReviewRunDbRow?
    fun listOwned(@Param("ownerId") ownerId: Long, @Param("reviewId") reviewId: Long, @Param("beforeId") beforeId: Long?, @Param("limit") limit: Int): List<CombinationReviewRunDbRow>
    fun saveEvidence(@Param("runId") runId: Long, @Param("evidenceJson") evidenceJson: String): Int
    fun insertSource(row: CombinationReviewRunSourceDbRow): Int
    fun findSource(@Param("ownerId") ownerId: Long, @Param("reviewId") reviewId: Long, @Param("runId") runId: Long, @Param("documentIndex") documentIndex: Int): CombinationReviewRunSourceDbRow?
    fun saveConfiguration(@Param("runId") runId: Long, @Param("configurationJson") configurationJson: String): Int
    fun finish(@Param("runId") runId: Long, @Param("status") status: String, @Param("analysisJson") analysisJson: String?, @Param("failureCode") failureCode: String?, @Param("finishedAt") finishedAt: LocalDateTime): Int
}
