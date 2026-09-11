package ai.govbiz.core.supportprogram.client.document

import ai.govbiz.core.supportprogram.client.document.SupportProgramDocumentException.Reason
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipInputStream
import javax.xml.XMLConstants
import javax.xml.parsers.DocumentBuilderFactory
import org.apache.pdfbox.Loader
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException
import org.apache.pdfbox.text.PDFTextStripper
import org.springframework.stereotype.Component
import org.w3c.dom.Element

data class SupportProgramDocumentBlock(val locator: String, val text: String)

/** 공식 PDF/HWPX 원문의 순서와 위치를 보존하며 안전 한도 안에서 텍스트 블록으로 변환합니다. */
@Component
class SupportProgramDocumentParser {
    fun parse(bytes: ByteArray, format: String): List<SupportProgramDocumentBlock> = try {
        if (bytes.size > MAX_SUPPORT_PROGRAM_ATTACHMENT_BYTES) fail(Reason.TOO_LARGE)
        val blocks = when (format) {
            "PDF" -> pdf(bytes)
            "HWPX" -> hwpx(bytes)
            else -> fail(Reason.UNSUPPORTED)
        }
        if (blocks.sumOf { it.text.length } < 50) fail(Reason.UNSUPPORTED)
        if (blocks.sumOf { it.text.length } > 60_000 || blocks.size > 256) fail(Reason.TOO_LARGE)
        blocks
    } catch (error: SupportProgramDocumentException) {
        throw error
    } catch (error: InvalidPasswordException) {
        throw SupportProgramDocumentException(Reason.UNSUPPORTED, cause = error)
    } catch (error: Exception) {
        throw SupportProgramDocumentException(Reason.INVALID, cause = error)
    }

    private fun pdf(bytes: ByteArray): List<SupportProgramDocumentBlock> = Loader.loadPDF(bytes).use { document ->
        if (document.isEncrypted || !document.currentAccessPermission.canExtractContent()) fail(Reason.UNSUPPORTED)
        if (document.numberOfPages !in 1..80) fail(Reason.TOO_LARGE)
        buildList {
            for (page in 1..document.numberOfPages) {
                val text = PDFTextStripper().apply { startPage = page; endPage = page; sortByPosition = true }.getText(document).trim()
                if (text.length < 10) fail(Reason.UNSUPPORTED)
                splitText(text).forEachIndexed { part, value ->
                    add(SupportProgramDocumentBlock("PDF page $page part ${part + 1}", value))
                }
            }
        }
    }

    private fun hwpx(bytes: ByteArray): List<SupportProgramDocumentBlock> {
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
                    if (buffer.isNotEmpty()) add(SupportProgramDocumentBlock("HWPX section$section paragraphs $start-$end", buffer.toString()))
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
                        splitText(text).forEachIndexed { part, value ->
                            add(SupportProgramDocumentBlock("HWPX section$section paragraph ${index + 1} part ${part + 1}", value))
                        }
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

    private fun fail(reason: Reason): Nothing = throw SupportProgramDocumentException(reason)

    companion object {
        const val VERSION = "pdfbox-3.0.8-hwpx-direct-paragraph-v1"
        private const val HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
    }
}
