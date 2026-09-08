import { catalogSorts, catalogStatuses, type SupportProgramCatalogFilters } from '../../../domain/entities/SupportProgramCatalog'

export const defaultCatalogFilters: SupportProgramCatalogFilters = {
  keyword: '', region: '', category: '', status: 'OPEN', sort: 'RECENT', page: 1, pageSize: 12,
}

/** URL을 검색 상태로 복원할 때 알려진 필터만 받아들입니다. */
export function readCatalogFilters(params: URLSearchParams): SupportProgramCatalogFilters {
  const text = (key: string) => {
    const value = (params.get(key) ?? '').trim()
    return value.length <= (key === 'region' ? 50 : 100) && !/\p{C}/u.test(value) ? value : ''
  }
  const status = params.get('status') as SupportProgramCatalogFilters['status']
  const sort = params.get('sort') as SupportProgramCatalogFilters['sort']
  const pageText = params.get('page') ?? '1'
  const page = /^\d{1,7}$/.test(pageText) ? Number(pageText) : 1
  return { ...defaultCatalogFilters, keyword: text('keyword'), region: text('region'), category: text('category'),
    status: catalogStatuses.includes(status) ? status : 'OPEN', sort: catalogSorts.includes(sort) ? sort : 'RECENT',
    page: page >= 1 && page <= 1_000_000 ? page : 1 }
}

export function writeCatalogFilters(filters: SupportProgramCatalogFilters): URLSearchParams {
  const params = new URLSearchParams({ mode: 'filter' })
  for (const key of ['keyword', 'region', 'category', 'status', 'sort', 'page'] as const) {
    if (filters[key] !== defaultCatalogFilters[key]) params.set(key, String(filters[key]))
  }
  return params
}
