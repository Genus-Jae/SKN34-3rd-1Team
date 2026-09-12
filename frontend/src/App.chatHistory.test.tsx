// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createAppStore } from './app/store'
import { appContainer } from './app/appContainer'
import type { ChatConversationDetail, ChatConversationSnapshot } from './domain/entities/ChatConversation'
import type { Account } from './domain/entities/Account'
import { readyConversationProposal, seoulConversationContext } from './data/fixtures/supportProgramConversation'
import { completeSearchResult } from './data/fixtures/supportProgramSearchResult'
import { supportPrograms } from './data/fixtures/supportPrograms'
import { sessionRestored } from './presentation/shared/auth/state/authSlice'
import { interpretationStarted } from './presentation/features/chat/state/chatSlice'
import { emptyConversationContext } from './data/fixtures/supportProgramConversation'

// 공통 테스트 격리를 해제하고 실제 DI → Repository → HTTP DTO 검증 경로를 사용합니다.
vi.unmock('./data/api/chatConversationApi')
vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({ CoreApiConnectionStatus: () => null }))
vi.mock('./presentation/features/chat/hooks/useSupportProgramSearchReadiness', () => ({ useSupportProgramSearchReadiness: () => ({
  canSearch: true, isError: false, isInitialLoading: false, isRefreshing: false, refetch: vi.fn(),
  data: { searchState: 'SEARCHABLE', programCount: 10, indexReady: true, sources: [] },
}) }))

const account: Account = { email: 'member@test.local', tier: 'MEMBER', role: 'USER', emailVerified: true, hasPassword: true, company: null }
const records = new Map<string, Map<string, ChatConversationDetail>>()
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
let historyRequests: { email: string; url: string; method: string; body?: { expectedVersion: number; snapshot: ChatConversationSnapshot } }[]

