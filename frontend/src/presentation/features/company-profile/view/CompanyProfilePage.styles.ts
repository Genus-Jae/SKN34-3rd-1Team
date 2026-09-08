function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 기업 프로필 화면에서 맡는 UI 역할을 이름으로 사용합니다.
// 카드·태그·버튼은 shared/workspace의 공용 스타일을 쓰고 여기서는 프로필 고유 배치만 다룹니다.
export const companyProfileStyles = {
  summaryTop: 'flex items-center justify-between gap-4 max-chat:flex-col max-chat:items-start',
  summaryIdentity: 'flex items-center gap-4',
  summaryAvatar:
    'grid size-[3.25rem] shrink-0 place-items-center rounded-[0.9rem] bg-brand-accent text-[1.2rem] font-black text-[#15271f]',
  summaryName: 'text-[1.25rem] font-bold tracking-[-0.025em] text-app-ink',
  summaryTags: 'mt-[0.35rem] flex flex-wrap gap-[0.35rem]',
  completion: 'flex flex-col gap-2',
  completionRow: 'flex items-center justify-between text-[0.75rem]',
  completionLabel: 'font-bold text-[#52685c]',
  completionValue: 'font-extrabold text-[#147d58]',
  completionTrack: 'h-2 overflow-hidden rounded-full bg-[#edf3ef]',
  completionBar: 'h-full rounded-full bg-brand-primary',
  completionHint: 'text-[0.75rem] leading-[1.5] text-sample-muted',
  fieldGrid: 'grid grid-cols-1 gap-3 @min-[32rem]/column:grid-cols-2',
  field: 'flex flex-col gap-1 rounded-[0.85rem] bg-[#f1f7f3] px-[0.85rem] py-[0.7rem]',
  emptyField:
    'flex flex-col gap-1 rounded-[0.85rem] border border-dashed border-[#b8d8c5] bg-white px-[0.85rem] py-[0.7rem]',
  fieldLabel: 'flex items-center gap-1 text-[0.7rem] font-bold text-sample-muted',
  optionalMark: 'font-medium text-sample-muted',
  fieldValue: 'flex items-center gap-2 text-[0.85rem] text-[#203d2c]',
  emptyValue: 'text-[0.85rem] text-sample-muted',
  settingRow: 'flex items-center justify-between gap-4 rounded-[0.85rem] bg-[#f1f7f3] px-4 py-[0.85rem]',
  settingTitle: 'block text-[0.85rem] font-bold text-[#203d2c]',
  settingDescription: 'mt-[0.1rem] block text-[0.74rem] leading-[1.5] text-sample-muted',
  choiceColumns: 'grid grid-cols-1 gap-4 @min-[32rem]/column:grid-cols-2',
  choiceGroup: 'flex flex-col gap-2',
  choiceLabel: 'text-[0.78rem] font-bold text-[#52685c]',
  choices: 'flex flex-wrap gap-[0.4rem]',
  choice:
    'inline-flex min-h-9 cursor-pointer items-center rounded-full border px-[0.78rem] py-[0.4rem] text-[0.78rem]',
  selectedChoice: 'border-brand-primary bg-brand-primary font-bold text-white',
  unselectedChoice: 'border-[#dbe9e0] bg-white font-semibold text-[#52685c] hover:border-[#147d58]',
  capabilityGroup: 'flex flex-col gap-2',
  capabilityTextarea: classes(
    'min-h-24 w-full resize-y rounded-[1rem] border border-[#b8d8c5] bg-[#fbfefc] px-[0.9rem] py-[0.8rem]',
    'text-[0.85rem] leading-[1.6] text-[#203d2c] placeholder:text-sample-muted',
    'focus:border-[#147d58] focus:shadow-[0_0_0_3px_rgb(20_125_88_/_12%)] focus:outline-0',
  ),
  capabilityHint: 'text-[0.72rem] leading-[1.5] text-sample-muted',
  statusRow:
    'flex items-center justify-between gap-4 rounded-[0.85rem] bg-[#f1f7f3] px-[0.85rem] py-[0.7rem] text-[0.85rem] text-[#203d2c]',
  accountRow:
    'flex items-center justify-between gap-4 rounded-[0.85rem] bg-[#f1f7f3] px-[0.85rem] py-[0.7rem]',
  accountLabel: 'block text-[0.7rem] font-bold text-sample-muted',
  accountValue: 'block text-[0.85rem] text-[#203d2c]',
  dangerRow: 'flex justify-end',
  usageList: 'flex flex-col gap-[0.85rem]',
  usageItem: 'flex items-start gap-[0.7rem]',
  usageIcon: 'grid size-8 shrink-0 place-items-center rounded-[0.55rem] bg-[#edf7f1] text-[#147d58]',
  usageTitle: 'block text-[0.85rem] font-bold text-app-ink',
  usageDescription: 'mt-[0.1rem] block text-[0.75rem] leading-[1.5] text-[#52685c]',
  publicityTable:
    'w-full border-separate border-spacing-0 overflow-hidden rounded-[1.4rem] border border-sample-border text-[0.72rem]',
  publicityHeadCell:
    'bg-[#edf7f1] px-[0.7rem] py-[0.55rem] text-left font-bold whitespace-nowrap text-[#203d2c]',
  publicityCell: 'border-t border-[#dbe9e0] px-[0.7rem] py-[0.55rem] text-[#52685c]',
  publicOpen: 'border-t border-[#dbe9e0] px-[0.7rem] py-[0.55rem] font-bold text-[#147d58]',
  publicClosed: 'border-t border-[#dbe9e0] px-[0.7rem] py-[0.55rem] text-sample-muted',
  checklist: 'flex flex-col gap-[0.45rem] text-[0.8rem]',
  checklistItem: 'relative flex items-center gap-[0.55rem]',
  doneMark: 'grid size-[1.125rem] shrink-0 place-items-center rounded-full bg-brand-accent text-[#15271f]',
  todoMark: 'size-[1.125rem] shrink-0 rounded-full border border-[#b8d8c5] bg-white',
  doneLabel: 'text-[#203d2c]',
  todoLabel: 'text-sample-muted',
} as const

export function companyProfileChoiceClassName(isSelected: boolean) {
  const variant = isSelected
    ? companyProfileStyles.selectedChoice
    : companyProfileStyles.unselectedChoice
  return `${companyProfileStyles.choice} ${variant}`
}
