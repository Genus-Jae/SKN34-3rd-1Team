// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { appContainer } from './app/appContainer'
import { createAppStore } from './app/store'
import { partnerRecruitmentDetail, partnerRecruitmentPage } from './data/fixtures/partnerRecruitments'
import { maskedCompanyLabel } from './presentation/features/public-partner-recruitment/view/publicPartnerMessages'
import type { Account } from './domain/entities/Account'
import { sessionRestored } from './presentation/shared/auth/state/authSlice'

vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({
  CoreApiConnectionStatus: () => null,
}))

const memberAccount: Account = { email: 'member@govbiz.local', role: 'USER', tier: 'MEMBER', emailVerified: true, company: null }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
  vi.spyOn(appContainer.resolve('browsePartnerRecruitmentsUseCase'), 'execute').mockResolvedValue(partnerRecruitmentPage)
  vi.spyOn(appContainer.resolve('getPartnerRecruitmentDetailUseCase'), 'execute')
    .mockImplementation(async (id) => (id === partnerRecruitmentDetail.id ? partnerRecruitmentDetail : null))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('공개 파트너 모집', () => {
  it('비로그인은 헤더 아래에서 모집글을 읽고 제안 대신 로그인 안내를 본다', async () => {
    renderApp('/partners', null)

    expect(screen.getByRole('banner', { name: '앱 헤더' })).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: '함께 신청할 기업 찾기' })).toBeTruthy()
    // 검색·요금제와 같은 공개 헤더를 공유하고 현재 화면 링크만 표시합니다.
    const navigation = screen.getByRole('navigation', { name: '화면 이동' })
    expect(within(navigation).getByRole('link', { name: '파트너 모집' }).getAttribute('aria-current')).toBe('page')
    expect(within(navigation).getByRole('link', { name: '지원사업 찾기' }).getAttribute('aria-current')).toBeNull()
    expect(within(navigation).getByRole('link', { name: '요금제' }).getAttribute('aria-current')).toBeNull()
    expect(await screen.findAllByRole('article')).toHaveLength(4)
    expect(screen.getByText('모집 중 4건 · 마감 임박순')).toBeTruthy()
    // 내 글 표시와 프로필 일치는 로그인 뒤에만 의미가 있습니다.
    expect(screen.queryByText('내가 쓴 모집글')).toBeNull()
    expect(screen.queryByText(/예시 일치/)).toBeNull()
    // 작성 기업 정보는 로그인 뒤에만 보여 주므로 상호·소재지가 DOM에도 없습니다.
    expect(screen.queryByText(partnerRecruitmentPage.recruitments[0]!.company.companyName)).toBeNull()
    expect(screen.getAllByRole('img', { name: maskedCompanyLabel })).toHaveLength(4)
    // 오른쪽 로그인 안내 카드는 없고, 자세히 보기가 로그인 안내 다이얼로그를 엽니다.
    expect(screen.queryByRole('complementary', { name: '로그인 안내' })).toBeNull()
    expect(screen.queryByRole('region', { name: '모집 원칙' })).toBeNull()
    expect(screen.queryByRole('link', { name: '로그인하고 제안하기' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: '자세히 보기' })[0]!)
    const dialog = screen.getByRole('dialog', { name: '로그인하면 할 수 있는 일' })
    expect(within(dialog).getByRole('link', { name: '로그인하고 제안하기' }).getAttribute('href'))
      .toBe('/login?next=%2Fpartners%2Fdetail%3FrecruitmentId%3D101')
    expect(within(dialog).queryByRole('link', { name: '기업 계정 만들기' })).toBeNull()
    expect(within(dialog).getByText('모집글을 직접 올리고 제안 받습니다.')).toBeTruthy()
    expect(within(dialog).queryByText(/담당자 이름과 연락처/)).toBeNull()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(appContainer.resolve('browsePartnerRecruitmentsUseCase').execute).toHaveBeenCalledWith(
      { keyword: '', seekingRoles: [], regions: [], mineOnly: false, sort: 'DEADLINE', page: 1 },
      expect.any(AbortSignal),
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('공개 상세는 공고와 조건만 보여 주고 제안 폼과 매칭은 두지 않는다', async () => {
    renderApp('/partners/detail?recruitmentId=101', null)

    expect(await screen.findByRole('heading', { level: 1, name: 'AI 실증 과제 데이터 구축·라벨링 참여기관 구합니다' })).toBeTruthy()
    expect(screen.getByRole('region', { name: '연결된 공고' })).toBeTruthy()
    expect(screen.getByText('서울 AI 스타트업 실증 지원사업')).toBeTruthy()
    expect(screen.queryByRole('form', { name: '참여 제안' })).toBeNull()
    expect(screen.queryByText('우리 기업과의 매칭')).toBeNull()
    expect(screen.queryByText(partnerRecruitmentDetail.company.companyName)).toBeNull()
    expect(screen.getByRole('img', { name: maskedCompanyLabel })).toBeTruthy()
    expect(screen.queryByRole('link', { name: '로그인하고 제안하기' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '로그인하고 제안하기' }))
    const dialog = screen.getByRole('dialog', { name: '로그인하면 할 수 있는 일' })
    expect(within(dialog).getByRole('link', { name: '로그인하고 제안하기' }).getAttribute('href'))
      .toBe('/login?next=%2Fpartners%2Fdetail%3FrecruitmentId%3D101')
    expect(within(dialog).queryByRole('link', { name: '기업 계정 만들기' })).toBeNull()
  })

  it.each(['999', 'abc', ''])('없는 공개 상세는 다른 글로 대체하지 않는다: %s', async (id) => {
    renderApp(`/partners/detail?recruitmentId=${id}`, null)

    expect(await screen.findByRole('heading', { name: '모집글을 찾을 수 없습니다' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '← 파트너 모집 목록' }).getAttribute('href')).toBe('/partners')
  })

  it('공개 상세의 로그인 안내를 따라가면 로그인 뒤 같은 모집글의 내부 상세로 돌아온다', async () => {
    renderApp('/partners/detail?recruitmentId=101', null)
    fireEvent.click(await screen.findByRole('button', { name: '로그인하고 제안하기' }))
    fireEvent.click(screen.getByRole('link', { name: '로그인하고 제안하기' }))
    expect(screen.getByRole('form', { name: '로그인' })).toBeTruthy()
  })
})

