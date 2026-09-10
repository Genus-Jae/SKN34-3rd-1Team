// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { buildCalendarWeeks, calendarToday, createCalendarPreview, type CalendarProgram } from './savedProgramCalendar'
import { useSavedProgramCalendarViewModel } from './useSavedProgramCalendarViewModel'

afterEach(cleanup)

describe('관심 공고 캘린더', () => {
  it('서울 날짜를 사용하고 윤년·요일·6주 달력을 정확히 표시한다', () => {
    expect(calendarToday(new Date('2026-09-09T16:00:00Z'))).toBe('2026-09-10')
    const february = buildCalendarWeeks(2028, 2, '2028-02-29', [])
    expect(february.flat().filter(day => day.inMonth)).toHaveLength(29)
    expect(february.flat().find(day => day.isToday)?.key).toBe('2028-02-29')
    const august = buildCalendarWeeks(2026, 8, '2026-08-01', [])
    expect(august).toHaveLength(6)
    expect(august[0]![0]!.key).toBe('2026-07-26')
    expect(august[5]![6]!.key).toBe('2026-09-05')
  })

  it('한 날짜에 공고가 200개여도 누락하거나 날짜 없는 공고를 끼워 넣지 않는다', () => {
    const programs: CalendarProgram[] = Array.from({ length: 200 }, (_, i) => ({ id: `${i}`, title: `지원사업 ${i}`, organization: '기관', endDate: '2026-09-11' }))
    programs.push({ id: 'unknown', title: '날짜 미확인', organization: '기관', endDate: null })
    const days = buildCalendarWeeks(2026, 9, '2026-09-10', programs).flat()
    expect(days.find(day => day.key === '2026-09-11')!.programs).toHaveLength(200)
    expect(days.flatMap(day => day.programs)).toHaveLength(200)
    expect(programs).toHaveLength(201)
  })

  it('연도·월 이동, 직접 선택, 오늘 복귀와 범위를 처리한다', () => {
    const today = '2026-12-10'
    const { result } = renderHook(() => useSavedProgramCalendarViewModel({ today, programs: createCalendarPreview(today) }))
    act(() => result.current.moveMonth(1))
    expect([result.current.year, result.current.month]).toEqual([2027, 1])
    expect(result.current.programsInMonth).toBe(0)
    act(() => result.current.moveMonth(-12))
    expect([result.current.year, result.current.month]).toEqual([2026, 1])
    act(() => result.current.chooseMonth(2028, 2))
    expect(result.current.weeks.flat().filter(day => day.inMonth)).toHaveLength(29)
    act(() => result.current.goToToday())
    expect([result.current.year, result.current.month]).toEqual([2026, 12])
    expect(result.current.programsInMonth).toBe(24)
    act(() => result.current.chooseMonth(2000, 1))
    expect(result.current.canPreviousMonth).toBe(false)
    expect(result.current.canPreviousYear).toBe(false)
    act(() => result.current.moveMonth(-1))
    expect(result.current.year).toBe(2000)
    act(() => result.current.chooseMonth(2100, 12))
    expect(result.current.canNextMonth).toBe(false)
    expect(result.current.canNextYear).toBe(false)
  })
})
