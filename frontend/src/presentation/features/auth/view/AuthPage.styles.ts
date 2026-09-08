function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 로그인·회원가입 화면에서 맡는 UI 역할을 이름으로 사용합니다.
// 두 화면은 같은 껍데기를 공유하고 카드 안의 입력 항목만 달라집니다.
export const authPageStyles = {
  page: classes(
    'grid min-h-screen grid-cols-1 bg-[linear-gradient(180deg,#f0f9f3_0%,#f9fdfb_65%,#fff_100%)] text-app-ink',
    'min-[1100px]:grid-cols-[560px_minmax(0,1fr)]',
  ),
  brandPanel: classes(
    'hidden flex-col gap-11 px-[3.25rem] py-14 text-[#e9f7ef] min-[1100px]:flex',
    'bg-[linear-gradient(180deg,#153e2d_0%,#0d2b1e_100%)]',
  ),
  brand: 'flex items-center gap-3 rounded-xl text-[#e9f7ef] no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-accent',
  brandMark:
    'grid size-[2.35rem] shrink-0 place-items-center rounded-xl bg-brand-accent text-[1.25rem] font-black text-[#153e2d]',
  brandTitle: 'block text-[1.12rem] font-extrabold tracking-[-0.04em]',
  brandSubtitle: 'mt-[0.2rem] block text-[0.72rem] font-normal text-[#b9d9c8]',
  brandHeadline: 'mt-8 flex flex-col gap-4',
  brandEyebrow:
    'm-0 text-[0.72rem] font-extrabold tracking-[0.1em] text-[#b9d9c8] uppercase',
  brandTagline: 'm-0 text-[2.1rem] font-extrabold leading-[1.25] tracking-[-0.04em] text-white',
  brandDescription: 'm-0 text-[0.95rem] leading-[1.65] text-[#c4dfcf]',
  brandFeatures: 'flex flex-col gap-[0.9rem]',
  brandFeature:
    'flex items-start gap-[0.9rem] rounded-2xl border border-[rgb(200_234_216_/_15%)] bg-[rgb(200_234_216_/_8%)] px-4 py-[0.9rem]',
  brandFeatureIcon:
    'grid size-9 shrink-0 place-items-center rounded-xl bg-[rgb(200_234_216_/_14%)] text-brand-accent',
  brandFeatureTitle: 'block text-[0.9rem] font-bold text-white',
  brandFeatureDescription: 'mt-[0.2rem] block text-[0.78rem] leading-[1.5] text-[#d0e7d9]',
  brandFooter: 'mt-auto mb-0 text-[0.72rem] leading-[1.55] text-[#b9d9c8]',
  formPanel: 'grid min-w-0 place-items-center p-12 max-chat:px-5 max-chat:py-8',
  card: classes(
    'flex min-w-0 w-full max-w-[440px] flex-col gap-6 rounded-[2rem] border bg-white p-10',
    'border-sample-border shadow-[0_16px_48px_rgb(23_68_45_/_6%)] max-chat:p-6',
  ),
  cardHeader: 'flex flex-col gap-2',
  cardEyebrow:
    'm-0 text-[0.7rem] font-extrabold tracking-[0.12em] text-[#147d58] uppercase',
  cardTitle: 'm-0 text-[1.7rem] font-bold tracking-[-0.04em] text-sample-heading',
  cardDescription: 'm-0 text-[0.9rem] leading-[1.65] text-sample-muted',
  fields: 'flex flex-col gap-[1.1rem]',
  field: 'flex flex-col gap-2 text-[0.9rem] font-bold text-app-ink',
  fieldControl: classes(
    'box-border min-h-12 w-full rounded-xl border px-[0.9rem] py-[0.8rem] text-[0.95rem] font-normal',
    'border-[#cce1d4] bg-[#fbfefc] text-app-ink placeholder:text-sample-muted',
    'focus:border-[#147d58] focus:shadow-[0_0_0_3px_rgb(20_125_88_/_15%)] focus:outline-0',
  ),
  fieldHint: 'text-[0.75rem] font-medium text-sample-muted',
  fieldError: 'm-0 text-[0.82rem] font-medium text-[#9a3947]',
  optionsRow: 'flex flex-wrap items-center justify-between gap-4',
  checkboxLabel: 'inline-flex items-center gap-2 text-[0.82rem] font-normal text-sample-muted',
  checkbox: 'size-[1.05rem] accent-brand-primary',
  helperLink: 'rounded text-[0.82rem] font-bold text-[#286044] no-underline hover:text-[#106b48] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary',
  // 아직 화면이 없는 보조 동작은 링크와 다른 색으로 두어 눌러도 이동하지 않는다는 것을 구분합니다.
  helperPending: 'cursor-default text-[0.82rem] font-bold text-[#718779]',
  submitButton: classes(
    'min-h-12 w-full cursor-pointer rounded-full border-0 bg-brand-primary px-4 py-[0.85rem]',
    'text-[0.95rem] font-extrabold text-white hover:bg-[#106b48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
  ),
  divider: 'flex items-center gap-3',
  dividerLine: 'h-px flex-1 bg-[#dbe9e0]',
  dividerText: 'text-[0.75rem] text-sample-muted',
  secondaryButton: classes(
    'inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full border bg-[#edf7f1] px-4 py-[0.85rem]',
    'border-[#cce1d4] text-[0.9rem] font-bold text-[#286044] no-underline hover:border-[#147d58] hover:bg-[#d8eee1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
  ),
  cardFooter: 'm-0 text-center text-[0.72rem] leading-[1.55] text-sample-muted',
} as const
