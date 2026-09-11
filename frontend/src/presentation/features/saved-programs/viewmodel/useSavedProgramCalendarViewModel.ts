import { useLayoutEffect, useRef, useState } from 'react'

import {
  buildCalendarWeeks,
  calendarToday,
  createCalendarPreview,
  defaultSavedProgramCalendarFilters,
  filterCalendarPrograms,
  firstCalendarYear,
  lastCalendarYear,
  type CalendarProgram,
  type SavedProgramCalendarFilters,
} from './savedProgramCalendar'

/** 월 선택·필터·스크롤 위치는 이 화면만 사용하는 로컬 상태이므로 Redux에 넣지 않습니다. */
export function useSavedProgramCalendarViewModel(input?: { today: string; programs: readonly CalendarProgram[] }) {
  const [initial] = useState(() => {
    const today = input?.today ?? calendarToday()
    return { today, programs: input?.programs ?? createCalendarPreview(today) }
  })
  const [display, setDisplay] = useState(() => ({ year: Number(initial.today.slice(0, 4)), month: Number(initial.today.slice(5, 7)) }))
  const [filters, setFilters] = useState(defaultSavedProgramCalendarFilters)
  const [scrollTarget, setScrollTarget] = useState<'start' | 'today'>('today')
  const [scrollRevision, setScrollRevision] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLTableCellElement>(null)

  // 월 전환은 달력 내부만 초기화합니다. 오늘 복귀는 오늘이 있는 주를 고정 요일 아래로 옮깁니다.
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    if (scrollTarget === 'today' && todayRef.current) {
      const headerHeight = scroller.querySelector('thead')?.getBoundingClientRect().height ?? 0
      const offset = todayRef.current.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
      scroller.scrollTop = Math.max(0, offset - headerHeight)
    } else {
      scroller.scrollTop = 0
    }
  }, [display.year, display.month, scrollTarget, scrollRevision])

  function chooseMonth(year: number, month: number) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || year < firstCalendarYear || year > lastCalendarYear || month < 1 || month > 12) return
    setDisplay({ year, month })
    setScrollTarget('start')
    setScrollRevision(value => value + 1)
  }

  function moveMonth(offset: number) {
    const next = new Date(Date.UTC(display.year, display.month - 1 + offset, 1))
    chooseMonth(next.getUTCFullYear(), next.getUTCMonth() + 1)
  }

  function goToToday() {
    const today = calendarToday()
    const target = input ? initial.today : today
    setDisplay({ year: Number(target.slice(0, 4)), month: Number(target.slice(5, 7)) })
    setScrollTarget('today')
    setScrollRevision(value => value + 1)
  }

  const today = input ? initial.today : calendarToday()
  const filteredPrograms = filterCalendarPrograms(initial.programs, filters, today)
  const weeks = buildCalendarWeeks(display.year, display.month, today, filteredPrograms)
  const programsInMonth = new Set(weeks.flatMap(week => week.flatMap(day => day.events.map(event => event.program.id)))).size
  const allProgramsInMonth = new Set(buildCalendarWeeks(display.year, display.month, today, initial.programs)
    .flatMap(week => week.flatMap(day => day.events.map(event => event.program.id)))).size
  const activeFilterCount = [filters.keyword.trim(), filters.region, filters.category, filters.target]
    .filter(Boolean).length + Number(filters.excludeClosed)

  function changeFilter<Key extends keyof SavedProgramCalendarFilters>(key: Key, value: SavedProgramCalendarFilters[Key]) {
    setFilters(current => ({ ...current, [key]: value }))
  }

  function clearFilter(key: keyof SavedProgramCalendarFilters) {
    setFilters(current => ({ ...current, [key]: key === 'excludeClosed' ? false : '' }))
  }

  function resetFilters() {
    setFilters(defaultSavedProgramCalendarFilters)
  }

  return {
    ...display, weeks, programsInMonth, allProgramsInMonth, filters, activeFilterCount, scrollRef, todayRef,
    years: Array.from({ length: lastCalendarYear - firstCalendarYear + 1 }, (_, i) => firstCalendarYear + i),
    canPreviousMonth: display.year > firstCalendarYear || display.month > 1,
    canNextMonth: display.year < lastCalendarYear || display.month < 12,
    canPreviousYear: display.year > firstCalendarYear,
    canNextYear: display.year < lastCalendarYear,
    chooseMonth, moveMonth, goToToday, changeFilter, clearFilter, resetFilters,
  }
}
