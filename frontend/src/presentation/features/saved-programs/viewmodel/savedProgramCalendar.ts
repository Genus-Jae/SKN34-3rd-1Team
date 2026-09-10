/** 달력 UI에 필요한 표시 정보. 실제 회원 저장/공고 API 계약은 다음 개발 범위입니다. */
export type CalendarProgram = {
  id: string
  title: string
  organization: string
  endDate: string | null
}

export const firstCalendarYear = 2000
export const lastCalendarYear = 2100

export function toCalendarDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function calendarToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}-${parts.find(part => part.type === 'day')!.value}`
}

/** 샘플은 최초 표시 월에만 만듭니다. 월 이동 때 가짜 공고를 계속 생성하지 않습니다. */
export function createCalendarPreview(today: string): CalendarProgram[] {
  const names = ['AI 사업화 지원', '수출 바우처 지원사업', '스마트공장 구축 지원', '초기 창업기업 성장 지원', '중소기업 기술개발 지원', '해외 전시회 참가 지원']
  const organizations = ['서울경제진흥원', '중소벤처기업부', '중소벤처기업진흥공단']
  const month = today.slice(0, 7)
  const day = Number(today.slice(8))
  const lastDay = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate()
  const crowdedDay = Math.min(day + 1, lastDay)
  return Array.from({ length: 24 }, (_, index) => {
    const endDay = index < 9 ? crowdedDay : [3, 7, day, 15, 20, 24, 27][index % 7]!
    return {
      id: `calendar-preview-${index + 1}`,
      title: `${names[index % names.length]}${index >= 6 ? ` · ${index + 1}차` : ''}`,
      organization: organizations[index % organizations.length]!,
      endDate: `${month}-${String(endDay).padStart(2, '0')}`,
    }
  })
}

export function buildCalendarWeeks(year: number, month: number, today: string, programs: readonly CalendarProgram[]) {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const grouped = new Map<string, CalendarProgram[]>()
  for (const program of programs) {
    if (!program.endDate?.startsWith(`${monthKey}-`)) continue
    const entries = grouped.get(program.endDate) ?? []
    entries.push(program)
    grouped.set(program.endDate, entries)
  }
  return Array.from({ length: Math.ceil((start.getUTCDay() + length) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(Date.UTC(year, month - 1, week * 7 + weekday - start.getUTCDay() + 1))
      const key = toCalendarDate(date)
      const inMonth = key.startsWith(`${monthKey}-`)
      return { key, day: date.getUTCDate(), inMonth, isToday: key === today, programs: inMonth ? grouped.get(key) ?? [] : [] }
    }),
  )
}
