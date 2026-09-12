import { useState } from 'react'

import { regionNames } from '../../../../domain/entities/Region'
import { supportProgramCategories } from '../../../../domain/entities/SupportProgramCategory'
import { WorkspacePageHeader } from '../../../shared/workspace/WorkspacePageHeader'
import { useSavedProgramCalendarViewModel } from '../viewmodel/useSavedProgramCalendarViewModel'
import {
  savedProgramTargetOptions,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarProgram,
  type SavedProgramCalendarFilters,
} from '../viewmodel/savedProgramCalendar'
import { savedCalendarStyles as s } from './SavedProgramsPage.styles'

function Arrow({ direction, double = false }: { direction: 'left' | 'right'; double?: boolean }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={direction === 'right' ? 'rotate-180' : undefined}>
    <path d={double ? 'M11 6l-6 6 6 6M19 6l-6 6 6 6' : 'M15 6l-6 6 6 6'} />
  </svg>
}

/** 관심 공고 캘린더 시안. 필터는 예시 데이터에 적용하며 실제 저장과 상세 이동은 다음 작업입니다. */
export function SavedProgramsPage() {
  const vm = useSavedProgramCalendarViewModel()
  const monthLabel = `${vm.year}년 ${vm.month}월`
  const activeFilters: { key: keyof SavedProgramCalendarFilters; label: string }[] = [
    ...(vm.filters.keyword.trim() ? [{ key: 'keyword' as const, label: `검색 · ${vm.filters.keyword.trim()}` }] : []),
    ...(vm.filters.region ? [{ key: 'region' as const, label: `지역 · ${vm.filters.region}` }] : []),
    ...(vm.filters.category ? [{ key: 'category' as const, label: `분야 · ${vm.filters.category}` }] : []),
    ...(vm.filters.target ? [{ key: 'target' as const, label: `대상 · ${vm.filters.target}` }] : []),
    ...(vm.filters.excludeClosed ? [{ key: 'excludeClosed' as const, label: '마감 공고 제외' }] : []),
  ]

  return <>
    <WorkspacePageHeader title="관심 공고함" tabs={<div className={s.viewTabs} role="tablist" aria-label="관심 공고 보기 방식">
      <button type="button" role="tab" aria-selected={vm.viewMode === 'calendar'} className={`${s.viewTab} ${vm.viewMode === 'calendar' ? s.activeViewTab : ''}`}
        onClick={() => vm.setViewMode('calendar')}>달력 보기</button>
      <button type="button" role="tab" aria-selected={vm.viewMode === 'list'} className={`${s.viewTab} ${vm.viewMode === 'list' ? s.activeViewTab : ''}`}
        onClick={() => vm.setViewMode('list')}>목록 보기</button>
    </div>} />
    <main className={s.page}>
      <section className={s.content} aria-label="관심 공고">
      <form className={s.filters} aria-label="관심 공고 필터" onSubmit={event => event.preventDefault()}>
        <div className={s.filterControls}>
          <label className={s.searchField}>
            <span className="sr-only">공고명 또는 기관명</span>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
            </svg>
            <input type="search" className={s.searchInput} placeholder="공고명·기관명 검색" maxLength={100}
              value={vm.filters.keyword} onChange={event => vm.changeFilter('keyword', event.target.value)} />
          </label>
          <FilterSelect label="지역" value={vm.filters.region} options={regionNames} onChange={value => vm.changeFilter('region', value)} />
          <FilterSelect label="지원 분야" value={vm.filters.category} options={supportProgramCategories} onChange={value => vm.changeFilter('category', value)} />
          <FilterSelect label="지원 대상" value={vm.filters.target} options={savedProgramTargetOptions} onChange={value => vm.changeFilter('target', value)} />
          <label className={s.closedToggle}>
            <input type="checkbox" checked={vm.filters.excludeClosed} onChange={event => vm.changeFilter('excludeClosed', event.target.checked)} />
            <span>마감 공고 제외</span>
          </label>
        </div>
        <div className={s.appliedFilters}>
          <strong>적용된 검색조건 <span className="text-brand-primary">{vm.activeFilterCount}</span></strong>
          {activeFilters.map(filter => <button type="button" className={s.filterChip} key={filter.key} onClick={() => vm.clearFilter(filter.key)}>
            {filter.label}<span aria-hidden="true">×</span><span className="sr-only"> 조건 해제</span>
          </button>)}
          {vm.activeFilterCount > 0 ? <button type="button" className={s.resetFilters} onClick={vm.resetFilters}>전체 초기화</button> : <span className={s.noFilters}>전체 관심 공고를 표시하고 있습니다.</span>}
        </div>
      </form>

      {vm.viewMode === 'calendar' ? <>
        <div className={s.toolbar}>
          <div className={s.navigation}>
            <div className="flex items-center gap-1">
              <select aria-label="달력 연도" className={s.monthSelect} value={vm.year} onChange={event => vm.chooseMonth(Number(event.target.value), vm.month)}>
                {vm.years.map(year => <option key={year} value={year}>{year}년</option>)}
              </select>
              <select aria-label="달력 월" className={s.monthSelect} value={vm.month} onChange={event => vm.chooseMonth(vm.year, Number(event.target.value))}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}월</option>)}
              </select>
            </div>
            <div className={s.arrowGroup} role="group" aria-label="연도와 월 이동">
              <button type="button" className={s.arrow} aria-label="이전 연도" title="이전 연도" disabled={!vm.canPreviousYear} onClick={() => vm.moveMonth(-12)}><Arrow direction="left" double /></button>
              <button type="button" className={s.arrow} aria-label="이전 달" title="이전 달" disabled={!vm.canPreviousMonth} onClick={() => vm.moveMonth(-1)}><Arrow direction="left" /></button>
              <button type="button" className={s.arrow} aria-label="다음 달" title="다음 달" disabled={!vm.canNextMonth} onClick={() => vm.moveMonth(1)}><Arrow direction="right" /></button>
              <button type="button" className={s.arrow} aria-label="다음 연도" title="다음 연도" disabled={!vm.canNextYear} onClick={() => vm.moveMonth(12)}><Arrow direction="right" double /></button>
            </div>
          </div>
          <span className="text-sm font-semibold text-brand-primary">월간 캘린더</span>
        </div>

        <div className={s.note}>
          <span role="status">{monthLabel} · 표시 공고 <strong className="text-app-ink">{vm.programsInMonth}건</strong> / 전체 {vm.allProgramsInMonth}건</span>
          <span>날짜별 공고는 최대 3건까지 표시하며 나머지는 건수로 안내합니다.</span>
        </div>
        {vm.programsInMonth === 0 && <p className="m-0 shrink-0 bg-app-canvas px-4 py-3 text-sm text-sample-muted">이 달에 표시할 예시 공고가 없습니다.</p>}

        <div className={s.calendarFrame}>
          <table className={s.table} aria-label={`${monthLabel} 접수 일정`}>
            <thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map((day, index) =>
              <th key={day} scope="col" className={`${s.weekday} ${index === 0 ? 'text-red-700' : index === 6 ? 'text-blue-700' : 'text-sample-muted'}`}>{day}</th>,
            )}</tr></thead>
            <tbody>{vm.weeks.map(week => <tr key={week[0]!.key}>{week.map((day, index) =>
              <td key={day.key} className={`${s.cell} ${!day.inMonth ? 'bg-[#fafbfc]' : 'bg-white'}`}>
                <time dateTime={day.key} aria-current={day.isToday ? 'date' : undefined} className={`${s.date} ${day.isToday ? 'bg-brand-primary font-bold text-white' : !day.inMonth ? 'text-[#9ca3af]' : index === 0 ? 'text-red-700' : index === 6 ? 'text-blue-700' : 'text-sample-muted'}`}>{day.day}</time>
                <CalendarEvents date={day.key} events={day.events} />
              </td>,
            )}</tr>)}</tbody>
          </table>
        </div>
        <p className={s.footer}>예시 데이터로 보는 캘린더입니다. 실제 관심 등록·저장 및 공고 상세 이동은 아직 연결되지 않았습니다.</p>
      </> : <SavedProgramList programs={vm.listPrograms} total={vm.filteredProgramCount} today={vm.today} page={vm.listPage}
        totalPages={vm.listTotalPages} onPageChange={vm.chooseListPage} />}
      </section>
    </main>
  </>
}

