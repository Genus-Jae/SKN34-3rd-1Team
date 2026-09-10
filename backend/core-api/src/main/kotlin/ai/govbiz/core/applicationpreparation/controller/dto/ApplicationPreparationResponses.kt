package ai.govbiz.core.applicationpreparation.controller.dto

import ai.govbiz.core.applicationpreparation.domain.ApplicationFormManifest
import ai.govbiz.core.applicationpreparation.domain.ApplicationFormSectionDefinition
import ai.govbiz.core.applicationpreparation.service.dto.ApplicationPreparationDetailResult
import ai.govbiz.core.applicationpreparation.service.dto.ApplicationPreparationListItemResult
import ai.govbiz.core.applicationpreparation.service.dto.ApplicationPreparationPageResult
import java.time.OffsetDateTime
import java.time.ZoneId

data class ApplicationFormResponse(
    val formVersionId: String,
    val sourceCode: String,
    val sourceProgramId: String,
    val programTitle: String,
    val formTitle: String,
    val sourceUrl: String,
    val verificationStatus: String,
    val institutionReviewed: Boolean,
    val supportedServiceFields: List<String>,
    val sections: List<ApplicationFormSectionResponse>,
) {
    companion object {
        fun from(form: ApplicationFormManifest) = ApplicationFormResponse(
            form.formVersionId,
            form.sourceCode,
            form.sourceProgramId,
            form.programTitle,
            form.formTitle,
            form.sourceUrl,
            form.verificationStatus,
            form.institutionReviewed,
            form.supportedServiceFields.map { it.name },
            form.sections.map(ApplicationFormSectionResponse::from),
        )
    }
}

data class ApplicationFormSectionResponse(
    val key: String,
    val title: String,
    val locator: String,
    val description: String,
    val status: String = "NOT_STARTED",
) {
    companion object {
        fun from(section: ApplicationFormSectionDefinition) = ApplicationFormSectionResponse(
            section.key,
            section.title,
            section.locator,
            section.description,
        )
    }
}

data class SupportedApplicationFormsResponse(val items: List<ApplicationFormResponse>) {
    companion object {
        fun from(forms: List<ApplicationFormManifest>) = SupportedApplicationFormsResponse(forms.map(ApplicationFormResponse::from))
    }
}

data class ApplicationPreparationResponse(
    val id: Long,
    val inputRevision: Long,
    val serviceField: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
    val form: ApplicationFormResponse,
) {
    companion object {
        fun from(result: ApplicationPreparationDetailResult) = ApplicationPreparationResponse(
            result.preparation.id,
            result.preparation.inputRevision,
            result.preparation.draft.serviceField.name,
            result.preparation.createdAt.atZone(SEOUL).toOffsetDateTime(),
            result.preparation.updatedAt.atZone(SEOUL).toOffsetDateTime(),
            ApplicationFormResponse.from(result.form),
        )
    }
}

data class ApplicationPreparationSummaryResponse(
    val id: Long,
    val inputRevision: Long,
    val serviceField: String,
    val programTitle: String,
    val formTitle: String,
    val updatedAt: OffsetDateTime,
) {
    companion object {
        fun from(result: ApplicationPreparationListItemResult) = ApplicationPreparationSummaryResponse(
            result.preparation.id,
            result.preparation.inputRevision,
            result.preparation.serviceField.name,
            result.form.programTitle,
            result.form.formTitle,
            result.preparation.updatedAt.atZone(SEOUL).toOffsetDateTime(),
        )
    }
}

data class ApplicationPreparationPageResponse(
    val items: List<ApplicationPreparationSummaryResponse>,
    val nextBeforeId: Long?,
) {
    companion object {
        fun from(page: ApplicationPreparationPageResult) = ApplicationPreparationPageResponse(
            page.items.map(ApplicationPreparationSummaryResponse::from),
            page.nextBeforeId,
        )
    }
}

private val SEOUL = ZoneId.of("Asia/Seoul")
