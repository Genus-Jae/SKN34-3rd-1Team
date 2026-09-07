// @vitest-environment jsdom

import { type FormEvent } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { supportPrograms } from '../../../../data/fixtures/supportPrograms'
import type { useSupportProgramChat } from '../hooks/useSupportProgramChat'
import { useChatPageViewModel } from './useChatPageViewModel'
import type { useSupportProgramSearchReadiness } from '../hooks/useSupportProgramSearchReadiness'

const hookMocks = vi.hoisted(() => ({
  chat: vi.fn(),
  readiness: vi.fn(),
}))

vi.mock('../hooks/useSupportProgramChat', () => ({
  supportProgramChatSuggestions: [
    '서울 AI 창업지원 사업 찾아줘',
    '현재 접수 중인 수출 지원사업 알려줘',
    '제조기업 R&D 사업을 찾아줘',
  ],
  useSupportProgramChat: hookMocks.chat,
}))

vi.mock('../hooks/useSupportProgramSearchReadiness', () => ({
  useSupportProgramSearchReadiness: hookMocks.readiness,
}))

type ChatHook = ReturnType<typeof useSupportProgramChat>
type ReadinessHook = ReturnType<typeof useSupportProgramSearchReadiness>

beforeEach(() => {
  hookMocks.chat.mockReturnValue(createChatHook())
  hookMocks.readiness.mockReturnValue(createReadinessHook())
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('useChatPageViewModel', () => {
  it('검색 불가 상태에서 직접 호출해도 제출·재시도·추천 선택을 위임하지 않는다', () => {
    const chat = createChatHook({
      canRetrySearch: true,
      isReadyToSubmit: true,
    })
    hookMocks.chat.mockReturnValue(chat)
    hookMocks.readiness.mockReturnValue(createReadinessHook({ canSearch: false }))
    const { result } = renderHook(() => useChatPageViewModel())
    const submitEvent = createSubmitEvent()

    act(() => result.current.openSidebar())
    act(() => {
      result.current.handleSubmit(submitEvent.event)
      result.current.handleRetrySearch()
      result.current.handleSelectSuggestion('서울 AI')
    })

    expect(submitEvent.preventDefault).toHaveBeenCalledOnce()
    expect(chat.submitMessage).not.toHaveBeenCalled()
    expect(chat.selectSuggestion).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({
      canSearch: false,
      canRetrySearch: false,
      isReadyToSubmit: false,
      isSidebarOpen: true,
    })
  })

  it('검색 가능 상태에서 내부 훅에 위임하고 추천 선택 후 사이드바를 닫는다', () => {
    const chat = createChatHook({
      canRetrySearch: true,
      isReadyToSubmit: true,
    })
    const readiness = createReadinessHook()
    hookMocks.chat.mockReturnValue(chat)
    hookMocks.readiness.mockReturnValue(readiness)
    const { result } = renderHook(() => useChatPageViewModel())
    const submitEvent = createSubmitEvent()

    act(() => {
      result.current.handleSubmit(submitEvent.event)
      result.current.handleRetrySearch()
    })
    expect(submitEvent.preventDefault).toHaveBeenCalledOnce()
    expect(chat.submitMessage).toHaveBeenCalledTimes(2)

    act(() => result.current.openSidebar())
    expect(result.current.isSidebarOpen).toBe(true)
    act(() => result.current.handleSelectSuggestion('서울 AI'))
    expect(chat.selectSuggestion).toHaveBeenCalledWith('서울 AI')
    expect(result.current.isSidebarOpen).toBe(false)

    act(() => result.current.refetchReadiness())
    expect(readiness.refetch).toHaveBeenCalledOnce()
  })

  it('준비 상태가 바뀌면 검색·재시도·제출 가능 여부를 다시 계산한다', () => {
    const chat = createChatHook({
      canRetrySearch: true,
      isReadyToSubmit: true,
    })
    let readiness = createReadinessHook({ canSearch: false })
    hookMocks.chat.mockReturnValue(chat)
    hookMocks.readiness.mockImplementation(() => readiness)
    const { result, rerender } = renderHook(() => useChatPageViewModel())

    expect(result.current).toMatchObject({
      canSearch: false,
      canRetrySearch: false,
      isReadyToSubmit: false,
    })

    readiness = createReadinessHook({ canSearch: true })
    rerender()

    expect(result.current).toMatchObject({
      canSearch: true,
      canRetrySearch: true,
      isReadyToSubmit: true,
    })
  })

  it('검색 불가 상태에서도 새 대화를 시작하고 사이드바를 닫는다', () => {
    const chat = createChatHook()
    hookMocks.chat.mockReturnValue(chat)
    hookMocks.readiness.mockReturnValue(createReadinessHook({ canSearch: false }))
    const { result } = renderHook(() => useChatPageViewModel())

    act(() => result.current.openSidebar())
    expect(result.current.isSidebarOpen).toBe(true)
    act(() => result.current.handleStartNewConversation())

    expect(chat.startNewConversation).toHaveBeenCalledOnce()
    expect(result.current.isSidebarOpen).toBe(false)
  })

  it('검색 중·0건·성공 결과를 스크린 리더 안내로 구분한다', () => {
    let chat = createChatHook({
      isSearching: true,
      messages: [{
        id: 'previous-result',
        role: 'assistant',
        text: '검색 결과',
        programs: [supportPrograms[0]],
      }],
    })
    hookMocks.chat.mockImplementation(() => chat)
    const { result, rerender } = renderHook(() => useChatPageViewModel())

    expect(result.current.searchStatusAnnouncement).toBe('지원사업 공고를 검색하고 있습니다.')

    chat = createChatHook({
      messages: [{ id: 'empty-result', role: 'assistant', text: '결과 없음', programs: [] }],
    })
    rerender()
    expect(result.current.searchStatusAnnouncement).toBe('지원사업 검색 결과 0건: 조건 확인 공고 0건, 확인 필요 공고 0건을 표시했습니다.')

    chat = createChatHook({
      messages: [{
        id: 'successful-result',
        role: 'assistant',
        text: '검색 결과',
        programs: supportPrograms.slice(0, 2),
      }],
    })
    rerender()
    expect(result.current.searchStatusAnnouncement).toBe('지원사업 검색 결과 2건: 조건 확인 공고 0건, 확인 필요 공고 2건을 표시했습니다.')
  })
})

function createChatHook(overrides: Partial<ChatHook> = {}): ChatHook {
  return {
    searchOptions: { acceptingOnly: true },
    companyConditionsDraft: { region: '', industry: '', establishedOn: '', supportPurpose: '' },
    conditionsError: null,
    updateCompanyCondition: vi.fn(),
    applyCompanyConditions: vi.fn(),
    removeCompanyCondition: vi.fn(),
    clearCompanyConditions: vi.fn(),
    updateAcceptingOnly: vi.fn(),
    canRetrySearch: false,
    conversationCount: 0,
    cancelSearch: vi.fn(),
    draft: '',
    isReadyToSubmit: false,
    isSearching: false,
    messages: [{ id: 'welcome', role: 'assistant', text: '안녕하세요.' }],
    searchError: null,
    selectSuggestion: vi.fn(),
    startNewConversation: vi.fn(),
    submitMessage: vi.fn().mockResolvedValue(undefined),
    updateDraft: vi.fn(),
    ...overrides,
  }
}

function createReadinessHook(
  overrides: Partial<ReadinessHook> = {},
): ReadinessHook {
  return {
    canSearch: true,
    data: {
      searchState: 'SEARCHABLE',
      programCount: 12,
      indexReady: true,
      lastSuccessfulSyncAt: '2026-09-05T09:00:00+09:00',
      lastFailedSyncAt: null,
      sources: [{
        sourceCode: 'BIZINFO',
        sourceName: '기업마당',
        searchState: 'SEARCHABLE',
        programCount: 12,
        indexReady: true,
        lastSuccessfulSyncAt: '2026-09-05T09:00:00+09:00',
        lastFailedSyncAt: null,
      }],
    },
    isError: false,
    isInitialLoading: false,
    isRefreshing: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createSubmitEvent() {
  const preventDefault = vi.fn()
  return {
    event: { preventDefault } as unknown as FormEvent<HTMLFormElement>,
    preventDefault,
  }
}
