import { useSavedProgramCalendarViewModel } from '../viewmodel/useSavedProgramCalendarViewModel'
import { WorkspacePageHeader } from '../../../shared/workspace/WorkspacePageHeader'
import { savedCalendarStyles as s } from './SavedProgramsPage.styles'

function Arrow({ direction, double = false }: { direction: 'left' | 'right'; double?: boolean }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={direction === 'right' ? 'rotate-180' : undefined}>
    <path d={double ? 'M11 6l-6 6 6 6M19 6l-6 6 6 6' : 'M15 6l-6 6 6 6'} />
  </svg>
}

/** 캘린더 1차 시안. 필터와 상세페이지 연결은 다음 작업이며 여기서는 구현하지 않습니다. */
export function SavedProgramsPage() {
  const vm = useSavedProgramCalendarViewModel()
  const monthLabel = `${vm.year}년 ${vm.month}월`

  return <>
    <WorkspacePageHeader title="관심 공고함" />
    <main className={s.page}>
      <section className={s.content} aria-label="관심 공고 캘린더">
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
        <span role="status">{monthLabel} · 마감 공고 <strong className="text-app-ink">{vm.programsInMonth}건</strong></span>
        <span>공고가 많은 주는 달력 안에서 스크롤해 확인하세요.</span>
      </div>
      {vm.programsInMonth === 0 && <p className="m-0 shrink-0 bg-app-canvas px-4 py-3 text-sm text-sample-muted">이 달에 표시할 예시 공고가 없습니다.</p>}

      <div ref={vm.scrollRef} className={s.scroll} role="region" aria-label="달력 내부 스크롤" tabIndex={0}>
        <table className={s.table} aria-label={`${monthLabel} 마감 일정`}>
          <thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map((day, index) =>
            <th key={day} scope="col" className={`${s.weekday} ${index === 0 ? 'text-red-700' : index === 6 ? 'text-blue-700' : 'text-sample-muted'}`}>{day}</th>,
          )}</tr></thead>
          <tbody>{vm.weeks.map(week => <tr key={week[0]!.key}>{week.map((day, index) =>
            <td key={day.key} ref={day.isToday ? vm.todayRef : undefined} className={`${s.cell} ${!day.inMonth ? 'bg-[#fafbfc]' : 'bg-white'}`}>
              <time dateTime={day.key} aria-current={day.isToday ? 'date' : undefined} className={`${s.date} ${day.isToday ? 'bg-brand-primary font-bold text-white' : !day.inMonth ? 'text-[#9ca3af]' : index === 0 ? 'text-red-700' : index === 6 ? 'text-blue-700' : 'text-sample-muted'}`}>{day.day}</time>
              {day.programs.length > 0 && <ul className={s.events} aria-label={`${day.key} 마감 공고 ${day.programs.length}건`}>{day.programs.map(program =>
                <li key={program.id} className={s.event}>
                  <span className={s.eventTitle}>{program.title}</span>
                  <span className={s.eventOrg}>{program.organization}</span>
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
