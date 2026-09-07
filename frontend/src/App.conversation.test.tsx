// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createAppStore } from './app/store'
import { emptyConversationContext, readyConversationProposal, seoulConversationContext } from './data/fixtures/supportProgramConversation'
import type { SupportProgramInterpretation } from './domain/entities/SupportProgramConversation'

vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({ CoreApiConnectionStatus: () => null }))
const readiness = vi.hoisted(() => ({ canSearch: true }))
vi.mock('./presentation/features/chat/hooks/useSupportProgramSearchReadiness', () => ({
  useSupportProgramSearchReadiness: () => ({
    canSearch: readiness.canSearch, isError: false, isInitialLoading: false, isRefreshing: false, refetch: vi.fn(),
    data: { searchState: readiness.canSearch ? 'SEARCHABLE' : 'UNAVAILABLE', programCount: 10, indexReady: readiness.canSearch,
      lastSuccessfulSyncAt: null, lastFailedSyncAt: null, sources: [{ sourceCode: 'BIZINFO', sourceName: '기업마당',
        searchState: readiness.canSearch ? 'SEARCHABLE' : 'UNAVAILABLE', programCount: 10, indexReady: readiness.canSearch,
        lastSuccessfulSyncAt: null, lastFailedSyncAt: null }] },
  }),
}))

