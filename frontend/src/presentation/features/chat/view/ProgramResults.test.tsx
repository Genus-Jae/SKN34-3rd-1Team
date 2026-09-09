// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { conditionMatchedProgram, relocationReviewRequiredProgram, supportPrograms } from '../../../../data/fixtures/supportPrograms'
import { appPaths, publicPaths, supportProgramDetailPath } from '../../../shared/routes/appPaths'
import * as supportProgramEligibility from '../supportProgramEligibility'
import { ProgramResults } from './ProgramResults'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ProgramResults', () => {
  it.each([
    { initialPath: '/', inApp: false, detailPath: publicPaths.supportProgramDetail },
    { initialPath: appPaths.chat, inApp: true, detailPath: appPaths.supportProgramDetail },
  ])('$initialPath에서 상세 식별자의 특수문자와 검색 복귀 경로를 보존한다', ({ initialPath, inApp, detailPath }) => {
    const program = { ...conditionMatchedProgram, sourceCode: '기업마당 & 제공처?', id: '한글/공고 &키=?' }
    const expectedPath = supportProgramDetailPath({ sourceCode: program.sourceCode, sourceProgramId: program.id }, inApp)
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={initialPath} element={<ProgramResults programs={[program]} />} />
          <Route path={detailPath} element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: '상세 조건 보기' })
    expect(link.getAttribute('href')).toBe(expectedPath)
    const parsed = new URL(link.getAttribute('href')!, 'http://localhost')
    expect(parsed.pathname).toBe(detailPath)
    expect(parsed.searchParams.get('sourceCode')).toBe(program.sourceCode)
    expect(parsed.searchParams.get('sourceProgramId')).toBe(program.id)
    expect(Array.from(parsed.searchParams.keys())).toEqual(['sourceCode', 'sourceProgramId'])

    fireEvent.click(link)

    expect(screen.getByTestId('detail-location').textContent).toBe(JSON.stringify({
      pathname: detailPath, search: parsed.search, state: { searchReturnTo: initialPath },
    }))
  })

  it('검색 순서와 각 자격 표시를 유지하며 관련도 0점도 숨기지 않는다', () => {
    const programs = [
      { ...relocationReviewRequiredProgram, recommendationScore: null },
      { ...supportPrograms[3], eligibilityReview: null, recommendationScore: null },
      { ...conditionMatchedProgram, recommendationScore: null },
      { ...supportPrograms[2], eligibilityReview: null, recommendationScore: 0 },
    ]
    render(<ProgramResults programs={programs} />, { wrapper: SearchRouter })
    const cards = screen.getAllByRole('article')

    expect(screen.getByRole('heading', { name: '검색 결과 · 4건' })).toBeTruthy()
    expect(cards.map((card) => within(card).getByRole('heading', { level: 2 }).textContent))
      .toEqual(programs.map((program) => program.title))
    expect(within(cards[0]).getByText('확인 필요', { exact: true })).toBeTruthy()
    expect(within(cards[1]).getByText('자격 미평가', { exact: true })).toBeTruthy()
    expect(within(cards[2]).getByText('조건 확인 · API 본문 기준', { exact: true })).toBeTruthy()
    expect(within(cards[3]).getByText('자격 판정 없음 · 확인 필요', { exact: true })).toBeTruthy()
    expect(within(cards[3]).getByText('관련도 0점 · 자격 충족 확률이 아닙니다.')).toBeTruthy()
    for (const card of cards.slice(0, 3)) {
      expect(within(card).queryByText(/^관련도 .*점/)).toBeNull()
    }
  })

  it('같은 결과 배열로 부모가 다시 렌더돼도 카드를 재분류하지 않고 새 배열에는 반영한다', () => {
    const classify = vi.spyOn(supportProgramEligibility, 'getSupportProgramEligibilityKind')
    const programs = [conditionMatchedProgram, relocationReviewRequiredProgram]
    const { rerender } = render(<ProgramResults programs={programs} />, { wrapper: SearchRouter })
    expect(classify).toHaveBeenCalledTimes(2)

    rerender(<ProgramResults programs={programs} />)
    expect(classify).toHaveBeenCalledTimes(2)

    rerender(<ProgramResults programs={[...programs]} />)
    expect(classify).toHaveBeenCalledTimes(4)
  })
})

function SearchRouter({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
}

function LocationProbe() {
  const { pathname, search, state } = useLocation()
  return <output data-testid="detail-location">{JSON.stringify({ pathname, search, state })}</output>
}
