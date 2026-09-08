package ai.govbiz.core.account.domain

import java.time.LocalDateTime

/** 관리자는 SQL이나 개발용 로그인으로만 지정하며 가입 시에는 항상 USER입니다. */
enum class AccountRole {
    USER,
    ADMIN,
}

/**
 * 화면 권한을 정하는 확인 단계입니다. 역할 이름이 아니라 계정이 통과한 확인으로 계산합니다.
 *
 * `COMPANY`(이메일 인증 + 사업자 확인 + 필수 프로필)는 기업 등록이 생기는 다음 단계에서 붙습니다.
 */
enum class AccountTier {
    MEMBER,
    COMPANY,
    ADMIN,
}

/** 로그인 가능한 계정입니다. 비밀번호 해시는 포함하지 않습니다. */
data class Account(
    val id: Long,
    val email: String,
    val role: AccountRole,
    val emailVerifiedAt: LocalDateTime?,
    val suspendedAt: LocalDateTime?,
    val createdAt: LocalDateTime,
) {
    init {
        requireEmail(email)
    }

    val isAdmin: Boolean
        get() = role == AccountRole.ADMIN

    val isEmailVerified: Boolean
        get() = emailVerifiedAt != null

    /** 정지된 계정은 로그인과 세션 확인이 모두 막힙니다. 정지 사유는 관리자 조치 기록이 맡습니다. */
    val isSuspended: Boolean
        get() = suspendedAt != null

    val tier: AccountTier
        get() = if (isAdmin) AccountTier.ADMIN else AccountTier.MEMBER
}

/** 로그인 검증에만 쓰는 계정과 비밀번호 해시 조합입니다. 공개 계약으로 노출하지 않습니다. */
data class AccountCredential(
    val account: Account,
    val passwordHash: String,
) {
    init {
        require(passwordHash.isNotBlank()) { "passwordHash must not be blank" }
    }
}

/** DB에 저장된 로그인 세션 한 건입니다. 토큰 원문은 없고 만료·마지막 사용 시각만 있습니다. */
data class StoredAccountSession(
    val accountId: Long,
    val expiresAt: LocalDateTime,
    val lastUsedAt: LocalDateTime,
)

internal fun requireEmail(email: String) {
    require(email.isNotBlank() && email == email.trim() && email == email.lowercase()) {
        "email must be a trimmed lowercase address"
    }
}
