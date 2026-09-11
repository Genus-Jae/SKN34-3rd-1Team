import { regionNames } from '../../../../domain/entities/Region'
import { supportProgramCategories } from '../../../../domain/entities/SupportProgramCategory'
import { WorkspacePageHeader } from '../../../shared/workspace/WorkspacePageHeader'
import { useSavedProgramCalendarViewModel } from '../viewmodel/useSavedProgramCalendarViewModel'
import { savedProgramTargetOptions, type CalendarEventType, type SavedProgramCalendarFilters } from '../viewmodel/savedProgramCalendar'
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
    <WorkspacePageHeader title="관심 공고함" />
    <main className={s.page}>
      <section className={s.content} aria-label="관심 공고 캘린더">
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
        <span>공고가 많은 주는 달력 안에서 스크롤해 확인하세요.</span>
      </div>
      {vm.programsInMonth === 0 && <p className="m-0 shrink-0 bg-app-canvas px-4 py-3 text-sm text-sample-muted">이 달에 표시할 예시 공고가 없습니다.</p>}

      <div ref={vm.scrollRef} className={s.scroll} role="region" aria-label="달력 내부 스크롤" tabIndex={0}>
        <table className={s.table} aria-label={`${monthLabel} 접수 일정`}>
          <thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map((day, index) =>
            <th key={day} scope="col" className={`${s.weekday} ${index === 0 ? 'text-red-700' : index === 6 ? 'text-blue-700' : 'text-sample-muted'}`}>{day}</th>,
          )}</tr></thead>
          <tbody>{vm.weeks.map(week => <tr key={week[0]!.key}>{week.map((day, index) =>
            <td key={day.key} ref={day.isToday ? vm.todayRef : undefined} className={`${s.cell} ${!day.inMonth ? 'bg-[#fafbfc]' : 'bg-white'}`}>
              <time dateTime={day.key} aria-current={day.isToday ? 'date' : undefined} className={`${s.date} ${day.isToday ? 'bg-brand-primary font-bold text-white' : !day.inMonth ? 'text-[#9ca3af]' : index === 0 ? 'text-red-700' : index === 6 ? 'text-blue-700' : 'text-sample-muted'}`}>{day.day}</time>
              {day.events.length > 0 && <ul className={s.events} aria-label={`${day.key} 접수 일정 ${day.events.length}건`}>{day.events.map(event =>
                <li key={`${event.program.id}:${event.type}`} className={s.event}>
                  <span className={`${s.eventBadge} ${eventBadgeStyle[event.type]}`}>{eventBadgeLabel[event.type]}</span>
                  <span className={s.eventBody}>
                    <span className={s.eventTitle}>{event.program.title}</span>
                    <span className={s.eventOrg}>{event.program.organization}</span>
                  </span>
                </li>,
              )}</ul>}
            </td>,
          )}</tr>)}</tbody>
        </table>
      </div>
      <p className={s.footer}>예시 데이터로 보는 캘린더입니다. 실제 관심 등록·저장 및 공고 상세 이동은 아직 연결되지 않았습니다.</p>
      </section>
    </main>
  </>
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
