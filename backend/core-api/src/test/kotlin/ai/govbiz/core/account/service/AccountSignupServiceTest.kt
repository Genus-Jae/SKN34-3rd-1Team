package ai.govbiz.core.account.service

import ai.govbiz.core.account.domain.NewAccount
import ai.govbiz.core.account.domain.NewAccountSession
import ai.govbiz.core.account.helper.AccountTestHelper
import ai.govbiz.core.account.helper.AccountTestHelper.NOW
import ai.govbiz.core.account.repository.AccountRepository
import ai.govbiz.core.account.service.exception.EmailAlreadyRegisteredException
import ai.govbiz.core.account.service.exception.LoginRateLimitedException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.Mockito.anyLong
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.doThrow
import org.mockito.Mockito.eq
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.dao.DuplicateKeyException
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder

@ExtendWith(MockitoExtension::class)
class AccountSignupServiceTest {

    @Mock
    private lateinit var repository: AccountRepository

    private val passwordEncoder = BCryptPasswordEncoder(4)

    private lateinit var service: AccountSignupService

    @BeforeEach
    fun setUp() {
        service = AccountSignupService(
            repository,
            AccountSessionService(repository, AccountTestHelper.sessionProperties(), AccountTestHelper.FIXED_CLOCK),
            passwordEncoder,
            AccountLoginAttemptGuard(AccountTestHelper.FIXED_CLOCK),
            AccountTestHelper.FIXED_CLOCK,
        )
    }

    @Test
    fun createsAnUnverifiedMemberWithTheNormalizedEmailAndIssuesABrowserSession() {
        var created: NewAccount? = null
        doAnswer { invocation ->
            created = invocation.getArgument(0)
            AccountTestHelper.account(id = 7L, email = "manager@company.co.kr")
        }.`when`(repository).createAccount(AccountTestHelper.anyValue())
        var storedSession: NewAccountSession? = null
        doAnswer { invocation ->
            storedSession = invocation.getArgument(1)
            null
        }.`when`(repository).createSession(eq(7L), AccountTestHelper.anyValue())

        val result = service.signUp("  Manager@Company.co.kr ", "password1", "127.0.0.1")

        val newAccount = requireNotNull(created)
        assertEquals("manager@company.co.kr", newAccount.email)
        assertTrue(passwordEncoder.matches("password1", newAccount.passwordHash))
        assertEquals(NOW, newAccount.termsAgreedAt)
        assertNull(newAccount.emailVerifiedAt)
        assertFalse(result.rememberMe)
        assertEquals(7L, result.account.id)
        assertNotNull(storedSession)
        assertEquals(NOW.plus(AccountTestHelper.SESSION_SHORT_TTL), storedSession?.expiresAt)
    }

    @Test
    fun reportsADuplicateEmailWithoutIssuingASession() {
        doThrow(DuplicateKeyException("uq_account_email")).`when`(repository).createAccount(AccountTestHelper.anyValue())

        assertThrows(EmailAlreadyRegisteredException::class.java) {
            service.signUp("manager@company.co.kr", "password1", "127.0.0.1")
        }

        verify(repository, never()).createSession(anyLong(), AccountTestHelper.anyValue())
    }

    @Test
    fun rejectsPasswordsOutsideTheAllowedLengthBeforeTouchingTheRepository() {
        assertThrows(IllegalArgumentException::class.java) { service.signUp("manager@company.co.kr", "short1", "127.0.0.1") }
        assertThrows(IllegalArgumentException::class.java) {
            service.signUp("manager@company.co.kr", "p".repeat(73), "127.0.0.1")
        }

        verify(repository, never()).createAccount(AccountTestHelper.anyValue())
    }

    @Test
    fun sharesTheAddressLimitWithLogin() {
        doAnswer { AccountTestHelper.account(id = 1L) }.`when`(repository).createAccount(AccountTestHelper.anyValue())

        repeat(AccountLoginAttemptGuard.ADDRESS_PER_MINUTE) { index ->
            service.signUp("member$index@company.co.kr", "password1", "10.0.0.9")
        }

        assertThrows(LoginRateLimitedException::class.java) {
            service.signUp("one-more@company.co.kr", "password1", "10.0.0.9")
        }
    }
}
