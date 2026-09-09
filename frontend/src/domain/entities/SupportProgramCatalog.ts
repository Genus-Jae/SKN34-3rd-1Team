import type { SupportProgram } from './SupportProgram'

export const catalogStatuses = ['ALL', 'OPEN', 'UPCOMING', 'CLOSED', 'UNKNOWN'] as const
export const catalogSorts = ['RECENT', 'DEADLINE'] as const
export const catalogSourceCodes = ['', 'BIZINFO', 'KSTARTUP'] as const

/** 제공처가 분류한 공고를 탐색하는 필터이며 기업의 신청 자격이 아닙니다. */
export type SupportProgramCatalogFilters = {
  keyword: string
  region: string
  category: string
  sourceCode: typeof catalogSourceCodes[number]
  startupStage: string
  applicantType: string
  founderAge: string
  status: typeof catalogStatuses[number]
  sort: typeof catalogSorts[number]
  page: number
  pageSize: number
}

export type SupportProgramCatalog = {
  programs: SupportProgram[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  regions: string[]
  categories: string[]
  startupStages: string[]
  applicantTypes: string[]
  founderAges: string[]
}
