package ai.govbiz.core.account.service

import ai.govbiz.core.account.domain.Account
import ai.govbiz.core.account.helper.SessionTokenHelper
import ai.govbiz.core.account.repository.AccountRepository
import ai.govbiz.core.account.repository.CompanyRepository
import ai.govbiz.core.account.service.dto.AccountDeletionPreview
import ai.govbiz.core.account.service.exception.AuthenticationRequiredException
import ai.govbiz.core.account.service.exception.CurrentPasswordMismatchException
import ai.govbiz.core.partner.domain.PartnerProposalStatus
import ai.govbiz.core.partner.repository.PartnerProposalRepository
import ai.govbiz.core.partner.repository.PartnerRecruitmentRepository
import java.time.Clock
import java.time.LocalDateTime
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 로그인한 회원이 자기 계정을 관리합니다. 비밀번호 변경과 계정 삭제는 현재 비밀번호를 다시 확인합니다.
 * 삭제는 계정·기업·모집글·제안 네 Repository의 쓰기를 한 transaction으로 묶으며 그 경계는 이 Service가 소유합니다.
 */
@Service
class AccountProfileService(
    private val accountRepository: AccountRepository,
    private val companyRepository: CompanyRepository,
    private val recruitmentRepository: PartnerRecruitmentRepository,
    private val proposalRepository: PartnerProposalRepository,
    private val passwordEncoder: PasswordEncoder,
    @param:Qualifier("seoulClock") private val clock: Clock,
) {

    /** 새 비밀번호를 저장하고 지금 쓰는 세션만 남긴 채 다른 기기의 세션을 끝냅니다. 본인 확인은 세션이 맡고 현재 비밀번호는 다시 묻지 않습니다. */
    fun changePassword(account: Account, newPassword: String, sessionToken: String?) {
        require(newPassword.length in AccountSignupService.PASSWORD_LENGTH) {
            "password must be ${AccountSignupService.PASSWORD_LENGTH} characters"
        }
        val token = sessionToken?.trim()?.takeIf(String::isNotEmpty) ?: throw AuthenticationRequiredException()

        accountRepository.updatePasswordHash(account.id, requireNotNull(passwordEncoder.encode(newPassword)))
        accountRepository.deleteSessionsByAccountIdExcept(account.id, SessionTokenHelper.hash(token))
    }

    /** 삭제 확인 화면에 보여 줄, 삭제와 함께 닫히거나 철회되는 것들의 수입니다. */
    fun previewDeletion(account: Account): AccountDeletionPreview {
        val now = LocalDateTime.now(clock)
        return AccountDeletionPreview(
            hasCompany = account.hasCompany,
            openRecruitmentCount = recruitmentRepository.countOpenByAccountId(account.id),
            receivedPendingProposalCount = proposalRepository.findReceivedBy(account.id).count { it.status(now) == PartnerProposalStatus.PENDING },
            sentPendingProposalCount = proposalRepository.findSentBy(account.id).count { it.status(now) == PartnerProposalStatus.PENDING },
        )
    }

    /**
     * 계정을 삭제 표시하고 기업 행과 모든 세션을 지웁니다. 내 모집글은 마감돼 받은 제안이 만료로 보이고, 내가 보낸 대기 제안은
     * 철회됩니다. 이메일은 익명화되므로 같은 이메일로 다시 가입하면 새 계정이 됩니다.
     */
    @Transactional
    fun deleteAccount(account: Account, currentPassword: String) {
        verifyCurrentPassword(account, currentPassword)
        val now = LocalDateTime.now(clock)

        proposalRepository.withdrawAllPendingByProposer(account.id, now)
        recruitmentRepository.closeAllByAccountId(account.id, now)
        companyRepository.deleteByAccountId(account.id)
        accountRepository.deleteAllSessionsByAccountId(account.id)
        accountRepository.markDeleted(account.id, now)
    }

    private fun verifyCurrentPassword(account: Account, currentPassword: String) {
        val credential = accountRepository.findCredentialByEmail(account.email) ?: throw AuthenticationRequiredException()
        if (!passwordEncoder.matches(currentPassword, credential.passwordHash)) throw CurrentPasswordMismatchException()
    }
}
