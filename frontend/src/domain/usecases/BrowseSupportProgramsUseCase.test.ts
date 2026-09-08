import { describe, expect, it, vi } from 'vitest'

import type { SupportProgramCatalogFilters } from '../entities/SupportProgramCatalog'
import { BrowseSupportProgramsUseCase } from './BrowseSupportProgramsUseCase'

const filters: SupportProgramCatalogFilters = { keyword: '', region: '', category: '', status: 'OPEN', sort: 'RECENT', page: 1, pageSize: 12 }
describe('BrowseSupportProgramsUseCase', () => {
  it('빈 키워드도 허용하고 필터를 정규화해 전달한다', async () => {
    const browseCatalog = vi.fn().mockResolvedValue({ total: 0 })
    const signal = new AbortController().signal
    await new BrowseSupportProgramsUseCase({ browseCatalog }).execute({ ...filters, keyword: '  ', region: ' 서울 ' }, signal)
    expect(browseCatalog).toHaveBeenCalledWith({ ...filters, region: '서울' }, signal)
  })
  it.each([{ page: 0 }, { page: 1.5 }, { page: 1_000_001 }, { pageSize: 51 }, { keyword: '가'.repeat(101) }, { keyword: 'abc\u0000' }])(
    '잘못된 입력은 요청 전에 거부한다 %j', (invalid) => {
      const browseCatalog = vi.fn()
      expect(() => new BrowseSupportProgramsUseCase({ browseCatalog }).execute({ ...filters, ...invalid })).toThrow()
      expect(browseCatalog).not.toHaveBeenCalled()
    },
  )
})
