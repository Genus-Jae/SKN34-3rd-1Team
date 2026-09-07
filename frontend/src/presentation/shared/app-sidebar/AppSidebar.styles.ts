function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 로그인 뒤 작업 화면에서 사이드바가 맡는 UI 역할을 이름으로 사용합니다.
// 아직 화면이 없는 메뉴는 링크와 다른 variant를 써서 눌러도 이동하지 않는다는 것을 시각적으로 구분합니다.
export const appSidebarStyles = {
  // 사이드바와 화면 머리말이 항상 보이도록 껍데기를 뷰포트 높이에 고정하고, 본문 칸만 스크롤합니다.
  // 한 칸으로 접히는 좁은 화면에서는 화면을 다 덮지 않도록 고정을 풀고 문서 전체가 스크롤되게 둡니다.
  layout: classes(
    'grid h-screen grid-cols-[278px_minmax(0,1fr)] overflow-hidden bg-app-canvas text-app-ink',
    'max-chat:h-auto max-chat:min-h-svh max-chat:grid-cols-1 max-chat:grid-rows-[auto_minmax(0,1fr)] max-chat:overflow-visible',
  ),
  sidebar: classes(
    'flex h-full flex-col gap-[1.35rem] overflow-y-auto px-5 py-[1.6rem] text-[#e9edff]',
    'bg-[linear-gradient(180deg,#1c2342_0%,#11162e_100%)]',
    'max-chat:h-auto max-chat:gap-4 max-chat:overflow-visible max-chat:py-4',
  ),
  brand: classes(
    'flex items-center gap-3 border-b border-[rgb(219_227_255_/_12%)] px-[0.35rem] pt-1 pb-5 no-underline',
    'text-[#e9edff] max-chat:pb-3',
  ),
  brandMark:
    'grid size-[2.35rem] shrink-0 place-items-center rounded-[0.8rem] bg-brand-accent text-[1.25rem] font-black text-[#17203d]',
  brandTitle: 'block text-[1.12rem] font-extrabold tracking-[-0.04em]',
  brandSubtitle: 'mt-[0.2rem] block text-[0.72rem] font-normal text-[#a7b1d4]',
  menuGroup: 'flex flex-col gap-2',
  menuGroupTitle:
    'mt-0 mb-1 text-[0.72rem] font-extrabold tracking-[0.1em] text-[#8995bd] uppercase',
  menuItem: classes(
    'flex items-center gap-[0.6rem] rounded-[0.65rem] px-3 py-[0.68rem] text-[0.8rem] no-underline',
    'bg-[rgb(113_128_197_/_12%)] font-semibold text-[#c8d0eb]',
  ),
  activeMenuItem: 'bg-[rgb(113_128_197_/_28%)] font-bold text-white',
  inactiveMenuItem: 'hover:bg-[rgb(113_128_197_/_22%)] hover:text-white',
  pendingMenuItem: 'cursor-default bg-[rgb(113_128_197_/_8%)] text-[#8a95bb]',
  menuBadge:
    'ml-auto inline-flex rounded-full bg-brand-accent px-[0.45rem] py-[0.1rem] text-[0.68rem] font-extrabold text-[#17203d]',
  pendingBadge:
    'ml-auto inline-flex rounded-full bg-[rgb(113_128_197_/_18%)] px-[0.45rem] py-[0.1rem] text-[0.62rem] font-bold text-[#8a95bb]',
  account: 'mt-auto flex flex-col gap-[0.6rem] max-chat:mt-4',
  accountCard:
    'flex items-center gap-[0.65rem] rounded-[0.7rem] bg-[rgb(113_128_197_/_12%)] p-3',
  accountAvatar:
    'grid size-8 shrink-0 place-items-center rounded-[0.6rem] bg-brand-primary text-[0.85rem] font-extrabold text-white',
  accountName: 'block text-[0.8rem] font-bold text-white',
  accountCompany:
    'mt-[0.1rem] block overflow-hidden text-[0.68rem] text-ellipsis whitespace-nowrap text-[#a7b1d4]',
  logoutLink: 'pl-[0.35rem] text-[0.72rem] font-semibold text-[#7783a9] no-underline hover:text-[#c8d0eb]',
  workspace: 'flex min-h-0 min-w-0 flex-col overflow-y-auto max-chat:overflow-visible',
} as const

export function sidebarMenuItemClassName(state: 'active' | 'inactive' | 'pending') {
  const variant =
    state === 'active'
      ? appSidebarStyles.activeMenuItem
      : state === 'pending'
        ? appSidebarStyles.pendingMenuItem
        : appSidebarStyles.inactiveMenuItem
  return `${appSidebarStyles.menuItem} ${variant}`
}
