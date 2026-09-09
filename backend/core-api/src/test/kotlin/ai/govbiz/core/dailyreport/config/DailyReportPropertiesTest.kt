package ai.govbiz.core.dailyreport.config

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.core.io.ClassPathResource
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import java.util.Properties

class DailyReportPropertiesTest {
    @Test
    fun defaultsDoNotSendEmailOrStartScheduling() {
        val properties = DailyReportProperties()
        assertFalse(properties.enabled)
        assertFalse(properties.mailEnabled)
    }

    @Test
    fun springBindsExplicitEnablementAndBudgetSettings() {
        ApplicationContextRunner().withUserConfiguration(DailyReportConfig::class.java).withPropertyValues(
            "app.daily-report.enabled=true", "app.daily-report.mail-enabled=true",
            "app.daily-report.from=reports@example.org", "app.daily-report.frontend-base-url=https://govbiz.example",
            "app.daily-report.send-hour=9", "app.daily-report.max-reports-per-day=7",
        ).run { context ->
            assertNull(context.startupFailure)
            val properties = context.getBean(DailyReportProperties::class.java)
            assertTrue(properties.enabled)
            assertTrue(properties.mailEnabled)
            assertEquals(9, properties.sendHour)
            assertEquals(7, properties.maxReportsPerDay)
            assertEquals("https://govbiz.example", properties.frontendBaseUrl)
        }
    }

    @Test
    fun evaluationProfilesExplicitlyDisableSchedulingAndMail() {
        listOf("evaluation-capture", "evaluation-fixture-export").forEach { profile ->
            val values = Properties()
            ClassPathResource("application-$profile.properties").inputStream.use(values::load)
            assertEquals("false", values.getProperty("app.daily-report.enabled"))
            assertEquals("false", values.getProperty("app.daily-report.mail-enabled"))
        }
    }

    @Test
    fun rejectsUnsafeLinksAndUnboundedCosts() {
        listOf("http://example.org", "https://user@example.org", "https://example.org?x=1", "https://example.org#token", "https://example.org/path").forEach {
            assertThrows(IllegalArgumentException::class.java) { DailyReportProperties(frontendBaseUrl = it) }
        }
        assertThrows(IllegalArgumentException::class.java) { DailyReportProperties(maxPrograms = 4) }
        assertThrows(IllegalArgumentException::class.java) { DailyReportProperties(maxReportsPerDay = 0) }
        assertThrows(IllegalArgumentException::class.java) { DailyReportProperties(maxAccountsPerRun = 101) }
        assertThrows(IllegalArgumentException::class.java) { DailyReportProperties(sendHour = 24) }
    }

    @Test
    fun enablingMailRequiresAnExplicitSingleSender() {
        assertThrows(IllegalArgumentException::class.java) { DailyReportProperties(mailEnabled = true) }
        assertThrows(IllegalArgumentException::class.java) {
            DailyReportProperties(mailEnabled = true, from = "reports@example.org\r\nBcc:other@example.org")
        }
        DailyReportProperties(mailEnabled = true, from = "reports@example.org", frontendBaseUrl = "https://app.example.org")
    }
}
