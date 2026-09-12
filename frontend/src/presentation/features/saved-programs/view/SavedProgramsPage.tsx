import { useState } from 'react'
import { Link } from 'react-router'

import { regionNames } from '../../../../domain/entities/Region'
import { supportProgramCategories } from '../../../../domain/entities/SupportProgramCategory'
import { appPaths, supportProgramDetailPath } from '../../../shared/routes/appPaths'
import { workspaceChipClassName, workspacePageStyles, workspaceTagClassName, type WorkspaceTagTone } from '../../../shared/workspace/WorkspacePage.styles'
import { WorkspacePageHeader } from '../../../shared/workspace/WorkspacePageHeader'
import { savedSupportProgramMessages } from '../../saved-support-program/viewmodel/useSavedSupportProgramsViewModel'
import {
  type SavedProgramsBrowseUseCase,
  useSavedProgramCalendarViewModel,
} from '../viewmodel/useSavedProgramCalendarViewModel'
import {
  savedProgramTargetOptions,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarProgram,
  type SavedProgramCalendarFilters,
} from '../viewmodel/savedProgramCalendar'
import { savedCalendarStyles as s } from './SavedProgramsPage.styles'

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={direction === 'right' ? 'rotate-180' : undefined}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
}

type SavedProgramsPageProps = {
  initial?: { today: string; programs: readonly CalendarProgram[] }
  browseUseCase?: SavedProgramsBrowseUseCase
}

/**
 * 로그인 회원이 실제로 저장한 지원사업을 달력과 목록으로 보여 줍니다.
 * 머리글·탭·검색 칸·필터·카드는 파트너 관리와 같은 공용 모양을 쓰고, 달력만 이 화면 고유입니다.
 */