beforeEach(() => { readiness.canSearch = true })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('대화 조건 해석·확인 검색 HTTP E2E', () => {
  it('서울 SW → 지원금 → 부산을 각각 확인한 뒤에만 검색하며 실제 body와 검색 스냅샷이 일치한다', async () => {
    const grants = { ...seoulConversationContext, query: '지원금', acceptingOnly: false,
      companyConditions: { ...seoulConversationContext.companyConditions, supportPurpose: '지원금' } }
    const busan = { ...grants, companyConditions: { ...grants.companyConditions, region: '부산' } }
    const network = mockConversationNetwork([
      { ...readyConversationProposal(seoulConversationContext), changedFields: ['QUERY', 'REGION', 'INDUSTRY', 'ESTABLISHED_ON', 'SUPPORT_PURPOSE'] },
      { ...readyConversationProposal(grants), changedFields: ['QUERY', 'SUPPORT_PURPOSE', 'ACCEPTING_ONLY'] },
      { ...readyConversationProposal(busan), changedFields: ['REGION'] },
    ])
    const { store } = renderConversationApp()
    for (const [index, message] of ['서울 SW 2024년 1월 1일 설립 사업화', '마감 공고도 포함해서 지원금 위주', '부산으로 변경'].entries()) {
      await submitMessage(message)
      expect(screen.getByText('보낸 메시지').parentElement?.querySelector('strong')?.textContent).toBe(String(index + 1))
      expect(network.searchRequests).toHaveLength(index)
      expect(screen.getByRole('region', { name: '조건 변경 제안' }).textContent).toContain('아직 적용하거나 검색하지 않았습니다')
      expect(screen.getByRole('status').textContent).toContain('확인 버튼을 눌러야 검색')
      await act(async () => fireEvent.click(screen.getByRole('button', { name: '이 조건으로 검색' })))
      await waitFor(() => expect(network.searchRequests).toHaveLength(index + 1))
      const command = network.searchRequests[index]
      expect(store.getState().chat.messages.at(-1)).toMatchObject({ searchQuery: command.query, searchOptions: {
        acceptingOnly: command.acceptingOnly, companyConditions: command.companyConditions,
      } })
    }
    expect(network.interpretRequests).toEqual([
      { message: '서울 SW 2024년 1월 1일 설립 사업화', context: emptyConversationContext, pendingClarification: null },
      { message: '마감 공고도 포함해서 지원금 위주', context: seoulConversationContext, pendingClarification: null },
      { message: '부산으로 변경', context: grants, pendingClarification: null },
    ])
    expect(network.searchRequests[2]).toEqual({ query: '지원금', acceptingOnly: false,
      companyConditions: { region: '부산', industry: 'SW', establishedOn: '2024-01-01', supportPurpose: '지원금' } })
    expect(screen.getByText(/검색 당시 조건: 접수 중만 · 현재 소재지 서울/)).toBeTruthy()
    expect(screen.getByText(/검색 당시 조건: 접수 상태 전체 · 현재 소재지 부산/)).toBeTruthy()
    expect(network.fetch).toHaveBeenCalledTimes(6)
    fireEvent.click(screen.getByRole('button', { name: /새 대화 시작/ }))
    expect(store.getState().chat.conversationQuery).toBeNull()
    expect(store.getState().chat.searchOptions).toEqual({ acceptingOnly: true })
    expect(screen.queryByText(/검색 당시 조건:/)).toBeNull()
    expect(screen.queryByRole('region', { name: '조건 변경 제안' })).toBeNull()
  })

  it('설립 2년은 미확정 질문으로 남기고 정확한 날짜 답변과 마지막 초안만 이어 보낸다', async () => {
    const draft = { ...seoulConversationContext, companyConditions: { ...seoulConversationContext.companyConditions, establishedOn: null } }
    const question = '정확한 설립일을 YYYY-MM-DD 형식으로 알려주세요.'
    const network = mockConversationNetwork([
      { status: 'CLARIFICATION_REQUIRED', proposedContext: draft, clarificationQuestion: question,
        changedFields: ['QUERY', 'REGION', 'INDUSTRY', 'SUPPORT_PURPOSE'] },
      { ...readyConversationProposal(seoulConversationContext), changedFields: ['QUERY', 'REGION', 'INDUSTRY', 'ESTABLISHED_ON', 'SUPPORT_PURPOSE'] },
    ])
    const { store } = renderConversationApp()
    await submitMessage('서울 SW 설립 2년 사업화')
    expect(screen.getByRole('region', { name: '조건 추가 확인' }).textContent).toContain(question)
    expect(screen.getByText(/아래는 미확정 초안입니다/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '이 조건으로 검색' })).toBeNull()
    expect(store.getState().chat.searchOptions).toEqual({ acceptingOnly: true })
    expect(network.searchRequests).toHaveLength(0)
    await submitMessage('2024-01-01')
    expect(network.interpretRequests[1]).toEqual({ message: '2024-01-01', context: emptyConversationContext,
      pendingClarification: { question, draftContext: draft } })
    expect(network.searchRequests).toHaveLength(0)
    expect(screen.getByRole('region', { name: '조건 변경 제안' }).textContent).toContain('제안: 2024-01-01')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '이 조건으로 검색' })))
    expect(network.searchRequests).toHaveLength(1)
    expect(store.getState().chat.searchOptions.companyConditions?.establishedOn).toBe('2024-01-01')
  })

  it('제공처 검색 불가 중에도 해석할 수 있지만 준비 완료 전 확인 검색은 막는다', async () => {
    readiness.canSearch = false
    const network = mockConversationNetwork([readyConversationProposal(seoulConversationContext)])
    const ui = renderConversationApp()
    await submitMessage('서울 SW 사업화')
    expect((screen.getByRole('button', { name: '이 조건으로 검색' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/공고 검색 준비가 완료되면/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '이 조건으로 검색' }))
    expect(network.searchRequests).toHaveLength(0)
    readiness.canSearch = true
    ui.rerender(<Provider store={ui.store}><MemoryRouter><App /></MemoryRouter></Provider>)
    expect((screen.getByRole('button', { name: '이 조건으로 검색' }) as HTMLButtonElement).disabled).toBe(false)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '이 조건으로 검색' })))
    expect(network.searchRequests).toHaveLength(1)
  })

  it('수동 폼 변경과 제안 취소는 미확정 초안을 폐기하고 실제 검색은 보내지 않는다', async () => {
    const network = mockConversationNetwork([readyConversationProposal(seoulConversationContext), readyConversationProposal(seoulConversationContext)])
    const { store } = renderConversationApp()
    await submitMessage('서울 SW 사업화')
    fireEvent.click(screen.getByText('기업 조건 입력·수정 (선택)'))
    fireEvent.change(screen.getByLabelText('현재 소재지'), { target: { value: '부산' } })
    expect(screen.queryByRole('button', { name: '이 조건으로 검색' })).toBeNull()
    expect(store.getState().chat.searchOptions).toEqual({ acceptingOnly: true })
    await submitMessage('서울 SW 사업화')
    fireEvent.click(screen.getByRole('button', { name: '제안 취소' }))
    expect(screen.queryByRole('region', { name: '조건 변경 제안' })).toBeNull()
    expect(store.getState().chat.pendingClarification).toBeNull()
    expect(network.searchRequests).toHaveLength(0)
  })

  it('해석 실패는 다시 해석만 제공하고 검색 실패 재시도와 혼동하지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(json(readyConversationProposal(seoulConversationContext)))
    vi.stubGlobal('fetch', fetchMock)
    renderConversationApp()
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(input, { target: { value: '서울 SW' } })
    fireEvent.submit(input.closest('form')!)
    await screen.findByRole('button', { name: '다시 해석' })
    expect(screen.queryByRole('button', { name: '다시 검색' })).toBeNull()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '다시 해석' })))
    expect(screen.getByRole('button', { name: '이 조건으로 검색' })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith('/conversation/interpret'))).toBe(true)
  })

  it('검색 서버의 확인된 시간 초과는 구체적으로 안내하고 같은 조건으로 검색만 수동 재시도한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(readyConversationProposal(seoulConversationContext)))
      .mockResolvedValueOnce(searchTimeoutResponse())
      .mockResolvedValueOnce(json({ query: seoulConversationContext.query, programs: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { store } = renderConversationApp()
    await submitMessage('서울 SW 사업화')
    expect(fetchMock).toHaveBeenCalledOnce()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '이 조건으로 검색' })))
    expect(screen.getByRole('alert').textContent).toContain('서버의 지원사업 검색 시간이 초과되었습니다')
    expect(screen.queryByRole('button', { name: '다시 해석' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(store.getState().chat.searchOptions.companyConditions).toEqual(seoulConversationContext.companyConditions)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '다시 검색' })))
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[2][0])).toContain('/support-programs/search')
    expect(fetchMock.mock.calls[2][1].body).toEqual(fetchMock.mock.calls[1][1].body)
    expect(store.getState().chat.searchError).toBeNull()
    expect(store.getState().chat.messages.at(-1)).toMatchObject({
      searchQuery: seoulConversationContext.query,
      searchOptions: { acceptingOnly: true, companyConditions: seoulConversationContext.companyConditions },
    })
  })

  it.each([{ code: 'UNKNOWN_TIMEOUT' }, { title: null }])('알 수 없거나 잘못된 검색 504는 일반 오류로 표시한다: %o', async (changes) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(readyConversationProposal(seoulConversationContext)))
      .mockResolvedValueOnce(searchTimeoutResponse(changes))
    vi.stubGlobal('fetch', fetchMock)
    renderConversationApp()
    await submitMessage('서울 SW')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '이 조건으로 검색' })))
    expect(screen.getByRole('alert').textContent).toContain('지원사업을 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    expect(screen.getByRole('alert').textContent).not.toContain('서버의 지원사업 검색 시간이 초과되었습니다')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

function searchTimeoutResponse(changes: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({
    type: 'urn:govbiz:problem:ai-service-timeout', title: 'AI Service Gateway Timeout', status: 504,
    detail: 'private server detail', instance: '/api/v1/support-programs/search', code: 'AI_SERVICE_TIMEOUT', ...changes,
  }), { status: 504, headers: { 'Content-Type': 'application/problem+json' } })
}

async function submitMessage(message: string) {
  const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
  fireEvent.change(input, { target: { value: message } })
  await act(async () => fireEvent.submit(input.closest('form')!))
  await waitFor(() => expect(screen.queryByText('조건 변경안을 해석하고 있어요. 아직 검색하지 않았습니다…')).toBeNull())
}

function renderConversationApp() {
  const store = createAppStore()
  const tree = <Provider store={store}><MemoryRouter><App /></MemoryRouter></Provider>
  return { ...render(tree), store, tree }
}

function mockConversationNetwork(proposals: SupportProgramInterpretation[]) {
  const interpretRequests: unknown[] = []
  const searchRequests: { query: string; acceptingOnly: boolean; companyConditions?: Record<string, string> }[] = []
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    if (String(url).endsWith('/conversation/interpret')) {
      interpretRequests.push(body)
      return json(proposals.shift())
    }
    if (String(url).endsWith('/search')) {
      searchRequests.push(body)
      return json({ query: body.query, programs: [] })
    }
    throw new Error(`Unexpected endpoint: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetch: fetchMock, interpretRequests, searchRequests }
}

function json(value: unknown) { return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }) }
