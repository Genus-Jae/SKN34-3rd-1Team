function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 파트너 모집 화면들에서 맡는 UI 역할을 이름으로 사용합니다.
// 카드·태그·버튼은 shared/workspace의 공용 스타일을 쓰고 여기서는 모집 화면 고유 배치를 다룹니다.
export const partnerRecruitmentStyles = {
  listHeader: classes(
    'sticky top-0 z-[3] flex flex-wrap items-center justify-between gap-6 border-b border-[#dbe9e0]',
    'bg-[rgb(244_250_246_/_96%)] backdrop-blur',
    'px-[clamp(1.25rem,5vw,4.5rem)] py-9 max-chat:px-4 max-chat:py-6',
  ),
  listTitleGroup: 'flex min-w-0 flex-col items-start gap-3',
  listBadge: 'm-0 inline-flex items-center rounded-full bg-[#d7efe2] px-3 py-[0.4rem] text-[0.75rem] font-bold text-[#126742]',
  listTitle: 'm-0 break-keep text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold leading-[1.35] tracking-[-0.06em] text-app-ink [text-wrap:balance]',
  listDescription: 'm-0 break-keep text-[0.88rem] leading-[1.7] text-sample-muted [text-wrap:pretty]',
  toolbar: 'flex flex-wrap items-center justify-between gap-4',
  tabs: 'inline-flex gap-[0.35rem] rounded-[0.85rem] border border-sample-border bg-[#eaf5ee] p-[0.35rem]',
  tab: 'inline-flex items-center gap-[0.4rem] rounded-[0.6rem] px-[0.9rem] py-[0.6rem] text-[0.82rem] font-extrabold',
  activeTab: 'bg-brand-primary text-white shadow-[0_4px_12px_rgb(23_68_45_/_14%)]',
  inactiveTab: 'text-[#52685c]',
  tabCount: 'inline-flex rounded-full bg-[#dbe9e0] px-[0.4rem] py-[0.05rem] text-[0.66rem] text-[#52685c]',
  search: classes(
    'flex min-h-11 w-[300px] max-w-full items-center gap-2 rounded-[1rem] border border-[#b8d8c5] bg-white px-[0.9rem]',
    'text-[0.85rem] text-[#708679]',
  ),
  filters: 'flex flex-wrap items-center gap-2',
  filterLabel:
    'mr-1 text-[0.72rem] font-extrabold tracking-[0.08em] text-[#52685c] uppercase',
  resultCount: 'ml-auto text-[0.78rem] text-sample-muted',
  cardGrid: 'grid grid-cols-1 gap-4 @min-[40rem]/column:grid-cols-2',
  cardTop: 'flex items-center justify-between gap-3',
  cardDeadline: 'text-[0.74rem] font-extrabold text-[#b75561]',
  mineDeadline: 'text-[0.74rem] font-extrabold text-sample-muted',
  cardTitle:
    'm-0 text-[1.02rem] font-bold leading-[1.4] tracking-[-0.025em] text-app-ink [overflow-wrap:anywhere]',
  cardProgram: 'm-0 text-[0.75rem] leading-[1.5] text-sample-muted',
  authorRow: 'flex items-center gap-2 rounded-[0.85rem] bg-[#f1f7f3] px-3 py-[0.6rem]',
  authorAvatar:
    'grid size-7 shrink-0 place-items-center rounded-[0.5rem] text-[0.75rem] font-extrabold',
  authorAvatarOther: 'bg-brand-primary text-white',
  authorAvatarMine: 'bg-brand-accent text-[#15271f]',
  authorName: 'block text-[0.78rem] font-bold text-[#203d2c]',
  authorSummary: 'mt-[0.05rem] block text-[0.68rem] text-sample-muted',
  tagRow: 'flex flex-wrap gap-[0.35rem]',
  cardFooter: 'flex flex-wrap items-center justify-between gap-3 pt-1',
  cardFooterNote: 'flex flex-wrap items-center gap-[0.35rem] text-[0.72rem] text-[#52685c]',
  moreRow: 'flex justify-center pt-2',
  sideList: 'flex flex-col gap-2',
  sideItem: 'flex flex-col gap-[0.3rem] rounded-[0.85rem] bg-[#f1f7f3] px-[0.85rem] py-[0.7rem]',
  sideItemTitle: 'text-[0.8rem] font-bold leading-[1.4] text-[#203d2c]',
  statGrid: 'grid grid-cols-3 gap-2',
  statCell: 'flex flex-col gap-[0.15rem] rounded-[0.85rem] bg-[#f1f7f3] px-3 py-[0.7rem]',
  statValue: 'text-[1.2rem] font-bold text-[#147d58]',
  statLabel: 'text-[0.68rem] text-sample-muted',
  noticeCard:
    'flex flex-col gap-[0.6rem] rounded-[1.4rem] border border-[#dbe9e0] bg-[#eaf5ee] p-[1.2rem]',
  noticeText: 'm-0 text-[0.75rem] leading-[1.6] text-[#52685c]',

  detailTitle:
    'm-0 text-[1.5rem] font-bold leading-[1.35] tracking-[-0.03em] text-app-ink [overflow-wrap:anywhere]',
  detailAuthorCard: 'flex flex-wrap items-center justify-between gap-4 rounded-[1rem] bg-[#f1f7f3] px-4 py-[0.85rem]',
  detailAuthorAvatar:
    'grid size-10 shrink-0 place-items-center rounded-[0.85rem] bg-brand-primary text-[0.95rem] font-extrabold text-white',
  detailAuthorName: 'text-[0.9rem] font-bold text-[#203d2c]',
  detailAuthorSummary: 'mt-[0.15rem] block text-[0.72rem] text-sample-muted',
  conditionGrid: 'grid grid-cols-1 gap-[0.6rem] @min-[32rem]/column:grid-cols-3',
  conditionCell: 'flex flex-col gap-[0.2rem] rounded-[0.85rem] border border-[#dbe9e0] px-[0.85rem] py-[0.7rem]',
  conditionLabel: 'text-[0.68rem] font-bold text-sample-muted',
  conditionValue: 'text-[0.85rem] font-bold text-[#203d2c]',
  rawBox: 'flex flex-col gap-1 rounded-[0.85rem] bg-[#f1f7f3] p-[0.7rem] text-[0.75rem] text-[#52685c]',
  rawBoxLabel: 'font-bold text-[#203d2c]',
  linkRow: 'flex flex-wrap items-center gap-3',
  pillLink:
    'rounded-[0.55rem] bg-[#edf7f1] px-[0.7rem] py-[0.55rem] text-[0.74rem] font-extrabold text-[#147d58] no-underline hover:bg-[#d8eee1]',
  bodyParagraph: 'm-0 text-[0.88rem] leading-[1.7] text-[#203d2c]',
  preparationBox: 'flex flex-col gap-2 rounded-[1rem] bg-[#f1f7f3] px-4 py-[0.9rem]',
  preparationTitle: 'text-[0.75rem] font-extrabold text-[#52685c]',
  preparationItem: 'flex items-center gap-2 text-[0.8rem] text-[#203d2c]',
  preparationDot: 'inline-block size-[6px] shrink-0 rounded-full bg-brand-primary',
  disclaimer: 'm-0 text-[0.72rem] leading-[1.55] text-sample-muted',
  matchRow:
    'flex items-center justify-between gap-2 rounded-[0.6rem] bg-[#f1f7f3] px-3 py-[0.6rem] text-[0.78rem] text-[#203d2c]',
  proposalCard: classes(
    'flex flex-col gap-[0.9rem] rounded-[1.4rem] border border-sample-border bg-white p-[1.35rem]',
    'shadow-[0_20px_50px_rgb(23_68_45_/_5%)]',
  ),
  proposalTextarea: classes(
    'min-h-28 w-full resize-y rounded-[1rem] border border-[#b8d8c5] bg-[#fbfefc] px-[0.9rem] py-[0.8rem]',
    'text-[0.85rem] leading-[1.6] text-[#203d2c] placeholder:text-sample-muted',
    'focus:border-[#147d58] focus:shadow-[0_0_0_3px_rgb(20_125_88_/_12%)] focus:outline-0',
  ),
  proposalCounter: 'text-right text-[0.7rem] font-medium text-sample-muted',
  checkboxLabel: 'flex items-center gap-[0.55rem] text-[0.8rem] text-[#365947]',
  checkbox: 'size-[1.05rem] shrink-0 accent-brand-primary',
  proposalSubmit: classes(
    'min-h-12 w-full cursor-pointer rounded-full border-0 bg-brand-primary px-4 py-[0.85rem]',
    'text-[0.9rem] font-extrabold text-white hover:bg-[#106b48] disabled:cursor-not-allowed disabled:opacity-60',
  ),
  flowRow: 'flex flex-wrap items-center gap-[0.35rem] text-[0.72rem] font-bold text-[#52685c]',
  flowStep: 'inline-flex rounded-[0.35rem] border border-sample-border bg-white px-[0.45rem] py-[0.25rem]',

  form: classes(
    '@container/column flex min-w-0 flex-col gap-6 rounded-[1.25rem] border border-sample-border bg-white p-9',
    'shadow-[0_20px_50px_rgb(23_68_45_/_5%)] max-chat:p-5',
  ),
  formSection: 'flex flex-col gap-4',
  formSectionHeader: 'flex flex-wrap items-center justify-between gap-3',
  formSectionTitleGroup: 'flex flex-wrap items-center gap-[0.6rem]',
  formStepBadge:
    'grid size-[1.6rem] shrink-0 place-items-center rounded-full bg-brand-primary text-[0.72rem] font-extrabold text-white',
  formSectionTitle: 'm-0 text-[1.1rem] font-bold tracking-[-0.025em] text-sample-heading',
  formSectionHint: 'text-[0.75rem] text-sample-muted',
  formDivider: 'h-px bg-[#dbe9e0]',
  selectedProgram:
    'flex items-center justify-between gap-4 rounded-[0.85rem] border border-brand-primary bg-[#edf7f1] px-4 py-[0.9rem]',
  selectedProgramTitle: 'text-[0.95rem] font-bold text-app-ink',
  selectedProgramMeta: 'text-[0.72rem] text-[#52685c]',
  programSearchBox: classes(
    'flex min-h-11 items-center gap-2 rounded-[1rem] border border-dashed border-[#b8d8c5] bg-[#fbfefc] px-[0.9rem]',
    'text-[0.82rem] text-[#708679]',
  ),
  fieldRow: 'grid grid-cols-1 gap-[1.1rem] @min-[28rem]/column:grid-cols-2',
  field: 'flex flex-col gap-2 text-[0.9rem] font-bold text-[#203d2c]',
  fieldLabelRow: 'flex items-center gap-1',
  optionalMark: 'text-[0.8rem] font-medium text-sample-muted',
  fieldControl: classes(
    'box-border min-h-12 w-full rounded-[1rem] border border-[#b8d8c5] bg-[#fbfefc] px-[0.9rem] py-[0.8rem]',
    'text-[0.95rem] font-normal text-[#203d2c] placeholder:text-sample-muted',
    'focus:border-[#147d58] focus:shadow-[0_0_0_3px_rgb(20_125_88_/_12%)] focus:outline-0',
  ),
  fieldTextarea: 'min-h-36 resize-y leading-[1.65]',
  fieldHint: 'text-[0.75rem] font-medium text-sample-muted',
  roleChoices: 'flex flex-wrap gap-2',
  roleChoice:
    'inline-flex min-h-10 cursor-pointer items-center rounded-full border px-[0.85rem] py-[0.5rem] text-[0.8rem]',
  selectedRoleChoice: 'border-brand-primary bg-brand-primary font-bold text-white',
  unselectedRoleChoice: 'border-[#dbe9e0] bg-white font-semibold text-[#52685c] hover:border-[#147d58]',
  capabilityBox: classes(
    'flex min-h-12 flex-wrap items-center gap-[0.4rem] rounded-[1rem] border border-[#b8d8c5] bg-[#fbfefc]',
    'px-[0.9rem] py-2',
  ),
  capabilityChip:
    'inline-flex min-w-0 max-w-full items-center gap-[0.3rem] rounded-full bg-[#edf7f1] px-[0.65rem] py-[0.3rem] text-[0.75rem] font-bold text-[#126742] [overflow-wrap:anywhere]',
  capabilityRemove: 'shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[0.75rem] leading-none text-[#126742]',
  capabilityInput:
    'min-w-32 flex-1 border-0 bg-transparent text-[0.85rem] text-[#203d2c] placeholder:text-sample-muted focus:outline-0',
  toggleRow: 'flex items-center justify-between gap-4 rounded-[0.85rem] bg-[#f1f7f3] px-[0.9rem] py-3',
  toggleTitle: 'block text-[0.85rem] font-bold text-[#203d2c]',
  toggleDescription: 'mt-[0.1rem] block text-[0.72rem] leading-[1.5] text-sample-muted',
  formActions: 'flex items-center justify-between gap-6 pt-2 max-chat:flex-col max-chat:items-stretch',
  formActionsNote: 'm-0 text-[0.82rem] leading-[1.6] text-sample-muted',
  formActionButtons: 'flex shrink-0 items-center gap-2',
  formSubmitButton: classes(
    'min-h-12 cursor-pointer rounded-full border-0 bg-brand-primary px-5 py-[0.85rem]',
    'text-[0.95rem] font-extrabold text-white hover:bg-[#106b48]',
  ),
  formCancelButton: classes(
    'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-[#dbe9e0] bg-white',
    'px-4 py-[0.85rem] text-[0.9rem] font-bold text-[#52685c] no-underline hover:border-[#147d58] hover:text-[#126742]',
  ),
  requirementRow: 'flex items-start gap-2 text-[0.78rem] leading-[1.5] text-[#203d2c]',
} as const

export function partnerTabClassName(isActive: boolean) {
  const variant = isActive
    ? partnerRecruitmentStyles.activeTab
    : partnerRecruitmentStyles.inactiveTab
  return `${partnerRecruitmentStyles.tab} ${variant}`
}

export function partnerRoleChoiceClassName(isSelected: boolean) {
  const variant = isSelected
    ? partnerRecruitmentStyles.selectedRoleChoice
    : partnerRecruitmentStyles.unselectedRoleChoice
  return `${partnerRecruitmentStyles.roleChoice} ${variant}`
}
