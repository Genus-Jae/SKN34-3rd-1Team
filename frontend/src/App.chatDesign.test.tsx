// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createAppStore } from './app/store'
import { readyConversationProposal, seoulConversationContext } from './data/fixtures/supportProgramConversation'

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
  render(<Provider store={createAppStore()}><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></Provider>)
  return fetchMock
}

describe('참고 이미지 기반 채팅 디자인', () => {
  it('공개 검색은 소개와 넓은 빈 입력으로 시작하고 가짜 이용 한도·기관 수를 표시하지 않는다', () => {
    const fetchMock = renderChat()
    expect(screen.getByRole('heading', { level: 1, name: /상황만 입력하면, AI가.*우리 회사 지원사업을 찾아드립니다/ })).toBeTruthy()
    expect(screen.getByText('AI 맞춤 검색')).toBeTruthy()
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    expect(input.value).toBe('')
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
    expect(screen.getByRole('heading', { level: 1, name: /상황만 입력하면, AI가/ })).toBeTruthy()
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
    expect(screen.getByRole('link', { name: '지원사업 찾기' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: '파트너 모집 (데모)' }).getAttribute('href')).toBe('/partners')
  })

  it('빈 초안·공백·500자 초과 입력의 제출은 소개 화면을 유지하고 요청하지 않는다', () => {
    const fetchMock = renderChat()
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement
    const form = input.closest('form')!

    for (const draft of ['', '   ', '가'.repeat(501)]) {
      fireEvent.change(input, { target: { value: draft } })
      fireEvent.submit(form)
      expect(screen.getByRole('heading', { level: 1, name: /상황만 입력하면, AI가/ })).toBeTruthy()
      expect(input.rows).toBe(3)
      expect(screen.getByRole('textbox', { name: '지원사업 검색어' })).toBe(input)
      expect(input.closest('form')).toBe(form)
      expect(screen.queryByRole('button', { name: '새 검색' })).toBeNull()
    }
    expect(screen.getByRole('alert').textContent).toContain('500')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('첫 전송 즉시 같은 입력과 폼을 도킹하고 요청 취소 후 유지하다 새 검색에서 소개로 돌아간다', async () => {
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
    expect(input.disabled).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const requestSignal = fetchMock.mock.calls[0][1].signal as AbortSignal
    act(() => screen.getByRole('button', { name: '취소' }).click())

    expect(requestSignal.aborted).toBe(true)
    expect(input.value).toBe(message)
    expect(input.disabled).toBe(false)
    expect(document.activeElement).toBe(input)
    expectDockedChat(input, form)

    fireEvent.click(screen.getByRole('button', { name: '새 검색' }))
    expect(screen.getByRole('heading', { level: 1, name: /상황만 입력하면, AI가/ })).toBeTruthy()
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
    expectDockedChat(input, form)
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
    expect(screen.getByRole('button', { name: '새 검색' })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('작업 채팅은 기존 사이드바와 단일 입력·대화 영역을 유지한다', () => {
    renderChat('/chat')
    expect(screen.getByRole('complementary', { name: '작업 사이드바' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '지원사업 채팅' })).toBeTruthy()
    expect(screen.getAllByRole('textbox', { name: '지원사업 검색어' })).toHaveLength(1)
    expect(screen.getByRole('region', { name: '대화 내역' }).getAttribute('tabindex')).toBe('0')
    expect(screen.queryByText('AI 맞춤 검색')).toBeNull()
  })
})

function expectDockedChat(input: HTMLTextAreaElement, form: HTMLFormElement) {
  expect(screen.queryByRole('heading', { level: 1, name: /상황만 입력하면, AI가/ })).toBeNull()
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
