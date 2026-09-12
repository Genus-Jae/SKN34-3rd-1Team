package ai.govbiz.core.applicationpreparation.repository

import ai.govbiz.core.applicationpreparation.domain.ApplicationPreparationSummary
import ai.govbiz.core.applicationpreparation.domain.ApplicationServiceField
import ai.govbiz.core.applicationpreparation.domain.NewApplicationPreparation
import ai.govbiz.core.applicationpreparation.domain.StoredApplicationPreparation
import ai.govbiz.core.applicationpreparation.repository.mapper.ApplicationPreparationDbRow
import ai.govbiz.core.applicationpreparation.repository.mapper.ApplicationPreparationMapper
import java.time.Clock
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

/** 인증된 계정이 소유한 신청 준비 건의 현재 기본정보를 저장하고 읽습니다. */
@Repository
class ApplicationPreparationRepository(
    private val mapper: ApplicationPreparationMapper,
    @param:Qualifier("seoulClock") private val clock: Clock,
) {
    @Transactional
    fun create(ownerAccountId: Long, draft: NewApplicationPreparation): StoredApplicationPreparation {
        require(ownerAccountId > 0) { "ownerAccountId must be positive" }
        val now = LocalDateTime.now(clock).truncatedTo(ChronoUnit.MICROS)
        val row = ApplicationPreparationDbRow(
            ownerAccountId = ownerAccountId,
            sourceCode = draft.sourceCode,
            sourceProgramId = draft.sourceProgramId,
            formVersionId = draft.formVersionId,
            serviceField = draft.serviceField.name,
            createdAt = now,
            updatedAt = now,
        )
        check(mapper.insertPreparation(row) == 1 && row.id > 0) { "application preparation was not created" }
        return row.toStored()
    }

    fun findOwned(ownerAccountId: Long, preparationId: Long): StoredApplicationPreparation? {
        require(ownerAccountId > 0 && preparationId > 0) { "ownerAccountId and preparationId must be positive" }
        return mapper.findOwned(ownerAccountId, preparationId)?.toStored()
    }

    fun listOwned(ownerAccountId: Long, beforeId: Long?, limit: Int): List<ApplicationPreparationSummary> {
        require(ownerAccountId > 0 && (beforeId == null || beforeId > 0) && limit in 1..51)
        return mapper.listOwned(ownerAccountId, beforeId, limit).map { row ->
            ApplicationPreparationSummary(
                id = row.id,
                inputRevision = row.inputRevision,
                formVersionId = row.formVersionId,
                serviceField = ApplicationServiceField.valueOf(row.serviceField),
                createdAt = requireNotNull(row.createdAt),
                updatedAt = requireNotNull(row.updatedAt),
            )
        }
    }

    @Transactional
    fun deleteOwned(ownerAccountId: Long, preparationId: Long): Boolean {
        require(ownerAccountId > 0 && preparationId > 0) { "ownerAccountId and preparationId must be positive" }
        return mapper.deleteOwned(ownerAccountId, preparationId) == 1
    }

    private fun ApplicationPreparationDbRow.toStored(): StoredApplicationPreparation = StoredApplicationPreparation(
        id = id,
        ownerAccountId = ownerAccountId,
        inputRevision = inputRevision,
        draft = NewApplicationPreparation(
            sourceCode = sourceCode,
            sourceProgramId = sourceProgramId,
            formVersionId = formVersionId,
            serviceField = ApplicationServiceField.valueOf(serviceField),
        ),
        createdAt = requireNotNull(createdAt),
        updatedAt = requireNotNull(updatedAt),
    )
}
