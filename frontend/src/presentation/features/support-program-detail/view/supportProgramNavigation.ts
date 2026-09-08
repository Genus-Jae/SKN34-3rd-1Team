import { appPaths } from '../../../shared/routes/appPaths'
import { readCatalogFilters, writeCatalogFilters } from '../../../shared/support-program/catalogSearchParams'

export type SupportProgramSearchReturnTo = '/' | typeof appPaths.chat | `/?${string}` | `${typeof appPaths.chat}?${string}`

/** 두 검색 경로와 검증된 필터만 복원합니다. 외부 URL·임의 경로는 허용하지 않습니다. */
export function getSupportProgramSearchReturnTo(state: unknown): SupportProgramSearchReturnTo {
  if (typeof state !== 'object' || state === null || !('searchReturnTo' in state) || typeof state.searchReturnTo !== 'string') return '/'
  const value = state.searchReturnTo
  if (value === '/' || value === appPaths.chat) return value
  const queryIndex = value.indexOf('?')
  const path = value.slice(0, queryIndex)
  if (queryIndex < 0 || (path !== '/' && path !== appPaths.chat) || value.includes('#')) return '/'
  const params = new URLSearchParams(value.slice(queryIndex + 1))
  if (params.get('mode') !== 'filter') return '/'
  return `${path}?${writeCatalogFilters(readCatalogFilters(params))}`
}
