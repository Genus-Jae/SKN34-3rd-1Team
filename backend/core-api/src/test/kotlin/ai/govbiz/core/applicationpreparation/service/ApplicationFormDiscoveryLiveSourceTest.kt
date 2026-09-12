package ai.govbiz.core.applicationpreparation.service

import ai.govbiz.core._common.helper.buildRestClient
import ai.govbiz.core.supportprogram.client.bizinfo.BizInfoAttachmentClient
import ai.govbiz.core.supportprogram.client.bizinfo.BizInfoSourceDocumentClient
import ai.govbiz.core.supportprogram.client.document.SupportProgramDocumentException
import ai.govbiz.core.supportprogram.client.document.SupportProgramDocumentParser
import ai.govbiz.core.supportprogram.client.msit.MsitAttachmentClient
import java.net.URI
import java.time.Duration
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Tag
import org.junit.jupiter.api.Test
import org.springframework.web.client.RestClient

/** 사용자 보고 공고의 공식 첨부 수집·파싱만 확인합니다. OpenAI를 호출하지 않습니다. */
@Tag("live-source")
class ApplicationFormDiscoveryLiveSourceTest {
    @Test
    fun reportedNoticesKeepAtLeastOneReadableOfficialDocument() {
        val http = buildRestClient(
            RestClient.builder(),
            URI("https://www.bizinfo.go.kr"),
            Duration.ofSeconds(5),
            Duration.ofSeconds(60),
        )
        val collector = BizInfoAttachmentClient(BizInfoSourceDocumentClient(http), http)
        val parser = SupportProgramDocumentParser()

        for (id in listOf("PBLN_000000000126400", "PBLN_000000000126418")) {
            val fetched = collector.collect("BIZINFO", id)
            val readable = fetched.files.mapNotNull { file ->
                try {
                    parser.parse(file.bytes, file.format)
                } catch (error: SupportProgramDocumentException) {
                    if (error.reason !in setOf(
                            SupportProgramDocumentException.Reason.UNSUPPORTED,
                            SupportProgramDocumentException.Reason.TOO_LARGE,
                        )) throw error
                    null
                }
            }
            assertTrue(readable.isNotEmpty(), "$id must keep at least one readable official PDF/HWPX")
            assertTrue(readable.flatten().all { it.locator.isNotBlank() && it.text.isNotBlank() })
        }
    }

    @Test
    fun msitNoticeKeepsItsReadableOfficialApplicationForm() {
        val id = "3186573"
        val sourceUrl = "https://www.msit.go.kr/bbs/view.do?bbsSeqNo=100&mId=311&mPid=121&nttSeqNo=$id&sCode=user"
        val http = buildRestClient(
            RestClient.builder(),
            null,
            Duration.ofSeconds(5),
            Duration.ofSeconds(60),
        )
        val fetched = MsitAttachmentClient(http).collect("MSIT", id, sourceUrl)
        val readable = fetched.files.mapNotNull { file ->
            try {
                SupportProgramDocumentParser().parse(file.bytes, file.format)
            } catch (error: SupportProgramDocumentException) {
                if (error.reason !in setOf(
                        SupportProgramDocumentException.Reason.UNSUPPORTED,
                        SupportProgramDocumentException.Reason.TOO_LARGE,
                    )) throw error
                null
            }
        }

        assertTrue(fetched.files.any { it.fileName.contains("신청") && it.format == "HWPX" })
        assertTrue(readable.isNotEmpty(), "$id must keep at least one readable official PDF/HWPX")
        assertTrue(readable.flatten().all { it.locator.isNotBlank() && it.text.isNotBlank() })
    }
}
