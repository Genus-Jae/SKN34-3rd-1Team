package ai.govbiz.core.applicationpreparation.controller.dto

import ai.govbiz.core.applicationpreparation.controller.exception.InvalidApplicationPreparationInputException
import ai.govbiz.core.applicationpreparation.domain.ApplicationServiceField
import ai.govbiz.core.applicationpreparation.domain.NewApplicationPreparation
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class CreateApplicationPreparationRequest(
    @field:NotBlank @field:Size(max = 64) val sourceCode: String,
    @field:NotBlank @field:Size(max = 255) val sourceProgramId: String,
    @field:NotBlank @field:Pattern(regexp = "[a-z0-9][a-z0-9-]{0,159}") val formVersionId: String,
    @field:NotBlank val serviceField: String,
) {
    fun toDraft(): NewApplicationPreparation = try {
        NewApplicationPreparation(
            sourceCode = sourceCode,
            sourceProgramId = sourceProgramId,
            formVersionId = formVersionId,
            serviceField = ApplicationServiceField.valueOf(serviceField),
        )
    } catch (_: IllegalArgumentException) {
        throw InvalidApplicationPreparationInputException()
    }
}
