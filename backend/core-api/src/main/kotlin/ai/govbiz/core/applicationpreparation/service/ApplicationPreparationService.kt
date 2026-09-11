package ai.govbiz.core.applicationpreparation.service

import ai.govbiz.core.account.domain.Account
import ai.govbiz.core.applicationpreparation.domain.NewApplicationPreparation
import ai.govbiz.core.applicationpreparation.domain.exception.ApplicationPreparationNotFoundException
import ai.govbiz.core.applicationpreparation.repository.ApplicationPreparationRepository
import ai.govbiz.core.applicationpreparation.service.dto.ApplicationPreparationDetailResult
import ai.govbiz.core.applicationpreparation.service.dto.ApplicationPreparationListItemResult
import ai.govbiz.core.applicationpreparation.service.dto.ApplicationPreparationPageResult
import org.springframework.stereotype.Service

/** 세션 계정의 신청 준비 건 생성·목록·상세만 다룹니다. 문항 입력과 AI 실행은 후속 기능입니다. */
@Service
class ApplicationPreparationService(
    private val repository: ApplicationPreparationRepository,
    private val forms: ApplicationFormService,
) {
    fun supportedForms(account: Account) = forms.listSupported().also { require(account.id > 0) }

    fun create(account: Account, draft: NewApplicationPreparation): ApplicationPreparationDetailResult {
        val form = forms.requireSupported(
            draft.sourceCode,
            draft.sourceProgramId,
            draft.formVersionId,
            draft.serviceField,
        )
        return ApplicationPreparationDetailResult(repository.create(account.id, draft), form)
    }

    fun findOwned(account: Account, preparationId: Long): ApplicationPreparationDetailResult {
        val preparation = repository.findOwned(account.id, preparationId) ?: throw ApplicationPreparationNotFoundException()
        return ApplicationPreparationDetailResult(preparation, forms.requireVersion(preparation.draft.formVersionId))
    }

    fun listOwned(account: Account, beforeId: Long?, size: Int): ApplicationPreparationPageResult {
        require(size in 1..50 && (beforeId == null || beforeId > 0))
        val rows = repository.listOwned(account.id, beforeId, size + 1)
        val items = rows.take(size).map { summary ->
            ApplicationPreparationListItemResult(summary, forms.requireVersion(summary.formVersionId))
        }
        return ApplicationPreparationPageResult(items, items.lastOrNull()?.preparation?.id?.takeIf { rows.size > size })
    }
}
