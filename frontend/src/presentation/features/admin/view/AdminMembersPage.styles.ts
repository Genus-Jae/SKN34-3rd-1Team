// 색상이나 CSS 속성이 아니라 어드민 회원·기업 목록에서 맡는 UI 역할을 이름으로 사용합니다.
// 카드·표·태그·버튼은 shared/workspace의 공용 스타일을 쓰고 여기서는 목록 고유 배치만 다룹니다.
export const adminMembersPageStyles = {
  statRow: 'flex flex-wrap gap-3',
  statCell:
    'flex min-w-40 flex-1 flex-col gap-[0.2rem] rounded-xl border border-[#e4e8f5] bg-white px-4 py-[0.85rem]',
  statValue: 'text-[1.35rem] font-bold tracking-[-0.03em]',
  statLabel: 'text-[0.7rem] text-[#7883a3]',
  toolbar: 'flex flex-wrap items-center gap-2',
  search:
    'flex min-h-10 w-[260px] max-w-full items-center gap-2 rounded-[0.7rem] border border-[#cbd5ec] bg-white px-[0.9rem] text-[0.8rem] text-[#8a94ae]',
  resultCount: 'ml-auto text-[0.78rem] text-[#7883a3]',
  tableScroll: 'w-full overflow-x-auto',
  emailCell: 'text-[0.74rem] [overflow-wrap:anywhere]',
  policyRow: 'flex items-start gap-3 rounded-[0.6rem] bg-[#f7f8fc] px-3 py-[0.6rem]',
  policyLabel: 'w-28 shrink-0 text-[0.75rem] font-bold text-[#263556]',
  policyValue: 'text-[0.75rem] leading-[1.5] text-[#4d597c]',
} as const

/** 요약 수치가 나타내는 상태입니다. 색이 아니라 의미로 고르도록 이름을 상태로 둡니다. */
export type AdminStatTone = 'neutral' | 'ok' | 'warn' | 'danger'

const statValueTones: Record<AdminStatTone, string> = {
  neutral: 'text-app-ink',
  ok: 'text-[#2f7a3d]',
  warn: 'text-[#8a5a00]',
  danger: 'text-[#9a3947]',
}

export function adminMembersStatValueClassName(tone: AdminStatTone) {
  return `${adminMembersPageStyles.statValue} ${statValueTones[tone]}`
}
