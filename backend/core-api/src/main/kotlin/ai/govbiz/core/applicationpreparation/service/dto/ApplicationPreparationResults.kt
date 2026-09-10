package ai.govbiz.core.applicationpreparation.service.dto

import ai.govbiz.core.applicationpreparation.domain.ApplicationFormManifest
import ai.govbiz.core.applicationpreparation.domain.ApplicationPreparationSummary
import ai.govbiz.core.applicationpreparation.domain.StoredApplicationPreparation

data class ApplicationPreparationDetailResult(
    val preparation: StoredApplicationPreparation,
    val form: ApplicationFormManifest,
)

data class ApplicationPreparationListItemResult(
    val preparation: ApplicationPreparationSummary,
    val form: ApplicationFormManifest,
)

data class ApplicationPreparationPageResult(
    val items: List<ApplicationPreparationListItemResult>,
    val nextBeforeId: Long?,
)
