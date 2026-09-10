package ai.govbiz.core._common.exception

import ai.govbiz.core.account.client.bizno.exception.BiznoClientException
import ai.govbiz.core.account.service.exception.AccountSuspendedException
import ai.govbiz.core.account.service.exception.AuthenticationRequiredException
import ai.govbiz.core.account.service.exception.BusinessNotActiveException
import ai.govbiz.core.account.service.exception.BusinessNotFoundException
import ai.govbiz.core.account.service.exception.BusinessNumberAlreadyRegisteredException
import ai.govbiz.core.account.service.exception.CompanyAlreadyRegisteredException
import ai.govbiz.core.account.service.exception.CompanyNotRegisteredException
import ai.govbiz.core.account.service.exception.CompanyProfileInvalidException
import ai.govbiz.core.account.service.exception.CurrentPasswordMismatchException
import ai.govbiz.core.account.service.exception.EmailAlreadyRegisteredException
import ai.govbiz.core.account.service.exception.InvalidCredentialsException
import ai.govbiz.core.account.service.exception.LoginRateLimitedException
import ai.govbiz.core.account.service.exception.SessionOriginRejectedException
import ai.govbiz.core.combinationreview.domain.exception.CombinationReviewNotFoundException
import ai.govbiz.core.combinationreview.domain.exception.CombinationReviewRevisionConflictException
import ai.govbiz.core.combinationreview.controller.exception.InvalidCombinationReviewInputException
import ai.govbiz.core.combinationreview.service.exception.CombinationReviewRunException
import ai.govbiz.core.combinationreview.domain.exception.CombinationReviewRunConflictException
import ai.govbiz.core.combinationreview.service.exception.ReviewRunFailureCode
import ai.govbiz.core.partner.service.exception.CompanyRequiredException
import ai.govbiz.core.partner.service.exception.ProposalActionForbiddenException
import ai.govbiz.core.partner.service.exception.ProposalAlreadySentException
import ai.govbiz.core.partner.service.exception.ProposalNotFoundException
import ai.govbiz.core.partner.service.exception.ProposalNotPendingException
import ai.govbiz.core.partner.service.exception.ProposalToOwnRecruitmentException
import ai.govbiz.core.partner.service.exception.RecruitmentAlreadyExistsException
import ai.govbiz.core.partner.service.exception.RecruitmentClosedException
import ai.govbiz.core.partner.service.exception.RecruitmentDeadlineNotAllowedException
import ai.govbiz.core.partner.service.exception.RecruitmentNotFoundException
import ai.govbiz.core.partner.service.exception.RecruitmentProgramClosedException
import ai.govbiz.core.partner.service.exception.RecruitmentProgramNotFoundException
import ai.govbiz.core.supportprogram.service.detail.exception.SupportProgramNotFoundException
import ai.govbiz.core.supportprogram.service.search.exception.SupportProgramSearchResultExpiredException
import ai.govbiz.core.supportprogram.service.catalog.exception.SupportProgramCatalogFilterException
import ai.govbiz.core.supportprogram.service.evidence.exception.SupportProgramEvidenceNotSupportedException
import ai.govbiz.core.supportprogram.service.evidence.exception.SupportProgramEvidenceUnavailableException
import ai.govbiz.core.supportprogram.service.admission.exception.SupportProgramRequestRejectedException
import jakarta.servlet.http.HttpServletRequest
import java.net.URI
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatusCode
import org.springframework.http.MediaType
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.validation.FieldError
import org.springframework.web.HttpMediaTypeNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException

