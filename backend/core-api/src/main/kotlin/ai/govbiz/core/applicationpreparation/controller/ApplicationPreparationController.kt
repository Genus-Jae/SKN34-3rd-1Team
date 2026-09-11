package ai.govbiz.core.applicationpreparation.controller

import ai.govbiz.core.account.domain.Account
import ai.govbiz.core.applicationpreparation.controller.dto.ApplicationPreparationPageResponse
import ai.govbiz.core.applicationpreparation.controller.dto.ApplicationPreparationResponse
import ai.govbiz.core.applicationpreparation.controller.dto.CreateApplicationPreparationRequest
import ai.govbiz.core.applicationpreparation.controller.dto.SupportedApplicationFormsResponse
import ai.govbiz.core.applicationpreparation.controller.dto.ApplicationInterpretationResponse
import ai.govbiz.core.applicationpreparation.controller.dto.InterpretApplicationPreparationRequest
import ai.govbiz.core.applicationpreparation.controller.dto.ReplaceApplicationPreparationInputsRequest
import ai.govbiz.core.applicationpreparation.service.ApplicationPreparationService
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import java.net.URI
import org.springframework.http.CacheControl
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/application-preparations")
class ApplicationPreparationController(private val service: ApplicationPreparationService) {
    @GetMapping("/forms")
    fun forms(account: Account): ResponseEntity<SupportedApplicationFormsResponse> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(SupportedApplicationFormsResponse.from(service.supportedForms(account)))

    @PostMapping
    fun create(
        account: Account,
        @RequestBody @Valid request: CreateApplicationPreparationRequest,
    ): ResponseEntity<ApplicationPreparationResponse> {
        val result = service.create(account, request.toDraft())
        return ResponseEntity.created(URI.create("/api/v1/application-preparations/${result.preparation.id}"))
            .cacheControl(CacheControl.noStore())
            .body(ApplicationPreparationResponse.from(result))
    }

    @GetMapping
    fun list(
        account: Account,
        @RequestParam(required = false) @Min(1) beforeId: Long?,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) size: Int,
    ): ResponseEntity<ApplicationPreparationPageResponse> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(ApplicationPreparationPageResponse.from(service.listOwned(account, beforeId, size)))

    @GetMapping("/{id}")
    fun detail(
        account: Account,
        @PathVariable @Min(1) id: Long,
    ): ResponseEntity<ApplicationPreparationResponse> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(ApplicationPreparationResponse.from(service.findOwned(account, id)))

    @PostMapping("/{id}/sections/{sectionKey}/messages")
    fun interpret(
        account: Account,
        @PathVariable @Min(1) id: Long,
        @PathVariable sectionKey: String,
        @RequestBody @Valid request: InterpretApplicationPreparationRequest,
    ): ResponseEntity<ApplicationInterpretationResponse> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
            ApplicationInterpretationResponse.from(
                service.interpret(account, id, sectionKey, request.expectedRevision, request.requestKey, request.message.trim()),
            ),
        )

    @PutMapping("/{id}/sections/{sectionKey}/inputs")
    fun replaceInputs(
        account: Account,
        @PathVariable @Min(1) id: Long,
        @PathVariable sectionKey: String,
        @RequestBody @Valid request: ReplaceApplicationPreparationInputsRequest,
    ): ResponseEntity<ApplicationPreparationResponse> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
            ApplicationPreparationResponse.from(service.replaceInputs(account, id, sectionKey, request.expectedRevision, request.toFacts())),
        )
}
