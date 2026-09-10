package ai.govbiz.core.applicationpreparation.repository

import ai.govbiz.core._common.test.MySqlTestContainerConfig
import ai.govbiz.core.account.domain.NewAccount
import ai.govbiz.core.account.repository.AccountRepository
import ai.govbiz.core.applicationpreparation.domain.ApplicationServiceField
import ai.govbiz.core.applicationpreparation.domain.NewApplicationPreparation
import java.time.LocalDateTime
import java.util.UUID
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.dao.DataAccessException
import org.springframework.jdbc.core.JdbcTemplate

@SpringBootTest(properties = [
    "app.account.jwt-secret=test-jwt-secret-0123456789abcdef0123456789",
    "app.ai-service.base-url=http://127.0.0.1:1",
    "app.bizinfo.sync.enabled=false",
    "app.support-program-index.enabled=false",
])
@Import(MySqlTestContainerConfig::class)
class ApplicationPreparationRepositoryIntegrationTest {
    @Autowired private lateinit var repository: ApplicationPreparationRepository
    @Autowired private lateinit var accounts: AccountRepository
    @Autowired private lateinit var jdbc: JdbcTemplate
    private var ownerId = 0L
    private var otherId = 0L

    @BeforeEach
    fun prepare() {
        jdbc.update("DELETE FROM application_preparation")
        ownerId = createAccount()
        otherId = createAccount()
    }

    @Test
    fun roundTripsEveryServiceFieldAndKeepsOwnerIsolation() {
        val created = ApplicationServiceField.entries.map { field -> repository.create(ownerId, draft(field)) }
        assertTrue(created.all { it.inputRevision == 1L && it.ownerAccountId == ownerId })
        assertEquals(ApplicationServiceField.entries, repository.listOwned(ownerId, null, 51).reversed().map { it.serviceField })
        assertNull(repository.findOwned(otherId, created.first().id))
        assertEquals(created.first(), repository.findOwned(ownerId, created.first().id))
    }

    @Test
    fun paginatesOnlyTheOwnerByStableDescendingId() {
        val oldest = repository.create(ownerId, draft()).id
        repository.create(otherId, draft())
        val middle = repository.create(ownerId, draft()).id
        val newest = repository.create(ownerId, draft()).id
        val first = repository.listOwned(ownerId, null, 2)
        val second = repository.listOwned(ownerId, middle, 2)
        assertEquals(listOf(newest, middle), first.map { it.id })
        assertEquals(listOf(oldest), second.map { it.id })
    }

    @Test
    fun enforcesOwnerFieldFormAndRevisionConstraintsInMysql() {
        assertThrows(DataAccessException::class.java) { repository.create(Long.MAX_VALUE, draft()) }
        val created = repository.create(ownerId, draft())
        assertThrows(DataAccessException::class.java) {
            jdbc.update("UPDATE application_preparation SET service_field = 'INVALID' WHERE id = ?", created.id)
        }
        assertThrows(DataAccessException::class.java) {
            jdbc.update("UPDATE application_preparation SET input_revision = 0 WHERE id = ?", created.id)
        }
        assertThrows(DataAccessException::class.java) {
            jdbc.update("UPDATE application_preparation SET form_version_id = '잘못된-버전' WHERE id = ?", created.id)
        }
        assertEquals(created, repository.findOwned(ownerId, created.id))
    }

    private fun createAccount(): Long = accounts.createAccount(
        NewAccount("application-${UUID.randomUUID()}@example.test", "test-password-hash", LocalDateTime.of(2026, 9, 11, 0, 0)),
    ).id

    private fun draft(field: ApplicationServiceField = ApplicationServiceField.TECHNICAL_SUPPORT) = NewApplicationPreparation(
        "BIZINFO",
        "PBLN_000000000118979",
        "bizinfo-pbln-000000000118979-innovation-voucher-2026-v1",
        field,
    )
}
