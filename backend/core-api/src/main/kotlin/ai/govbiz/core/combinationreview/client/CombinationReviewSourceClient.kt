package ai.govbiz.core.combinationreview.client

import ai.govbiz.core.combinationreview.client.dto.ReviewAttachmentResult
import ai.govbiz.core.combinationreview.client.dto.ReviewAttachmentsResult
import ai.govbiz.core.combinationreview.client.dto.MAX_REVIEW_ATTACHMENTS_TOTAL_BYTES
import ai.govbiz.core.combinationreview.domain.ReviewProgramIdentity
import ai.govbiz.core.combinationreview.client.dto.MAX_REVIEW_ATTACHMENT_BYTES
import ai.govbiz.core.combinationreview.client.exception.CombinationReviewSourceClientException
import ai.govbiz.core.combinationreview.client.exception.CombinationReviewSourceClientException.Reason
import ai.govbiz.core.supportprogram.client.bizinfo.BizInfoSourceDocumentClient
import java.net.URI
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import org.jsoup.Jsoup
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/** 공고 ID로 공식 페이지를 찾고 그 페이지가 직접 연결한 첨부만 수집한다. 사용자 URL은 받지 않는다. */
@Component
class CombinationReviewSourceClient(
    private val htmlClient: BizInfoSourceDocumentClient,
    @param:Qualifier("bizInfoSourceDocumentRestClient") private val restClient: RestClient,
) {
    fun collect(identity: ReviewProgramIdentity): ReviewAttachmentsResult {
        if (identity.sourceCode != "BIZINFO" || !Regex("PBLN_[0-9]{1,32}").matches(identity.sourceProgramId) || identity.subProgramId != null) {
            throw CombinationReviewSourceClientException(Reason.UNSUPPORTED)
        }
        try {
            val url = "https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${identity.sourceProgramId}"
            val page = Jsoup.parse(htmlClient.fetchHtml(url, identity.sourceProgramId), url)
            val detail = page.selectFirst(".support_project_detail") ?: fail(Reason.NOT_FOUND)
            val title = detail.selectFirst(".title_area .title")?.text()?.trim().orEmpty()
            if (title.isBlank()) fail(Reason.NOT_FOUND)
            val links = linkedMapOf<String, Pair<String, String>>()
            val warnings = mutableListOf("공식 페이지의 직접 첨부만 수집했습니다. 추가 외부 지침·기관 해석·정정 공고 전수 확인과 사람 검수는 미완료입니다.")
            detail.select(".file_name").forEach { name ->
                val label = name.text()
                val anchor = name.parent()?.selectFirst("a[href*='/cmm/fms/fileDown.do']")
                if (anchor != null) addLink(links, warnings, anchor.absUrl("href"), label)
            }
            // 일반형처럼 기업마당에는 HWP만 있고 직접 연결한 중기부 원문에 HWPX가 있는 경우도 포함한다.
            val mssPages = detail.select("a[href]").mapNotNull { anchor ->
                runCatching { URI(anchor.absUrl("href")) }.getOrNull()?.takeIf { isMssPage(it) }
            }.distinct()
            if (mssPages.size > 1) fail(Reason.INVALID)
            mssPages.singleOrNull()?.let { mss ->
                val linked = Jsoup.parse(String(download(mss, 500_000), StandardCharsets.UTF_8), mss.toString())
                val board = linked.selectFirst(".board_view") ?: fail(Reason.INVALID)
                board.select("a[href*='/common/board/Download.do']").forEach { anchor ->
                    val label = anchor.parent()?.selectFirst(".name")?.text()
                        ?: anchor.parent()?.parent()?.selectFirst(".name")?.text().orEmpty()
                    addLink(links, warnings, anchor.absUrl("href"), label)
                }
            }
            val primaryNames = links.filter { (url, descriptor) -> URI(url).host in setOf("mss.go.kr", "www.mss.go.kr") && descriptor.second == "HWPX" }
                .values.map { normalizedTitle(it.first) }.toSet()
            val selected = links.filter { (url, descriptor) ->
                val mirrored = URI(url).host in setOf("bizinfo.go.kr", "www.bizinfo.go.kr") && normalizedTitle(descriptor.first) in primaryNames
                if (mirrored) warnings.add("동일 표제의 기업마당 변환본 대신 발행기관 중기부 HWPX를 사용했습니다: ${descriptor.first.take(200)}")
                !mirrored
            }
            if (selected.isEmpty()) fail(Reason.UNSUPPORTED)
            if (selected.size > 4 || warnings.distinct().size > 12) fail(Reason.TOO_LARGE)
            val files = selected.map { (link, descriptor) ->
                val bytes = download(URI(link), MAX_REVIEW_ATTACHMENT_BYTES)
                ReviewAttachmentResult(link, descriptor.first.take(300), descriptor.second, bytes)
            }
            if (files.sumOf { it.bytes.size } > MAX_REVIEW_ATTACHMENTS_TOTAL_BYTES) fail(Reason.TOO_LARGE)
            return ReviewAttachmentsResult(title, files, warnings.distinct())
        } catch (error: CombinationReviewSourceClientException) {
            throw error
        } catch (error: Exception) {
            throw CombinationReviewSourceClientException(Reason.UNAVAILABLE, cause = error)
        }
    }

    private fun addLink(links: MutableMap<String, Pair<String, String>>, warnings: MutableList<String>, url: String, name: String) {
        val format = when {
            Regex("(?i)\\.hwpx(?:\\s|$)").containsMatchIn(name) -> "HWPX"
            Regex("(?i)\\.pdf(?:\\s|$)").containsMatchIn(name) -> "PDF"
            else -> null
        }
        if (format == null) {
            warnings.add("미수집 첨부(지원 형식 PDF/HWPX 이외): ${name.take(250)}")
            return
        }
        val uri = URI(url)
        requireTrustedUri(uri)
        links[uri.toString()] = name to format
    }

    private fun normalizedTitle(name: String): String = name.replace(Regex("(?i)\\.(hwpx|pdf).*"), "")
        .replace(Regex("[^\\p{L}\\p{N}]"), "").lowercase()

    private fun download(uri: URI, limit: Int): ByteArray {
        requireTrustedUri(uri)
        return restClient.get().uri(uri).accept(MediaType.ALL).exchange { _, response ->
            // No redirects: a destination must have been linked by the verified official page.
            if (response.statusCode.value() == 404) fail(Reason.NOT_FOUND)
            if (response.statusCode.value() != 200) fail(Reason.UNAVAILABLE)
            if (response.headers.contentLength > limit) fail(Reason.TOO_LARGE)
            val bytes = response.body.readNBytes(limit + 1)
            if (bytes.isEmpty()) fail(Reason.INVALID)
            if (bytes.size > limit) fail(Reason.TOO_LARGE)
            bytes
        }
    }

    internal fun requireTrustedUri(uri: URI) {
        if (uri.scheme != "https" || uri.userInfo != null || uri.fragment != null || uri.port !in listOf(-1, 443)) fail(Reason.INVALID)
        val query = uri.rawQuery.orEmpty().split('&').map { it.substringBefore('=') }
        if (query.size != query.distinct().size) fail(Reason.INVALID)
        val valid = when (uri.host) {
            "www.bizinfo.go.kr", "bizinfo.go.kr" -> uri.path == "/cmm/fms/fileDown.do" && query.toSet() == setOf("atchFileId", "fileSn") &&
                Regex("FILE_[0-9]+").matches(parameter(uri, "atchFileId")) && Regex("[0-9]+").matches(parameter(uri, "fileSn"))
            "www.mss.go.kr", "mss.go.kr" -> isMssPage(uri) || (uri.path == "/common/board/Download.do" &&
                query.toSet() == setOf("bcIdx", "cbIdx", "streFileNm") && parameter(uri, "cbIdx") == "310" &&
                Regex("[0-9]+").matches(parameter(uri, "bcIdx")) && Regex("[A-Za-z0-9-]+\\.(hwpx|pdf)", RegexOption.IGNORE_CASE).matches(parameter(uri, "streFileNm")))
            else -> false
        }
        if (!valid) fail(Reason.INVALID)
    }

    private fun isMssPage(uri: URI): Boolean = uri.scheme == "https" && uri.host in setOf("mss.go.kr", "www.mss.go.kr") &&
        uri.userInfo == null && uri.port in listOf(-1,443) && uri.path == "/site/smba/ex/bbs/View.do" &&
        parameter(uri,"cbIdx") == "310" && Regex("[0-9]+").matches(parameter(uri,"bcIdx"))
    private fun parameter(uri: URI, name: String): String = uri.rawQuery.orEmpty().split('&')
        .singleOrNull { it.substringBefore('=') == name }?.substringAfter('=', "")
        ?.let { URLDecoder.decode(it, StandardCharsets.UTF_8) }.orEmpty()
    private fun fail(reason: Reason): Nothing = throw CombinationReviewSourceClientException(reason)
}
