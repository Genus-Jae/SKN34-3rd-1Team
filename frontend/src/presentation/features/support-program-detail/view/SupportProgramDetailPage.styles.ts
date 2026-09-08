function classes(...groups: string[]) {
  return groups.join(' ')
}

export const supportProgramDetailStyles = {
  page: 'mx-auto w-[min(920px,calc(100%_-_2rem))] py-[clamp(1.5rem,5vw,4rem)] [overflow-wrap:anywhere]',
  unavailablePage: 'mx-auto w-[min(720px,calc(100%_-_2rem))] py-[clamp(1.5rem,5vw,4rem)]',
  header: 'mb-8 flex items-center justify-between gap-4',
  backLink: classes(
    'inline-flex items-center rounded-full border px-[0.85rem] py-[0.65rem]',
    'border-[#dbe9e0] bg-white text-[0.85rem] font-bold text-[#365947] no-underline',
    'hover:border-[#147d58] hover:bg-[#f0f9f3] hover:text-[#106b48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58]',
  ),
  sourceBadge: 'rounded-full bg-[#e4f3ea] px-3 py-[0.45rem] text-[0.72rem] font-extrabold text-[#106b48]',
  hero: classes(
    'mb-6 grid grid-cols-[minmax(0,1fr)_minmax(160px,200px)] items-start gap-6 rounded-[1.4rem] border border-[#dbe9e0]',
    'bg-white p-[clamp(1.4rem,4vw,2.5rem)] shadow-[0_16px_42px_rgb(23_68_45_/_6%)]',
    'max-chat:grid-cols-1',
  ),
  eyebrow:
    'mt-0 mb-2 text-[0.72rem] font-extrabold tracking-[0.12em] text-[#52685c] uppercase',
  title: 'm-0 text-[clamp(1.65rem,4vw,2.45rem)] font-bold leading-[1.25] tracking-[-0.045em] text-app-ink',
  organization: 'mt-3 mb-0 text-[0.9rem] font-bold text-[#52685c]',
  summary: 'mt-5 mb-0 leading-[1.7] text-[#52685c]',
  qualificationNotice: 'mt-3 mb-4 leading-[1.6] text-[#52685c]',
  statusCard: 'grid gap-2 rounded-[1rem] border border-[#dbe9e0] bg-[#f0f9f3] p-5 text-left',
  statusLabel: 'text-[0.72rem] font-extrabold tracking-[0.08em] text-[#52685c] uppercase',
  statusValue: 'text-[1.2rem] text-[#15271f]',
  score: 'mt-1 w-fit rounded-full bg-[#e4f3ea] px-2 py-1 text-[0.72rem] font-extrabold text-[#286044]',
  details: 'grid grid-cols-2 gap-3 max-chat:grid-cols-1',
  detailItem: 'rounded-[1.4rem] border border-[#dbe9e0] bg-white p-5',
  detailLabel: 'mt-0 mb-3 text-[0.75rem] font-extrabold tracking-[0.08em] text-[#52685c] uppercase',
  detailValue: 'leading-[1.6] text-[#15271f]',
  tagList: 'm-0 flex list-none flex-wrap gap-2 p-0',
  tag: 'rounded-full bg-[#e4f3ea] px-3 py-1 text-[0.78rem] font-bold text-[#106b48]',
  emptyValue: 'text-sample-muted',
  reasonSection: 'mt-6 rounded-[1.4rem] border border-[#dbe9e0] bg-white p-[clamp(1.4rem,4vw,2.1rem)]',
  sectionEyebrow:
    'mt-0 mb-2 text-[0.72rem] font-extrabold tracking-[0.12em] text-[#52685c] uppercase',
  sectionTitle: 'm-0 text-[1.25rem] font-bold tracking-[-0.03em] text-app-ink',
  reasonList: 'mt-5 mb-0 grid list-none gap-2 p-0',
  reason: 'rounded-[1rem] bg-[#f0f9f3] px-4 py-3 text-[0.88rem] text-[#365947]',
  questionSection: 'mt-6 rounded-[1.4rem] border border-[#dbe9e0] bg-white p-[clamp(1.4rem,4vw,2.1rem)]',
  questionDescription: 'mt-3 mb-0 leading-[1.6] text-[#52685c]',
  questionLink: classes(
    'mt-5 inline-flex rounded-full bg-brand-primary px-4 py-3 text-[0.84rem] font-extrabold text-white no-underline',
    'hover:bg-[#106b48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58]',
  ),
  sourceSection: classes(
    'mt-6 flex items-center justify-between gap-6 rounded-[1.4rem] bg-[#163c2b] p-[clamp(1.4rem,4vw,2.1rem)]',
    'text-[#e8f5ed] max-chat:items-start max-chat:flex-col',
  ),
  sourceEyebrow:
    'mt-0 mb-2 text-[0.72rem] font-extrabold tracking-[0.12em] text-[#acd0bb] uppercase',
  sourceTitle: 'm-0 text-[1.25rem] font-bold tracking-[-0.03em] text-white',
  sourceDescription: 'mt-3 mb-0 leading-[1.6] text-[#c7e3d3]',
  sourceLink: classes(
    'max-w-full shrink-0 rounded-full bg-brand-accent px-4 py-3 text-[0.84rem] font-extrabold',
    'text-[#15271f] no-underline hover:bg-[#bfe6cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7efe2]',
  ),
  unavailableCard: 'mt-6 rounded-[1.4rem] border border-[#dbe9e0] bg-white p-[clamp(1.5rem,5vw,3rem)] shadow-[0_16px_42px_rgb(23_68_45_/_6%)]',
  unavailableDescription: 'mt-4 mb-0 leading-[1.65] text-[#52685c]',
  retryButton: 'mt-5 cursor-pointer rounded-full border-0 bg-brand-primary px-4 py-3 text-[0.84rem] font-extrabold text-white hover:bg-[#106b48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58]',
} as const
