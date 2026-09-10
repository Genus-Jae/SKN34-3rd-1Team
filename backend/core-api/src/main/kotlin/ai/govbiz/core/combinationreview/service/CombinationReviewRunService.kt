package ai.govbiz.core.combinationreview.service

import ai.govbiz.core.account.domain.Account
import ai.govbiz.core.combinationreview.facade.AiCombinationReviewFacade
import ai.govbiz.core.combinationreview.facade.exception.AiCombinationReviewFacadeException
import ai.govbiz.core.combinationreview.client.CombinationReviewSourceClient
import ai.govbiz.core.combinationreview.client.mapper.CombinationReviewDocumentMapper
import ai.govbiz.core.combinationreview.client.exception.CombinationReviewSourceClientException
import ai.govbiz.core.combinationreview.domain.*
import ai.govbiz.core.combinationreview.domain.exception.CombinationReviewNotFoundException
import ai.govbiz.core.combinationreview.repository.CombinationReviewRunRepository
import ai.govbiz.core.combinationreview.service.exception.*
import ai.govbiz.core.supportprogram.service.admission.SupportProgramRequestAdmissionService
import ai.govbiz.core.supportprogram.service.admission.exception.SupportProgramRequestRejectedException
import java.time.Clock
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit
import java.util.UUID
import java.util.concurrent.Semaphore
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Service

