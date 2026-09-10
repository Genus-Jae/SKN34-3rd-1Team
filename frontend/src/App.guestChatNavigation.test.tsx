// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { completeSearchResult } from './data/fixtures/supportProgramSearchResult'
import { appContainer } from './app/appContainer'
import { createAppStore, type AppStore } from './app/store'
import { partnerRecruitmentPage } from './data/fixtures/partnerRecruitments'
import { emptyConversationContext, readyConversationProposal, seoulConversationContext } from './data/fixtures/supportProgramConversation'
import { supportPrograms } from './data/fixtures/supportPrograms'
import {
  draftChanged,
  interpretationStarted,
  interpretationSucceeded,
  proposalConfirmed,
  searchStarted,
  searchSucceeded,
} from './presentation/features/chat/state/chatSlice'
import { sessionRestored } from './presentation/shared/auth/state/authSlice'

vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({
  CoreApiConnectionStatus: () => null,
}))
vi.mock('./presentation/features/chat/hooks/useSupportProgramSearchReadiness', () => ({
  useSupportProgramSearchReadiness: () => ({
    canSearch: true, isError: false, isInitialLoading: false, isRefreshing: false, refetch: vi.fn(),
    data: { searchState: 'SEARCHABLE', programCount: 10, indexReady: true,
      lastSuccessfulSyncAt: null, lastFailedSyncAt: null, sources: [{ sourceCode: 'BIZINFO', sourceName: '기업마당',
        searchState: 'SEARCHABLE', programCount: 10, indexReady: true,
        lastSuccessfulSyncAt: null, lastFailedSyncAt: null }] },
  }),
}))

const originalMessage = '서울 AI 창업지원 사업 찾아줘'
const unsentDraft = '아직 보내지 않은 다음 조건'
const context = { ...seoulConversationContext, query: '서울 AI 창업지원 사업', acceptingOnly: false }
const program = supportPrograms[0]!

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
  vi.spyOn(appContainer.resolve('browsePartnerRecruitmentsUseCase'), 'execute')
    .mockResolvedValue(partnerRecruitmentPage)
  vi.spyOn(appContainer.resolve('getSupportProgramDetailUseCase'), 'execute').mockResolvedValue(program)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('비로그인 대화의 화면 이동 수명', () => {
  it.each(['메뉴 링크', '브라우저 뒤로가기'] as const)('파트너 모집에서 %s로 돌아오면 대화·결과·조건·초안을 비우고 새 맥락으로 시작한다', async (returnMethod) => {
    const fetchMock = vi.fn().mockResolvedValue(json(readyConversationProposal(seoulConversationContext)))
    vi.stubGlobal('fetch', fetchMock)
    const store = seededConversationStore()
    renderApp(store)
    expect(screen.getByText(originalMessage, { selector: 'div' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: program.title })).toBeTruthy()

    await act(async () => fireEvent.click(within(screen.getByRole('navigation', { name: '화면 이동' }))
      .getByRole('link', { name: '파트너 모집' })))

    expect(screen.getByRole('heading', { name: '함께 신청할 기업 찾기' })).toBeTruthy()
    expectEmptyConversation(store)
    if (returnMethod === '메뉴 링크') {
      fireEvent.click(within(screen.getByRole('navigation', { name: '화면 이동' }))
        .getByRole('link', { name: '지원사업 찾기' }))
    } else {
      fireEvent.click(screen.getByRole('button', { name: '브라우저 뒤로가기' }))
    }

    expectEmptyChatScreen()
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(input, { target: { value: '수출 지원사업 찾아줘' } })
    await act(async () => fireEvent.submit(input.closest('form')!))
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1].body))).toEqual({
      message: '수출 지원사업 찾아줘', context: emptyConversationContext, pendingClarification: null,
    })
  })

  it('로그인한 사용자는 파트너 모집을 왕복해도 기존 대화·결과·조건·초안을 유지한다', async () => {
    const store = seededConversationStore(true)
    const previous = store.getState().chat
    renderApp(store, '/app/chat')
    await act(async () => fireEvent.click(within(screen.getByRole('complementary', { name: '작업 사이드바' }))
      .getByRole('link', { name: '파트너 모집' })))
    expect(screen.getByRole('heading', { name: '함께 신청할 기업 찾기' })).toBeTruthy()
    expect(store.getState().chat).toEqual(previous)
    fireEvent.click(within(screen.getByRole('complementary', { name: '작업 사이드바' }))
      .getByRole('link', { name: '지원사업 검색' }))
    expect(store.getState().chat).toEqual(previous)
    expect(screen.getByText(originalMessage, { selector: 'div' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: program.title })).toBeTruthy()
    expect((screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement).value).toBe(unsentDraft)
  })

  it.each(['interpretation', 'search'] as const)('진행 중인 %s 요청을 남기고 다른 메뉴로 나가면 취소하고 복귀 후 늦은 응답도 무시한다', async (phase) => {
    let complete!: (response: Response) => void
    const pending = new Promise<Response>((resolve) => { complete = resolve })
    const fetchMock = vi.fn()
    if (phase === 'search') fetchMock.mockResolvedValueOnce(json(readyConversationProposal(context)))
    fetchMock.mockReturnValueOnce(pending)
    vi.stubGlobal('fetch', fetchMock)
    const store = emptyStore()
    renderApp(store)
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(input, { target: { value: originalMessage } })
    await act(async () => fireEvent.submit(input.closest('form')!))
    if (phase === 'search') {
      await act(async () => fireEvent.click(screen.getByRole('button', { name: '이 조건으로 검색' })))
    }
    const signal = fetchMock.mock.calls.at(-1)![1].signal as AbortSignal
    expect(signal.aborted).toBe(false)

    await act(async () => fireEvent.click(within(screen.getByRole('navigation', { name: '화면 이동' }))
      .getByRole('link', { name: '파트너 모집' })))

    expect(signal.aborted).toBe(true)
    expectEmptyConversation(store)
    fireEvent.click(within(screen.getByRole('navigation', { name: '화면 이동' }))
      .getByRole('link', { name: '지원사업 찾기' }))
    expectEmptyChatScreen()
    fireEvent.change(screen.getByRole('textbox', { name: '지원사업 검색어' }), { target: { value: '새 대화의 초안' } })
    const returnedState = store.getState().chat

    await act(async () => {
      complete(json(phase === 'search' ? completeSearchResult({ query: context.query, programs: [program] })
        : readyConversationProposal(context)))
      await pending
    })

    expect(store.getState().chat).toEqual(returnedState)
    expect((screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement).value).toBe('새 대화의 초안')
    expect(screen.queryByRole('button', { name: '이 조건으로 검색' })).toBeNull()
    expect(screen.queryByRole('heading', { name: program.title })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(phase === 'search' ? 2 : 1)
  })

  it('StrictMode에서 검색 화면을 마운트해도 같은 검색 흐름의 대화를 초기화하지 않는다', () => {
    const store = seededConversationStore()
    const previous = store.getState().chat
    renderApp(store, '/', true)
    expect(store.getState().chat).toEqual(previous)
    expect(screen.getByText(originalMessage, { selector: 'div' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: program.title })).toBeTruthy()
    expect((screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement).value).toBe(unsentDraft)
  })

  it('공고 상세에서는 대화를 유지하고 요금제로 나간 뒤 상세를 거쳐 돌아오면 초기화한다', async () => {
    const store = seededConversationStore()
    const previous = store.getState().chat
    renderApp(store)
    await act(async () => fireEvent.click(screen.getByRole('link', { name: '상세 조건 보기' })))
    expect(screen.getByText('자격 미평가 · 공고 상세 정보')).toBeTruthy()
    expect(store.getState().chat).toEqual(previous)

    fireEvent.click(within(screen.getByRole('navigation', { name: '화면 이동' })).getByRole('link', { name: '요금제' }))
    expectEmptyConversation(store)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '브라우저 뒤로가기' })))
    fireEvent.click(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' }))
    expectEmptyChatScreen()
    expectEmptyConversation(store)
  })
})

