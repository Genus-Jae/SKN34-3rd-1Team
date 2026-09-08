function classes(...groups: string[]) {
  return groups.join(' ')
}

/** 태그가 나타내는 상태입니다. 색이 아니라 의미로 고르도록 이름을 상태로 둡니다. */
export type WorkspaceTagTone = 'ok' | 'warn' | 'danger' | 'muted' | 'info'

// 로그인 뒤 작업 화면들이 공유하는 UI 조각입니다. 화면별로 다른 배치는 각 화면의 styles 파일이 맡습니다.
export const workspacePageStyles = {
  // 본문이 스크롤돼도 현재 화면 이름과 주요 동작은 남아야 하므로 본문 칸의 위쪽에 붙입니다.
  header: classes(
    'sticky top-0 z-[3] flex flex-wrap items-center justify-between gap-4 border-b border-[#e8ecf7]',
    'bg-[rgb(255_255_255_/_92%)] backdrop-blur',
    'px-[clamp(1.25rem,5vw,4.5rem)] py-6 max-chat:px-4 max-chat:py-4',
  ),
  headerTitleGroup: 'flex flex-col gap-1',
  headerBackLink:
    'inline-flex items-center gap-[0.3rem] text-[0.75rem] font-bold text-[#6471a0] no-underline hover:text-[#504ebd]',
  eyebrow:
    'm-0 text-[0.7rem] font-extrabold tracking-[0.12em] text-[#6471a0] uppercase',
  title: 'm-0 text-[1.25rem] font-bold tracking-[-0.04em] text-[#151d3a]',
  headerActions: 'flex min-w-0 max-w-full flex-wrap items-center gap-2',
  content: classes(
    'flex flex-col gap-5 px-[clamp(1.25rem,5vw,4.5rem)] pt-8 pb-12',
    'max-chat:px-4 max-chat:pt-5 max-chat:pb-8',
  ),
  // 사이드바를 제외한 실제 작업 공간이 충분할 때만 보조 패널을 옆에 배치합니다.
  columns: 'grid grid-cols-1 items-start gap-6 @min-[64rem]/workspace:grid-cols-[minmax(0,1fr)_340px]',
  column: '@container/column flex min-w-0 flex-col gap-5',
  card: classes(
    'flex flex-col gap-[0.9rem] rounded-2xl border border-[#e4e8f5] bg-white p-[1.35rem]',
    'shadow-[0_12px_30px_rgb(47_67_129_/_7%)]',
  ),
  outlinedCard:
    'flex flex-col gap-[0.9rem] rounded-2xl border border-dashed border-[#cbd5ec] bg-white p-[1.35rem]',
  cardHeader: 'flex items-start justify-between gap-4',
  cardTitle: 'm-0 text-[1.02rem] font-bold tracking-[-0.025em] text-app-ink',
  cardDescription: 'mt-1 mb-0 text-[0.75rem] leading-[1.5] text-sample-muted',
  sectionEyebrow:
    'm-0 text-[0.7rem] font-extrabold tracking-[0.12em] text-[#6471a0] uppercase',
  primaryButton: classes(
    'inline-flex min-h-9 cursor-pointer items-center justify-center gap-[0.35rem] rounded-[0.55rem] border-0',
    'bg-brand-primary px-[0.8rem] py-[0.55rem] text-[0.74rem] font-extrabold text-white no-underline hover:bg-[#5051b8]',
  ),
  secondaryButton: classes(
    'inline-flex min-h-9 cursor-pointer items-center justify-center gap-[0.35rem] rounded-[0.55rem] border bg-white',
    'border-[#dfe4f2] px-[0.8rem] py-[0.55rem] text-[0.74rem] font-bold text-[#536087] no-underline',
    'hover:border-[#7774d7] hover:text-[#504ebd]',
  ),
  dangerButton: classes(
    'inline-flex min-h-9 cursor-pointer items-center justify-center rounded-[0.55rem] border-0 bg-[#9a3947]',
    'px-[0.8rem] py-[0.55rem] text-[0.74rem] font-extrabold text-white hover:bg-[#873140]',
  ),
  quietLink: 'text-[0.74rem] font-bold text-[#5e5fc8] no-underline hover:text-[#504ebd]',
  mutedLink: 'text-[0.74rem] font-bold text-sample-muted no-underline hover:text-[#536087]',
  dangerLink: 'text-[0.74rem] font-bold text-[#9a3947] no-underline hover:text-[#7d2f3a]',
  // 아직 화면이 없는 이동은 링크로 만들지 않고 이 스타일로 "준비 중"임을 보여줍니다.
  pendingLink: 'cursor-default text-[0.74rem] font-bold text-[#8a94ae]',
  tag: 'inline-flex shrink-0 items-center rounded-[0.35rem] px-[0.45rem] py-[0.2rem] text-[0.68rem] font-extrabold whitespace-nowrap',
  chip: classes(
    'inline-flex min-h-9 items-center gap-[0.35rem] rounded-full border bg-white px-[0.78rem] py-[0.4rem]',
    'text-[0.78rem] font-semibold text-[#536087] whitespace-nowrap',
  ),
  activeChip: 'border-brand-primary bg-[#f1f2ff] font-bold text-[#504ebd]',
  inactiveChip: 'border-[#dfe4f2]',
  keyValueRow:
    'flex items-center justify-between gap-3 rounded-[0.6rem] bg-[#f7f8fc] px-3 py-[0.6rem] text-[0.78rem] text-[#293454]',
  keyValueLabel: 'text-[0.75rem] font-bold text-sample-muted',
  table: 'w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-sample-border text-[0.75rem]',
  tableHeadCell:
    'bg-[#f2f5fc] px-3 py-[0.6rem] text-left text-[0.7rem] font-bold whitespace-nowrap text-[#263556]',
  tableCell: 'border-t border-[#e4e9f7] px-3 py-[0.6rem] align-middle text-[#59647e]',
  tableStrongCell: 'font-bold text-app-ink',
  tableActionCell: 'flex flex-wrap items-center gap-2',
  warnRow: 'bg-[#fffaf0]',
  dangerRow: 'bg-[#fff5f6]',
  pagination: 'flex items-center justify-between gap-3 text-[0.75rem] text-sample-muted',
  emptyNote: 'm-0 text-[0.78rem] leading-[1.6] text-sample-muted',
  toggle:
    'relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full border-0 p-0',
  toggleOn: 'bg-brand-primary',
  toggleOff: 'bg-[#d7dcef]',
  toggleKnob: 'absolute top-[3px] size-4 rounded-full bg-white transition-[left]',
  toggleKnobOn: 'left-[21px]',
  toggleKnobOff: 'left-[3px]',
} as const

const tagTones: Record<WorkspaceTagTone, string> = {
  ok: 'bg-[#f0f9e9] text-[#536d37]',
  warn: 'bg-[#fff4e0] text-[#8a5a00]',
  danger: 'bg-[#fff5f6] text-[#9a3947]',
  muted: 'bg-[#eef0f8] text-[#5b6681]',
  info: 'bg-[#f1f2ff] text-[#5e5fc8]',
}

export function workspaceTagClassName(tone: WorkspaceTagTone) {
  return `${workspacePageStyles.tag} ${tagTones[tone]}`
}

export function workspaceChipClassName(isActive: boolean) {
  const variant = isActive ? workspacePageStyles.activeChip : workspacePageStyles.inactiveChip
  return `${workspacePageStyles.chip} ${variant}`
}