const maximumVisibleEvents = 3

function CalendarEvents({ date, events }: { date: string; events: CalendarEvent[] }) {
  const [showAll, setShowAll] = useState(false)
  if (events.length === 0) return null
  const visible = events.slice(0, maximumVisibleEvents)
  const hiddenCount = events.length - visible.length
  return <>
    <ul className={s.events} aria-label={`${date} 접수 일정 ${events.length}건`}>
      {visible.map(event => <CalendarEventRow key={`${event.program.id}:${event.type}`} event={event} />)}
      {hiddenCount > 0 ? <li><button type="button" className={s.overflowCount} onClick={() => setShowAll(true)}>+{hiddenCount}건 더보기</button></li> : null}
    </ul>
    {showAll ? <div className={s.dialogBackdrop} role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) setShowAll(false)
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby={`calendar-events-${date}`} className={s.dialog}>
        <div className={s.dialogHeader}>
          <div><p className="m-0 text-xs font-semibold text-brand-primary">접수 일정</p><h2 id={`calendar-events-${date}`} className="mt-1 mb-0 text-xl font-bold">{date} · {events.length}건</h2></div>
          <button type="button" className={s.dialogClose} aria-label="전체 공고 닫기" onClick={() => setShowAll(false)}>×</button>
        </div>
        <ul className={s.dialogEvents} aria-label={`${date} 전체 접수 일정`}>
          {events.map(event => <CalendarEventRow key={`${event.program.id}:${event.type}`} event={event} expanded />)}
        </ul>
      </section>
    </div> : null}
  </>
}

