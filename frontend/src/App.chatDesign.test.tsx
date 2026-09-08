// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createAppStore } from './app/store'

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

  it('작업 채팅은 기존 사이드바와 단일 입력·대화 영역을 유지한다', () => {
    renderChat('/chat')
    expect(screen.getByRole('complementary', { name: '작업 사이드바' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '지원사업 채팅' })).toBeTruthy()
    expect(screen.getAllByRole('textbox', { name: '지원사업 검색어' })).toHaveLength(1)
    expect(screen.getByRole('region', { name: '대화 내역' }).getAttribute('tabindex')).toBe('0')
    expect(screen.queryByText('AI 맞춤 검색')).toBeNull()
  })
})
