function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 앱 최상단 헤더에서 맡는 UI 역할을 이름으로 사용합니다.
export const appHeaderStyles = {
  // 공개 랜딩에서만 사용하는 변형입니다. 작은 화면에서도 모든 이동 경로를 두 줄로 유지합니다.
  landingHeader: classes(
    'sticky top-5 z-[5] mx-auto mt-5 grid w-[calc(100%-2.5rem)] max-w-[1400px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-7 gap-y-3',
    'rounded-[2rem] bg-[#102b22] px-6 py-4 text-white shadow-[0_12px_30px_rgb(16_43_34_/_8%)]',
    'min-[640px]:top-6 min-[640px]:mt-6 min-[640px]:w-[calc(100%-3rem)]',
    'max-[900px]:grid-cols-[minmax(0,1fr)_auto] max-[900px]:gap-x-3 max-[900px]:px-3',
  ),
  landingBrand: 'flex min-w-0 items-center gap-2.5 justify-self-start text-white no-underline',
  landingBrandMark: 'grid size-9 shrink-0 place-items-center rounded-full bg-[#b9e5ce] text-[1.1rem] font-black text-[#102b22] max-[400px]:size-8',
  landingBrandTitle: 'block text-[1.25rem] font-extrabold tracking-[-0.055em] max-[400px]:text-[1.05rem]',
  landingNav: 'contents',
  landingNavLinks: classes(
    'flex min-w-0 flex-wrap items-center justify-center gap-x-5 gap-y-1',
    'max-[900px]:col-span-2 max-[900px]:row-start-2 max-[900px]:gap-x-4',
  ),
  landingNavLink: classes(
    'inline-flex min-h-8 items-center rounded-lg text-[0.83rem] font-semibold whitespace-nowrap text-[#e2f1e9] no-underline hover:text-white',
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b9e5ce] max-[400px]:text-[0.68rem] max-[400px]:tracking-[-0.02em]',
  ),
  landingAccountLinks: 'flex shrink-0 items-center justify-end gap-2 max-[900px]:col-start-2 max-[900px]:row-start-1 max-[400px]:gap-1.5',
  landingAccountButton: classes(
    'inline-flex min-h-9 items-center justify-center rounded-full bg-white px-4 py-2 text-[0.78rem] font-bold whitespace-nowrap text-[#102b22] no-underline hover:bg-[#e2f1e9]',
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b9e5ce] max-[400px]:px-2.5 max-[400px]:text-[0.7rem]',
  ),
  header: classes(
    'sticky top-0 z-[5] grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[#e8ecf7] bg-[rgb(255_255_255_/_92%)] backdrop-blur',
    'max-chat:grid-cols-[minmax(0,1fr)_auto] max-chat:gap-y-2',
    'px-[clamp(1rem,4vw,2.5rem)] py-3',
  ),
  currentPage: 'm-0 whitespace-nowrap text-center text-[0.95rem] font-extrabold tracking-[-0.02em] text-app-ink max-chat:text-[0.85rem]',
  brand: 'flex items-center gap-3 justify-self-start text-app-ink no-underline',
  brandMark:
    'grid size-9 place-items-center rounded-[0.7rem] bg-brand-accent text-[1.1rem] font-black text-[#17203d]',
  brandTitle: 'block text-[1.05rem] font-extrabold tracking-[-0.04em]',
  brandSubtitle: 'mt-[0.1rem] block text-[0.7rem] text-sample-muted max-chat:hidden',
  nav: 'flex flex-wrap items-center justify-end gap-2 justify-self-end max-chat:col-span-2 max-chat:row-start-2 max-chat:justify-self-stretch',
  navLink: classes(
    'whitespace-nowrap rounded-full border px-[0.8rem] py-[0.45rem] text-[0.74rem] font-bold no-underline',
    'border-[#dfe4ef] bg-white text-[#536087] hover:border-[#7774d7] hover:text-[#504ebd]',
    'max-chat:px-[0.6rem] max-chat:text-[0.66rem]',
  ),
  loginButton: classes(
    'whitespace-nowrap rounded-full border-0 bg-brand-primary px-[0.9rem] py-[0.5rem] text-[0.74rem] font-extrabold text-white no-underline',
    'hover:bg-[#5051b8] max-chat:px-[0.7rem] max-chat:text-[0.66rem]',
  ),
} as const
