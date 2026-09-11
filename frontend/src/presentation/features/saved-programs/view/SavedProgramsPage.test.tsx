// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { SavedProgramsPage } from './SavedProgramsPage'

afterEach(() => { cleanup(); vi.useRealTimers() })

it('연도·월 컨트롤을 사용할 수 있고 필터·공고 찾기·상세 이동은 이번 범위에 포함하지 않는다', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-10T03:00:00Z'))
  render(<SavedProgramsPage />)
  expect(screen.getByRole('table', { name: '2026년 9월 마감 일정' })).toBeTruthy()
  expect(screen.getByRole('region', { name: '달력 내부 스크롤' }).tabIndex).toBe(0)
  expect(screen.queryByRole('link', { name: /공고 찾기/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /공고 찾기/ })).toBeNull()
  expect(screen.queryByRole('button', { name: '오늘' })).toBeNull()
  expect(screen.queryByRole('searchbox')).toBeNull()
  expect(document.querySelector('time[aria-current="date"]')?.textContent).toBe('10')
  expect(within(screen.getByRole('table')).getAllByRole('listitem')).toHaveLength(24)
  expect(within(screen.getByRole('table')).queryByRole('link')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '다음 연도' }))
  expect(screen.getByRole('table', { name: '2027년 9월 마감 일정' })).toBeTruthy()
  expect(screen.getByText('이 달에 표시할 예시 공고가 없습니다.')).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: '달력 월' }), { target: { value: '12' } })
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }))
  expect(screen.getByRole('table', { name: '2028년 1월 마감 일정' })).toBeTruthy()
})
