import { useEffect, useState } from 'react'

import { appContainer } from '../../../../app/appContainer'
import type { SavedSupportProgram } from '../../../../domain/entities/SavedSupportProgram'
import type { BrowseSavedSupportProgramsUseCase } from '../../../../domain/usecases/SavedSupportProgramUseCases'
import {
  buildCalendarWeeks,
  calendarToday,
  defaultSavedProgramCalendarFilters,
  filterCalendarPrograms,
  firstCalendarYear,
  lastCalendarYear,
  toCalendarPrograms,
  type CalendarProgram,
  type SavedProgramCalendarFilters,
} from './savedProgramCalendar'

export type SavedProgramsViewMode = 'calendar' | 'list'
export type SavedProgramsBrowseUseCase = Pick<BrowseSavedSupportProgramsUseCase, 'execute'>

const savedProgramListPageSize = 8

type LoadState =
  | { phase: 'loading'; items: SavedSupportProgram[] }
  | { phase: 'ready'; items: SavedSupportProgram[] }
  | { phase: 'failed'; items: SavedSupportProgram[] }

/** 서버 공고는 UseCase로 읽고, 월 선택·필터·보기 방식은 화면 로컬 상태로 관리합니다. */
export function useSavedProgramCalendarViewModel(
  input?: { today: string; programs: readonly CalendarProgram[] },
  browseUseCase: SavedProgramsBrowseUseCase = appContainer.resolve('browseSavedSupportProgramsUseCase'),
) {
  const [initial] = useState(() => {
    const today = input?.today ?? calendarToday()
    return { today, programs: input?.programs ?? null }
  })
  const [loadState, setLoadState] = useState<LoadState>({ phase: initial.programs ? 'ready' : 'loading', items: [] })
  const [loadVersion, setLoadVersion] = useState(0)
  const [display, setDisplay] = useState(() => ({ year: Number(initial.today.slice(0, 4)), month: Number(initial.today.slice(5, 7)) }))
  const [filters, setFilters] = useState(defaultSavedProgramCalendarFilters)
  const [viewMode, setViewMode] = useState<SavedProgramsViewMode>('calendar')
  const [listPage, setListPage] = useState(1)

  useEffect(() => {
    if (initial.programs) return
    const controller = new AbortController()
    setLoadState((current) => ({ phase: 'loading', items: current.items }))
    browseUseCase.execute(controller.signal)
      .then((items) => { if (!controller.signal.aborted) setLoadState({ phase: 'ready', items }) })
      .catch(() => { if (!controller.signal.aborted) setLoadState((current) => ({ phase: 'failed', items: current.items })) })
    return () => controller.abort()
  }, [browseUseCase, initial.programs, loadVersion])

  function chooseMonth(year: number, month: number) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || year < firstCalendarYear || year > lastCalendarYear || month < 1 || month > 12) return
    setDisplay({ year, month })
  }

  function moveMonth(offset: number) {
    const next = new Date(Date.UTC(display.year, display.month - 1 + offset, 1))
    chooseMonth(next.getUTCFullYear(), next.getUTCMonth() + 1)
  }

  function goToToday() {
    const today = calendarToday()
    const target = input ? initial.today : today
    setDisplay({ year: Number(target.slice(0, 4)), month: Number(target.slice(5, 7)) })
  }

  const today = input ? initial.today : calendarToday()
  const programs = initial.programs ?? toCalendarPrograms(loadState.items)
  const filteredPrograms = filterCalendarPrograms(programs, filters, today)
  const weeks = buildCalendarWeeks(display.year, display.month, today, filteredPrograms)
  const programsInMonth = new Set(weeks.flatMap(week => week.flatMap(day => day.events.map(event => event.program.id)))).size
  const allProgramsInMonth = new Set(buildCalendarWeeks(display.year, display.month, today, programs)
    .flatMap(week => week.flatMap(day => day.events.map(event => event.program.id)))).size
  const activeFilterCount = [filters.keyword.trim(), filters.region, filters.category, filters.target]
    .filter(Boolean).length + Number(filters.excludeClosed)
  const listTotalPages = Math.max(1, Math.ceil(filteredPrograms.length / savedProgramListPageSize))
  const safeListPage = Math.min(listPage, listTotalPages)
  const listPrograms = filteredPrograms.slice((safeListPage - 1) * savedProgramListPageSize, safeListPage * savedProgramListPageSize)

  function changeFilter<Key extends keyof SavedProgramCalendarFilters>(key: Key, value: SavedProgramCalendarFilters[Key]) {
    setFilters(current => ({ ...current, [key]: value }))
    setListPage(1)
  }

  function clearFilter(key: keyof SavedProgramCalendarFilters) {
    setFilters(current => ({ ...current, [key]: key === 'excludeClosed' ? false : '' }))
    setListPage(1)
  }

  function resetFilters() {
    setFilters(defaultSavedProgramCalendarFilters)
    setListPage(1)
  }

  function chooseListPage(page: number) {
    if (!Number.isInteger(page) || page < 1 || page > listTotalPages) return
    setListPage(page)
  }

  return {
    ...display, today, phase: loadState.phase, weeks, programsInMonth, allProgramsInMonth, filters, activeFilterCount,
    viewMode, listPage: safeListPage, listTotalPages, listPrograms, filteredProgramCount: filteredPrograms.length,
    years: Array.from({ length: lastCalendarYear - firstCalendarYear + 1 }, (_, i) => firstCalendarYear + i),
    canPreviousMonth: display.year > firstCalendarYear || display.month > 1,
    canNextMonth: display.year < lastCalendarYear || display.month < 12,
    canPreviousYear: display.year > firstCalendarYear,
    canNextYear: display.year < lastCalendarYear,
    chooseMonth, moveMonth, goToToday, changeFilter, clearFilter, resetFilters, setViewMode, chooseListPage,
    retry: () => setLoadVersion((value) => value + 1),
  }
}