@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(SupportProgramSearchResultExpiredException::class)
    fun handleSearchResultExpired(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.GONE, URI.create("urn:govbiz:problem:support-program-search-result-expired"),
                "Search Result Expired", "The saved search result is no longer available. Please search again.",
                "SUPPORT_PROGRAM_SEARCH_RESULT_EXPIRED",
            ), request,
        )

    @ExceptionHandler(CombinationReviewRunConflictException::class)
    fun handleCombinationReviewRunConflict(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(ProblemDefinition(HttpStatus.CONFLICT, URI.create("urn:govbiz:problem:combination-review-run-conflict"),
            "Combination Review Run Conflict", "The request key has a different payload or another run is active.", "COMBINATION_REVIEW_RUN_CONFLICT"), request)

    @ExceptionHandler(CombinationReviewRunException::class)
    fun handleCombinationReviewRunFailure(error: CombinationReviewRunException, request: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val status = when (error.code) {
            ReviewRunFailureCode.SOURCE_UNSUPPORTED, ReviewRunFailureCode.SOURCE_TOO_LARGE -> HttpStatus.UNPROCESSABLE_CONTENT
            ReviewRunFailureCode.RUN_CAPACITY_EXCEEDED, ReviewRunFailureCode.RUN_RATE_LIMITED -> HttpStatus.TOO_MANY_REQUESTS
            else -> HttpStatus.SERVICE_UNAVAILABLE
        }
        val response = problemResponse(ProblemDefinition(status, URI.create("urn:govbiz:problem:combination-review-run-failed"),
            "Combination Review Run Failed", "The review could not be completed. Inspect the saved run before retrying.", error.code.name), request)
        error.runId?.let { response.body?.setProperty("runId", it) }
        error.retryAfterSeconds?.let { seconds ->
            return ResponseEntity.status(status).headers(response.headers).header(HttpHeaders.RETRY_AFTER, seconds.toString()).body(response.body)
        }
        return response
    }

    @ExceptionHandler(CombinationReviewNotFoundException::class)
    fun handleCombinationReviewNotFound(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.NOT_FOUND, URI.create("urn:govbiz:problem:combination-review-not-found"),
                "Combination Review Not Found", "The requested combination review is not available.",
                "COMBINATION_REVIEW_NOT_FOUND",
            ), request,
        )

    @ExceptionHandler(CombinationReviewRevisionConflictException::class)
    fun handleCombinationReviewRevisionConflict(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.CONFLICT, URI.create("urn:govbiz:problem:combination-review-revision-conflict"),
                "Combination Review Revision Conflict", "Reload the current input before editing again.",
                "COMBINATION_REVIEW_REVISION_CONFLICT",
            ), request,
        )

    @ExceptionHandler(InvalidCombinationReviewInputException::class)
    fun handleInvalidCombinationReviewInput(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        validationProblem(
            HttpStatus.BAD_REQUEST, URI.create("urn:govbiz:problem:request-validation-failed"),
            "Request Validation Failed", "The combination review input is invalid.",
            "REQUEST_VALIDATION_FAILED", emptyList(), request,
        )

    @ExceptionHandler(SupportProgramCatalogFilterException::class)
    fun handleSupportProgramCatalogFilterException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        validationProblem(
            HttpStatus.BAD_REQUEST,
            URI.create("urn:govbiz:problem:request-validation-failed"),
            "Request Validation Failed",
            "K-Startup filters require the KSTARTUP source.",
            "REQUEST_VALIDATION_FAILED",
            listOf(ValidationError("sourceCode", "INVALID_VALUE")),
            request,
        )

    @ExceptionHandler(SupportProgramRequestRejectedException::class)
    fun handleSupportProgramRequestRejectedException(
        exception: SupportProgramRequestRejectedException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val rateLimited = exception.reason == SupportProgramRequestRejectedException.Reason.RATE_LIMITED
        val status = if (rateLimited) HttpStatus.TOO_MANY_REQUESTS else HttpStatus.SERVICE_UNAVAILABLE
        val problem = ProblemDetail.forStatusAndDetail(
            status,
            if (rateLimited) "Too many support program requests. Please retry later."
            else "Support program request capacity is currently full. Please retry later.",
        )
        problem.type = URI.create(
            if (rateLimited) "urn:govbiz:problem:support-program-rate-limited"
            else "urn:govbiz:problem:support-program-busy",
        )
        problem.title = if (rateLimited) "Support Program Rate Limited" else "Support Program Busy"
        problem.instance = URI.create(request.requestURI)
        problem.setProperty("code", if (rateLimited) "SUPPORT_PROGRAM_RATE_LIMITED" else "SUPPORT_PROGRAM_BUSY")
        problem.setProperty("retryAfterSeconds", exception.retryAfterSeconds)
        return ResponseEntity.status(status)
            .contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .header(HttpHeaders.RETRY_AFTER, exception.retryAfterSeconds.toString())
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(problem)
    }

    @ExceptionHandler(SupportProgramNotFoundException::class)
    fun handleSupportProgramNotFoundException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.NOT_FOUND,
                URI.create("urn:govbiz:problem:support-program-not-found"),
                "Support Program Not Found",
                "The requested support program does not exist or is no longer available.",
                "SUPPORT_PROGRAM_NOT_FOUND",
            ),
            request,
        )

    @ExceptionHandler(SupportProgramEvidenceNotSupportedException::class)
    fun handleSupportProgramEvidenceNotSupportedException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.UNPROCESSABLE_CONTENT,
                URI.create("urn:govbiz:problem:support-program-evidence-not-supported"),
                "Support Program Evidence Not Supported",
                "Evidence-based answers are not supported for this support program source.",
                "SUPPORT_PROGRAM_EVIDENCE_NOT_SUPPORTED",
            ),
            request,
        )

    @ExceptionHandler(SupportProgramEvidenceUnavailableException::class)
    fun handleSupportProgramEvidenceUnavailableException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.SERVICE_UNAVAILABLE,
                URI.create("urn:govbiz:problem:support-program-evidence-unavailable"),
                "Support Program Evidence Unavailable",
                "Evidence-based answers are temporarily unavailable for this support program.",
                "SUPPORT_PROGRAM_EVIDENCE_UNAVAILABLE",
            ),
            request,
        )

    @ExceptionHandler(AiServiceCallException::class)
    fun handleAiServiceCallException(
        exception: AiServiceCallException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        problemResponse(definitionFor(exception.failure), request)

    @ExceptionHandler(LoginRateLimitedException::class)
    fun handleLoginRateLimitedException(
        exception: LoginRateLimitedException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val response = problemResponse(
            ProblemDefinition(
                HttpStatus.TOO_MANY_REQUESTS,
                URI.create("urn:govbiz:problem:login-rate-limited"),
                "Login Rate Limited",
                "Too many login attempts. Please retry later.",
                "LOGIN_RATE_LIMITED",
            ),
            request,
        )
        response.body?.setProperty("retryAfterSeconds", exception.retryAfterSeconds)
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, exception.retryAfterSeconds.toString())
            .contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .body(response.body)
    }

    @ExceptionHandler(SessionOriginRejectedException::class)
    fun handleSessionOriginRejectedException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.FORBIDDEN,
                URI.create("urn:govbiz:problem:session-origin-rejected"),
                "Session Origin Rejected",
                "The request origin is not allowed to use the session cookie.",
                "SESSION_ORIGIN_REJECTED",
            ),
            request,
        )

    @ExceptionHandler(AccountSuspendedException::class)
    fun handleAccountSuspendedException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.FORBIDDEN,
                URI.create("urn:govbiz:problem:account-suspended"),
                "Account Suspended",
                "The account is suspended.",
                "ACCOUNT_SUSPENDED",
            ),
            request,
        )

    @ExceptionHandler(EmailAlreadyRegisteredException::class)
    fun handleEmailAlreadyRegisteredException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.CONFLICT,
                URI.create("urn:govbiz:problem:email-already-registered"),
                "Email Already Registered",
                "An account with this email already exists.",
                "EMAIL_ALREADY_REGISTERED",
            ),
            request,
        )

    @ExceptionHandler(CompanyProfileInvalidException::class)
    fun handleCompanyProfileInvalidException(
        exception: CompanyProfileInvalidException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        validationProblem(
            HttpStatus.BAD_REQUEST,
            URI.create("urn:govbiz:problem:request-validation-failed"),
            "Request Validation Failed",
            "One or more request fields are invalid.",
            "REQUEST_VALIDATION_FAILED",
            listOf(ValidationError(exception.field, "INVALID_VALUE")),
            request,
        )

    @ExceptionHandler(CompanyNotRegisteredException::class)
    fun handleCompanyNotRegisteredException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.NOT_FOUND,
                URI.create("urn:govbiz:problem:company-not-registered"),
                "Company Not Registered",
                "This account has not registered a company yet.",
                "COMPANY_NOT_REGISTERED",
            ),
            request,
        )

    @ExceptionHandler(CompanyAlreadyRegisteredException::class)
    fun handleCompanyAlreadyRegisteredException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.CONFLICT,
                URI.create("urn:govbiz:problem:company-already-registered"),
                "Company Already Registered",
                "This account already has a registered company.",
                "COMPANY_ALREADY_REGISTERED",
            ),
            request,
        )

    @ExceptionHandler(BusinessNumberAlreadyRegisteredException::class)
    fun handleBusinessNumberAlreadyRegisteredException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.CONFLICT,
                URI.create("urn:govbiz:problem:business-number-already-registered"),
                "Business Number Already Registered",
                "Another account has already registered this business number.",
                "BUSINESS_NUMBER_ALREADY_REGISTERED",
            ),
            request,
        )

    @ExceptionHandler(BusinessNotFoundException::class)
    fun handleBusinessNotFoundException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.NOT_FOUND,
                URI.create("urn:govbiz:problem:business-not-found"),
                "Business Not Found",
                "The business number is not registered with the National Tax Service.",
                "BUSINESS_NOT_FOUND",
            ),
            request,
        )

    @ExceptionHandler(CompanyRequiredException::class)
    fun handleCompanyRequiredException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.FORBIDDEN,
                URI.create("urn:govbiz:problem:company-required"),
                "Company Required",
                "Register a company in the profile before writing a recruitment or sending a proposal.",
                "COMPANY_REQUIRED",
            ),
            request,
        )

    @ExceptionHandler(RecruitmentProgramNotFoundException::class)
    fun handleRecruitmentProgramNotFoundException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.NOT_FOUND,
                URI.create("urn:govbiz:problem:recruitment-program-not-found"),
                "Recruitment Program Not Found",
                "The support program to attach the recruitment to was not found.",
                "RECRUITMENT_PROGRAM_NOT_FOUND",
            ),
            request,
        )

    @ExceptionHandler(RecruitmentProgramClosedException::class)
    fun handleRecruitmentProgramClosedException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.UNPROCESSABLE_CONTENT,
                URI.create("urn:govbiz:problem:recruitment-program-closed"),
                "Recruitment Program Closed",
                "The support program is no longer accepting applications.",
                "RECRUITMENT_PROGRAM_CLOSED",
            ),
            request,
        )

    @ExceptionHandler(RecruitmentDeadlineNotAllowedException::class)
    fun handleRecruitmentDeadlineNotAllowedException(
        exception: RecruitmentDeadlineNotAllowedException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val response = problemResponse(
            ProblemDefinition(
                HttpStatus.UNPROCESSABLE_CONTENT,
                URI.create("urn:govbiz:problem:recruitment-deadline-not-allowed"),
                "Recruitment Deadline Not Allowed",
                "The recruitment deadline must be today or later and before the program application deadline.",
                "RECRUITMENT_DEADLINE_NOT_ALLOWED",
            ),
            request,
        )
        exception.latestAllowedDeadline?.let { response.body?.setProperty("latestAllowedDeadline", it.toString()) }
        return response
    }

    @ExceptionHandler(RecruitmentAlreadyExistsException::class)
    fun handleRecruitmentAlreadyExistsException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.CONFLICT,
                URI.create("urn:govbiz:problem:recruitment-already-exists"),
                "Recruitment Already Exists",
                "This account already has a recruitment for the support program.",
                "RECRUITMENT_ALREADY_EXISTS",
            ),
            request,
        )

    @ExceptionHandler(RecruitmentNotFoundException::class)
    fun handleRecruitmentNotFoundException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.NOT_FOUND,
                URI.create("urn:govbiz:problem:recruitment-not-found"),
                "Recruitment Not Found",
                "The recruitment was not found.",
                "RECRUITMENT_NOT_FOUND",
            ),
            request,
        )

    @ExceptionHandler(ProposalNotFoundException::class)
    fun handleProposalNotFoundException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.NOT_FOUND,
                URI.create("urn:govbiz:problem:proposal-not-found"),
                "Proposal Not Found",
                "The proposal was not found.",
                "PROPOSAL_NOT_FOUND",
            ),
            request,
        )

    @ExceptionHandler(ProposalToOwnRecruitmentException::class)
    fun handleProposalToOwnRecruitmentException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.UNPROCESSABLE_CONTENT,
                URI.create("urn:govbiz:problem:proposal-own-recruitment"),
                "Proposal To Own Recruitment",
                "A proposal cannot be sent to your own recruitment.",
                "PROPOSAL_OWN_RECRUITMENT",
            ),
            request,
        )

    @ExceptionHandler(RecruitmentClosedException::class)
    fun handleRecruitmentClosedException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.UNPROCESSABLE_CONTENT,
                URI.create("urn:govbiz:problem:recruitment-closed"),
                "Recruitment Closed",
                "The recruitment is no longer open for proposals.",
                "RECRUITMENT_CLOSED",
            ),
            request,
        )

    @ExceptionHandler(ProposalAlreadySentException::class)
    fun handleProposalAlreadySentException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.CONFLICT,
                URI.create("urn:govbiz:problem:proposal-already-sent"),
                "Proposal Already Sent",
                "This account already sent a proposal to the recruitment.",
                "PROPOSAL_ALREADY_SENT",
            ),
            request,
        )

    @ExceptionHandler(ProposalNotPendingException::class)
    fun handleProposalNotPendingException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.CONFLICT,
                URI.create("urn:govbiz:problem:proposal-not-pending"),
                "Proposal Not Pending",
                "The proposal is no longer pending.",
                "PROPOSAL_NOT_PENDING",
            ),
            request,
        )

    @ExceptionHandler(ProposalActionForbiddenException::class)
    fun handleProposalActionForbiddenException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.FORBIDDEN,
                URI.create("urn:govbiz:problem:proposal-action-forbidden"),
                "Proposal Action Forbidden",
                "Only the recruitment owner can accept or decline, and only the proposer can withdraw.",
                "PROPOSAL_ACTION_FORBIDDEN",
            ),
            request,
        )

    @ExceptionHandler(BusinessNotActiveException::class)
    fun handleBusinessNotActiveException(
        exception: BusinessNotActiveException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val response = problemResponse(
            ProblemDefinition(
                HttpStatus.UNPROCESSABLE_CONTENT,
                URI.create("urn:govbiz:problem:business-not-active"),
                "Business Not Active",
                "Only an active business can be registered.",
                "BUSINESS_NOT_ACTIVE",
            ),
            request,
        )
        response.body?.setProperty("businessStatus", exception.businessStatus)
        return response
    }

    @ExceptionHandler(BiznoClientException::class)
    fun handleBiznoClientException(
        exception: BiznoClientException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        problemResponse(definitionFor(exception.failure), request)

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentialsException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.UNAUTHORIZED,
                URI.create("urn:govbiz:problem:invalid-credentials"),
                "Invalid Credentials",
                "The email or password is incorrect.",
                "INVALID_CREDENTIALS",
            ),
            request,
        )

    @ExceptionHandler(CurrentPasswordMismatchException::class)
    fun handleCurrentPasswordMismatchException(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        problemResponse(
            ProblemDefinition(
                HttpStatus.UNPROCESSABLE_CONTENT,
                URI.create("urn:govbiz:problem:current-password-mismatch"),
                "Current Password Mismatch",
                "The current password is incorrect.",
                "CURRENT_PASSWORD_MISMATCH",
            ),
            request,
        )

    @ExceptionHandler(AuthenticationRequiredException::class)
    fun handleAuthenticationRequiredException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val response = problemResponse(
            ProblemDefinition(
                HttpStatus.UNAUTHORIZED,
                URI.create("urn:govbiz:problem:authentication-required"),
                "Authentication Required",
                "A valid session token is required.",
                "AUTHENTICATION_REQUIRED",
            ),
            request,
        )
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .headers(response.headers)
            .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
            .contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .body(response.body)
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleMethodArgumentNotValidException(
        exception: MethodArgumentNotValidException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val errors = java.util.List.copyOf(
            exception.bindingResult.fieldErrors.map(::toValidationError).distinct(),
        )

        return validationProblem(
            HttpStatus.BAD_REQUEST,
            URI.create("urn:govbiz:problem:request-validation-failed"),
            "Request Validation Failed",
            "One or more request fields are invalid.",
            "REQUEST_VALIDATION_FAILED",
            errors,
            request,
        )
    }

    @ExceptionHandler(HandlerMethodValidationException::class)
    fun handleHandlerMethodValidationException(
        exception: HandlerMethodValidationException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val errors = java.util.List.copyOf(
            exception.parameterValidationResults
                .map { result ->
                    ValidationError(
                        result.methodParameter.parameterName ?: "request",
                        "INVALID_VALUE",
                    )
                }
                .distinct(),
        )

        return validationProblem(
            HttpStatus.BAD_REQUEST,
            URI.create("urn:govbiz:problem:request-validation-failed"),
            "Request Validation Failed",
            "One or more request fields are invalid.",
            "REQUEST_VALIDATION_FAILED",
            errors,
            request,
        )
    }

    @ExceptionHandler(MissingServletRequestParameterException::class)
    fun handleMissingServletRequestParameterException(
        exception: MissingServletRequestParameterException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        validationProblem(
            HttpStatus.BAD_REQUEST,
            URI.create("urn:govbiz:problem:request-validation-failed"),
            "Request Validation Failed",
            "One or more request fields are invalid.",
            "REQUEST_VALIDATION_FAILED",
            listOf(ValidationError(exception.parameterName, "INVALID_VALUE")),
            request,
        )

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleMethodArgumentTypeMismatchException(
        exception: MethodArgumentTypeMismatchException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        validationProblem(
            HttpStatus.BAD_REQUEST,
            URI.create("urn:govbiz:problem:request-validation-failed"),
            "Request Validation Failed",
            "One or more request fields are invalid.",
            "REQUEST_VALIDATION_FAILED",
            listOf(ValidationError(exception.name, "INVALID_VALUE")),
            request,
        )

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleHttpMessageNotReadableException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        validationProblem(
            HttpStatus.BAD_REQUEST,
            URI.create("urn:govbiz:problem:request-validation-failed"),
            "Request Validation Failed",
            "The request body is invalid.",
            "REQUEST_VALIDATION_FAILED",
            emptyList(),
            request,
        )

    @ExceptionHandler(HttpMediaTypeNotSupportedException::class)
    fun handleHttpMediaTypeNotSupportedException(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        validationProblem(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            URI.create("urn:govbiz:problem:unsupported-media-type"),
            "Unsupported Media Type",
            "This endpoint accepts application/json requests.",
            "UNSUPPORTED_MEDIA_TYPE",
            emptyList(),
            request,
        )

    private fun validationProblem(
        status: HttpStatusCode,
        type: URI,
        title: String,
        detail: String,
        code: String,
        errors: List<ValidationError>,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val definition = ProblemDefinition(status, type, title, detail, code)
        return problemResponse(definition, request, errors)
    }

    private fun problemResponse(
        definition: ProblemDefinition,
        request: HttpServletRequest,
        errors: List<ValidationError>? = null,
    ): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatusAndDetail(definition.status, definition.detail)
        problem.type = definition.type
        problem.title = definition.title
        problem.instance = URI.create(request.requestURI)
        problem.setProperty("code", definition.code)
        if (errors != null) {
            problem.setProperty("errors", errors)
        }

        return ResponseEntity.status(definition.status)
            .contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .headers { headers ->
                if (request.requestURI == "/api/v1/combination-reviews" ||
                    request.requestURI.startsWith("/api/v1/combination-reviews/") ||
                    request.requestURI == "/api/v1/support-programs/search" ||
                    request.requestURI == "/api/v1/support-programs/search/results") {
                    headers.cacheControl = "no-store"
                }
            }
            .body(problem)
    }

    private fun toValidationError(fieldError: FieldError): ValidationError =
        ValidationError(fieldError.field, "INVALID_VALUE")

    private fun definitionFor(failure: AiServiceFailure): ProblemDefinition =
        when (failure) {
            AiServiceFailure.UPSTREAM_ERROR -> ProblemDefinition(
                HttpStatus.BAD_GATEWAY,
                URI.create("urn:govbiz:problem:ai-service-upstream-error"),
                "AI Service Upstream Error",
                "AI Service returned an unexpected HTTP status.",
                "AI_SERVICE_UPSTREAM_ERROR",
            )
            AiServiceFailure.INVALID_RESPONSE -> ProblemDefinition(
                HttpStatus.BAD_GATEWAY,
                URI.create("urn:govbiz:problem:ai-service-invalid-response"),
                "AI Service Invalid Response",
                "AI Service returned an invalid response.",
                "AI_SERVICE_INVALID_RESPONSE",
            )
            AiServiceFailure.UNAVAILABLE -> ProblemDefinition(
                HttpStatus.SERVICE_UNAVAILABLE,
                URI.create("urn:govbiz:problem:ai-service-unavailable"),
                "AI Service Unavailable",
                "AI Service is currently unavailable.",
                "AI_SERVICE_UNAVAILABLE",
            )
            AiServiceFailure.TIMEOUT -> ProblemDefinition(
                HttpStatus.GATEWAY_TIMEOUT,
                URI.create("urn:govbiz:problem:ai-service-timeout"),
                "AI Service Gateway Timeout",
                "AI Service did not respond within the configured timeout.",
                "AI_SERVICE_TIMEOUT",
            )
        }

    private fun definitionFor(failure: BiznoClientException.Failure): ProblemDefinition =
        when (failure) {
            BiznoClientException.Failure.NOT_CONFIGURED -> ProblemDefinition(
                HttpStatus.SERVICE_UNAVAILABLE,
                URI.create("urn:govbiz:problem:bizno-not-configured"),
                "Bizno Not Configured",
                "Business registration lookup is not configured on this server.",
                "BIZNO_NOT_CONFIGURED",
            )
            BiznoClientException.Failure.UNAVAILABLE -> ProblemDefinition(
                HttpStatus.SERVICE_UNAVAILABLE,
                URI.create("urn:govbiz:problem:bizno-unavailable"),
                "Bizno Unavailable",
                "Business registration lookup is currently unavailable.",
                "BIZNO_UNAVAILABLE",
            )
            BiznoClientException.Failure.TIMEOUT -> ProblemDefinition(
                HttpStatus.GATEWAY_TIMEOUT,
                URI.create("urn:govbiz:problem:bizno-timeout"),
                "Bizno Gateway Timeout",
                "Business registration lookup did not respond within the configured timeout.",
                "BIZNO_TIMEOUT",
            )
            BiznoClientException.Failure.UPSTREAM_ERROR -> ProblemDefinition(
                HttpStatus.BAD_GATEWAY,
                URI.create("urn:govbiz:problem:bizno-upstream-error"),
                "Bizno Upstream Error",
                "Business registration lookup returned an unexpected result.",
                "BIZNO_UPSTREAM_ERROR",
            )
            BiznoClientException.Failure.INVALID_RESPONSE -> ProblemDefinition(
                HttpStatus.BAD_GATEWAY,
                URI.create("urn:govbiz:problem:bizno-invalid-response"),
                "Bizno Invalid Response",
                "Business registration lookup returned an invalid response.",
                "BIZNO_INVALID_RESPONSE",
            )
        }

    private data class ProblemDefinition(
        val status: HttpStatusCode,
        val type: URI,
        val title: String,
        val detail: String,
        val code: String,
    )

    private data class ValidationError(
        val field: String,
        val code: String,
    )
}
