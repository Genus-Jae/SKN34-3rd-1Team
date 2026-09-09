package ai.govbiz.core.account.repository

import ai.govbiz.core.account.domain.Account
import ai.govbiz.core.account.domain.AccountCredential
import ai.govbiz.core.account.domain.AccountRole
import ai.govbiz.core.account.domain.CompanySummary
import ai.govbiz.core.account.domain.NewAccount
import ai.govbiz.core.account.domain.NewAccountSession
import ai.govbiz.core.account.domain.StoredAccountSession
import ai.govbiz.core.account.repository.mapper.AccountDbRow
import ai.govbiz.core.account.repository.mapper.AccountMapper
import ai.govbiz.core.account.repository.mapper.AccountSessionDbRow
import java.time.Clock
import java.time.LocalDateTime
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

/** 계정·로그인 세션을 MySQL에 저장하고 읽습니다. 비밀번호 해시는 로그인 검증 조회에서만 내보냅니다. */
@Repository
class AccountRepository(
    private val accountMapper: AccountMapper,
    @param:Qualifier("seoulClock") private val clock: Clock,
) {

    /**
     * 계정을 INSERT합니다. 첫 세션은 계정 ID로 JWT를 만든 뒤 [createSession]으로 따로 저장합니다.
     *
     * 비밀번호 해시는 이 호출 전에 끝나 있어야 합니다. 이메일 중복은 DB UNIQUE 제약이 막으며
     * 그때 던져지는 [org.springframework.dao.DuplicateKeyException]은 호출한 Service가 변환합니다.
     */
    @Transactional
    fun createAccount(newAccount: NewAccount): Account {
        // DB 기본값은 MySQL 서버 시간대를 따르므로 다른 시각 컬럼처럼 서울 기준 앱 시계로 기록합니다.
        val accountRow = AccountDbRow(
            email = newAccount.email,
            passwordHash = newAccount.passwordHash,
            role = newAccount.role.name,
            emailVerifiedAt = newAccount.emailVerifiedAt,
            termsAgreedAt = newAccount.termsAgreedAt,
            createdAt = LocalDateTime.now(clock),
        )
        check(accountMapper.insertAccount(accountRow) == 1) { "account row was not created" }

        return requireNotNull(accountMapper.findAccountById(accountRow.id)) { "account row was not readable" }
            .toAccount()
    }

    /** 삭제되지 않은 계정을 ID로 조회합니다. */
    fun findById(id: Long): Account? =
        accountMapper.findAccountById(id)?.toAccount()

    /** 정규화된(소문자) 이메일로 계정을 조회합니다. */
    fun findByEmail(email: String): Account? =
        accountMapper.findAccountByEmail(email)?.toAccount()

    /** 로그인 검증을 위해 비밀번호 해시를 포함해 조회합니다. */
    fun findCredentialByEmail(email: String): AccountCredential? =
        accountMapper.findAccountByEmail(email)?.let { row ->
            AccountCredential(account = row.toAccount(), passwordHash = row.passwordHash)
        }

    /** 비밀번호 변경입니다. 해시는 호출 전에 끝나 있어야 합니다. */
    @Transactional
    fun updatePasswordHash(accountId: Long, passwordHash: String) {
        check(accountMapper.updateAccountPasswordHash(accountId, passwordHash) == 1) { "account row was not updated" }
    }

    /**
     * 계정을 삭제 표시합니다. 모집글·제안이 계정을 참조하므로 행은 남기되, 이메일은 `deleted+<id>+<시각>@deleted.invalid`로
     * 바꿔 UNIQUE 제약을 비웁니다. 같은 이메일로 다시 가입하면 새 계정이 됩니다. 삭제된 행은 모든 조회에서 제외됩니다.
     */
    @Transactional
    fun markDeleted(accountId: Long, deletedAt: LocalDateTime) {
        val anonymizedEmail = "deleted+$accountId+${deletedAt.toEpochSecond(java.time.ZoneOffset.UTC)}@deleted.invalid"
        check(accountMapper.updateAccountDeletedAt(accountId, deletedAt, anonymizedEmail) == 1) { "account row was not marked deleted" }
    }

    /** 비밀번호를 바꾼 기기의 세션만 남기고 같은 계정의 다른 세션을 지웁니다. */
    @Transactional
    fun deleteSessionsByAccountIdExcept(accountId: Long, keepTokenHash: String): Int =
        accountMapper.deleteSessionsByAccountIdExcept(accountId, keepTokenHash)

    @Transactional
    fun deleteAllSessionsByAccountId(accountId: Long): Int =
        accountMapper.deleteSessionsByAccountId(accountId)

    /** 로그인 성공 시 새 세션을 저장하고 같은 계정의 만료 세션을 정리합니다. */
    @Transactional
    fun createSession(accountId: Long, session: NewAccountSession) {
        val now = LocalDateTime.now(clock)
        accountMapper.deleteExpiredSessionsByAccountId(accountId, now)
        val inserted = accountMapper.insertSession(
            AccountSessionDbRow(
                tokenHash = session.tokenHash,
                accountId = accountId,
                lastUsedAt = now,
                expiresAt = session.expiresAt,
            ),
        )
        check(inserted == 1) { "account session row was not created" }
    }

    /** 세션 토큰 해시로 저장된 세션을 조회합니다. 만료·유휴 판단은 호출한 Service가 합니다. */
    fun findSessionByTokenHash(tokenHash: String): StoredAccountSession? =
        accountMapper.findSessionByTokenHash(tokenHash)?.let { row ->
            StoredAccountSession(
                accountId = row.accountId,
                expiresAt = requireNotNull(row.expiresAt) { "session expiresAt must not be null" },
                lastUsedAt = requireNotNull(row.lastUsedAt) { "session lastUsedAt must not be null" },
            )
        }

    /** 세션을 사용한 시각을 기록해 유휴 만료 기준을 늦춥니다. */
    @Transactional
    fun touchSession(tokenHash: String, usedAt: LocalDateTime) {
        accountMapper.updateSessionLastUsedAt(tokenHash, usedAt)
    }

    /** 로그아웃한 세션을 삭제합니다. 이미 없으면 false입니다. */
    @Transactional
    fun deleteSessionByTokenHash(tokenHash: String): Boolean =
        accountMapper.deleteSessionByTokenHash(tokenHash) == 1

    private fun AccountDbRow.toAccount(): Account =
        Account(
            id = id,
            email = email,
            role = AccountRole.valueOf(role),
            emailVerifiedAt = emailVerifiedAt,
            suspendedAt = suspendedAt,
            createdAt = requireNotNull(createdAt) { "account createdAt must not be null" },
            company = companyId?.let { id ->
                CompanySummary(
                    id = id,
                    companyName = requireNotNull(companyName) { "company name must not be null" },
                    businessNumber = requireNotNull(companyBusinessNumber) { "company business number must not be null" },
                )
            },
        )
}