function emptyStore(authenticated = false) {
  const store = createAppStore()
  store.dispatch(sessionRestored(authenticated
    ? { email: 'member@govbiz.local', role: 'USER', tier: 'MEMBER', emailVerified: true, company: null }
    : null))
  return store
}

function seededConversationStore(authenticated = false) {
  const store = emptyStore(authenticated)
  const interpreted = interpretationStarted({ message: originalMessage, context: emptyConversationContext, pendingClarification: null })
  store.dispatch(interpreted)
  store.dispatch(interpretationSucceeded({ requestId: interpreted.payload.requestId, result: readyConversationProposal(context) }))
  store.dispatch(proposalConfirmed(interpreted.payload.requestId))
  const searched = searchStarted(context.query, {
    acceptingOnly: context.acceptingOnly, companyConditions: store.getState().chat.searchOptions.companyConditions,
  }, interpreted.payload.messageId)
  store.dispatch(searched)
  store.dispatch(searchSucceeded(completeSearchResult({ requestId: searched.payload.requestId, programs: [program] })))
  store.dispatch(draftChanged(unsentDraft))
  return store
}

function renderApp(store: AppStore, path = '/', strict = false) {
  const tree = <Provider store={store}><MemoryRouter initialEntries={[path]}>
    <App /><BrowserHistoryControls />
  </MemoryRouter></Provider>
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

function BrowserHistoryControls() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => void navigate(-1)}>브라우저 뒤로가기</button>
}

function expectEmptyConversation(store: AppStore) {
  expect(store.getState().chat).toMatchObject({
    accountEmail: null, activeRequestId: null, draft: '', confirmedSearch: null,
    conversationQuery: null, pendingClarification: null, interpretation: { status: 'idle' },
    searchOptions: { acceptingOnly: true }, searchStatus: 'idle', searchError: null,
  })
  expect(store.getState().chat.searchOptions.companyConditions).toBeUndefined()
  expect(store.getState().chat.messages).toHaveLength(1)
  expect(store.getState().chat.messages[0]).toMatchObject({ role: 'assistant' })
  expect(store.getState().chat.messages[0]!.programs).toBeUndefined()
}

function expectEmptyChatScreen() {
  expect((screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement).value).toBe('')
  expect(screen.queryByText(originalMessage, { selector: 'div' })).toBeNull()
  expect(screen.queryByRole('heading', { name: program.title })).toBeNull()
  expect(screen.queryByRole('button', { name: '새 검색' })).toBeNull()
  expect(screen.queryByRole('button', { name: '이 조건으로 검색' })).toBeNull()
}

function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
}