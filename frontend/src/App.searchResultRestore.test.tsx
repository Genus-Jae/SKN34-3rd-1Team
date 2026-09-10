// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { appContainer } from './app/appContainer'
import { createAppStore } from './app/store'
import { supportPrograms } from './data/fixtures/supportPrograms'
import { emptyConversationContext, seoulConversationContext } from './data/fixtures/supportProgramConversation'
import { interpretationStarted } from './presentation/features/chat/state/chatSlice'
import { sessionRestored, signedOut } from './presentation/shared/auth/state/authSlice'

vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({ CoreApiConnectionStatus: () => null }))
vi.mock('./presentation/features/chat/hooks/useSupportProgramSearchReadiness', () => ({
  useSupportProgramSearchReadiness: () => ({
    canSearch: true, isError: false, isInitialLoading: false, isRefreshing: false, refetch: vi.fn(),
    data: { searchState: 'SEARCHABLE', programCount: 10, indexReady: true,
      lastSuccessfulSyncAt: null, lastFailedSyncAt: null, sources: [{ sourceCode: 'BIZINFO', sourceName: '기업마당',
        searchState: 'SEARCHABLE', programCount: 10, indexReady: true, lastSuccessfulSyncAt: null, lastFailedSyncAt: null }] },
  }),
}))

const token = 'ce5a0b64-5496-47e4-8bab-05392e7661c9'
const returnTo = '/app/chat?searchResult=' + token
const account = { email: 'member@example.test', role: 'USER' as const, tier: 'MEMBER' as const, emailVerified: true, company: null }
const originals = [4, 2, 5, 1, 3].map((index) => ({ ...supportPrograms[0]!, id: 'original-' + index, title: '선택한 검색 공고 ' + index }))
const restored = { query: seoulConversationContext.query, context: seoulConversationContext,
  programs: originals, totalCount: originals.length, resultToken: null, expiresAt: null }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(restored)))
  vi.spyOn(appContainer.resolve('signUpUseCase'), 'execute').mockResolvedValue({
    outcome: 'session', session: { account, expiresAt: '2026-12-01T00:00:00+09:00' },
  })
  vi.spyOn(appContainer.resolve('logInUseCase'), 'execute').mockResolvedValue({
    outcome: 'session', session: { account, expiresAt: '2026-12-01T00:00:00+09:00' },
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('가입·로그인 후 선택한 검색의 원본 복원', () => {
  it('가입과 로그인 화면을 왕복해도 선택한 검색의 next를 유지한다', () => {
    renderApp('/signup?next=' + encodeURIComponent(returnTo))
    const loginLink = screen.getByRole('link', { name: '로그인' })
    expect(loginLink.getAttribute('href')).toBe('/login?next=' + encodeURIComponent(returnTo))
    fireEvent.click(loginLink)
    expect(screen.getByRole('form', { name: '로그인' })).toBeTruthy()
    const signupLink = screen.getByRole('link', { name: '기업 계정 만들기' })
    expect(signupLink.getAttribute('href')).toBe('/signup?next=' + encodeURIComponent(returnTo))
    fireEvent.click(signupLink)
    expect(screen.getByRole('form', { name: '회원가입' })).toBeTruthy()
    expect(new URLSearchParams(locationText().split('?')[1]).get('next')).toBe(returnTo)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each(['signup', 'login'] as const)('%s 성공 후 추가 검색 없이 선택한 원본 5개와 조건만 복원한다', async (entry) => {
    const { store } = renderApp('/' + entry + '?next=' + encodeURIComponent(returnTo))
    await submitAuth(entry)
    await waitFor(() => expect(store.getState().chat.messages.at(-1)?.programs).toEqual(originals))
    expect(locationText()).toBe('/app/chat')
    expect(screen.getAllByRole('link', { name: '상세 조건 보기' })).toHaveLength(5)
    expect(store.getState().chat.messages).toHaveLength(3)
    expect(store.getState().chat.messages.some((message) => message.text.includes('이전 다른 대화'))).toBe(false)
    expect(store.getState().chat.confirmedSearch).toEqual({
      query: seoulConversationContext.query, acceptingOnly: seoulConversationContext.acceptingOnly,
      companyConditions: seoulConversationContext.companyConditions,
    })
    expect(store.getState().chat.lastSearch).toEqual({ context: seoulConversationContext, resultCount: 5 })
    expect(fetch).toHaveBeenCalledOnce()
    const fetchMock = vi.mocked(fetch)
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/api/v1/support-programs/search/results')
    expect(fetchMock.mock.calls[0]![1]?.method).toBe('POST')
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ resultToken: token })

    act(() => store.dispatch(signedOut()))
    await screen.findByRole('form', { name: '로그인' })
    expect(locationText()).not.toContain(token)
    expect(store.getState().chat.messages).toHaveLength(1)
    expect(store.getState().chat.lastSearch).toBeNull()
  })

  it('비회원이 복원 경로에 직접 들어오면 로그인·가입 링크를 거쳐 같은 선택으로 돌아온다', async () => {
    const { store } = renderApp(returnTo)
    expect(screen.getByRole('form', { name: '로그인' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: '기업 계정 만들기' }))
    expect(screen.getByRole('form', { name: '회원가입' })).toBeTruthy()
    await submitAuth('signup')
    await waitFor(() => expect(store.getState().chat.messages.at(-1)?.programs).toEqual(originals))
    expect(fetch).toHaveBeenCalledOnce()
    expect(locationText()).toBe('/app/chat')
  })
})

function renderApp(path: string) {
  const store = createAppStore()
  store.dispatch(sessionRestored(null))
  store.dispatch(interpretationStarted({ message: '이전 다른 대화', context: emptyConversationContext, pendingClarification: null }))
  return { ...render(<Provider store={store}><MemoryRouter initialEntries={[path]}>
    <App /><CurrentLocation />
  </MemoryRouter></Provider>), store }
}
function CurrentLocation() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}
function locationText() { return screen.getByTestId('location').textContent ?? '' }
async function submitAuth(entry: 'signup' | 'login') {
  const form = screen.getByRole('form', { name: entry === 'signup' ? '회원가입' : '로그인' })
  fireEvent.change(within(form).getByLabelText('이메일'), { target: { value: account.email } })
  fireEvent.change(within(form).getByLabelText('비밀번호'), { target: { value: 'welcome-12' } })
  if (entry === 'signup') fireEvent.change(within(form).getByLabelText('비밀번호 확인'), { target: { value: 'welcome-12' } })
  await act(async () => fireEvent.submit(form))
}