/** 명시적인 POST 한 번의 동기 실행. DB transaction 밖에서 수집·파싱·AI를 호출한다. */
@Service
class CombinationReviewRunService(
    private val runs: CombinationReviewRunRepository, private val reviews: CombinationReviewService,
    private val sources: CombinationReviewSourceClient, private val documentMapper: CombinationReviewDocumentMapper,
    private val ai: AiCombinationReviewFacade, private val admission: SupportProgramRequestAdmissionService,
    @param:Qualifier("seoulClock") private val clock: Clock,
) {
    private val runnerInstanceId = UUID.randomUUID().toString()
    private val slots = Semaphore(2)

    fun start(account: Account, reviewId: Long, expectedRevision: Long, requestKey: String, additionalFacts: String): ReviewRunReservation {
        val reservation = runs.reserve(account.id, reviewId, expectedRevision, requestKey, additionalFacts, runnerInstanceId)
        if (!reservation.created) return reservation
        try {
            return admission.execute("combination-review-account:${account.id}") { executeRun(reservation) }
        } catch (error: SupportProgramRequestRejectedException) {
            val code = if (error.reason == SupportProgramRequestRejectedException.Reason.RATE_LIMITED) ReviewRunFailureCode.RUN_RATE_LIMITED else ReviewRunFailureCode.RUN_CAPACITY_EXCEEDED
            runs.fail(reservation.run.id, code.name)
            throw CombinationReviewRunException(code, reservation.run.id, error, error.retryAfterSeconds)
        }
    }

    private fun executeRun(reservation: ReviewRunReservation): ReviewRunReservation {
        val run = reservation.run
        if (!slots.tryAcquire()) {
            runs.fail(run.id, "RUN_CAPACITY_EXCEEDED")
            throw CombinationReviewRunException(ReviewRunFailureCode.RUN_CAPACITY_EXCEEDED, run.id)
        }
        try {
            val documents = mutableListOf<ReviewSourceDocument>()
            val blocks = mutableListOf<ReviewEvidenceBlock>()
            val raw = mutableListOf<ByteArray>()
            val warnings = mutableListOf<String>()
            run.input.programs.forEachIndexed { index, program ->
                val fetched = sources.collect(program.identity)
                warnings.addAll(fetched.warnings.map { "사업 ${index + 1}: $it" })
                var parsedDocumentCount = 0
                var rejectedReason: CombinationReviewSourceClientException.Reason? = null
                fetched.files.forEach { file ->
                    val parsed = try {
                        documentMapper.fromBytes(file.bytes, file.format)
                    } catch (error: CombinationReviewSourceClientException) {
                        if (error.reason !in setOf(
                                CombinationReviewSourceClientException.Reason.UNSUPPORTED,
                                CombinationReviewSourceClientException.Reason.TOO_LARGE,
                            )
                        ) throw error
                        rejectedReason = error.reason
                        warnings.add("사업 ${index + 1}: 자동 분석 제외 첨부(SOURCE_${error.reason.name}): ${file.fileName.take(250)}. 원본 대조가 필요합니다.")
                        return@forEach
                    }
                    val document = documentMapper.toDocument(file, index, parsed, LocalDateTime.now(clock).truncatedTo(ChronoUnit.MICROS))
                    documents.add(document)
                    parsed.forEach { block -> blocks.add(ReviewEvidenceBlock("E${blocks.size}", index, document.rawHash, block.locator, block.text)) }
                    raw.add(file.bytes)
                    parsedDocumentCount++
                }
                if (parsedDocumentCount == 0) {
                    throw CombinationReviewSourceClientException(
                        rejectedReason ?: CombinationReviewSourceClientException.Reason.UNSUPPORTED,
                    )
                }
            }
            if (blocks.size > 512 || blocks.sumOf { it.text.length } > 120_000) throw CombinationReviewRunException(ReviewRunFailureCode.SOURCE_TOO_LARGE)
            val evidence = ReviewEvidenceSnapshot(documents, blocks, warnings.distinct())
            runs.saveEvidence(run.id, evidence, raw)
            val configuration = ai.configuration()
            runs.saveConfiguration(run.id, configuration)
            val analysis = ai.analyze(run.input, evidence, configuration)
            val finishedAt = runs.succeed(run.id, analysis)
            return ReviewRunReservation(run.copy(status = ReviewRunStatus.SUCCEEDED, evidence = evidence,
                configuration = configuration, analysis = analysis, finishedAt = finishedAt), true)
        } catch (error: Exception) {
            val code = failureCode(error)
            runs.fail(run.id, code.name)
            throw CombinationReviewRunException(code, run.id, error)
        } finally {
            slots.release()
        }
    }

    fun findOwned(account: Account, reviewId: Long, runId: Long): StoredCombinationReviewRun =
        runs.findOwned(account.id, reviewId, runId) ?: throw CombinationReviewNotFoundException()

    fun listOwned(account: Account, reviewId: Long, beforeId: Long?, size: Int): List<ReviewRunSummary> {
        reviews.findOwned(account, reviewId)
        return runs.listOwned(account.id, reviewId, beforeId, size + 1)
    }

    fun download(account: Account, reviewId: Long, runId: Long, documentIndex: Int): Pair<ReviewSourceDocument, ByteArray> {
        val run = findOwned(account, reviewId, runId)
        val doc = run.evidence?.documents?.getOrNull(documentIndex) ?: throw CombinationReviewNotFoundException()
        val bytes = runs.findSource(account.id, reviewId, runId, documentIndex) ?: throw CombinationReviewNotFoundException()
        return doc to bytes
    }

    /** 각 하위 경계의 실패를 실행 상태·공개 오류 계약으로 변환한다. */
    private fun failureCode(error: Exception): ReviewRunFailureCode = when (error) {
        is CombinationReviewRunException -> error.code
        is CombinationReviewSourceClientException -> when (error.reason) {
            CombinationReviewSourceClientException.Reason.UNSUPPORTED -> ReviewRunFailureCode.SOURCE_UNSUPPORTED
            CombinationReviewSourceClientException.Reason.NOT_FOUND -> ReviewRunFailureCode.SOURCE_NOT_FOUND
            CombinationReviewSourceClientException.Reason.UNAVAILABLE -> ReviewRunFailureCode.SOURCE_UNAVAILABLE
            CombinationReviewSourceClientException.Reason.INVALID -> ReviewRunFailureCode.SOURCE_INVALID
            CombinationReviewSourceClientException.Reason.TOO_LARGE -> ReviewRunFailureCode.SOURCE_TOO_LARGE
        }
        is AiCombinationReviewFacadeException -> when (error.reason) {
            AiCombinationReviewFacadeException.Reason.UNAVAILABLE -> ReviewRunFailureCode.ANALYSIS_UNAVAILABLE
            AiCombinationReviewFacadeException.Reason.INVALID_RESPONSE -> ReviewRunFailureCode.ANALYSIS_INVALID
            AiCombinationReviewFacadeException.Reason.CONTEXT_TOO_LARGE -> ReviewRunFailureCode.SOURCE_TOO_LARGE
        }
        else -> ReviewRunFailureCode.RUN_FAILED
    }
}
