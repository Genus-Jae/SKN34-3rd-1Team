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

  it.each([3, 5])('전체 %s건 중 2건만 공개하고 나머지는 내용 없는 잠금 카드와 인증 링크로 표시한다', (totalCount) => {
    const token = '4595df20-ea11-4b17-a37e-c82e1b5c9142'
    render(<ProgramResults programs={supportPrograms.slice(0, 2)} totalCount={totalCount} resultToken={token} />, { wrapper: SearchRouter })
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: `검색 결과 · ${totalCount}건 중 2건 공개` })).toBeTruthy()
    const locked = screen.getByRole('list', { name: '로그인 후 공개되는 지원사업' })
    expect(within(locked).getAllByRole('listitem')).toHaveLength(totalCount - 2)
    expect(within(locked).queryAllByRole('link')).toHaveLength(0)
    for (const program of supportPrograms.slice(2)) expect(screen.queryByText(program.title)).toBeNull()
    for (const [name, pathname] of [['회원가입하고 전체 보기', '/signup'], ['로그인하고 전체 보기', '/login']]) {
      const url = new URL(screen.getByRole('link', { name }).getAttribute('href')!, 'http://localhost')
      expect(url.pathname).toBe(pathname)
      expect(url.searchParams.get('next')).toBe(`/app/chat?searchResult=${token}`)
      expect(url.searchParams.size).toBe(1)
    }
  })

  it.each([0, 1, 2, 5])('전체 공개 %s건에는 잠금 카드나 가입 유도를 표시하지 않는다', (totalCount) => {
    render(<ProgramResults programs={supportPrograms.slice(0, totalCount)} totalCount={totalCount} resultToken={null} />, { wrapper: SearchRouter })
    expect(screen.queryByRole('region', { name: '추가 검색 결과' })).toBeNull()
    expect(screen.queryByRole('link', { name: '회원가입하고 전체 보기' })).toBeNull()
    expect(screen.getByRole('heading', { name: `검색 결과 · ${totalCount}건` })).toBeTruthy()
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

  it('충청남도 공고는 개별 원문이 아닌 공식 공지 목록임을 알리고 다른 출처의 원문 링크는 유지한다', () => {
    const programs = [
      { ...supportPrograms[0], sourceCode: 'CNTRADE_NOTICE', sourceName: '충청남도 온라인수출지원시스템',
        sourceUrl: 'https://cntrade.chungnam.go.kr/home/kor/M102638244/board.do' },
      { ...supportPrograms[0], sourceCode: 'MSIT', sourceName: '과학기술정보통신부',
        sourceUrl: 'https://www.msit.go.kr/bbs/view.do' },
    ]
    render(<ProgramResults programs={programs} />, { wrapper: SearchRouter })
    const cards = screen.getAllByRole('article')
    const noticeLink = within(cards[0]).getByRole('link', { name: '공식 공지 목록 ↗' })
    expect(noticeLink.getAttribute('href')).toBe(programs[0].sourceUrl)
    expect(noticeLink.getAttribute('rel')).toBe('noreferrer')
    expect(within(cards[0]).getByText('제목으로 해당 공지를 확인해 주세요.')).toBeTruthy()
    expect(within(cards[0]).queryByRole('link', { name: '원문 보기 ↗' })).toBeNull()
    expect(within(cards[1]).getByRole('link', { name: '원문 보기 ↗' }).getAttribute('href')).toBe(programs[1].sourceUrl)
    expect(within(cards[1]).queryByText('제목으로 해당 공지를 확인해 주세요.')).toBeNull()
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
