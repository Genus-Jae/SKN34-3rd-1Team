import { catalogSorts, catalogStatuses, type SupportProgramCatalogFilters } from '../entities/SupportProgramCatalog'
import type { SupportProgramRepository } from '../repositories/SupportProgramRepository'

/** AI 해석·랭킹 없이 저장 공고를 명시적인 필터로 조회합니다. */
export class BrowseSupportProgramsUseCase {
  private readonly repository: Pick<SupportProgramRepository, 'browseCatalog'>

  constructor(repository: Pick<SupportProgramRepository, 'browseCatalog'>) { this.repository = repository }

  execute(command: SupportProgramCatalogFilters, signal?: AbortSignal) {
    const normalized = { ...command, keyword: command.keyword.trim(), region: command.region.trim(), category: command.category.trim() }
    if ([normalized.keyword, normalized.region, normalized.category].some((value) => value.length > 100 || /\p{C}/u.test(value))
      || normalized.region.length > 50 || !catalogStatuses.includes(command.status) || !catalogSorts.includes(command.sort)
      || !Number.isInteger(command.page) || command.page < 1 || command.page > 1_000_000
      || !Number.isInteger(command.pageSize) || command.pageSize < 1 || command.pageSize > 50) {
      throw new Error('공고 검색 조건을 확인해 주세요.')
    }
    return this.repository.browseCatalog(normalized, signal)
  }
}
