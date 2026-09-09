package ai.govbiz.core.partner.controller

import ai.govbiz.core.account.domain.Account
import ai.govbiz.core.account.service.exception.AuthenticationRequiredException
import ai.govbiz.core.partner.controller.dto.CreatePartnerRecruitmentRequest
import ai.govbiz.core.partner.controller.dto.PartnerRecruitmentListResponse
import ai.govbiz.core.partner.controller.dto.PartnerRecruitmentResponse
import ai.govbiz.core.partner.domain.PartnerRecruitmentQuery
import ai.govbiz.core.partner.domain.PartnerRecruitmentSort
import ai.govbiz.core.partner.domain.PartnerRole
import ai.govbiz.core.partner.service.PartnerRecruitmentService
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/** 파트너 모집글입니다. 읽기는 누구나, 작성은 기업을 등록한 회원만 할 수 있습니다. [Account]는 세션 쿠키로 채워집니다. */
@RestController
@RequestMapping("/api/v1/partners/recruitments")
class PartnerRecruitmentController(
    private val recruitmentService: PartnerRecruitmentService,
) {

    @PostMapping
    fun create(
        account: Account,
        @RequestBody @Valid request: CreatePartnerRecruitmentRequest,
    ): ResponseEntity<PartnerRecruitmentResponse> {
        val view = recruitmentService.create(account, request.sourceCode.trim(), request.sourceProgramId.trim(), request.toInput())
        return ResponseEntity.status(HttpStatus.CREATED).body(PartnerRecruitmentResponse.from(view, account.id))
    }

    /**
     * 목록은 비로그인도 읽을 수 있습니다. 검색어·찾는 역할·지역·정렬은 화면 조건과 같고,
     * `mine=true`는 세션이 있어야 하며 마감된 내 글도 포함합니다.
     */
    @GetMapping
    fun list(
        account: Account?,
        @RequestParam(defaultValue = "") @Size(max = PartnerRecruitmentQuery.MAX_KEYWORD_LENGTH) keyword: String,
        @RequestParam(required = false) seekingRole: PartnerRole?,
        @RequestParam(defaultValue = "") @Size(max = 20) region: String,
        @RequestParam(defaultValue = "false") mine: Boolean,
        @RequestParam(defaultValue = "DEADLINE") sort: PartnerRecruitmentSort,
        @RequestParam(defaultValue = "1") @Min(1) @Max(100_000) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) pageSize: Int,
    ): PartnerRecruitmentListResponse {
        // 세션 쿠키 유무는 웹 계층만 알 수 있으므로 내 글 조회의 로그인 요구는 여기서 판단합니다.
        if (mine && account == null) throw AuthenticationRequiredException()
        val query = PartnerRecruitmentQuery(
            keyword = keyword.trim(),
            seekingRole = seekingRole,
            region = region.trim(),
            mineAccountId = if (mine) account?.id else null,
            sort = sort,
            page = page,
            pageSize = pageSize,
        )
        return PartnerRecruitmentListResponse.from(recruitmentService.findPage(query), account?.id)
    }

    /** 비로그인도 읽을 수 있으므로 [Account]는 선택입니다. 쿠키가 있으면 내 글 여부와 내 제안을 함께 돌려줍니다. */
    @GetMapping("/{id}")
    fun detail(account: Account?, @PathVariable id: Long): PartnerRecruitmentResponse =
        PartnerRecruitmentResponse.from(recruitmentService.findView(id, account?.id), account?.id)
}
