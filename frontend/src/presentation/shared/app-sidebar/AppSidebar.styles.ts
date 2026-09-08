function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 로그인 뒤 작업 화면에서 사이드바가 맡는 UI 역할을 이름으로 사용합니다.
// 아직 화면이 없는 메뉴는 링크와 다른 variant를 써서 눌러도 이동하지 않는다는 것을 시각적으로 구분합니다.
export const appSidebarStyles = {
  // 사이드바와 화면 머리말이 항상 보이도록 껍데기를 뷰포트 높이에 고정하고, 본문 칸만 스크롤합니다.
  // 한 칸으로 접히는 좁은 화면에서는 화면을 다 덮지 않도록 고정을 풀고 문서 전체가 스크롤되게 둡니다.
  layout: classes(
    'grid h-screen grid-cols-[278px_minmax(0,1fr)] overflow-hidden bg-[linear-gradient(180deg,#f0f9f3_0%,#f9fdfb_65%,#fff_100%)] text-app-ink',
    'max-chat:h-auto max-chat:min-h-svh max-chat:grid-cols-1 max-chat:grid-rows-[auto_minmax(0,1fr)] max-chat:overflow-visible',
  ),
  sidebar: classes(
    'flex h-full flex-col gap-[1.35rem] overflow-y-auto px-5 py-[1.6rem] text-[#e2f1e9]',
    'bg-[linear-gradient(180deg,#102b22_0%,#0d241c_100%)]',
    'max-chat:h-auto max-chat:gap-4 max-chat:overflow-visible max-chat:py-4',
  ),
  brand: classes(
    'flex items-center gap-3 border-b border-[#294b3c] px-[0.35rem] pt-1 pb-5 no-underline',
    'text-[#e2f1e9] max-chat:pb-3',
  ),
  brandMark:
    'grid size-[2.35rem] shrink-0 place-items-center rounded-[0.8rem] bg-brand-accent text-[1.25rem] font-black text-[#102b22]',
  brandTitle: 'block text-[1.12rem] font-extrabold tracking-[-0.04em]',
  brandSubtitle: 'mt-[0.2rem] block text-[0.72rem] font-normal text-[#b4cdbf]',
  menuGroup: 'flex flex-col gap-2',
  menuGroupTitle:
    'mt-0 mb-1 text-[0.72rem] font-extrabold tracking-[0.1em] text-[#b4cdbf] uppercase',
  menuItem: 'flex items-center gap-[0.6rem] rounded-[0.85rem] px-3 py-[0.68rem] text-[0.8rem] no-underline',
  activeMenuItem: 'bg-[#286044] font-bold text-white',
  inactiveMenuItem: 'bg-[#19392c] font-semibold text-[#e2f1e9] hover:bg-[#234d39] hover:text-white',
  pendingMenuItem: 'cursor-default bg-[#153126] font-semibold text-[#b4cdbf]',
  menuBadge:
    'ml-auto inline-flex rounded-full bg-brand-accent px-[0.45rem] py-[0.1rem] text-[0.68rem] font-extrabold text-[#102b22]',
  pendingBadge:
    'ml-auto inline-flex rounded-full bg-[#234333] px-[0.45rem] py-[0.1rem] text-[0.62rem] font-bold text-[#b4cdbf]',
  account: 'mt-auto flex flex-col gap-[0.6rem] max-chat:mt-4',
  demoNotice: 'm-0 text-xs leading-relaxed text-[#e2f1e9]',
  accountCard:
    'flex items-center gap-[0.65rem] rounded-[0.7rem] bg-[#19392c] p-3',
  accountAvatar:
    'grid size-8 shrink-0 place-items-center rounded-[0.6rem] bg-brand-primary text-[0.85rem] font-extrabold text-white',
  accountName: 'block text-[0.8rem] font-bold text-white',
  accountCompany:
    'mt-[0.1rem] block overflow-hidden text-[0.68rem] text-ellipsis whitespace-nowrap text-[#b4cdbf]',
  publicSearchLink: 'pl-[0.35rem] text-[0.72rem] font-semibold text-[#b4cdbf] no-underline hover:text-[#e2f1e9]',
  workspace: '@container/workspace flex min-h-0 min-w-0 flex-col overflow-y-auto max-chat:overflow-visible',
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
