// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createAppStore } from './app/store'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderApp(path: string) {
  render(
    <Provider store={createAppStore()}>
      <MemoryRouter initialEntries={[path]}><App /></MemoryRouter>
    </Provider>,
  )
}

describe('공개 요금제', () => {
  it.each(['/pricing', '/pricing/'])('%s에서 무료와 출시 예정 플랜을 보여주고 결제 요청은 보내지 않는다', (path) => {
    renderApp(path)

    expect(screen.getByRole('heading', { level: 1, name: '기업의 다음 단계에 맞는 요금제' })).toBeTruthy()
    for (const name of ['무료', '프로', '팀']) {
      expect(screen.getByRole('heading', { name })).toBeTruthy()
    }
    const pendingButtons = screen.getAllByRole('button', { name: '출시 준비 중' })
    expect(pendingButtons).toHaveLength(2)
    for (const button of pendingButtons) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
      fireEvent.click(button)
    }
    expect(fetch).not.toHaveBeenCalled()

    const navigation = screen.getByRole('navigation', { name: '화면 이동' })
    expect(within(navigation).getByRole('link', { name: '요금제' }).getAttribute('aria-current')).toBe('page')
    expect(within(navigation).getByRole('link', { name: '지원사업 찾기' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('link', { name: '무료로 지원사업 찾기' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: '지원사업 찾기 시작하기' }).getAttribute('href')).toBe('/')
  })

  it('공개 검색 상단 메뉴에서 요금제로 이동한다', () => {
    renderApp('/')
    fireEvent.click(screen.getByRole('link', { name: '요금제' }))
    expect(screen.getByRole('heading', { level: 1, name: '기업의 다음 단계에 맞는 요금제' })).toBeTruthy()
  })

  it('작업 사이드바에서 요금제로 이동하고 무료 버튼으로 공개 검색에 돌아간다', () => {
    renderApp('/partners')
    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    fireEvent.click(within(sidebar).getByRole('link', { name: '요금제' }))

    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: '무료로 지원사업 찾기' }))
    expect(screen.getByRole('textbox', { name: '지원사업 검색어' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '기업의 다음 단계에 맞는 요금제' })).toBeNull()
  })
})
