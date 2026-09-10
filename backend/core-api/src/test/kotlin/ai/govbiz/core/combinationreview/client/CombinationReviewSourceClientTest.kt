package ai.govbiz.core.combinationreview.client

import ai.govbiz.core.combinationreview.client.dto.MAX_REVIEW_ATTACHMENT_BYTES
import ai.govbiz.core.combinationreview.client.dto.MAX_REVIEW_ATTACHMENTS_TOTAL_BYTES
import ai.govbiz.core.combinationreview.domain.ReviewProgramIdentity
import ai.govbiz.core.combinationreview.client.exception.CombinationReviewSourceClientException
import ai.govbiz.core.combinationreview.client.exception.CombinationReviewSourceClientException.Reason
import ai.govbiz.core.supportprogram.client.bizinfo.BizInfoSourceDocumentClient
import java.net.URI
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.*
import org.springframework.web.client.RestClient

class CombinationReviewSourceClientTest {
    private val builder = RestClient.builder()
    private val server = MockRestServiceServer.bindTo(builder).build()
    private val html = mock(BizInfoSourceDocumentClient::class.java)
    private val client = CombinationReviewSourceClient(html, builder.build())
    private val identity = ReviewProgramIdentity("BIZINFO", "PBLN_1")
    private val pageUrl = "https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_1"
    private val download = download(0)

    private fun download(index: Int) = "https://www.bizinfo.go.kr/cmm/fms/fileDown.do?atchFileId=FILE_${index + 1}&fileSn=$index"
    private fun page(extra: String = "", downloads: List<String> = listOf(download)) = """
        <div class="support_project_detail"><div class="title_area"><span class="title">검증 공고</span></div>
        ${downloads.mapIndexed { index, url ->
            val name = if (downloads.size == 1) "공고문.pdf" else "공고문-${index + 1}.pdf"
            "<li><div class=\"file_name\">$name</div><a href=\"$url\">다운로드</a></li>"
        }.joinToString("")}$extra</div><a href="https://evil.example/tracker.pdf">footer</a>
    """.trimIndent()
    private fun stubPage(text: String) { `when`(html.fetchHtml(pageUrl, identity.sourceProgramId)).thenReturn(text) }

    @Test
    fun collectsOnlyLinkedFilesInsideTheOfficialDetail() {
        stubPage(page())
        server.expect(requestTo(download)).andRespond(withSuccess(byteArrayOf(1,2,3), MediaType.APPLICATION_PDF))
        val result = client.collect(identity)
        assertEquals("검증 공고", result.title)
        assertEquals(1, result.files.size)
        assertArrayEquals(byteArrayOf(1,2,3), result.files.single().bytes)
        assertTrue(result.warnings.isNotEmpty())
        server.verify()
    }

    @Test
    fun prefersPublisherHwpxOverTheSameTitlePdfAndRecordsThatChoice() {
        val mss = "https://www.mss.go.kr/site/smba/ex/bbs/View.do?bcIdx=123&cbIdx=310&parentSeq=123"
        val file = "https://www.mss.go.kr/common/board/Download.do?bcIdx=123&cbIdx=310&streFileNm=abc.hwpx"
        stubPage(page("""<a href="$mss">출처 바로가기</a>"""))
        server.expect(requestTo(mss)).andRespond(withSuccess("""<div class="board_view"><div><span class="name">공고문.hwpx [12 KB]</span><div><a href="$file">다운로드</a></div></div></div>""", MediaType.TEXT_HTML))
        server.expect(requestTo(file)).andRespond(withSuccess(byteArrayOf(1), MediaType.APPLICATION_OCTET_STREAM))
        val result = client.collect(identity)
        assertEquals("HWPX", result.files.single().format)
        assertTrue(result.warnings.any { it.contains("발행기관 중기부 HWPX") })
        server.verify()
    }

    @Test
    fun rejectsNonOfficialUrlsEncodedTraversalAndDuplicateParameters() {
        for (url in listOf(
            "http://www.bizinfo.go.kr/cmm/fms/fileDown.do?atchFileId=FILE_1&fileSn=0",
            "https://www.bizinfo.go.kr.evil.example/cmm/fms/fileDown.do?atchFileId=FILE_1&fileSn=0",
            "https://127.0.0.1/cmm/fms/fileDown.do?atchFileId=FILE_1&fileSn=0",
            "https://user@www.bizinfo.go.kr/cmm/fms/fileDown.do?atchFileId=FILE_1&fileSn=0",
            "$download&fileSn=1", "$download#x",
            "https://www.mss.go.kr/common/board/Download.do?bcIdx=123&cbIdx=310&streFileNm=..%2Fsecret.hwpx",
        )) assertThrows(CombinationReviewSourceClientException::class.java) { client.requireTrustedUri(URI(url)) }
    }

    @Test
    fun rejectsRedirectsAndUpstreamFailureWithoutFollowingThem() {
        stubPage(page())
        server.expect(requestTo(download)).andRespond(withStatus(HttpStatus.FOUND).header(HttpHeaders.LOCATION, "https://evil.example"))
        assertEquals(Reason.UNAVAILABLE, assertThrows(CombinationReviewSourceClientException::class.java) { client.collect(identity) }.reason)
        server.verify()
    }

