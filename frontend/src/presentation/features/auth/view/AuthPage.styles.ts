function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 로그인·회원가입·비밀번호 찾기 화면에서 맡는 UI 역할을 이름으로 사용합니다.
// 네 화면은 테두리 없는 가운데 열(로고·구분선·입력·버튼·링크)이라는 같은 껍데기를 공유하고 입력 항목만 달라집니다.
export const authPageStyles = {
  page: 'flex min-h-screen flex-col items-center justify-center bg-white px-5 py-10 text-app-ink max-chat:py-8',
  logo: classes(
    'mb-7 flex items-center gap-3 self-center rounded-xl text-app-ink no-underline',
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary',
  ),
  // 로그인·회원가입은 로고 마크와 이름 둘만 두므로 공개 헤더보다 한 단계 크게 씁니다.
  logoMark:
    'grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-accent text-[1.8rem] font-black text-brand-primary',
  logoTitle: 'block text-[1.75rem] font-extrabold leading-none tracking-[-0.05em]',
  // 입력·버튼 폭 444px은 참고한 로그인 화면과 같습니다.
  formPanel: 'flex w-full max-w-[444px] min-w-0 flex-col justify-center',
  card: 'flex min-w-0 w-full flex-col gap-3',
  cardHeader: 'flex flex-col gap-2',
  cardEyebrow:
    'm-0 text-[0.7rem] font-extrabold tracking-[0.12em] text-brand-primary uppercase',
  cardTitle: 'm-0 text-[1.7rem] font-bold tracking-[-0.04em] text-sample-heading',
  cardDescription: 'm-0 text-[0.9rem] leading-[1.65] text-sample-muted',
  fields: 'flex flex-col gap-3',
  field: 'flex flex-col gap-2 text-[0.9rem] font-bold text-app-ink',
  // 항목 이름은 placeholder가 대신하고 낭독기에만 읽히게 숨깁니다.
  fieldName: 'sr-only',
  fieldControl: classes(
    'box-border min-h-14 w-full rounded-xl border px-4 py-[0.9rem] text-base font-normal',
    'border-sample-border bg-white text-app-ink placeholder:text-sample-muted',
    'focus:border-brand-primary focus:shadow-[0_0_0_3px_rgb(8_127_70_/_15%)] focus:outline-0',
  ),
  fieldHint: 'm-0 text-center text-[0.75rem] font-medium text-sample-muted',
  fieldError: 'm-0 text-[0.82rem] font-medium text-[#9a3947]',
  notice: 'm-0 rounded-xl bg-brand-accent px-4 py-3 text-[0.88rem] leading-[1.6] text-app-ink',
  optionsRow: 'flex flex-wrap items-center justify-between gap-4',
  checkboxLabel: 'inline-flex items-center gap-2 text-[0.82rem] font-normal text-sample-muted',
  checkbox: 'size-[1.05rem] accent-brand-primary',
  submitButton: classes(
    'min-h-14 w-full cursor-pointer rounded-full border-0 bg-brand-primary px-4 py-[0.9rem]',
    'text-base font-extrabold text-white hover:bg-[#066538] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
    'disabled:cursor-default disabled:opacity-60',
  ),
  primaryLink: classes(
    'inline-flex min-h-14 w-full items-center justify-center rounded-full bg-brand-primary px-4 py-[0.9rem]',
    'text-base font-extrabold text-white no-underline hover:bg-[#066538] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
  ),
  divider: 'mb-6 flex items-center gap-4',
  dividerLine: 'h-px flex-1 bg-sample-border',
  dividerText: 'text-[0.95rem] text-sample-muted',
  linksRow: 'm-0 mt-3 flex flex-wrap items-center justify-center gap-3 text-[0.95rem]',
  linksLead: 'text-sample-muted',
  linkSeparator: 'h-4 w-px bg-sample-border',
  footerLink: 'rounded font-bold text-app-ink no-underline hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary',
} as const