function CalendarEventRow({ event, expanded = false }: { event: CalendarEvent; expanded?: boolean }) {
  return <li className={expanded ? s.dialogEvent : s.event} title={event.program.title}>
    <span className={`${s.eventBadge} ${eventBadgeStyle[event.type]}`}>{eventBadgeLabel[event.type]}</span>
    <span className="min-w-0 flex-1">
      <span className={expanded ? 'block font-semibold text-app-ink' : s.eventTitle}>{event.program.title}</span>
      {expanded ? <span className="mt-1 block text-xs text-sample-muted">{event.program.organization} · {event.program.region} · {event.program.category}</span> : null}
    </span>
  </li>
}

function SavedProgramList({ programs, total, today, page, totalPages, onPageChange }: {
  programs: CalendarProgram[]; total: number; today: string; page: number; totalPages: number; onPageChange: (page: number) => void
}) {
  const pageStart = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageStart + index)
  return <div role="tabpanel" aria-label="관심 공고 목록">
    <div className={s.listSummary}><strong className="text-app-ink">관심 공고 {total}건</strong><span>한 페이지에 8개씩 표시합니다.</span></div>
    {programs.length ? <div className={s.list}>{programs.map(program => {
      const status = programStatus(program, today)
      return <article key={program.id} className={s.listItem}>
        <div className="min-w-0">
          <h2 className={s.listTitle} title={program.title}>{program.title}</h2>
          <p className={s.listMeta}>{program.organization} · {program.region} · {program.category} · {program.target}</p>
        </div>
        <div className={s.listPeriod}>
          <span className={status === '마감' ? s.closedBadge : s.statusBadge}>{status}</span>
          <span>{formatPeriod(program)}</span>
        </div>
      </article>
    })}</div> : <p className="rounded-2xl border border-sample-border p-10 text-center text-sm text-sample-muted">조건에 맞는 관심 공고가 없습니다.</p>}
    {totalPages > 1 ? <nav className={s.pagination} aria-label="관심 공고 페이지">
      <button type="button" className={`${s.pageButton} ${s.inactivePageButton}`} disabled={page === 1} onClick={() => onPageChange(page - 1)}>이전</button>
      {pages.map(value => <button type="button" key={value} aria-label={`${value}페이지`} aria-current={value === page ? 'page' : undefined}
        className={`${s.pageButton} ${value === page ? s.activePageButton : s.inactivePageButton}`} onClick={() => onPageChange(value)}>{value}</button>)}
      <button type="button" className={`${s.pageButton} ${s.inactivePageButton}`} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>다음</button>
    </nav> : null}
    <p className={s.footer}>예시 데이터 목록입니다. 실제 관심 등록·저장 및 공고 상세 이동은 아직 연결되지 않았습니다.</p>
  </div>
}

function programStatus(program: CalendarProgram, today: string): '접수 예정' | '접수 중' | '마감' | '날짜 미확인' {
  if (program.startDate === null && program.endDate === null) return '날짜 미확인'
  if (program.endDate !== null && program.endDate < today) return '마감'
  if (program.startDate !== null && program.startDate > today) return '접수 예정'
  return '접수 중'
}

function formatPeriod(program: CalendarProgram): string {
  if (program.startDate === null && program.endDate === null) return '접수일 미확인'
  return `${program.startDate ?? '시작일 미확인'} ~ ${program.endDate ?? '마감일 미확인'}`
}

const eventBadgeLabel: Record<CalendarEventType, string> = {
  START: '시', END: '끝', SAME_DAY: '당일',
}

const eventBadgeStyle: Record<CalendarEventType, string> = {
  START: 'bg-[#dff4e7] text-[#187348]',
  END: 'bg-[#344054] text-white',
  SAME_DAY: 'bg-[#fff0d5] text-[#9a5b00]',
}

function FilterSelect({ label, value, options, onChange }: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return <label className={s.selectField}>
    <span>{label}</span>
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
      <option value="">전체</option>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
}
