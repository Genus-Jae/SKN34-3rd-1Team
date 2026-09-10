package ai.govbiz.core.account.controller.dto

import ai.govbiz.core.account.service.dto.AccountDeletionPreview
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * 비밀번호는 로그·예외 메시지에 남지 않도록 toString을 제한합니다. 새 비밀번호 규칙은 가입과 같은 8~72자입니다.
 * 로그인한 세션이 곧 본인 확인이므로 현재 비밀번호는 받지 않습니다(계정 삭제는 계속 받습니다).
 */
class ChangePasswordRequest(
    @field:NotBlank
    @field:Size(min = 8, max = 72)
    val newPassword: String,
) {
    override fun toString(): String = "ChangePasswordRequest"
}

class DeleteAccountRequest(
    @field:NotBlank
    @field:Size(max = 72)
    val password: String,
) {
    override fun toString(): String = "DeleteAccountRequest"
}

data class AccountDeletionPreviewResponse(
    val hasCompany: Boolean,
    val openRecruitmentCount: Int,
    val receivedPendingProposalCount: Int,
    val sentPendingProposalCount: Int,
) {
    companion object {
        fun from(preview: AccountDeletionPreview): AccountDeletionPreviewResponse =
            AccountDeletionPreviewResponse(
                hasCompany = preview.hasCompany,
                openRecruitmentCount = preview.openRecruitmentCount,
                receivedPendingProposalCount = preview.receivedPendingProposalCount,
                sentPendingProposalCount = preview.sentPendingProposalCount,
            )
    }
}
