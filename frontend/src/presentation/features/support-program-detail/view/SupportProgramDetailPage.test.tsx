// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { appContainer } from '../../../../app/appContainer'
import { supportPrograms } from '../../../../data/fixtures/supportPrograms'
import { SupportProgramDetailPage } from './SupportProgramDetailPage'
import { SupportProgramEvidenceQuestionPage } from './SupportProgramEvidenceQuestionPage'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('상세 오류 복구와 검색 화면 복귀', () => {
  it('일시 실패 후 같은 화면에서 수동 재시도하고 근거 질문은 자동 호출하지 않는다', async () => {
    const detail = vi.spyOn(appContainer.resolve('getSupportProgramDetailUseCase'), 'execute')
      .mockRejectedValueOnce(new Error('private failure')).mockResolvedValueOnce(supportPrograms[0])
    const question = vi.spyOn(appContainer.resolve('askSupportProgramEvidenceQuestionUseCase'), 'execute')
      .mockResolvedValue({ outcome: 'unavailable' })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: '상세 정보 다시 불러오기' }))
    await screen.findByRole('heading', { name: supportPrograms[0].title })
    expect(detail).toHaveBeenCalledTimes(2)
    expect(question).not.toHaveBeenCalled()
    expect(screen.queryByText('private failure')).toBeNull()
  })

  it('상세·질문을 왕복해도 원래 작업 채팅으로 복귀한다', async () => {
    vi.spyOn(appContainer.resolve('getSupportProgramDetailUseCase'), 'execute').mockResolvedValue(supportPrograms[0])
    renderDetail({ searchReturnTo: '/app/chat' })
    expect(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' }).getAttribute('href')).toBe('/app/chat')
    fireEvent.click(await screen.findByRole('link', { name: '이 공고에 질문하기' }))
    fireEvent.click(screen.getByRole('link', { name: '← 공고 상세로 돌아가기' }))
    await screen.findByRole('heading', { name: supportPrograms[0].title })
    expect(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' }).getAttribute('href')).toBe('/app/chat')
  })

  it.each([null, {}, { searchReturnTo: 'https://example.com' }, { searchReturnTo: '//example.com' }, { searchReturnTo: '/admin' }])(
    '직접 진입 또는 허용하지 않는 복귀 상태 %j는 첫 검색 화면으로 돌아간다', async (state) => {
      vi.spyOn(appContainer.resolve('getSupportProgramDetailUseCase'), 'execute').mockResolvedValue(null)
      renderDetail(state)
      await screen.findByRole('heading', { name: '공고 정보를 찾을 수 없습니다' })
      expect(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' }).getAttribute('href')).toBe('/')
      expect(screen.queryByRole('button', { name: '상세 정보 다시 불러오기' })).toBeNull()
    },
  )

  it('잘못된 식별자는 조회하지 않고 원래 검색 화면의 복귀 링크를 유지한다', () => {
    const detail = vi.spyOn(appContainer.resolve('getSupportProgramDetailUseCase'), 'execute').mockResolvedValue(null)
    renderDetail({ searchReturnTo: '/app/chat' }, '?sourceCode=BIZINFO')
    expect(screen.getByRole('heading', { name: '공고 정보를 찾을 수 없습니다' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' }).getAttribute('href')).toBe('/app/chat')
    expect(detail).not.toHaveBeenCalled()
  })
})

function renderDetail(state: unknown = null, search = `?${new URLSearchParams({ sourceCode: supportPrograms[0].sourceCode, sourceProgramId: supportPrograms[0].id })}`) {
  render(<MemoryRouter initialEntries={[{ pathname: '/support-programs/detail', search, state }]}><Routes>
    <Route path="/support-programs/detail" element={<SupportProgramDetailPage />} />
    <Route path="/support-programs/detail/question" element={<SupportProgramEvidenceQuestionPage />} />
  </Routes></MemoryRouter>)
}
