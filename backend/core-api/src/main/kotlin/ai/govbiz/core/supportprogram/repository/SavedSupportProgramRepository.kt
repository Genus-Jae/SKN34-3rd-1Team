package ai.govbiz.core.supportprogram.repository

import ai.govbiz.core.supportprogram.domain.SavedSupportProgram
import ai.govbiz.core.supportprogram.repository.mapper.SavedSupportProgramDbRow
import ai.govbiz.core.supportprogram.repository.mapper.SavedSupportProgramMapper
import java.time.Clock
import java.time.LocalDateTime
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

/**
 * 회원의 관심 공고함을 MySQL에 저장하고 읽습니다. 공고 내용은 저장하지 않고 `support_program`을 조회 때 함께 읽어
 * 접수 상태 같은 값이 현재 공고와 같게 합니다. 동기화로 더 이상 노출되지 않는 공고는 목록에서 빠집니다.
 */
@Repository
class SavedSupportProgramRepository(
    private val savedSupportProgramMapper: SavedSupportProgramMapper,
    private val supportProgramRepository: SupportProgramRepository,
    @param:Qualifier("seoulClock") private val clock: Clock,
) {

    /** 노출 중인 공고면 담습니다. 이미 담겨 있거나 노출되지 않는 공고면 아무것도 바꾸지 않고 false입니다. */
    @Transactional
    fun saveIfPresent(accountId: Long, sourceCode: String, sourceProgramId: String): Boolean =
        savedSupportProgramMapper.insertIfPresent(accountId, sourceCode, sourceProgramId, LocalDateTime.now(clock)) == 1

    @Transactional
    fun delete(accountId: Long, sourceCode: String, sourceProgramId: String): Boolean =
        savedSupportProgramMapper.deleteByIdentity(accountId, sourceCode, sourceProgramId) == 1

    fun findByIdentity(accountId: Long, sourceCode: String, sourceProgramId: String): SavedSupportProgram? =
        savedSupportProgramMapper.findByIdentity(accountId, sourceCode, sourceProgramId)?.toSavedProgram()

    fun findByAccountId(accountId: Long): List<SavedSupportProgram> =
        savedSupportProgramMapper.findByAccountId(accountId).map { row -> row.toSavedProgram() }

    private fun SavedSupportProgramDbRow.toSavedProgram(): SavedSupportProgram =
        SavedSupportProgram(
            savedAt = requireNotNull(savedAt) { "saved program savedAt must not be null" },
            program = supportProgramRepository.toProgram(requireNotNull(program) { "saved program row must include the program" }),
        )
}