export function SavedProgramsPage({ initial, browseUseCase }: SavedProgramsPageProps = {}) {
  const vm = useSavedProgramCalendarViewModel(initial, browseUseCase)
  const monthLabel = `${vm.year}년 ${vm.month}월`
  const isEmpty = vm.phase === 'ready' && vm.totalProgramCount === 0
  const activeFilters: { key: keyof SavedProgramCalendarFilters; label: string }[] = [
    ...(vm.filters.keyword.trim() ? [{ key: 'keyword' as const, label: `검색 · ${vm.filters.keyword.trim()}` }] : []),
    ...(vm.filters.region ? [{ key: 'region' as const, label: `지역 · ${vm.filters.region}` }] : []),
    ...(vm.filters.category ? [{ key: 'category' as const, label: `분야 · ${vm.filters.category}` }] : []),
    ...(vm.filters.target ? [{ key: 'target' as const, label: `대상 · ${vm.filters.target}` }] : []),
  ]

  return <>
    <WorkspacePageHeader title="관심 공고함" tabs={<div className={s.viewTabs} role="tablist" aria-label="관심 공고 보기 방식">
      <button type="button" role="tab" aria-selected={vm.viewMode === 'calendar'} className={workspaceChipClassName(vm.viewMode === 'calendar')}
        onClick={() => vm.setViewMode('calendar')}>달력 보기</button>
      <button type="button" role="tab" aria-selected={vm.viewMode === 'list'} className={workspaceChipClassName(vm.viewMode === 'list')}
        onClick={() => vm.setViewMode('list')}>목록 보기</button>
    </div>} />

    <div className={workspacePageStyles.content}>
      <div className={workspacePageStyles.column}>
        {/* 검색어·지역·분야·대상은 저장된 공고 안에서 바로 거릅니다. 서버 요청이 없어 조회 버튼을 두지 않습니다. */}
        <form className={s.filterPanel} aria-label="관심 공고 필터" onSubmit={event => event.preventDefault()}>
          <div className={s.filterControls}>
            <label className={s.searchField}>
              <span>검색어</span>
              <span className={s.search}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input className={s.searchInput} type="search" name="keyword" aria-label="공고명 또는 기관명" placeholder="공고명, 기관명" maxLength={100}
                  value={vm.filters.keyword} onChange={event => vm.changeFilter('keyword', event.target.value)} />
              </span>
            </label>
            <FilterSelect label="지역" value={vm.filters.region} options={regionNames} onChange={value => vm.changeFilter('region', value)} />
            <FilterSelect label="지원 분야" value={vm.filters.category} options={supportProgramCategories} onChange={value => vm.changeFilter('category', value)} />
            <FilterSelect label="지원 대상" value={vm.filters.target} options={savedProgramTargetOptions} onChange={value => vm.changeFilter('target', value)} />
          </div>
          <div className={s.appliedFilters}>
            <strong className={s.appliedTitle}>적용된 검색조건 <span className="text-brand-primary">{vm.activeFilterCount}</span></strong>
            {activeFilters.map(filter => <button type="button" className={s.filterChip} key={filter.key} onClick={() => vm.clearFilter(filter.key)}>
              {filter.label}<span aria-hidden="true">×</span><span className="sr-only"> 조건 해제</span>
            </button>)}
            {vm.activeFilterCount > 0
              ? <button type="button" className={s.resetFilters} onClick={vm.resetFilters}>전체 초기화</button>
              : <span className={s.resultCount}>관심 공고 {vm.totalProgramCount}건을 모두 표시하고 있습니다.</span>}
          </div>
        </form>

        {vm.phase === 'loading' && vm.totalProgramCount === 0 ? (
          <section className={workspacePageStyles.card} aria-label="관심 공고 불러오는 중">
            <p className={workspacePageStyles.emptyNote} role="status">{savedSupportProgramMessages.loading}</p>
          </section>
        ) : vm.phase === 'failed' ? (
          <section className={workspacePageStyles.card} aria-label="관심 공고 불러오기 실패">
            <p className={workspacePageStyles.emptyNote}>{savedSupportProgramMessages.failed}</p>
            <button className={workspacePageStyles.quietLink} type="button" onClick={vm.retry}>다시 시도</button>
          </section>
        ) : isEmpty ? (
          <section className={workspacePageStyles.card} aria-label="관심 공고 없음">
            <p className={workspacePageStyles.emptyNote}>{savedSupportProgramMessages.empty}</p>
            <div><Link className={workspacePageStyles.primaryButton} to={appPaths.chat}>지원사업 찾기</Link></div>
          </section>
        ) : null}

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
              <div className={s.arrowGroup} role="group" aria-label="월 이동">
                <button type="button" className={s.arrow} aria-label="이전 달" title="이전 달" disabled={!vm.canPreviousMonth} onClick={() => vm.moveMonth(-1)}><Arrow direction="left" /></button>
                <button type="button" className={s.arrow} aria-label="다음 달" title="다음 달" disabled={!vm.canNextMonth} onClick={() => vm.moveMonth(1)}><Arrow direction="right" /></button>
              </div>
              <span className={s.note} role="status">표시 공고 <strong className="text-app-ink">{vm.programsInMonth}건</strong> / 전체 {vm.allProgramsInMonth}건</span>
            </div>
          </div>

          <div className={s.calendarFrame}>
            <table className={s.table} aria-label={`${monthLabel} 접수 일정`}>
              <thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map((day, index) =>
                <th key={day} scope="col" className={`${s.weekday} ${index === 0 ? 'text-[#b75561]' : index === 6 ? 'text-[#2b5ea8]' : 'text-sample-muted'}`}>{day}</th>,
              )}</tr></thead>
              <tbody>{vm.weeks.map(week => <tr key={week[0]!.key}>{week.map((day, index) =>
                <td key={day.key} className={`${s.cell} ${!day.inMonth ? 'bg-[#fafbfc]' : 'bg-white'}`}>
                  <time dateTime={day.key} aria-current={day.isToday ? 'date' : undefined} className={`${s.date} ${day.isToday ? 'bg-brand-primary font-bold text-white' : !day.inMonth ? 'text-[#9ca3af]' : index === 0 ? 'text-[#b75561]' : index === 6 ? 'text-[#2b5ea8]' : 'text-sample-muted'}`}>{day.day}</time>
                  <CalendarEvents date={day.key} events={day.events} />
                </td>,
              )}</tr>)}</tbody>
            </table>
          </div>
        </> : <SavedProgramList programs={vm.listPrograms} today={vm.today} page={vm.listPage}
          totalPages={vm.listTotalPages} onPageChange={vm.chooseListPage} />}
      </div>
    </div>
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
          <div><p className={workspacePageStyles.sectionEyebrow}>접수 일정</p><h2 id={`calendar-events-${date}`} className="mt-1 mb-0 text-xl font-bold">{date} · {events.length}건</h2></div>
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
  const detailPath = getDetailPath(event.program)
  return <li className={expanded ? s.dialogEvent : s.event} title={event.program.title}>
    <span className={`${s.eventBadge} ${eventBadgeStyle[event.type]}`}>{eventBadgeLabel[event.type]}</span>
    <span className="min-w-0 flex-1">
      {detailPath ? <Link className={expanded ? 'block font-semibold text-app-ink hover:text-brand-primary' : s.eventTitle}
        to={detailPath} state={{ searchReturnTo: appPaths.savedPrograms }}>{event.program.title}</Link>
        : <span className={expanded ? 'block font-semibold text-app-ink' : s.eventTitle}>{event.program.title}</span>}
      {expanded ? <span className="mt-1 block text-xs text-sample-muted">{event.program.organization} · {event.program.region} · {event.program.category}</span> : null}
    </span>
  </li>
}

