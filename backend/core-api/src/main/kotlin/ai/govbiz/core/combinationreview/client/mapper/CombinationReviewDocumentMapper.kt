package ai.govbiz.core.combinationreview.client.mapper

import ai.govbiz.core.combinationreview.domain.ReviewSourceBlock
import ai.govbiz.core.combinationreview.domain.ReviewSourceDocument
import ai.govbiz.core.combinationreview.client.dto.ReviewAttachmentResult
import ai.govbiz.core.combinationreview.helper.CombinationReviewHashHelper
import ai.govbiz.core.combinationreview.client.exception.CombinationReviewSourceClientException
import ai.govbiz.core.combinationreview.client.exception.CombinationReviewSourceClientException.Reason
import ai.govbiz.core.combinationreview.client.dto.MAX_REVIEW_ATTACHMENT_BYTES
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.LocalDateTime
import java.util.zip.ZipInputStream
import javax.xml.XMLConstants
import javax.xml.parsers.DocumentBuilderFactory
import org.apache.pdfbox.Loader
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException
import org.apache.pdfbox.text.PDFTextStripper
import org.springframework.stereotype.Component
import org.w3c.dom.Element

/** 원문 전체의 순서를 보존한다. 한도 초과를 잘라내거나 키워드로 일부 조항만 선택하지 않는다. */
@Component
class CombinationReviewDocumentMapper {
    fun toDocument(attachment: ReviewAttachmentResult, programIndex: Int, blocks: List<ReviewSourceBlock>, fetchedAt: LocalDateTime): ReviewSourceDocument =
        ReviewSourceDocument(
            programIndex, attachment.sourceUrl, attachment.fileName, attachment.format,
            CombinationReviewHashHelper.sha256(attachment.bytes),
            CombinationReviewHashHelper.sha256(blocks.joinToString("\n") { it.text }), VERSION, fetchedAt,
        )

    fun fromBytes(bytes: ByteArray, format: String): List<ReviewSourceBlock> = try {
        if (bytes.size > MAX_REVIEW_ATTACHMENT_BYTES) fail(Reason.TOO_LARGE)
        val blocks = when (format) {
            "PDF" -> pdf(bytes)
            "HWPX" -> hwpx(bytes)
            else -> fail(Reason.UNSUPPORTED)
        }
        if (blocks.sumOf { it.text.length } < 50) fail(Reason.UNSUPPORTED)
        if (blocks.sumOf { it.text.length } > 60_000 || blocks.size > 256) fail(Reason.TOO_LARGE)
        blocks
    } catch (error: CombinationReviewSourceClientException) {
        throw error
    } catch (error: InvalidPasswordException) {
        throw CombinationReviewSourceClientException(Reason.UNSUPPORTED, cause = error)
    } catch (error: Exception) {
        throw CombinationReviewSourceClientException(Reason.INVALID, cause = error)
    }

    private fun pdf(bytes: ByteArray): List<ReviewSourceBlock> = Loader.loadPDF(bytes).use { document ->
        if (document.isEncrypted || !document.currentAccessPermission.canExtractContent()) fail(Reason.UNSUPPORTED)
        if (document.numberOfPages !in 1..80) fail(Reason.TOO_LARGE)
        buildList {
            for (page in 1..document.numberOfPages) {
                val text = PDFTextStripper().apply { startPage = page; endPage = page; sortByPosition = true }.getText(document).trim()
                // A scanned/empty page may contain a relevant exception. Do not silently omit it.
                if (text.length < 10) fail(Reason.UNSUPPORTED)
                splitText(text).forEachIndexed { part, value -> add(ReviewSourceBlock("PDF page $page part ${part + 1}", value)) }
            }
        }
    }

    private fun hwpx(bytes: ByteArray): List<ReviewSourceBlock> {
        val sections = sortedMapOf<Int, ByteArray>()
        var expanded = 0
        var entries = 0
        ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                if (++entries > 256 || entry.name.contains("..") || entry.name.startsWith("/")) fail(Reason.INVALID)
                val section = Regex("Contents/section(\\d+)\\.xml").matchEntire(entry.name)
                val output = ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                while (true) {
                    val count = zip.read(buffer)
                    if (count < 0) break
                    expanded += count
                    if (expanded > 24 * 1024 * 1024) fail(Reason.TOO_LARGE)
                    if (section != null) output.write(buffer, 0, count)
                }
                if (section != null && sections.put(section.groupValues[1].toInt(), output.toByteArray()) != null) fail(Reason.INVALID)
            }
        }
        if (sections.isEmpty()) fail(Reason.INVALID)
        val factory = DocumentBuilderFactory.newInstance().apply {
            isNamespaceAware = true
            setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
            setFeature("http://xml.org/sax/features/external-general-entities", false)
            setFeature("http://xml.org/sax/features/external-parameter-entities", false)
            setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "")
            setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "")
            isXIncludeAware = false
            isExpandEntityReferences = false
        }
        return buildList {
            sections.forEach { (section, xml) ->
                val nodes = factory.newDocumentBuilder().parse(ByteArrayInputStream(xml)).getElementsByTagNameNS(HP, "p")
                var buffer = StringBuilder()
                var start = 1
                fun flush(end: Int) {
                    if (buffer.isNotEmpty()) add(ReviewSourceBlock("HWPX section$section paragraphs $start-$end", buffer.toString()))
                    buffer = StringBuilder()
                }
                for (index in 0 until nodes.length) {
                    val paragraph = nodes.item(index) as Element
                    val text = buildString {
                        for (i in 0 until paragraph.childNodes.length) {
                            val run = paragraph.childNodes.item(i)
                            if (run.namespaceURI != HP || run.localName != "run") continue
                            for (j in 0 until run.childNodes.length) {
                                val child = run.childNodes.item(j)
                                if (child.namespaceURI == HP && child.localName == "t") append(child.textContent)
                            }
                        }
                    }.trim()
                    if (text.isBlank()) continue
                    if (text.length > 3000) {
                        flush(index)
                        splitText(text).forEachIndexed { part, value -> add(ReviewSourceBlock("HWPX section$section paragraph ${index + 1} part ${part + 1}", value)) }
                        continue
                    }
                    if (buffer.length + text.length + 1 > 3000) flush(index)
                    if (buffer.isEmpty()) start = index + 1 else buffer.append('\n')
                    buffer.append(text)
                }
                flush(nodes.length)
            }
        }
    }

    private fun splitText(text: String): List<String> = buildList {
        var start = 0
        while (start < text.length) {
            var end = minOf(start + 3000, text.length)
            if (end < text.length && Character.isHighSurrogate(text[end - 1]) && Character.isLowSurrogate(text[end])) end--
            add(text.substring(start, end))
            start = end
        }
    }

    private fun fail(reason: Reason): Nothing = throw CombinationReviewSourceClientException(reason)
    companion object {
        const val VERSION = "pdfbox-3.0.8-hwpx-direct-paragraph-v1"
        private const val HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
    }
}
