import { readCatalogFilters, writeCatalogFilters } from '../../../shared/support-program/catalogSearchParams'

export type SupportProgramSearchReturnTo = '/' | '/chat' | `/?${string}` | `/chat?${string}`

/** 두 검색 경로와 검증된 필터만 복원합니다. 외부 URL·임의 경로는 허용하지 않습니다. */
export function getSupportProgramSearchReturnTo(state: unknown): SupportProgramSearchReturnTo {
  if (typeof state !== 'object' || state === null || !('searchReturnTo' in state) || typeof state.searchReturnTo !== 'string') return '/'
  const value = state.searchReturnTo
  if (value === '/' || value === '/chat') return value
  const match = /^(\/|\/chat)\?([^#]*)$/.exec(value)
  if (!match) return '/'
  const params = new URLSearchParams(match[2])
  if (params.get('mode') !== 'filter') return '/'
  const path = match[1] === '/chat' ? '/chat' : '/'
  return `${path}?${writeCatalogFilters(readCatalogFilters(params))}`
}
