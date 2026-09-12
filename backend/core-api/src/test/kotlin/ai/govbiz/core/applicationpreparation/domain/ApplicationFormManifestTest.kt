package ai.govbiz.core.applicationpreparation.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ApplicationFormManifestTest {
    @Test
    fun preservesTheVerifiedSourceAndSupportedSections() {
        val form = form()
        assertTrue(form.supports(ApplicationServiceField.TECHNICAL_SUPPORT))
        assertFalse(form.institutionReviewed)
        assertEquals(listOf("company-overview", "voucher-plan", "voucher-necessity"), form.sections.map { it.key })
    }

    @Test
    fun acceptsAnUnreviewedFormExtractedFromAnOfficialSourceDocument() {
        val form = form(verificationStatus = "SOURCE_DOCUMENT_EXTRACTED")
        assertEquals("SOURCE_DOCUMENT_EXTRACTED", form.verificationStatus)
        assertFalse(form.institutionReviewed)
    }

    @Test
    fun rejectsDuplicateSectionsUnsafeSourcesAndInstitutionReviewClaims() {
        assertThrows(IllegalArgumentException::class.java) { form(sections = listOf(section("same"), section("same"))) }
        assertThrows(IllegalArgumentException::class.java) { form(sourceUrl = "http://example.com/form") }
        assertThrows(IllegalArgumentException::class.java) { form(institutionReviewed = true) }
        assertThrows(IllegalArgumentException::class.java) { form(attachmentSha256 = "not-a-hash") }
    }

    private fun form(
        sourceUrl: String = "https://www.bizinfo.go.kr/form",
        institutionReviewed: Boolean = false,
        attachmentSha256: String = "a".repeat(64),
        verificationStatus: String = "SOURCE_HASH_AND_LOCATORS_VERIFIED",
        sections: List<ApplicationFormSectionDefinition> = listOf(
            section("company-overview"),
            section("voucher-plan"),
            section("voucher-necessity"),
        ),
    ) = ApplicationFormManifest(
        1,
        "verified-form-v1",
        "BIZINFO",
        "PBLN_1",
        "지원사업",
        "사업계획서",
        sourceUrl,
        "공식 양식.hwpx",
        10,
        attachmentSha256,
        verificationStatus,
        institutionReviewed,
        ApplicationServiceField.entries,
        sections,
    )

    private fun section(key: String) = ApplicationFormSectionDefinition(
        key,
        "문항",
        "HWPX paragraph 1",
        "작성 안내",
        listOf(ApplicationFormFieldDefinition("field-one", "입력", "확인된 값을 입력합니다.", true)),
    )
}
