package ai.govbiz.core.applicationpreparation.service

import ai.govbiz.core.applicationpreparation.domain.ApplicationFormManifest
import ai.govbiz.core.applicationpreparation.domain.ApplicationServiceField
import ai.govbiz.core.applicationpreparation.service.exception.ApplicationFormNotSupportedException
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper

/** 첫 지원 대상의 고정 manifest만 읽는다. 원격 파일을 runtime에 다시 받아 자동 채택하지 않는다. */
@Service
class ApplicationFormService(objectMapper: ObjectMapper) {
    private val form: ApplicationFormManifest = ClassPathResource(MANIFEST_PATH).inputStream.use {
        objectMapper.readValue(it, ApplicationFormManifest::class.java)
    }

    fun listSupported(): List<ApplicationFormManifest> = listOf(form)

    fun requireSupported(
        sourceCode: String,
        sourceProgramId: String,
        formVersionId: String,
        serviceField: ApplicationServiceField,
    ): ApplicationFormManifest {
        if (
            form.sourceCode != sourceCode ||
            form.sourceProgramId != sourceProgramId ||
            form.formVersionId != formVersionId ||
            !form.supports(serviceField)
        ) {
            throw ApplicationFormNotSupportedException()
        }
        return form
    }

    fun requireVersion(formVersionId: String): ApplicationFormManifest =
        form.takeIf { it.formVersionId == formVersionId } ?: throw ApplicationFormNotSupportedException()

    private companion object {
        const val MANIFEST_PATH = "application-preparation/innovation-voucher-2026-v1.json"
    }
}
