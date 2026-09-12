package ai.govbiz.core.combinationreview.service

import ai.govbiz.core.account.domain.Account
import ai.govbiz.core.combinationreview.facade.AiCombinationReviewFacade
import ai.govbiz.core.combinationreview.facade.exception.AiCombinationReviewFacadeException
import ai.govbiz.core.combinationreview.helper.CombinationReviewHashHelper
import ai.govbiz.core.combinationreview.domain.*
import ai.govbiz.core.combinationreview.domain.exception.CombinationReviewNotFoundException
import ai.govbiz.core.combinationreview.repository.CombinationReviewRunRepository
import ai.govbiz.core.combinationreview.service.exception.*
import ai.govbiz.core.supportprogram.service.admission.SupportProgramRequestAdmissionService
import ai.govbiz.core.supportprogram.service.admission.exception.SupportProgramRequestRejectedException
import ai.govbiz.core.supportprogram.client.bizinfo.BizInfoAttachmentClient
import ai.govbiz.core.supportprogram.client.cntradenotice.CnTradeNoticeAttachmentClient
import ai.govbiz.core.supportprogram.client.document.SupportProgramAttachments
import ai.govbiz.core.supportprogram.client.document.SupportProgramDocumentParser
import ai.govbiz.core.supportprogram.client.document.SupportProgramDocumentException
import ai.govbiz.core.supportprogram.client.kstartup.KStartupAttachmentClient
import ai.govbiz.core.supportprogram.client.msit.MsitAttachmentClient
import ai.govbiz.core.supportprogram.service.detail.SupportProgramDetailService
import ai.govbiz.core.supportprogram.service.detail.exception.SupportProgramNotFoundException
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
    private val bizInfoAttachments: BizInfoAttachmentClient, private val msitAttachments: MsitAttachmentClient,
    private val kStartupAttachments: KStartupAttachmentClient,
    private val cnTradeNoticeAttachments: CnTradeNoticeAttachmentClient,
    private val programDetails: SupportProgramDetailService, private val documentParser: SupportProgramDocumentParser,
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
                if (program.identity.subProgramId != null) {
                    throw SupportProgramDocumentException(SupportProgramDocumentException.Reason.UNSUPPORTED)
                }
                val fetched = collectAttachments(program.identity)
                if (documents.size + fetched.files.size > MAX_REVIEW_SOURCE_DOCUMENTS) {
                    throw SupportProgramDocumentException(SupportProgramDocumentException.Reason.TOO_LARGE)
                }
                warnings.addAll(fetched.warnings.map { "사업 ${index + 1}: $it" })
                var parsedDocumentCount = 0
                var rejectedReason: SupportProgramDocumentException.Reason? = null
                fetched.files.forEach { file ->
                    val parsed = try {
                        documentParser.parse(file.bytes, file.format)
                    } catch (error: SupportProgramDocumentException) {
                        if (error.reason !in setOf(
                                SupportProgramDocumentException.Reason.UNSUPPORTED,
                                SupportProgramDocumentException.Reason.TOO_LARGE,
                            )
                        ) throw error
                        rejectedReason = error.reason
                        warnings.add("사업 ${index + 1}: 자동 분석 제외 첨부(SOURCE_${error.reason.name}): ${file.fileName.take(250)}. 원본 대조가 필요합니다.")
                        return@forEach
                    }
                    val document = ReviewSourceDocument(
                        index,
                        file.sourceUrl,
                        file.fileName,
                        file.format,
                        CombinationReviewHashHelper.sha256(file.bytes),
                        CombinationReviewHashHelper.sha256(parsed.joinToString("\n") { it.text }),
                        SupportProgramDocumentParser.VERSION,
                        LocalDateTime.now(clock).truncatedTo(ChronoUnit.MICROS),
                    )
                    documents.add(document)
                    parsed.forEach { block -> blocks.add(ReviewEvidenceBlock("E${blocks.size}", index, document.rawHash, block.locator, block.text)) }
                    raw.add(file.bytes)
                    parsedDocumentCount++
                }
                if (parsedDocumentCount == 0) {
                    throw SupportProgramDocumentException(
                        rejectedReason ?: SupportProgramDocumentException.Reason.UNSUPPORTED,
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

    private fun collectAttachments(identity: ReviewProgramIdentity): SupportProgramAttachments = when (identity.sourceCode) {
        "BIZINFO" -> bizInfoAttachments.collect(identity.sourceCode, identity.sourceProgramId)
        "MSIT" -> {
            if (!NUMERIC_PROGRAM_ID.matches(identity.sourceProgramId)) {
                throw SupportProgramDocumentException(SupportProgramDocumentException.Reason.UNSUPPORTED)
            }
            val program = requireProgram(identity)
            msitAttachments.collect(identity.sourceCode, identity.sourceProgramId, program.sourceUrl)
        }
        "KSTARTUP" -> {
            if (!NUMERIC_PROGRAM_ID.matches(identity.sourceProgramId)) {
                throw SupportProgramDocumentException(SupportProgramDocumentException.Reason.UNSUPPORTED)
            }
            val program = requireProgram(identity)
            kStartupAttachments.collect(identity.sourceCode, identity.sourceProgramId, program.sourceUrl)
        }
        "CNTRADE_NOTICE" -> {
            if (!NUMERIC_PROGRAM_ID.matches(identity.sourceProgramId)) {
                throw SupportProgramDocumentException(SupportProgramDocumentException.Reason.UNSUPPORTED)
            }
            val program = requireProgram(identity)
            cnTradeNoticeAttachments.collect(identity.sourceCode, identity.sourceProgramId, program.title, program.targetDescription)
        }
        else -> throw SupportProgramDocumentException(SupportProgramDocumentException.Reason.UNSUPPORTED)
    }

    private fun requireProgram(identity: ReviewProgramIdentity) = try {
        programDetails.get(identity.sourceCode, identity.sourceProgramId)
    } catch (error: SupportProgramNotFoundException) {
        throw SupportProgramDocumentException(SupportProgramDocumentException.Reason.NOT_FOUND, error)
    }

    /** 각 하위 경계의 실패를 실행 상태·공개 오류 계약으로 변환한다. */
    private fun failureCode(error: Exception): ReviewRunFailureCode = when (error) {
        is CombinationReviewRunException -> error.code
        is SupportProgramDocumentException -> when (error.reason) {
            SupportProgramDocumentException.Reason.UNSUPPORTED -> ReviewRunFailureCode.SOURCE_UNSUPPORTED
            SupportProgramDocumentException.Reason.NOT_FOUND -> ReviewRunFailureCode.SOURCE_NOT_FOUND
            SupportProgramDocumentException.Reason.UNAVAILABLE -> ReviewRunFailureCode.SOURCE_UNAVAILABLE
            SupportProgramDocumentException.Reason.INVALID -> ReviewRunFailureCode.SOURCE_INVALID
            SupportProgramDocumentException.Reason.TOO_LARGE -> ReviewRunFailureCode.SOURCE_TOO_LARGE
        }
        is AiCombinationReviewFacadeException -> when (error.reason) {
            AiCombinationReviewFacadeException.Reason.UNAVAILABLE -> ReviewRunFailureCode.ANALYSIS_UNAVAILABLE
            AiCombinationReviewFacadeException.Reason.INVALID_RESPONSE -> ReviewRunFailureCode.ANALYSIS_INVALID
            AiCombinationReviewFacadeException.Reason.CONTEXT_TOO_LARGE -> ReviewRunFailureCode.SOURCE_TOO_LARGE
        }
        else -> ReviewRunFailureCode.RUN_FAILED
    }

    private companion object {
        const val MAX_REVIEW_SOURCE_DOCUMENTS = 12
        val NUMERIC_PROGRAM_ID = Regex("[1-9][0-9]{0,254}")
    }
}
