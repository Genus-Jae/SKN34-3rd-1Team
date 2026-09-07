function classes(...groups: string[]) {
  return groups.join(' ')
}

export const supportProgramEvidenceQuestionStyles = {
  page: 'mx-auto w-[min(720px,calc(100%_-_2rem))] py-[clamp(1.5rem,5vw,4rem)]',
  backLink: classes(
    'inline-flex items-center rounded-[0.7rem] border px-[0.85rem] py-[0.65rem]',
    'border-[#d8e0f3] bg-white text-[0.85rem] font-bold text-[#43527a] no-underline',
    'hover:border-[#5e5fc8] hover:text-[#5e5fc8]',
  ),
  title: 'm-0 text-[clamp(1.65rem,4vw,2.45rem)] font-bold leading-[1.25] tracking-[-0.045em] text-app-ink',
  sectionEyebrow:
    'mt-0 mb-2 text-[0.72rem] font-extrabold tracking-[0.12em] text-[#6471a0] uppercase',
  evidenceSection: 'mt-6 rounded-3xl border border-[#dfe4f2] bg-white p-[clamp(1.4rem,4vw,2.1rem)]',
  evidenceHeader: 'flex flex-wrap items-start justify-between gap-4',
  evidenceBadge: 'shrink-0 rounded-full bg-[#edf8e5] px-3 py-[0.45rem] text-[0.7rem] font-extrabold text-[#536d37]',
  evidenceDescription: 'mt-3 mb-0 leading-[1.6] text-[#536087]',
  evidenceForm: 'mt-5 grid gap-2',
  evidenceLabel: 'text-[0.82rem] font-extrabold text-[#344166]',
  evidenceInput: classes(
    'min-h-24 w-full resize-y rounded-xl border bg-white px-3 py-3 leading-[1.55] text-[#26305a] outline-0',
    'border-[#d7dcef] focus:border-[#7774d7] focus:shadow-[0_0_0_3px_rgb(119_116_215_/_15%)]',
    'disabled:cursor-wait disabled:bg-[#f7f8fc] disabled:text-[#667291]',
  ),
  evidenceControls: 'mt-1 flex items-center justify-between gap-3',
  evidenceCount: 'text-[0.72rem] text-[#7b86a3]',
  evidenceSubmitButton: classes(
    'cursor-pointer rounded-[0.7rem] border-0 bg-brand-primary px-4 py-[0.7rem] text-[0.78rem] font-extrabold text-white',
    'hover:bg-[#4d4dab] disabled:cursor-not-allowed disabled:opacity-[0.4]',
  ),
  evidenceCancelButton: classes(
    'cursor-pointer rounded-[0.7rem] border border-[#d1d8ec] bg-white px-4 py-[0.7rem] text-[0.78rem] font-extrabold text-[#49557a]',
    'hover:border-[#7774d7] hover:text-[#504ebd]',
  ),
  evidenceHint: 'text-[0.7rem] leading-[1.45] text-[#7b86a3]',
  evidenceFeedback: 'mt-5 mb-0 rounded-xl bg-[#f4f6ff] px-4 py-3 text-[0.84rem] leading-[1.55] text-[#46537a]',
  evidenceError: 'mt-5 mb-0 rounded-xl bg-[#fff5f6] px-4 py-3 text-[0.84rem] leading-[1.55] text-[#9a3947]',
  evidenceAnswer: 'mt-5 rounded-2xl border border-[#dce7d1] bg-[#fbfff8] p-5',
  evidenceAnswerEyebrow: 'mt-0 mb-2 text-[0.7rem] font-extrabold tracking-[0.1em] text-[#536d37] uppercase',
  evidenceAnswerText: 'm-0 whitespace-pre-wrap leading-[1.7] text-[#26305a]',
  evidenceCitationTitle: 'mt-5 mb-3 text-[0.86rem] font-extrabold text-[#344166]',
  evidenceCitationList: 'm-0 grid list-decimal gap-3 pl-5',
  evidenceCitation: 'pl-1 text-[#455276]',
  evidenceExcerpt: 'm-0 whitespace-pre-wrap rounded-xl bg-white px-4 py-3 text-[0.82rem] leading-[1.6] text-[#536087]',
  evidenceSourceLink: 'mt-2 inline-block text-[0.75rem] font-extrabold text-[#504ebd] no-underline hover:underline',
} as const
