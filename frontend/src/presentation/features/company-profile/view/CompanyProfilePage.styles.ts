function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 기업 프로필 화면에서 맡는 UI 역할을 이름으로 사용합니다.
// 카드·태그·버튼은 shared/workspace의 공용 스타일을 쓰고 여기서는 프로필 고유 배치만 다룹니다.
export const companyProfileStyles = {
  summaryTop: 'flex items-center justify-between gap-4 max-chat:flex-col max-chat:items-start',
  summaryIdentity: 'flex items-center gap-4',
  summaryAvatar:
    'grid size-[3.25rem] shrink-0 place-items-center rounded-[0.9rem] bg-brand-accent text-[1.2rem] font-black text-[#17203d]',
  summaryName: 'text-[1.25rem] font-bold tracking-[-0.025em] text-app-ink',
  summaryTags: 'mt-[0.35rem] flex flex-wrap gap-[0.35rem]',
  completion: 'flex flex-col gap-2',
  completionRow: 'flex items-center justify-between text-[0.75rem]',
  completionLabel: 'font-bold text-[#4d597c]',
  completionValue: 'font-extrabold text-[#5e5fc8]',
  completionTrack: 'h-2 overflow-hidden rounded-full bg-[#eef0f8]',
  completionBar: 'h-full rounded-full bg-brand-primary',
  completionHint: 'text-[0.75rem] leading-[1.5] text-sample-muted',
  fieldGrid: 'grid grid-cols-1 gap-3 @min-[32rem]/column:grid-cols-2',
  field: 'flex flex-col gap-1 rounded-[0.65rem] bg-[#f7f8fc] px-[0.85rem] py-[0.7rem]',
  emptyField:
    'flex flex-col gap-1 rounded-[0.65rem] border border-dashed border-[#cbd5ec] bg-white px-[0.85rem] py-[0.7rem]',
  fieldLabel: 'flex items-center gap-1 text-[0.7rem] font-bold text-sample-muted',
  optionalMark: 'font-medium text-sample-muted',
  fieldValue: 'flex items-center gap-2 text-[0.85rem] text-[#293454]',
  emptyValue: 'text-[0.85rem] text-sample-muted',
  settingRow: 'flex items-center justify-between gap-4 rounded-[0.65rem] bg-[#f7f8fc] px-4 py-[0.85rem]',
  settingTitle: 'block text-[0.85rem] font-bold text-[#293454]',
  settingDescription: 'mt-[0.1rem] block text-[0.74rem] leading-[1.5] text-sample-muted',
  choiceColumns: 'grid grid-cols-1 gap-4 @min-[32rem]/column:grid-cols-2',
  choiceGroup: 'flex flex-col gap-2',
  choiceLabel: 'text-[0.78rem] font-bold text-[#4d597c]',
  choices: 'flex flex-wrap gap-[0.4rem]',
  choice:
    'inline-flex min-h-9 cursor-pointer items-center rounded-full border px-[0.78rem] py-[0.4rem] text-[0.78rem]',
  selectedChoice: 'border-brand-primary bg-brand-primary font-bold text-white',
  unselectedChoice: 'border-[#dfe4f2] bg-white font-semibold text-[#536087] hover:border-[#7774d7]',
  capabilityGroup: 'flex flex-col gap-2',
  capabilityTextarea: classes(
    'min-h-24 w-full resize-y rounded-[0.7rem] border border-[#cbd5ec] bg-[#fbfcff] px-[0.9rem] py-[0.8rem]',
    'text-[0.85rem] leading-[1.6] text-[#17213d] placeholder:text-sample-muted',
    'focus:border-[#7774d7] focus:shadow-[0_0_0_3px_rgb(119_116_215_/_15%)] focus:outline-0',
  ),
  capabilityHint: 'text-[0.72rem] leading-[1.5] text-sample-muted',
  statusRow:
    'flex items-center justify-between gap-4 rounded-[0.65rem] bg-[#f7f8fc] px-[0.85rem] py-[0.7rem] text-[0.85rem] text-[#293454]',
  accountRow:
    'flex items-center justify-between gap-4 rounded-[0.65rem] bg-[#f7f8fc] px-[0.85rem] py-[0.7rem]',
  accountLabel: 'block text-[0.7rem] font-bold text-sample-muted',
  accountValue: 'block text-[0.85rem] text-[#293454]',
  dangerRow: 'flex justify-end',
  usageList: 'flex flex-col gap-[0.85rem]',
  usageItem: 'flex items-start gap-[0.7rem]',
  usageIcon: 'grid size-8 shrink-0 place-items-center rounded-[0.55rem] bg-[#f1f2ff] text-[#5e5fc8]',
  usageTitle: 'block text-[0.85rem] font-bold text-app-ink',
  usageDescription: 'mt-[0.1rem] block text-[0.75rem] leading-[1.5] text-[#5c6785]',
  publicityTable:
    'w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-sample-border text-[0.72rem]',
  publicityHeadCell:
    'bg-[#f2f5fc] px-[0.7rem] py-[0.55rem] text-left font-bold whitespace-nowrap text-[#263556]',
  publicityCell: 'border-t border-[#e4e9f7] px-[0.7rem] py-[0.55rem] text-[#59647e]',
  publicOpen: 'border-t border-[#e4e9f7] px-[0.7rem] py-[0.55rem] font-bold text-[#234cae]',
  publicClosed: 'border-t border-[#e4e9f7] px-[0.7rem] py-[0.55rem] text-sample-muted',
  checklist: 'flex flex-col gap-[0.45rem] text-[0.8rem]',
  checklistItem: 'relative flex items-center gap-[0.55rem]',
  doneMark: 'grid size-[1.125rem] shrink-0 place-items-center rounded-full bg-brand-accent text-[#17203d]',
  todoMark: 'size-[1.125rem] shrink-0 rounded-full border border-[#cbd5ec] bg-white',
  doneLabel: 'text-[#293454]',
  todoLabel: 'text-sample-muted',
} as const

export function companyProfileChoiceClassName(isSelected: boolean) {
  const variant = isSelected
    ? companyProfileStyles.selectedChoice
    : companyProfileStyles.unselectedChoice
  return `${companyProfileStyles.choice} ${variant}`
}
