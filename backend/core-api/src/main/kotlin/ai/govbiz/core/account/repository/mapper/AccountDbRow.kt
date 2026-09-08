package ai.govbiz.core.account.repository.mapper

import java.time.LocalDateTime

/** MyBatis가 계정 한 행을 읽고 쓰기 위한 DB 행 값입니다. */
data class AccountDbRow(
    var id: Long = 0,
    var email: String = "",
    var passwordHash: String = "",
    var role: String = "USER",
    var emailVerifiedAt: LocalDateTime? = null,
    var suspendedAt: LocalDateTime? = null,
    var deletedAt: LocalDateTime? = null,
    var termsAgreedAt: LocalDateTime? = null,
    var createdAt: LocalDateTime? = null,
)