describe('로그인 상태의 공개 주소', () => {
  it.each([
    ['/', '지원사업 검색어'],
    ['/partners', '파트너 관리'],
  ])('%s에 오면 사이드바 안의 같은 화면으로 보낸다', (path, expected) => {
    renderApp(path, memberAccount)

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    expect(screen.queryByRole('banner', { name: '앱 헤더' })).toBeNull()
    expect(within(sidebar).getByText('member@govbiz.local')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: expected }) ?? screen.queryByRole('heading', { name: expected })).toBeTruthy()
  })

  it('로그인한 회원의 내부 상세에는 제안 폼이 있고 공개 상세의 로그인 안내는 없다', async () => {
    renderApp('/partners/detail?recruitmentId=101', memberAccount)

    expect(await screen.findByRole('form', { name: '참여 제안' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: '로그인하고 제안하기' })).toBeNull()
    expect(screen.queryByRole('button', { name: '로그인하고 제안하기' })).toBeNull()
    expect(screen.queryByRole('img', { name: maskedCompanyLabel })).toBeNull()
    expect(screen.getByRole('complementary', { name: '작업 사이드바' })).toBeTruthy()
  })

  it('비로그인으로 내부 주소에 오면 로그인으로 보내고 복귀 경로를 남긴다', () => {
    renderApp('/app/pricing', null)

    expect(screen.getByRole('form', { name: '로그인' })).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
  })
})

function renderApp(initialEntry: string, account: Account | null) {
  const store = createAppStore()
  store.dispatch(sessionRestored(account))
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </Provider>,
  )
}
