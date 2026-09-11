// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { SavedProgramsPage } from './SavedProgramsPage'

afterEach(() => { cleanup(); vi.useRealTimers() })

it('관심 공고 필터와 연도·월 컨트롤을 사용할 수 있고 공고 찾기·상세 이동은 포함하지 않는다', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-10T03:00:00Z'))
  render(<SavedProgramsPage />)
  expect(screen.getByRole('table', { name: '2026년 9월 접수 일정' })).toBeTruthy()
  expect(screen.getByRole('region', { name: '달력 내부 스크롤' }).tabIndex).toBe(0)
  expect(screen.queryByRole('link', { name: /공고 찾기/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /공고 찾기/ })).toBeNull()
  expect(screen.queryByRole('button', { name: '오늘' })).toBeNull()
  expect(document.querySelector('time[aria-current="date"]')?.textContent).toBe('10')
  expect(within(screen.getByRole('table')).getAllByRole('listitem').length).toBeGreaterThan(24)
  expect(within(screen.getByRole('table')).getAllByText('시').length).toBeGreaterThan(0)
  expect(within(screen.getByRole('table')).getAllByText('끝').length).toBeGreaterThan(0)
  expect(within(screen.getByRole('table')).getAllByText('당일').length).toBeGreaterThan(0)
  expect(within(screen.getByRole('table')).queryByRole('link')).toBeNull()
  fireEvent.change(screen.getByRole('combobox', { name: '지원 분야' }), { target: { value: '사업화' } })
  expect(within(screen.getByRole('table')).getAllByRole('listitem').length).toBeGreaterThanOrEqual(4)
  expect(screen.getByText(/표시 공고/).textContent).toContain('4건 / 전체 24건')
  fireEvent.click(screen.getByRole('button', { name: /분야 · 사업화/ }))
  expect(within(screen.getByRole('table')).getAllByRole('listitem').length).toBeGreaterThan(24)
  fireEvent.change(screen.getByRole('searchbox', { name: '공고명 또는 기관명' }), { target: { value: '서울경제' } })
  expect(within(screen.getByRole('table')).getAllByRole('listitem').length).toBeGreaterThanOrEqual(8)
  fireEvent.click(screen.getByRole('button', { name: '전체 초기화' }))
  expect(within(screen.getByRole('table')).getAllByRole('listitem').length).toBeGreaterThan(24)
  fireEvent.click(screen.getByRole('button', { name: '다음 연도' }))
  expect(screen.getByRole('table', { name: '2027년 9월 접수 일정' })).toBeTruthy()
  expect(screen.getByText('이 달에 표시할 예시 공고가 없습니다.')).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: '달력 월' }), { target: { value: '12' } })
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }))
  expect(screen.getByRole('table', { name: '2028년 1월 접수 일정' })).toBeTruthy()
})
