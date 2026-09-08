function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 로그인·회원가입 화면에서 맡는 UI 역할을 이름으로 사용합니다.
// 두 화면은 같은 껍데기를 공유하고 카드 안의 입력 항목만 달라집니다.
export const authPageStyles = {
  page: classes(
    'grid min-h-screen grid-cols-1 bg-app-canvas text-app-ink',
    'min-[1100px]:grid-cols-[560px_minmax(0,1fr)]',
  ),
  brandPanel: classes(
    'hidden flex-col gap-11 px-[3.25rem] py-14 text-[#e9edff] min-[1100px]:flex',
    'bg-[linear-gradient(180deg,#1c2342_0%,#11162e_100%)]',
  ),
  brand: 'flex items-center gap-3 text-[#e9edff] no-underline',
  brandMark:
    'grid size-[2.35rem] shrink-0 place-items-center rounded-[0.8rem] bg-brand-accent text-[1.25rem] font-black text-[#17203d]',
  brandTitle: 'block text-[1.12rem] font-extrabold tracking-[-0.04em]',
  brandSubtitle: 'mt-[0.2rem] block text-[0.72rem] font-normal text-[#a7b1d4]',
  brandHeadline: 'mt-8 flex flex-col gap-4',
  brandEyebrow:
    'm-0 text-[0.72rem] font-extrabold tracking-[0.1em] text-[#8995bd] uppercase',
  brandTagline: 'm-0 text-[2.1rem] font-extrabold leading-[1.25] tracking-[-0.04em] text-white',
  brandDescription: 'm-0 text-[0.95rem] leading-[1.65] text-[#a7b1d4]',
  brandFeatures: 'flex flex-col gap-[0.9rem]',
  brandFeature:
    'flex items-start gap-[0.9rem] rounded-[0.7rem] bg-[rgb(113_128_197_/_12%)] px-4 py-[0.9rem]',
  brandFeatureIcon:
    'grid size-9 shrink-0 place-items-center rounded-[0.6rem] bg-[rgb(185_232_143_/_14%)] text-brand-accent',
  brandFeatureTitle: 'block text-[0.9rem] font-bold text-white',
  brandFeatureDescription: 'mt-[0.2rem] block text-[0.78rem] leading-[1.5] text-[#c8d0eb]',
  brandFooter: 'mt-auto mb-0 text-[0.72rem] leading-[1.55] text-[#7783a9]',
  formPanel: 'grid min-w-0 place-items-center p-12 max-chat:px-5 max-chat:py-8',
  card: classes(
    'flex min-w-0 w-full max-w-[440px] flex-col gap-6 rounded-[1.25rem] border bg-white p-10',
    'border-sample-border shadow-[0_20px_50px_rgb(33_59_126_/_8%)] max-chat:p-6',
  ),
  cardHeader: 'flex flex-col gap-2',
  cardEyebrow:
    'm-0 text-[0.7rem] font-extrabold tracking-[0.12em] text-[#6471a0] uppercase',
  cardTitle: 'm-0 text-[1.7rem] font-bold tracking-[-0.04em] text-sample-heading',
  cardDescription: 'm-0 text-[0.9rem] leading-[1.65] text-sample-muted',
  fields: 'flex flex-col gap-[1.1rem]',
  field: 'flex flex-col gap-2 text-[0.9rem] font-bold text-[#1e2a49]',
  fieldControl: classes(
    'box-border min-h-12 w-full rounded-[0.7rem] border px-[0.9rem] py-[0.8rem] text-[0.95rem] font-normal',
    'border-[#cbd5ec] bg-[#fbfcff] text-[#17213d] placeholder:text-sample-muted',
    'focus:border-[#7774d7] focus:shadow-[0_0_0_3px_rgb(119_116_215_/_15%)] focus:outline-0',
  ),
  fieldHint: 'text-[0.75rem] font-medium text-sample-muted',
  fieldError: 'm-0 text-[0.82rem] font-medium text-[#9a3947]',
  optionsRow: 'flex flex-wrap items-center justify-between gap-4',
  checkboxLabel: 'inline-flex items-center gap-2 text-[0.82rem] font-normal text-[#43527a]',
  checkbox: 'size-[1.05rem] accent-brand-primary',
  helperLink: 'text-[0.82rem] font-bold text-[#5e5fc8] no-underline hover:text-[#504ebd]',
  // 아직 화면이 없는 보조 동작은 링크와 다른 색으로 두어 눌러도 이동하지 않는다는 것을 구분합니다.
  helperPending: 'cursor-default text-[0.82rem] font-bold text-[#8a94ae]',
  submitButton: classes(
    'min-h-12 w-full cursor-pointer rounded-[0.7rem] border-0 bg-brand-primary px-4 py-[0.85rem]',
    'text-[0.95rem] font-extrabold text-white hover:bg-[#5051b8]',
  ),
  divider: 'flex items-center gap-3',
  dividerLine: 'h-px flex-1 bg-[#e4e8f5]',
  dividerText: 'text-[0.75rem] text-sample-muted',
  secondaryButton: classes(
    'inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-[0.7rem] border bg-white px-4 py-[0.85rem]',
    'border-[#dfe4f2] text-[0.9rem] font-bold text-[#536087] no-underline hover:border-[#7774d7] hover:text-[#504ebd]',
  ),
  cardFooter: 'm-0 text-center text-[0.72rem] leading-[1.55] text-sample-muted',
} as const