    @Test
    fun doesNotReplaceMissingAttachmentsWithHtmlSummary() {
        stubPage("""<div class="support_project_detail"><div class="title_area"><span class="title">공고</span></div><p>허용이라는 요약</p></div>""")
        assertEquals(Reason.UNSUPPORTED, assertThrows(CombinationReviewSourceClientException::class.java) { client.collect(identity) }.reason)
        verify(html).fetchHtml(pageUrl, identity.sourceProgramId)
    }

    @Test
    fun rejectsUnsupportedProvidersBeforeAnyNetworkCall() {
        assertThrows(CombinationReviewSourceClientException::class.java) { client.collect(ReviewProgramIdentity("KSTARTUP", "1")) }
        assertThrows(CombinationReviewSourceClientException::class.java) { client.collect(ReviewProgramIdentity("BIZINFO", "PBLN_1", "unverified-subtype")) }
        verifyNoInteractions(html)
    }

    @Test
    fun enforcesExactFileBoundaryFromContentLengthBeforeReadingTheBody() {
        stubPage(page())
        server.expect(requestTo(download)).andRespond(withSuccess(ByteArray(MAX_REVIEW_ATTACHMENT_BYTES), MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_LENGTH, MAX_REVIEW_ATTACHMENT_BYTES.toString()))
        server.expect(requestTo(download)).andRespond(withSuccess(byteArrayOf(1), MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_LENGTH, (MAX_REVIEW_ATTACHMENT_BYTES + 1).toString()))
        assertEquals(MAX_REVIEW_ATTACHMENT_BYTES, client.collect(identity).files.single().bytes.size)
        assertEquals(Reason.TOO_LARGE, assertThrows(CombinationReviewSourceClientException::class.java) { client.collect(identity) }.reason)
        server.verify()
    }

    @Test
    fun enforcesExactFileBoundaryWhileStreamingWithoutContentLength() {
        stubPage(page())
        server.expect(requestTo(download)).andRespond(withSuccess(ByteArray(MAX_REVIEW_ATTACHMENT_BYTES), MediaType.APPLICATION_PDF))
        server.expect(requestTo(download)).andRespond(withSuccess(ByteArray(MAX_REVIEW_ATTACHMENT_BYTES + 1), MediaType.APPLICATION_PDF))
        assertEquals(MAX_REVIEW_ATTACHMENT_BYTES, client.collect(identity).files.single().bytes.size)
        assertEquals(Reason.TOO_LARGE, assertThrows(CombinationReviewSourceClientException::class.java) { client.collect(identity) }.reason)
        server.verify()
    }

    @Test
    fun skipsOversizedAttachmentWhenAnotherSupportedAttachmentRemains() {
        val downloads = listOf(download(0), download(1))
        stubPage(page(downloads = downloads))
        server.expect(requestTo(downloads[0])).andRespond(withSuccess(byteArrayOf(1), MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_LENGTH, (MAX_REVIEW_ATTACHMENT_BYTES + 1).toString()))
        server.expect(requestTo(downloads[1])).andRespond(withSuccess(byteArrayOf(2), MediaType.APPLICATION_PDF))

        val result = client.collect(identity)

        assertEquals(listOf(downloads[1]), result.files.map { it.sourceUrl })
        assertTrue(result.warnings.any { it.contains("파일 크기 제한 초과") })
        server.verify()
    }

    @Test
    fun enforcesTotalAttachmentBoundaryByKeepingFilesWithinTheLimit() {
        val twoDownloads = listOf(download(0), download(1))
        val threeDownloads = twoDownloads + download(2)
        `when`(html.fetchHtml(pageUrl, identity.sourceProgramId)).thenReturn(
            page(downloads = twoDownloads),
            page(downloads = threeDownloads),
        )
        twoDownloads.forEach { url ->
            server.expect(requestTo(url)).andRespond(withSuccess(ByteArray(MAX_REVIEW_ATTACHMENT_BYTES), MediaType.APPLICATION_PDF))
        }
        twoDownloads.forEach { url ->
            server.expect(requestTo(url)).andRespond(withSuccess(ByteArray(MAX_REVIEW_ATTACHMENT_BYTES), MediaType.APPLICATION_PDF))
        }
        server.expect(requestTo(download(2))).andRespond(withSuccess(byteArrayOf(1), MediaType.APPLICATION_PDF))
        assertEquals(MAX_REVIEW_ATTACHMENTS_TOTAL_BYTES, client.collect(identity).files.sumOf { it.bytes.size })
        val limited = client.collect(identity)
        assertEquals(MAX_REVIEW_ATTACHMENTS_TOTAL_BYTES, limited.files.sumOf { it.bytes.size })
        assertTrue(limited.warnings.any { it.contains("공고별 전체 크기 제한 초과") })
        server.verify()
    }
}