function SavedProgramList({ programs, today, page, totalPages, onPageChange }: {
  programs: CalendarProgram[]; today: string; page: number; totalPages: number; onPageChange: (page: number) => void
}) {
  const pageStart = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageStart + index)
  return <div role="tabpanel" aria-label="관심 공고 목록" className="flex flex-col gap-4">
    {programs.length ? <div className={s.cardGrid}>{programs.map(program => {
      const status = programStatus(program, today)
      const detailPath = getDetailPath(program)
      return <article key={program.id} className={workspacePageStyles.card}>
        <div className={s.cardTop}>
          <span className={workspaceTagClassName(statusTone[status])}>{status}</span>
          <span className={s.cardPeriod}>{formatPeriod(program)}</span>
        </div>
        <h2 className={s.cardTitle} title={program.title}>
          {detailPath
            ? <Link to={detailPath} state={{ searchReturnTo: appPaths.savedPrograms }} className={s.cardTitleLink}>{program.title}</Link>
            : program.title}
        </h2>
        <p className={s.cardMeta}>{program.organization}</p>
        <div className={s.tagRow}>
          <span className={workspaceTagClassName('muted')} title={program.region}>{program.region}</span>
          <span className={workspaceTagClassName('muted')} title={program.category}>{program.category}</span>
          <span className={workspaceTagClassName('muted')} title={program.target}>{program.target}</span>
        </div>
      </article>
    })}</div> : (
      <section className={workspacePageStyles.card} aria-label="조건에 맞는 관심 공고 없음">
        <p className={workspacePageStyles.emptyNote}>조건에 맞는 관심 공고가 없습니다.</p>
      </section>
    )}
    {totalPages > 1 ? <nav className={s.pagination} aria-label="관심 공고 페이지">
      <button type="button" className={`${s.pageButton} ${s.inactivePageButton}`} disabled={page === 1} onClick={() => onPageChange(page - 1)}>이전</button>
      {pages.map(value => <button type="button" key={value} aria-label={`${value}페이지`} aria-current={value === page ? 'page' : undefined}
        className={`${s.pageButton} ${value === page ? s.activePageButton : s.inactivePageButton}`} onClick={() => onPageChange(value)}>{value}</button>)}
      <button type="button" className={`${s.pageButton} ${s.inactivePageButton}`} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>다음</button>
    </nav> : null}
    <p className={s.footer}>한 페이지에 8건씩 보여 주며, 공고명을 누르면 지원사업 상세로 갑니다.</p>
  </div>
}

function getDetailPath(program: CalendarProgram): string | null {
  if (!program.sourceCode || !program.sourceProgramId) return null
  return supportProgramDetailPath({ sourceCode: program.sourceCode, sourceProgramId: program.sourceProgramId }, true)
}

type ProgramStatus = '접수 예정' | '접수 중' | '마감' | '날짜 미확인'

function programStatus(program: CalendarProgram, today: string): ProgramStatus {
  if (program.startDate === null && program.endDate === null) return '날짜 미확인'
  if (program.endDate !== null && program.endDate < today) return '마감'
  if (program.startDate !== null && program.startDate > today) return '접수 예정'
  return '접수 중'
}

/** 공고 상세·검색 결과와 같은 의미의 색을 씁니다. 접수 중은 초록, 예정은 안내, 마감은 회색, 날짜 미확인은 주의입니다. */
const statusTone: Record<ProgramStatus, WorkspaceTagTone> = {
  '접수 중': 'ok',
  '접수 예정': 'info',
  '마감': 'muted',
  '날짜 미확인': 'warn',
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
