package ai.govbiz.core.account.service

import ai.govbiz.core.account.domain.NewAccount
import ai.govbiz.core.account.helper.normalizeEmail
import ai.govbiz.core.account.repository.AccountRepository
import ai.govbiz.core.account.service.dto.AccountSessionResult
import ai.govbiz.core.account.service.exception.EmailAlreadyRegisteredException
import java.time.Clock
import java.time.LocalDateTime
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.dao.DuplicateKeyException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

/**
 * 이메일·비밀번호만으로 회원(T1) 계정을 만들고 바로 로그인 세션을 발급합니다.
 * 약관 동의 시각은 가입 요청 시각으로 기록하고, 이메일 인증은 별도 단계라 가입 직후에는 미인증입니다.
 * 이메일 중복은 DB unique 제약이 최종 판단이며 같은 순간의 경쟁 요청도 한쪽만 성공합니다.
 */
@Service
class AccountSignupService(
    private val repository: AccountRepository,
    private val sessionService: AccountSessionService,
    private val passwordEncoder: PasswordEncoder,
    private val attemptGuard: AccountLoginAttemptGuard,
    @param:Qualifier("seoulClock") private val clock: Clock,
) {

    fun signUp(email: String, password: String, clientAddress: String): AccountSessionResult {
        require(password.length in PASSWORD_LENGTH) { "password must be $PASSWORD_LENGTH characters" }
        val normalizedEmail = normalizeEmail(email)
        // 가입도 로그인과 같은 접속 주소 한도를 씁니다. 계정 잠금은 가입에 해당하지 않습니다.
        attemptGuard.checkAddressAllowed(clientAddress)

        val account = try {
            repository.createAccount(
                NewAccount(
                    email = normalizedEmail,
                    passwordHash = requireNotNull(passwordEncoder.encode(password)) { "password hash must not be null" },
                    termsAgreedAt = LocalDateTime.now(clock),
                ),
            )
        } catch (_: DuplicateKeyException) {
            throw EmailAlreadyRegisteredException()
        }

        val issued = sessionService.issue(account.id, rememberMe = false)
        repository.createSession(account.id, issued.session)
        return sessionService.toResult(issued, account)
    }

    companion object {
        /** 비밀번호 규칙은 길이만 봅니다. 72자는 BCrypt가 실제로 반영하는 최대 길이입니다. */
        val PASSWORD_LENGTH: IntRange = 8..72
    }
}
