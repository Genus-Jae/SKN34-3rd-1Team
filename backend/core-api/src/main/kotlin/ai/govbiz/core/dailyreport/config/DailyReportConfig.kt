package ai.govbiz.core.dailyreport.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(DailyReportProperties::class, DailyReportQueueProperties::class)
class DailyReportConfig(properties: DailyReportProperties, queue: DailyReportQueueProperties) {
    init {
        require(!properties.enabled || queue.enabled) {
            "정기 리포트 실행에는 app.daily-report.queue.enabled=true가 필요합니다."
        }
    }
}
