function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 파트너 모집 화면들에서 맡는 UI 역할을 이름으로 사용합니다.
// 공용 카드·태그·버튼은 shared/workspace의 스타일을 쓰고 여기서는 모집 화면 고유 배치만 다룹니다.
export const partnerRecruitmentStyles = {
  toolbar: 'flex flex-wrap items-center justify-between gap-4',
  tabs: 'inline-flex gap-[0.35rem] rounded-[0.85rem] border border-sample-border bg-[#f5f7fd] p-[0.35rem]',
  tab: 'inline-flex items-center gap-[0.4rem] rounded-[0.6rem] px-[0.9rem] py-[0.6rem] text-[0.82rem] font-extrabold',
  activeTab: 'bg-brand-primary text-white shadow-[0_4px_12px_rgb(98_98_204_/_20%)]',
  inactiveTab: 'text-[#5b6681]',
  tabCount: 'inline-flex rounded-full bg-[#e4e8f5] px-[0.4rem] py-[0.05rem] text-[0.66rem] text-[#5b6681]',
  search: classes(
    'flex min-h-11 w-[300px] max-w-full items-center gap-2 rounded-[0.7rem] border border-[#cbd5ec] bg-white px-[0.9rem]',
    'text-[0.85rem] text-[#8a94ae]',
  ),
  filters: 'flex flex-wrap items-center gap-2',
  filterLabel:
    'mr-1 text-[0.72rem] font-extrabold tracking-[0.08em] text-[#8995bd] uppercase',
  resultCount: 'ml-auto text-[0.78rem] text-[#7883a3]',
  cardGrid: 'grid grid-cols-2 gap-4 max-chat:grid-cols-1',
  cardTop: 'flex items-center justify-between gap-3',
  cardDeadline: 'text-[0.74rem] font-extrabold text-[#b75561]',
  mineDeadline: 'text-[0.74rem] font-extrabold text-[#7883a3]',
  cardTitle:
    'm-0 text-[1.02rem] font-bold leading-[1.4] tracking-[-0.025em] text-app-ink [overflow-wrap:anywhere]',
  cardProgram: 'm-0 text-[0.75rem] leading-[1.5] text-[#7883a3]',
  authorRow: 'flex items-center gap-2 rounded-[0.65rem] bg-[#f7f8fc] px-3 py-[0.6rem]',
  authorAvatar:
    'grid size-7 shrink-0 place-items-center rounded-[0.5rem] text-[0.75rem] font-extrabold',
  authorAvatarOther: 'bg-brand-primary text-white',
  authorAvatarMine: 'bg-brand-accent text-[#17203d]',
  authorName: 'block text-[0.78rem] font-bold text-[#293454]',
  authorSummary: 'mt-[0.05rem] block text-[0.68rem] text-[#7883a3]',
  tagRow: 'flex flex-wrap gap-[0.35rem]',
  cardFooter: 'flex items-center justify-between gap-3 pt-1',
  cardFooterNote: 'flex items-center gap-[0.35rem] text-[0.72rem] text-[#5c6785]',
  moreRow: 'flex justify-center pt-2',
  sideList: 'flex flex-col gap-2',
  sideItem: 'flex flex-col gap-[0.3rem] rounded-[0.65rem] bg-[#f7f8fc] px-[0.85rem] py-[0.7rem]',
  sideItemTitle: 'text-[0.8rem] font-bold leading-[1.4] text-[#293454]',
  statGrid: 'grid grid-cols-3 gap-2',
  statCell: 'flex flex-col gap-[0.15rem] rounded-[0.65rem] bg-[#f7f8fc] px-3 py-[0.7rem]',
  statValue: 'text-[1.2rem] font-bold text-[#5e5fc8]',
  statLabel: 'text-[0.68rem] text-[#7883a3]',
  noticeCard:
    'flex flex-col gap-[0.6rem] rounded-2xl border border-[#e4e8f5] bg-[#f5f7fd] p-[1.2rem]',
  noticeText: 'm-0 text-[0.75rem] leading-[1.6] text-[#4d597c]',

  detailTitle:
    'm-0 text-[1.5rem] font-bold leading-[1.35] tracking-[-0.03em] text-app-ink [overflow-wrap:anywhere]',
  detailAuthorCard: 'flex items-center justify-between gap-4 rounded-[0.7rem] bg-[#f7f8fc] px-4 py-[0.85rem]',
  detailAuthorAvatar:
    'grid size-10 shrink-0 place-items-center rounded-[0.65rem] bg-brand-primary text-[0.95rem] font-extrabold text-white',
  detailAuthorName: 'text-[0.9rem] font-bold text-[#293454]',
  detailAuthorSummary: 'mt-[0.15rem] block text-[0.72rem] text-[#7883a3]',
  conditionGrid: 'grid grid-cols-3 gap-[0.6rem] max-chat:grid-cols-1',
  conditionCell: 'flex flex-col gap-[0.2rem] rounded-[0.65rem] border border-[#e4e8f5] px-[0.85rem] py-[0.7rem]',
  conditionLabel: 'text-[0.68rem] font-bold text-[#7883a3]',
  conditionValue: 'text-[0.85rem] font-bold text-[#293454]',
  rawBox: 'flex flex-col gap-1 rounded-[0.65rem] bg-[#f7f8fc] p-[0.7rem] text-[0.75rem] text-[#4d597c]',
  rawBoxLabel: 'font-bold text-[#263556]',
  linkRow: 'flex flex-wrap items-center gap-3',
  pillLink:
    'rounded-[0.55rem] bg-[#f1f2ff] px-[0.7rem] py-[0.55rem] text-[0.74rem] font-extrabold text-[#5e5fc8] no-underline hover:bg-[#e6e8ff]',
  bodyParagraph: 'm-0 text-[0.88rem] leading-[1.7] text-[#293454]',
  preparationBox: 'flex flex-col gap-2 rounded-[0.7rem] bg-[#f7f8fc] px-4 py-[0.9rem]',
  preparationTitle: 'text-[0.75rem] font-extrabold text-[#4d597c]',
  preparationItem: 'flex items-center gap-2 text-[0.8rem] text-[#293454]',
  preparationDot: 'inline-block size-[6px] shrink-0 rounded-full bg-brand-primary',
  disclaimer: 'm-0 text-[0.72rem] leading-[1.55] text-[#8a94ae]',
  matchRow:
    'flex items-center justify-between gap-2 rounded-[0.6rem] bg-[#f7f8fc] px-3 py-[0.6rem] text-[0.78rem] text-[#293454]',
  proposalCard: classes(
    'flex flex-col gap-[0.9rem] rounded-2xl border border-sample-border bg-white p-[1.35rem]',
    'shadow-[0_20px_50px_rgb(33_59_126_/_8%)]',
  ),
  proposalTextarea: classes(
    'min-h-28 w-full resize-y rounded-[0.7rem] border border-[#cbd5ec] bg-[#fbfcff] px-[0.9rem] py-[0.8rem]',
    'text-[0.85rem] leading-[1.6] text-[#17213d] placeholder:text-[#8a94ae]',
    'focus:border-[#7774d7] focus:shadow-[0_0_0_3px_rgb(119_116_215_/_15%)] focus:outline-0',
  ),
  proposalCounter: 'text-right text-[0.7rem] font-medium text-[#8a94ae]',
  checkboxLabel: 'flex items-center gap-[0.55rem] text-[0.8rem] text-[#43527a]',
  checkbox: 'size-[1.05rem] shrink-0 accent-brand-primary',
  proposalSubmit: classes(
    'min-h-12 w-full cursor-pointer rounded-[0.7rem] border-0 bg-brand-primary px-4 py-[0.85rem]',
    'text-[0.9rem] font-extrabold text-white hover:bg-[#5051b8]',
  ),
  flowRow: 'flex flex-wrap items-center gap-[0.35rem] text-[0.72rem] font-bold text-[#4d597c]',
  flowStep: 'inline-flex rounded-[0.35rem] border border-sample-border bg-white px-[0.45rem] py-[0.25rem]',

  form: classes(
    'flex flex-col gap-6 rounded-[1.25rem] border border-sample-border bg-white p-9',
    'shadow-[0_20px_50px_rgb(33_59_126_/_8%)] max-chat:p-5',
  ),
  formSection: 'flex flex-col gap-4',
  formSectionHeader: 'flex flex-wrap items-center justify-between gap-3',
  formSectionTitleGroup: 'flex flex-wrap items-center gap-[0.6rem]',
  formStepBadge:
    'grid size-[1.6rem] shrink-0 place-items-center rounded-full bg-brand-primary text-[0.72rem] font-extrabold text-white',
  formSectionTitle: 'm-0 text-[1.1rem] font-bold tracking-[-0.025em] text-sample-heading',
  formSectionHint: 'text-[0.75rem] text-[#7a849d]',
  formDivider: 'h-px bg-[#e4e8f5]',
  selectedProgram:
    'flex items-center justify-between gap-4 rounded-[0.85rem] border border-brand-primary bg-[#f1f2ff] px-4 py-[0.9rem]',
  selectedProgramTitle: 'text-[0.95rem] font-bold text-app-ink',
  selectedProgramMeta: 'text-[0.72rem] text-[#5c6785]',
  programSearchBox: classes(
    'flex min-h-11 items-center gap-2 rounded-[0.7rem] border border-dashed border-[#cbd5ec] bg-[#fbfcff] px-[0.9rem]',
    'text-[0.82rem] text-[#8a94ae]',
  ),
  fieldRow: 'grid grid-cols-2 gap-[1.1rem] max-chat:grid-cols-1',
  field: 'flex flex-col gap-2 text-[0.9rem] font-bold text-[#1e2a49]',
  fieldLabelRow: 'flex items-center gap-1',
  optionalMark: 'text-[0.8rem] font-medium text-[#7a849d]',
  fieldControl: classes(
    'box-border min-h-12 w-full rounded-[0.7rem] border border-[#cbd5ec] bg-[#fbfcff] px-[0.9rem] py-[0.8rem]',
    'text-[0.95rem] font-normal text-[#17213d] placeholder:text-[#8a94ae]',
    'focus:border-[#7774d7] focus:shadow-[0_0_0_3px_rgb(119_116_215_/_15%)] focus:outline-0',
  ),
  fieldTextarea: 'min-h-36 resize-y leading-[1.65]',
  fieldHint: 'text-[0.75rem] font-medium text-[#7a849d]',
  roleChoices: 'flex flex-wrap gap-2',
  roleChoice:
    'inline-flex min-h-10 cursor-pointer items-center rounded-full border px-[0.85rem] py-[0.5rem] text-[0.8rem]',
  selectedRoleChoice: 'border-brand-primary bg-brand-primary font-bold text-white',
  unselectedRoleChoice: 'border-[#dfe4f2] bg-white font-semibold text-[#536087] hover:border-[#7774d7]',
  capabilityBox: classes(
    'flex min-h-12 flex-wrap items-center gap-[0.4rem] rounded-[0.7rem] border border-[#cbd5ec] bg-[#fbfcff]',
    'px-[0.9rem] py-2',
  ),
  capabilityChip:
    'inline-flex items-center gap-[0.3rem] rounded-full bg-[#f1f2ff] px-[0.65rem] py-[0.3rem] text-[0.75rem] font-bold text-[#504ebd]',
  capabilityRemove: 'cursor-pointer border-0 bg-transparent p-0 text-[0.75rem] leading-none text-[#504ebd]',
  capabilityInput:
    'min-w-32 flex-1 border-0 bg-transparent text-[0.85rem] text-[#17213d] placeholder:text-[#8a94ae] focus:outline-0',
  toggleRow: 'flex items-center justify-between gap-4 rounded-[0.65rem] bg-[#f7f8fc] px-[0.9rem] py-3',
  toggleTitle: 'block text-[0.85rem] font-bold text-[#293454]',
  toggleDescription: 'mt-[0.1rem] block text-[0.72rem] leading-[1.5] text-[#7883a3]',
  formActions: 'flex items-center justify-between gap-6 pt-2 max-chat:flex-col max-chat:items-stretch',
  formActionsNote: 'm-0 text-[0.82rem] leading-[1.6] text-sample-muted',
  formActionButtons: 'flex shrink-0 items-center gap-2',
  formSubmitButton: classes(
    'min-h-12 cursor-pointer rounded-[0.7rem] border-0 bg-brand-primary px-5 py-[0.85rem]',
    'text-[0.95rem] font-extrabold text-white hover:bg-[#5051b8]',
  ),
  formCancelButton: classes(
    'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-[0.7rem] border border-[#dfe4f2] bg-white',
    'px-4 py-[0.85rem] text-[0.9rem] font-bold text-[#536087] no-underline hover:border-[#7774d7] hover:text-[#504ebd]',
  ),
  requirementRow: 'flex items-start gap-2 text-[0.78rem] leading-[1.5] text-[#293454]',
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
