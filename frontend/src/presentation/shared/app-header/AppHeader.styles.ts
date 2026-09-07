function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 앱 최상단 헤더에서 맡는 UI 역할을 이름으로 사용합니다.
export const appHeaderStyles = {
  header: classes(
    'sticky top-0 z-[5] grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[#e8ecf7] bg-[rgb(255_255_255_/_92%)] backdrop-blur',
    'px-[clamp(1rem,4vw,2.5rem)] py-3',
  ),
  currentPage: 'm-0 text-center text-[0.95rem] font-extrabold tracking-[-0.02em] text-app-ink max-chat:text-[0.85rem]',
  brand: 'flex items-center gap-3 justify-self-start text-app-ink no-underline',
  brandMark:
    'grid size-9 place-items-center rounded-[0.7rem] bg-brand-accent text-[1.1rem] font-black text-[#17203d]',
  brandTitle: 'block text-[1.05rem] font-extrabold tracking-[-0.04em]',
  brandSubtitle: 'mt-[0.1rem] block text-[0.7rem] text-[#6d7898] max-chat:hidden',
  nav: 'flex items-center gap-2 justify-self-end',
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
