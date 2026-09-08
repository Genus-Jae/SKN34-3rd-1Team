import { afterEach, describe, expect, it, vi } from 'vitest'

import { BrowseSupportProgramsUseCase } from '../../../domain/usecases/BrowseSupportProgramsUseCase'
import type { SupportProgramCatalogFilters } from '../../../domain/entities/SupportProgramCatalog'
import { supportPrograms } from '../../fixtures/supportPrograms'
import { SupportProgramRepositoryImpl } from '../../repositories/SupportProgramRepositoryImpl'
import { browseSupportProgramsApi } from '../supportProgramCatalogApi'

const defaultCatalogFilters: SupportProgramCatalogFilters = { keyword: '', region: '', category: '', status: 'OPEN', sort: 'RECENT', page: 1, pageSize: 12 }
const response = { programs: [{ ...supportPrograms[0], recommendationScore: null, matchedReasons: [] }], total: 1, page: 1, pageSize: 12, totalPages: 1, regions: ['서울'], categories: ['수출'] }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('공고 카탈로그 HTTP 경계', () => {
  it('키워드가 있어도 catalog GET만 사용하며 취소 신호·복합 식별자를 보존한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(response))
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal
    const useCase = new BrowseSupportProgramsUseCase(new SupportProgramRepositoryImpl())
    const result = await useCase.execute({ ...defaultCatalogFilters, keyword: ' 수출 & AI ', region: '서울', category: '수출' }, signal)
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/api/v1/support-programs/catalog')
    expect(url.searchParams.get('keyword')).toBe('수출 & AI')
    expect(url.searchParams.get('region')).toBe('서울')
    expect(fetchMock.mock.calls[0][1].signal).toBe(signal)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result.programs).toEqual(response.programs)
    expect(result.programs[0]).not.toBe(response.programs[0])
  })

  it.each([
    { ...response, totalPages: 2 }, { ...response, total: 3 }, { ...response, page: 2 },
    { ...response, regions: ['서울', '서울'] }, { ...response, programs: [{ ...response.programs[0], recommendationScore: 90 }] },
    { ...response, programs: [{ ...response.programs[0], sourceUrl: 'https://evil.example' }] },
    { ...response, programs: [response.programs[0], response.programs[0]], total: 2 },
  ])('모순되거나 신뢰할 수 없는 목록 계약을 거부한다 (%#)', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)))
    await expect(browseSupportProgramsApi(defaultCatalogFilters)).rejects.toThrow()
  })

  it('범위를 벗어난 페이지의 빈 결과와 전체 건수를 수용한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...response, programs: [], page: 2 })))
    await expect(browseSupportProgramsApi({ ...defaultCatalogFilters, page: 2 })).resolves.toMatchObject({ total: 1, programs: [], page: 2 })
  })

  it('실패를 숨기거나 AI로 재시도하지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('비밀 서버 오류', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(browseSupportProgramsApi(defaultCatalogFilters)).rejects.toThrow('공고 목록을 불러오지 못했습니다.')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
