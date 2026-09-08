function classes(...groups: string[]) {
  return groups.join(' ')
}

export const supportProgramEvidenceQuestionStyles = {
  page: 'mx-auto w-[min(720px,calc(100%_-_2rem))] py-[clamp(1.5rem,5vw,4rem)] [overflow-wrap:anywhere]',
  backLink: classes(
    'inline-flex items-center rounded-full border px-[0.85rem] py-[0.65rem]',
    'border-[#dbe9e0] bg-white text-[0.85rem] font-bold text-[#365947] no-underline',
    'hover:border-[#147d58] hover:bg-[#f0f9f3] hover:text-[#106b48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58]',
  ),
  title: 'm-0 text-[clamp(1.65rem,4vw,2.45rem)] font-bold leading-[1.25] tracking-[-0.045em] text-app-ink',
  sectionEyebrow:
    'mt-0 mb-2 text-[0.72rem] font-extrabold tracking-[0.12em] text-[#52685c] uppercase',
  evidenceSection: 'mt-6 rounded-[1.4rem] border border-[#dbe9e0] bg-white p-[clamp(1.4rem,4vw,2.1rem)]',
  evidenceHeader: 'flex flex-wrap items-start justify-between gap-4',
  evidenceBadge: 'shrink-0 rounded-full bg-[#e4f3ea] px-3 py-[0.45rem] text-[0.7rem] font-extrabold text-[#286044]',
  evidenceDescription: 'mt-3 mb-0 leading-[1.6] text-[#52685c]',
  evidenceForm: 'mt-5 grid gap-2',
  evidenceLabel: 'text-[0.82rem] font-extrabold text-[#365947]',
  evidenceInput: classes(
    'min-h-24 w-full resize-y rounded-[1rem] border bg-white px-3 py-3 leading-[1.55] text-[#15271f] placeholder:text-sample-muted outline-0',
    'border-[#dbe9e0] focus:border-[#147d58] focus:shadow-[0_0_0_3px_rgb(20_125_88_/_12%)]',
    'disabled:cursor-wait disabled:bg-[#f0f9f3] disabled:text-[#52685c]',
  ),
  evidenceControls: 'mt-1 flex items-center justify-between gap-3',
  evidenceCount: 'text-[0.72rem] text-sample-muted',
  evidenceSubmitButton: classes(
    'cursor-pointer rounded-full border-0 bg-brand-primary px-4 py-[0.7rem] text-[0.78rem] font-extrabold text-white',
    'hover:bg-[#106b48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58] disabled:cursor-not-allowed disabled:opacity-[0.4]',
  ),
  evidenceCancelButton: classes(
    'cursor-pointer rounded-full border border-[#dbe9e0] bg-white px-4 py-[0.7rem] text-[0.78rem] font-extrabold text-[#365947]',
    'hover:border-[#147d58] hover:bg-[#f0f9f3] hover:text-[#106b48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58]',
  ),
  evidenceHint: 'text-[0.7rem] leading-[1.45] text-sample-muted',
  evidenceFeedback: 'mt-5 mb-0 rounded-[1rem] border border-[#dbe9e0] bg-[#f0f9f3] px-4 py-3 text-[0.84rem] leading-[1.55] text-[#365947]',
  evidenceError: 'mt-5 mb-0 rounded-[1rem] border border-[#f0cfd4] bg-[#fff5f6] px-4 py-3 text-[0.84rem] leading-[1.55] text-[#9a3947]',
  evidenceAnswer: 'mt-5 rounded-[1.4rem] border border-[#b6dac7] bg-[#f5faf7] p-5',
  evidenceAnswerEyebrow: 'mt-0 mb-2 text-[0.7rem] font-extrabold tracking-[0.1em] text-[#286044] uppercase',
  evidenceAnswerText: 'm-0 whitespace-pre-wrap leading-[1.7] text-[#15271f]',
  evidenceCitationTitle: 'mt-5 mb-3 text-[0.86rem] font-extrabold text-[#365947]',
  evidenceCitationList: 'm-0 grid list-decimal gap-3 pl-5',
  evidenceCitation: 'pl-1 text-[#365947]',
  evidenceExcerpt: 'm-0 whitespace-pre-wrap rounded-[1rem] bg-white px-4 py-3 text-[0.82rem] leading-[1.6] text-[#52685c]',
  evidenceSourceLink: 'mt-2 inline-block rounded-full text-[0.75rem] font-extrabold text-[#147d58] no-underline hover:text-[#106b48] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58]',
} as const
