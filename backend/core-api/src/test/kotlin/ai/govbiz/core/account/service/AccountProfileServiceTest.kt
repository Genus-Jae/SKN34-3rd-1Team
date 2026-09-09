package ai.govbiz.core.account.service

import ai.govbiz.core.account.domain.AccountCredential
import ai.govbiz.core.account.helper.AccountTestHelper
import ai.govbiz.core.account.helper.AccountTestHelper.NOW
import ai.govbiz.core.account.helper.SessionTokenHelper
import ai.govbiz.core.account.repository.AccountRepository
import ai.govbiz.core.account.repository.CompanyRepository
import ai.govbiz.core.account.service.exception.AuthenticationRequiredException
import ai.govbiz.core.account.service.exception.CurrentPasswordMismatchException
import ai.govbiz.core.partner.repository.PartnerProposalRepository
import ai.govbiz.core.partner.repository.PartnerRecruitmentRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.Mockito.anyLong
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder

@ExtendWith(MockitoExtension::class)
class AccountProfileServiceTest {

    @Mock
    private lateinit var accountRepository: AccountRepository

    @Mock
    private lateinit var companyRepository: CompanyRepository

    @Mock
    private lateinit var recruitmentRepository: PartnerRecruitmentRepository

    @Mock
    private lateinit var proposalRepository: PartnerProposalRepository

    private val passwordEncoder = BCryptPasswordEncoder(4)

    private val account = AccountTestHelper.account(id = 7L)

    private lateinit var service: AccountProfileService

    @BeforeEach
    fun setUp() {
        service = AccountProfileService(
            accountRepository, companyRepository, recruitmentRepository, proposalRepository, passwordEncoder, AccountTestHelper.FIXED_CLOCK,
        )
    }

    @Test
    fun changePasswordStoresANewHashAndEndsTheOtherSessions() {
        stubCredential()
        var storedHash: String? = null
        doAnswer { invocation ->
            storedHash = invocation.getArgument(1)
            null
        }.`when`(accountRepository).updatePasswordHash(anyLong(), AccountTestHelper.anyValue())

        service.changePassword(account, "password1", "new-password-2", SESSION_TOKEN)

        assertTrue(passwordEncoder.matches("new-password-2", requireNotNull(storedHash)))
        verify(accountRepository).deleteSessionsByAccountIdExcept(7L, SessionTokenHelper.hash(SESSION_TOKEN))
    }

    @Test
    fun changePasswordRejectsAWrongCurrentPasswordAShortNewPasswordAndAMissingSession() {
        stubCredential()
        assertThrows(CurrentPasswordMismatchException::class.java) {
            service.changePassword(account, "wrong-password", "new-password-2", SESSION_TOKEN)
        }
        assertThrows(IllegalArgumentException::class.java) {
            service.changePassword(account, "password1", "short", SESSION_TOKEN)
        }
        assertThrows(AuthenticationRequiredException::class.java) {
            service.changePassword(account, "password1", "new-password-2", null)
        }

        verify(accountRepository, never()).updatePasswordHash(anyLong(), AccountTestHelper.anyValue())
    }

    @Test
    fun previewCountsOpenRecruitmentsAndPendingProposalsOnly() {
        doReturn(2).`when`(recruitmentRepository).countOpenByAccountId(7L)
        doReturn(emptyList<Any>()).`when`(proposalRepository).findReceivedBy(7L)
        doReturn(emptyList<Any>()).`when`(proposalRepository).findSentBy(7L)

        val preview = service.previewDeletion(account)

        assertEquals(false, preview.hasCompany)
        assertEquals(2, preview.openRecruitmentCount)
        assertEquals(0, preview.receivedPendingProposalCount)
        assertEquals(0, preview.sentPendingProposalCount)
    }

    @Test
    fun deleteAccountWithdrawsProposalsClosesRecruitmentsRemovesTheCompanyAndSessionsThenMarksDeleted() {
        stubCredential()

        service.deleteAccount(account, "password1")

        verify(proposalRepository).withdrawAllPendingByProposer(7L, NOW)
        verify(recruitmentRepository).closeAllByAccountId(7L, NOW)
        verify(companyRepository).deleteByAccountId(7L)
        verify(accountRepository).deleteAllSessionsByAccountId(7L)
        verify(accountRepository).markDeleted(7L, NOW)
    }

    @Test
    fun deleteAccountRejectsAWrongPasswordWithoutTouchingAnything() {
        stubCredential()
        assertThrows(CurrentPasswordMismatchException::class.java) { service.deleteAccount(account, "wrong-password") }

        verify(companyRepository, never()).deleteByAccountId(anyLong())
        verify(recruitmentRepository, never()).closeAllByAccountId(anyLong(), AccountTestHelper.anyValue())
        verify(accountRepository, never()).markDeleted(anyLong(), AccountTestHelper.anyValue())
    }

    private fun stubCredential() {
        doReturn(AccountCredential(account, requireNotNull(passwordEncoder.encode("password1"))))
            .`when`(accountRepository).findCredentialByEmail("manager@company.co.kr")
    }

    private companion object {
        const val SESSION_TOKEN = "header.payload.signature"
    }
}
