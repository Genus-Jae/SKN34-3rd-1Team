package ai.govbiz.core.combinationreview.client.mapper

import ai.govbiz.core.combinationreview.client.exception.CombinationReviewSourceClientException
import ai.govbiz.core.combinationreview.client.exception.CombinationReviewSourceClientException.Reason
import ai.govbiz.core.combinationreview.client.dto.MAX_REVIEW_ATTACHMENT_BYTES
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.pdmodel.PDPage
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class CombinationReviewDocumentMapperTest {
    private val mapper = CombinationReviewDocumentMapper()
    private fun resource(name: String) = requireNotNull(javaClass.getResourceAsStream("/combinationreview/$name")).use { it.readBytes() }

    @Test
    fun readsBothOfficialHwpxDocumentsIncludingFootnotesAndAppendices() {
        for (name in listOf("general.hwpx", "deeptech.hwpx")) {
            val blocks = mapper.fromBytes(resource(name), "HWPX")
            val text = blocks.joinToString("\n") { it.text }
            assertTrue(text.contains("3개 유형에 중복 신청은 가능하나 1개 유형만 수행 가능"))
            assertTrue(text.contains("최초 ‘협약체결확약서’"))
            assertTrue(text.contains("글로벌기업 협업 프로그램"))
            assertTrue(text.contains("사업연도를 불문하고"))
            assertTrue(blocks.all { it.text.length <= 3000 && it.locator.startsWith("HWPX section0") })
        }
    }

    @Test
    fun readsOfficialPdfWithRealPageLocators() {
        val blocks = mapper.fromBytes(resource("deeptech.pdf"), "PDF")
        assertTrue(blocks.any { it.locator.startsWith("PDF page 1 ") && it.text.contains("동시수행 불가") })
        assertTrue(blocks.any { it.locator.startsWith("PDF page 18 ") && it.text.contains("지원 제외사업") })
        assertTrue(blocks.any { it.locator.startsWith("PDF page 24 ") })
    }

    @Test
    fun refusesScannedOrBlankPdfInsteadOfSilentlyLosingAPage() {
        val bytes = PDDocument().use { pdf ->
            pdf.addPage(PDPage())
            ByteArrayOutputStream().also { pdf.save(it) }.toByteArray()
        }
        assertEquals(Reason.UNSUPPORTED, assertThrows(CombinationReviewSourceClientException::class.java) { mapper.fromBytes(bytes, "PDF") }.reason)
    }

    @Test
    fun refusesUnsupportedHwpAndInvalidFiles() {
        assertEquals(Reason.UNSUPPORTED, assertThrows(CombinationReviewSourceClientException::class.java) { mapper.fromBytes(byteArrayOf(1), "HWP") }.reason)
        assertEquals(Reason.INVALID, assertThrows(CombinationReviewSourceClientException::class.java) { mapper.fromBytes("html error page".toByteArray(), "PDF") }.reason)
    }

    @Test
    fun rejectsExternalXmlEntities() {
        val xml = """<?xml version="1.0"?><!DOCTYPE a [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><a>&xxe;</a>"""
        assertEquals(Reason.INVALID, assertThrows(CombinationReviewSourceClientException::class.java) { mapper.fromBytes(zip("Contents/section0.xml", xml.toByteArray()), "HWPX") }.reason)
    }

    @Test
    fun keepsSupplementaryUnicodeCharactersWholeAtBlockBoundaries() {
        val text = "가".repeat(2999) + "🚀끝"
        val xml = """<root xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"><hp:p><hp:run><hp:t>$text</hp:t></hp:run></hp:p></root>"""
        val blocks = mapper.fromBytes(zip("Contents/section0.xml", xml.toByteArray(Charsets.UTF_8)), "HWPX")
        assertEquals(text, blocks.joinToString("") { it.text })
        assertTrue(blocks.none { Character.isHighSurrogate(it.text.last()) || Character.isLowSurrogate(it.text.first()) })
    }

    @Test
    fun rejectsArchiveExpansionAndRawSizeOverflow() {
        assertEquals(Reason.TOO_LARGE, assertThrows(CombinationReviewSourceClientException::class.java) {
            mapper.fromBytes(zip("Contents/section0.xml", ByteArray(25 * 1024 * 1024) { 65 }), "HWPX")
        }.reason)
        assertEquals(Reason.TOO_LARGE, assertThrows(CombinationReviewSourceClientException::class.java) {
            mapper.fromBytes(ByteArray(MAX_REVIEW_ATTACHMENT_BYTES + 1), "PDF")
        }.reason)
    }

    @Test
    fun acceptsExactRawFileBoundaryAndRejectsOneByteOver() {
        val xml = """<root xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"><hp:p><hp:run><hp:t>${"정상 본문".repeat(20)}</hp:t></hp:run></hp:p></root>"""
        val valid = zip("Contents/section0.xml", xml.toByteArray(Charsets.UTF_8))
        val blocks = mapper.fromBytes(valid.copyOf(MAX_REVIEW_ATTACHMENT_BYTES), "HWPX")
        assertTrue(blocks.joinToString("\n") { it.text }.contains("정상 본문"))
        assertEquals(Reason.TOO_LARGE, assertThrows(CombinationReviewSourceClientException::class.java) {
            mapper.fromBytes(valid.copyOf(MAX_REVIEW_ATTACHMENT_BYTES + 1), "HWPX")
        }.reason)
    }

    private fun zip(name: String, bytes: ByteArray): ByteArray = ByteArrayOutputStream().also { output ->
        ZipOutputStream(output).use { it.putNextEntry(ZipEntry(name)); it.write(bytes); it.closeEntry() }
    }.toByteArray()
}
