// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { completeSearchResult } from './data/fixtures/supportProgramSearchResult'
import { createAppStore } from './app/store'
import { readyConversationProposal, seoulConversationContext } from './data/fixtures/supportProgramConversation'
import { sessionRestored } from './presentation/shared/auth/state/authSlice'

vi.mock('./presentation/features/chat/hooks/useSupportProgramSearchReadiness', () => ({
  useSupportProgramSearchReadiness: () => ({
    canSearch: true, isError: false, isInitialLoading: false, isRefreshing: false,
    refetch: vi.fn(), data: { searchState: 'SEARCHABLE', sources: [] },
  }),
}))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function renderChat(path = '/') {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const store = createAppStore()
  // 작업 채팅(/chat)은 회원 세션이 있어야 열립니다. 세션 복원 요청은 보내지 않습니다.
  store.dispatch(sessionRestored(
    path.startsWith('/app/chat') ? { email: 'member@govbiz.local', role: 'USER', tier: 'MEMBER', emailVerified: true, company: null } : null,
  ))
  render(<Provider store={store}><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></Provider>)
  return fetchMock
}

describe('참고 이미지 기반 채팅 디자인', () => {
  it('대화 전에는 기존 소개·상단 메뉴·큰 입력창을 보여준다', () => {
    const fetchMock = renderChat()
    expect(screen.getByRole('heading', { level: 1, name: '우리 회사에 맞는 지원사업, AI와 함께 무료로 찾아보세요.' })).toBeTruthy()
    expect(screen.getByText('회사의 지역과 업종, 필요한 지원을 알려주세요. 관련 공고와 확인할 신청 조건을 함께 안내합니다.')).toBeTruthy()
    expect(screen.queryByText('AI 맞춤 검색')).toBeNull()
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    expect(input.value).toBe('')
    expect(screen.queryByRole('complementary', { name: '검색 사이드바' })).toBeNull()
    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
    expect(screen.getByRole('link', { name: '회원가입' }).getAttribute('href')).toBe('/signup')
    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login')
    expect(screen.queryByRole('button', { name: '새 채팅' })).toBeNull()
    expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('horizontal')
    expect(input.rows).toBe(3)
    expect(screen.queryByText(/오늘 무료|남은 AI 검색|11개 정부기관|1,000여개/)).toBeNull()
    expect(screen.queryByRole('button', { name: '새 검색' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('예시 질문은 입력만 채우고 자동 요청하거나 새 입력창을 만들지 않는다', () => {
    const fetchMock = renderChat()
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    fireEvent.click(screen.getByRole('button', { name: '서울 AI 창업지원 사업 찾아줘' }))
    expect(input.value).toBe('서울 AI 창업지원 사업 찾아줘')
    expect(input.rows).toBe(3)
    expect(screen.queryByRole('complementary', { name: '검색 사이드바' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: /우리 회사에 맞는 지원사업/ })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '지원사업 검색어' })).toBe(input)
    expect(screen.queryByRole('button', { name: '새 검색' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('입력 안내는 실제 요소를 참조하고 실제 경로만 메뉴로 연결한다', () => {
    renderChat()
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
    const ids = input.getAttribute('aria-describedby')?.split(' ') ?? []
    for (const id of ids) expect(document.getElementById(id)).toBeTruthy()
    expect(screen.getByText(/Enter로 전송 · Shift\+Enter로 줄바꿈/)).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'AI 대화 검색' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('link', { name: 'GovBiz 홈으로' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: '파트너 모집' }).getAttribute('href')).toBe('/partners')
  })

  it('빈 초안·공백·500자 초과 입력의 제출은 소개 화면을 유지하고 요청하지 않는다', () => {
    const fetchMock = renderChat()
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    const form = input.closest('form')!

    for (const draft of ['', '   ', '가'.repeat(501)]) {
      fireEvent.change(input, { target: { value: draft } })
      fireEvent.submit(form)
      expect(screen.getByRole('heading', { level: 1, name: /우리 회사에 맞는 지원사업/ })).toBeTruthy()
      expect(input.rows).toBe(3)
      expect(screen.getByRole('textbox', { name: '지원사업 검색어' })).toBe(input)
      expect(input.closest('form')).toBe(form)
      expect(screen.queryByRole('button', { name: '새 검색' })).toBeNull()
    }
    expect(screen.getByRole('alert').textContent).toContain('500')
    expect(screen.getByRole('alert').closest('article')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('첫 전송 즉시 같은 입력과 폼을 도킹하고 요청 취소 후 유지하다 새 채팅에서 소개로 돌아간다', async () => {
    const fetchMock = renderChat()
    let complete!: (response: Response) => void
    const pending = new Promise<Response>((resolve) => { complete = resolve })
    fetchMock.mockReturnValueOnce(pending)
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    const form = input.closest('form')!
    const message = '서울 AI 창업지원 사업 찾아줘'
    fireEvent.change(input, { target: { value: message } })
    fireEvent.submit(form)

    expectDockedChat(input, form)
    expectLoadingCard('interpretation')
    expect(input.disabled).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const requestSignal = fetchMock.mock.calls[0][1].signal as AbortSignal
    expect(requestSignal.aborted).toBe(false)
    act(() => screen.getByRole('button', { name: '취소' }).click())

    expect(requestSignal.aborted).toBe(true)
    expect(input.value).toBe(message)
    expect(input.disabled).toBe(false)
    expect(document.activeElement).toBe(input)
    expectDockedChat(input, form)
    expectNoLoadingCards()

    fireEvent.click(screen.getByRole('button', { name: '새 채팅' }))
    expect(screen.getByRole('heading', { level: 1, name: /우리 회사에 맞는 지원사업/ })).toBeTruthy()
    expect(input.rows).toBe(3)
    expect(input.value).toBe('')
    expect(screen.getByRole('textbox', { name: '지원사업 검색어' })).toBe(input)
    expect(input.closest('form')).toBe(form)
    expect(document.activeElement).toBe(input)
    await act(async () => {
      complete(proposalResponse())
      await pending
    })
    expect(screen.queryByRole('region', { name: '조건 변경 제안' })).toBeNull()
    expect(screen.queryByRole('button', { name: '새 검색' })).toBeNull()
    expect(input.rows).toBe(3)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('해석 실패 후에도 도킹을 유지하고 같은 요청을 다시 해석할 수 있다', async () => {
    const fetchMock = renderChat()
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(proposalResponse())
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    const form = input.closest('form')!
    fireEvent.change(input, { target: { value: '서울 SW' } })
    fireEvent.submit(form)

    const retryButton = await screen.findByRole('button', { name: '다시 해석' })
    expect(screen.getByRole('alert').closest('article')?.contains(retryButton)).toBe(true)
    expectDockedChat(input, form)
    expectNoLoadingCards()
    expect(input.disabled).toBe(false)
    expect(screen.queryByRole('button', { name: '다시 검색' })).toBeNull()
    fireEvent.click(retryButton)
    await screen.findByRole('button', { name: '이 조건으로 검색' })

    expectDockedChat(input, form)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body)
    expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith('/conversation/interpret'))).toBe(true)
    expect(screen.queryByRole('button', { name: '다시 해석' })).toBeNull()
  })

  it('조건 제안만 취소하면 소개로 되돌리지 않고 도킹된 입력에서 다음 대화를 준비한다', async () => {
    const fetchMock = renderChat()
    fetchMock.mockResolvedValueOnce(proposalResponse())
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    const form = input.closest('form')!
    fireEvent.change(input, { target: { value: '서울 SW 사업화' } })
    fireEvent.submit(form)
    fireEvent.click(await screen.findByRole('button', { name: '제안 취소' }))

    expect(screen.queryByRole('region', { name: '조건 변경 제안' })).toBeNull()
    expectDockedChat(input, form)
    expect(input.disabled).toBe(false)
    expect(screen.queryByRole('button', { name: '새 검색' })).toBeNull()
    expect(screen.getByRole('button', { name: '새 채팅' })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('해석과 검색 요청이 진행되는 동안에만 접근 가능한 로딩 카드와 숨긴 애니메이션 장식을 표시한다', async () => {
    const fetchMock = renderChat()
    const interpretation = pendingResponse()
    const search = pendingResponse()
    fetchMock.mockReturnValueOnce(interpretation.promise).mockReturnValueOnce(search.promise)
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
    expectNoLoadingCards()
    fireEvent.change(input, { target: { value: '서울 SW 사업화' } })
    fireEvent.submit(input.closest('form')!)

    expectLoadingCard('interpretation')
    expect(fetchMock).toHaveBeenCalledOnce()
    await act(async () => {
      interpretation.complete(proposalResponse())
      await interpretation.promise
    })
    const confirm = await screen.findByRole('button', { name: '이 조건으로 검색' })
    expectNoLoadingCards()
    expect(fetchMock).toHaveBeenCalledOnce()

    fireEvent.click(confirm)
    expectLoadingCard('search')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await act(async () => {
      search.complete(new Response(JSON.stringify(completeSearchResult({ query: seoulConversationContext.query, programs: [] })), {
        headers: { 'Content-Type': 'application/json' },
      }))
      await search.promise
    })
    await waitFor(expectNoLoadingCards)
    expect(screen.queryByRole('button', { name: '취소' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('검색 취소와 검색 오류에서는 로딩 카드를 제거하고 자동으로 재요청하지 않는다', async () => {
    for (const outcome of ['cancel', 'error'] as const) {
      const fetchMock = renderChat()
      const search = pendingResponse()
      fetchMock.mockResolvedValueOnce(proposalResponse()).mockReturnValueOnce(search.promise)
      const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
      fireEvent.change(input, { target: { value: '서울 SW 사업화' } })
      fireEvent.submit(input.closest('form')!)
      fireEvent.click(await screen.findByRole('button', { name: '이 조건으로 검색' }))
      expectLoadingCard('search')
      const requestSignal = fetchMock.mock.calls[1][1].signal as AbortSignal

      if (outcome === 'cancel') {
        fireEvent.click(screen.getByRole('button', { name: '취소' }))
        expect(requestSignal.aborted).toBe(true)
        expectNoLoadingCards()
      }
      await act(async () => {
        search.complete(new Response('', { status: 503 }))
        await search.promise
      })
      if (outcome === 'error') {
        expect(await screen.findByRole('button', { name: '다시 검색' })).toBeTruthy()
      } else {
        expect(screen.queryByRole('alert')).toBeNull()
        expect(screen.queryByRole('button', { name: '다시 검색' })).toBeNull()
      }
      expectNoLoadingCards()
      expect(screen.queryByRole('button', { name: '취소' })).toBeNull()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      cleanup()
    }
  })

  it('사이드바를 접었다 펼쳐도 같은 입력 노드와 초안을 유지한다', () => {
    const fetchMock = renderChat()
    fetchMock.mockReturnValueOnce(new Promise<Response>(() => {}))
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '서울 AI' } })
    fireEvent.submit(input.closest('form')!)
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    fireEvent.click(screen.getByRole('button', { name: '사이드바 접기' }))
    expect(screen.queryByRole('complementary', { name: '검색 사이드바' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '사이드바 펼치기' }))
    fireEvent.click(screen.getByRole('button', { name: '사이드바 펼치기' }))
    expect(screen.getByRole('complementary', { name: '검색 사이드바' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '지원사업 검색어' })).toBe(input)
    expect(input.value).toBe('서울 AI')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '사이드바 접기' }))
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('사이드바 새 채팅은 진행 중인 해석을 취소하고 늦은 응답을 무시한다', async () => {
    const fetchMock = renderChat()
    const pending = pendingResponse()
    fetchMock.mockReturnValueOnce(pending.promise)
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '서울 AI' } })
    fireEvent.submit(input.closest('form')!)
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal
    fireEvent.click(screen.getByRole('button', { name: '새 채팅' }))
    expect(signal.aborted).toBe(true)
    expect(screen.queryByRole('complementary', { name: '검색 사이드바' })).toBeNull()
    expect(screen.getByRole('link', { name: '지원사업 찾기' })).toBeTruthy()
    expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('horizontal')
    expect(input.rows).toBe(3)
    expect(input.value).toBe('')
    expect(document.activeElement).toBe(input)
    expect(screen.getByRole('textbox', { name: '지원사업 검색어' })).toBe(input)
    await act(async () => { pending.complete(proposalResponse()); await pending.promise })
    expect(screen.queryByRole('button', { name: '이 조건으로 검색' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('작업 채팅은 기존 사이드바와 단일 입력·대화 영역을 유지한다', () => {
    renderChat('/app/chat')
    expect(screen.getByRole('complementary', { name: '작업 사이드바' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '지원사업 채팅' })).toBeTruthy()
    expect(screen.getAllByRole('textbox', { name: '지원사업 검색어' })).toHaveLength(1)
    expect(screen.getByRole('region', { name: '대화 내역' }).getAttribute('tabindex')).toBe('0')
    expect(screen.queryByText('AI 맞춤 검색')).toBeNull()
  })
})

function expectDockedChat(input: HTMLTextAreaElement, form: HTMLFormElement) {
  expect(screen.queryByRole('button', { name: '새 검색' })).toBeNull()
  expect(screen.getByRole('complementary', { name: '검색 사이드바' })).toBeTruthy()
  expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('vertical')
  expect(screen.getByRole('link', { name: '무료 회원가입' })).toBeTruthy()
  expect(screen.queryByRole('heading', { level: 1, name: /우리 회사에 맞는 지원사업/ })).toBeNull()
  expect(screen.getByRole('heading', { level: 1, name: '지원사업 채팅' })).toBeTruthy()
  expect(screen.queryByText('AI 맞춤 검색')).toBeNull()
  expect(screen.getAllByRole('textbox', { name: '지원사업 검색어' })).toEqual([input])
  expect(input.closest('form')).toBe(form)
  expect(input.rows).toBe(1)
}

function proposalResponse() {
  return new Response(JSON.stringify(readyConversationProposal(seoulConversationContext)), {
    headers: { 'Content-Type': 'application/json' },
  })
}

function pendingResponse() {
  let complete!: (response: Response) => void
  const promise = new Promise<Response>((resolve) => { complete = resolve })
  return { promise, complete }
}

function expectNoLoadingCards() {
  expect(screen.queryByRole('group', { name: '조건 해석 진행 중' })).toBeNull()
  expect(screen.queryByRole('group', { name: '지원사업 검색 진행 중' })).toBeNull()
}

function expectLoadingCard(phase: 'interpretation' | 'search') {
  const isInterpreting = phase === 'interpretation'
  const card = screen.getByRole('group', {
    name: isInterpreting ? '조건 해석 진행 중' : '지원사업 검색 진행 중',
  })
  expect(within(card).getByText(isInterpreting
    ? '조건 변경안을 해석하고 있어요. 아직 검색하지 않았습니다…'
    : '공고를 찾아보고 있어요…')).toBeTruthy()
  expect(card.querySelector('span[aria-hidden="true"]')?.children).toHaveLength(3)
  expect(card.querySelector('div[aria-hidden="true"]')?.children).toHaveLength(1)
  expect(card.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(card.contains(screen.getByRole('status'))).toBe(false)
  expect(screen.queryByRole('group', {
    name: isInterpreting ? '지원사업 검색 진행 중' : '조건 해석 진행 중',
  })).toBeNull()
}
