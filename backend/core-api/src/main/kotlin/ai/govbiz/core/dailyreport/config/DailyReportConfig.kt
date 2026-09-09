package ai.govbiz.core.dailyreport.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(DailyReportProperties::class)
class DailyReportConfig
