package ai.govbiz.core.dailyreport.repository.mapper

import java.time.LocalDate
import java.time.LocalDateTime
import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param

@Mapper
interface DailyReportMapper {
    fun ensureSubscription(@Param("accountId") accountId: Long, @Param("now") now: LocalDateTime): Int
    fun findSubscription(@Param("accountId") accountId: Long): DailyReportSubscriptionDbRow?
    fun lockSubscription(@Param("accountId") accountId: Long): DailyReportSubscriptionDbRow?
    fun updateSettings(@Param("accountId") accountId: Long, @Param("purpose") purpose: String, @Param("enabled") enabled: Boolean, @Param("now") now: LocalDateTime): Int
    fun reserveVerification(@Param("accountId") accountId: Long, @Param("email") email: String, @Param("hash") hash: String, @Param("now") now: LocalDateTime, @Param("expiresAt") expiresAt: LocalDateTime, @Param("retryBefore") retryBefore: LocalDateTime): Int
    fun confirmEmail(@Param("hash") hash: String, @Param("now") now: LocalDateTime): Int
    fun unsubscribe(@Param("hash") hash: String, @Param("now") now: LocalDateTime): Int
    fun tokenExists(@Param("hash") hash: String): Boolean
    fun findLatest(@Param("accountId") accountId: Long): DailyReportDbRow?
    fun findDay(@Param("accountId") accountId: Long, @Param("date") date: LocalDate): DailyReportDbRow?
    fun lockDay(@Param("accountId") accountId: Long, @Param("date") date: LocalDate): DailyReportDbRow?
    fun insertReport(row: DailyReportDbRow): Int
    fun retryReport(@Param("id") id: Long, @Param("key") key: String, @Param("now") now: LocalDateTime): Int
    fun finishReport(@Param("id") id: Long, @Param("key") key: String, @Param("status") status: String, @Param("content") content: String?, @Param("error") error: String?, @Param("now") now: LocalDateTime): Int
    fun expireGeneration(@Param("before") before: LocalDateTime): Int
    fun ensureBudget(@Param("date") date: LocalDate): Int
    fun consumeBudget(@Param("date") date: LocalDate, @Param("maximum") maximum: Int): Int
    fun claimDelivery(@Param("id") id: Long, @Param("email") email: String, @Param("hash") hash: String, @Param("now") now: LocalDateTime): Int
    fun finishDelivery(@Param("id") id: Long, @Param("status") status: String, @Param("now") now: LocalDateTime): Int
    fun expireDelivery(@Param("before") before: LocalDateTime): Int
    fun findDueAccountIds(@Param("date") date: LocalDate, @Param("limit") limit: Int): List<Long>
}
