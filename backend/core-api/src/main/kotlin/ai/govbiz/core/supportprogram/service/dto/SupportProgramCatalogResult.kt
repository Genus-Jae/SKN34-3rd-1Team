package ai.govbiz.core.supportprogram.service.dto

import ai.govbiz.core.supportprogram.domain.SupportProgram

data class SupportProgramCatalogResult(
    val programs: List<SupportProgram>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
    val totalPages: Int,
    val regions: List<String>,
    val categories: List<String>,
)
