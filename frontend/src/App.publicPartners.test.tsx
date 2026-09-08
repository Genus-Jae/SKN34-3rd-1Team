// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createAppStore } from './app/store'
import type { Account } from './domain/entities/Account'
import { sessionRestored } from './presentation/shared/auth/state/authSlice'

vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({
  CoreApiConnectionStatus: () => null,
}))

const memberAccount: Account = { email: 'member@govbiz.local', role: 'USER', tier: 'MEMBER', emailVerified: true }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('공개 파트너 모집', () => {
  it('비로그인은 헤더 아래에서 모집글을 읽고 제안 대신 로그인 안내를 본다', () => {
    renderApp('/partners', null)

    expect(screen.getByRole('banner', { name: '앱 헤더' })).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: '함께 신청할 기업 찾기' })).toBeTruthy()
    // 검색·요금제와 같은 공개 헤더를 공유하고 현재 화면 링크만 표시합니다.
    const navigation = screen.getByRole('navigation', { name: '화면 이동' })
    expect(within(navigation).getByRole('link', { name: '파트너 모집' }).getAttribute('aria-current')).toBe('page')
    expect(within(navigation).getByRole('link', { name: '지원사업 찾기' }).getAttribute('aria-current')).toBeNull()
    expect(within(navigation).getByRole('link', { name: '요금제' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getAllByRole('article').length).toBe(4)
    expect(screen.queryByText(/내 프로필 일치/)).toBeNull()
    expect(screen.getByRole('link', { name: '로그인하고 제안하기' }).getAttribute('href')).toBe('/login?next=%2Fpartners')
    expect(screen.getByRole('link', { name: '자세히 보기' }).getAttribute('href')).toBe('/partners/detail?recruitmentId=ai-labeling')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('공개 상세는 공고와 조건만 보여 주고 제안 폼과 매칭은 두지 않는다', () => {
    renderApp('/partners/detail?recruitmentId=ai-labeling', null)

    expect(screen.getByRole('heading', { level: 1, name: 'AI 실증 과제 데이터 구축·라벨링 참여기관 구합니다' })).toBeTruthy()
    expect(screen.getByRole('region', { name: '연결된 공고' })).toBeTruthy()
    expect(screen.queryByRole('form', { name: '참여 제안' })).toBeNull()
    expect(screen.queryByText('우리 기업과의 매칭')).toBeNull()
    expect(screen.getByRole('link', { name: '로그인하고 제안하기' }).getAttribute('href'))
      .toBe('/login?next=%2Fpartners%2Fdetail%3FrecruitmentId%3Dai-labeling')
    expect(screen.getByRole('link', { name: '기업 계정 만들기' }).getAttribute('href')).toBe('/signup')
  })

  it('준비되지 않은 공개 상세는 첫 예시로 대체하지 않는다', () => {
    renderApp('/partners/detail?recruitmentId=smart-factory', null)

    expect(screen.getByRole('heading', { name: '준비되지 않은 모집글 상세입니다' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '← 파트너 모집 목록' }).getAttribute('href')).toBe('/partners')
  })

  it('공개 상세의 로그인 안내를 따라가면 로그인 뒤 같은 모집글의 내부 상세로 돌아온다', () => {
    renderApp('/partners/detail?recruitmentId=ai-labeling', null)
    fireEvent.click(screen.getByRole('link', { name: '로그인하고 제안하기' }))
    expect(screen.getByRole('form', { name: '로그인' })).toBeTruthy()
  })
})

describe('로그인 상태의 공개 주소', () => {
  it.each([
    ['/', '지원사업 검색어'],
    ['/partners', '함께 신청할 기업 찾기'],
  ])('%s에 오면 사이드바 안의 같은 화면으로 보낸다', (path, expected) => {
    renderApp(path, memberAccount)

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    expect(screen.queryByRole('banner', { name: '앱 헤더' })).toBeNull()
    expect(within(sidebar).getByText('member@govbiz.local')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: expected }) ?? screen.queryByRole('heading', { name: expected })).toBeTruthy()
  })

  it('로그인한 회원의 내부 상세에는 제안 폼이 있고 공개 상세의 로그인 안내는 없다', () => {
    renderApp('/partners/detail?recruitmentId=ai-labeling', memberAccount)

    expect(screen.getByRole('form', { name: '참여 제안' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: '로그인하고 제안하기' })).toBeNull()
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