beforeEach(() => {
  records.clear(); historyRequests = []
  vi.spyOn(appContainer.resolve('interpretSupportProgramConversationUseCase'), 'execute').mockResolvedValue(readyConversationProposal(seoulConversationContext))
  vi.spyOn(appContainer.resolve('searchSupportProgramsUseCase'), 'execute').mockResolvedValue(completeSearchResult({ query: '서울 AI', programs: [supportPrograms[0]] }))
  vi.stubGlobal('fetch', vi.fn(async (input: string, init: RequestInit) => {
    if (!input.includes('/api/v1/me/chat-conversations')) return new Promise<Response>(() => {})
    expect(init.credentials).toBe('include'); expect(init.cache).toBe('no-store')
    const email = decodeURIComponent(new Headers(init.headers).get('X-Chat-Account')!)
    const url = new URL(input, 'http://localhost')
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!)
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    historyRequests.push({ email, url: url.pathname, method: init.method!, body })
    const mine = records.get(email) ?? new Map<string, ChatConversationDetail>(); records.set(email, mine)
    if (init.method === 'PUT') {
      const current = mine.get(id)
      if ((current?.conversation.version ?? 0) !== body.expectedVersion) return json({}, 409)
      const detail = { conversation: { id, title: body.snapshot.messages.find((message: { role: string }) => message.role === 'user').text,
        version: body.expectedVersion + 1, updatedAt: '2026-09-12T12:00:00' }, snapshot: body.snapshot }
      mine.set(id, detail); return json(detail.conversation)
    }
    if (id === 'chat-conversations') return json({ items: [...mine.values()].reverse().map((entry) => entry.conversation), nextCursor: null })
    return mine.has(id) ? json(mine.get(id)) : json({}, 404)
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function renderChat(owner: Account | null = account, path = owner ? '/app/chat' : '/') {
  const store = createAppStore(); store.dispatch(sessionRestored(owner))
  const view = render(<Provider store={store}><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></Provider>)
  return { ...view, store }
}
async function submit(text: string) {
  const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
  await act(async () => { fireEvent.change(input, { target: { value: text } }); fireEvent.submit(input.closest('form')!) })
}

describe('사이드바 대화 기록 HTTP 통합', () => {
  it('요금제 아래 대화 단위로 쌓이고 새 대화·필터 이동 후 클릭으로 복원하며 AI를 다시 호출하지 않는다', async () => {
    renderChat()
    await waitFor(() => expect(historyRequests).toHaveLength(1))
    await submit('서울 창업지원 찾아줘')
    const history = screen.getByRole('region', { name: '대화 기록' })
    const pricing = screen.getByRole('link', { name: '요금제' })
    expect(pricing.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    await waitFor(() => expect([...records.get(account.email)!.values()][0].snapshot.interpretation.status).toBe('ready'))
    expect(within(history).getAllByRole('button', { name: /^대화 열기:/ })).toHaveLength(1)
    await submit('지원 목적도 알려줘')
    expect(within(history).getAllByRole('button', { name: /^대화 열기:/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '지원사업 새검색' }))
    expect(within(history).getAllByRole('button', { name: /^대화 열기:/ })).toHaveLength(1)
    await submit('부산 제조기업 지원')
    expect(within(history).getAllByRole('button', { name: /^대화 열기:/ })).toHaveLength(2)
    fireEvent.click(screen.getByRole('tab', { name: '필터 검색' }))
    await act(async () => fireEvent.click(within(history).getByRole('button', { name: '대화 열기: 서울 창업지원 찾아줘' })))
    expect(screen.getByRole('tab', { name: 'AI 대화 검색' }).getAttribute('aria-selected')).toBe('true')
    expect(within(screen.getByRole('region', { name: '대화 내역' })).getByText('지원 목적도 알려줘')).toBeTruthy()
    expect(screen.getByRole('region', { name: '조건 변경 제안' })).toBeTruthy()
    expect(appContainer.resolve('interpretSupportProgramConversationUseCase').execute).toHaveBeenCalledTimes(3)
    expect(appContainer.resolve('searchSupportProgramsUseCase').execute).not.toHaveBeenCalled()
  })

  it('새 브라우저 상태·재로그인에서 저장된 결과와 조건을 복원하고 다른 계정은 빈 목록을 본다', async () => {
    const first = renderChat()
    await submit('서울 AI 사업 찾아줘')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '이 조건으로 검색' })))
    await waitFor(() => expect([...records.get(account.email)!.values()][0].snapshot.messages.at(-1)?.programs).toHaveLength(1))
    const saved = [...records.get(account.email)!.values()][0]
    first.unmount()
    const restored = renderChat()
    const link = await screen.findByRole('button', { name: '대화 열기: 서울 AI 사업 찾아줘' })
    await act(async () => fireEvent.click(link))
    expect(restored.store.getState().chat.messages).toEqual(saved.snapshot.messages)
    expect(restored.store.getState().chat.searchOptions).toEqual(saved.snapshot.searchOptions)
    expect(screen.getByText(supportPrograms[0].title)).toBeTruthy()
    expect(appContainer.resolve('searchSupportProgramsUseCase').execute).toHaveBeenCalledOnce()
    expect(appContainer.resolve('interpretSupportProgramConversationUseCase').execute).toHaveBeenCalledOnce()
    const puts = historyRequests.filter((request) => request.method === 'PUT').length
    await act(async () => {})
    expect(historyRequests.filter((request) => request.method === 'PUT')).toHaveLength(puts)
    restored.unmount()
    renderChat({ ...account, email: 'other@test.local' })
    await waitFor(() => expect(historyRequests.at(-1)?.email).toBe('other@test.local'))
    expect(screen.queryByRole('button', { name: '대화 열기: 서울 AI 사업 찾아줘' })).toBeNull()
  })

  it('비로그인 대화는 목록도 보이지 않고 저장 API도 호출하지 않는다', async () => {
    renderChat(null)
    await submit('비회원 서울 AI 질문')
    expect(screen.queryByRole('region', { name: '대화 기록' })).toBeNull()
    expect(historyRequests).toEqual([])
    expect(records.size).toBe(0)
  })

  it('중단된 대화를 새 세션에서 열면 로딩 대신 명시적인 재시도 버튼을 제공한다', async () => {
    const first = renderChat()
    act(() => first.store.dispatch(interpretationStarted({ message: '중단된 질문', context: emptyConversationContext }, 'interrupted')))
    await waitFor(() => expect(records.get(account.email)?.get('interrupted')?.snapshot.interpretation.status).toBe('failed'))
    first.unmount()
    renderChat()
    const historyButton = await screen.findByRole('button', { name: '대화 열기: 중단된 질문' })
    await act(async () => fireEvent.click(historyButton))
    expect(screen.getByRole('button', { name: '다시 해석' })).toBeTruthy()
    expect(appContainer.resolve('interpretSupportProgramConversationUseCase').execute).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '다시 해석' })))
    expect(appContainer.resolve('interpretSupportProgramConversationUseCase').execute).toHaveBeenCalledOnce()
    expect(screen.getByRole('region', { name: '조건 변경 제안' })).toBeTruthy()
  })

  it('대화 조회 중 다른 메뉴로 이동하면 늦은 응답이 채팅으로 되돌리지 않는다', async () => {
    const first = renderChat()
    await submit('이전 기록')
    await waitFor(() => expect(records.get(account.email)?.size).toBe(1))
    const saved = [...records.get(account.email)!.values()][0]
    first.unmount()
    const fetch = globalThis.fetch
    let finish!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn((input, init) => String(input).endsWith(`/${saved.conversation.id}`) && init?.method === 'GET'
      ? new Promise<Response>((resolve) => { finish = resolve }) : fetch(input, init)))
    const second = renderChat()
    fireEvent.click(await screen.findByRole('button', { name: '대화 열기: 이전 기록' }))
    await waitFor(() => expect(finish).toBeTruthy())
    fireEvent.click(screen.getByRole('link', { name: '요금제' }))
    await act(async () => finish(json(saved)))
    expect(screen.queryByRole('tab', { name: 'AI 대화 검색' })).toBeNull()
    expect(second.store.getState().chat.messages).toHaveLength(1)
  })
})
