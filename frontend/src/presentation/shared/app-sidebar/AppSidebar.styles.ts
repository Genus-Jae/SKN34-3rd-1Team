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
    'flex h-full flex-col gap-[1.35rem] overflow-y-auto px-5 py-[1.6rem] text-app-ink',
    'border-r border-sample-border bg-white',
    'max-chat:h-auto max-chat:gap-4 max-chat:overflow-visible max-chat:border-r-0 max-chat:border-b max-chat:py-4',
  ),
  brand: classes(
    'flex items-center gap-3 border-b border-sample-border px-[0.35rem] pt-1 pb-5 no-underline',
    'text-app-ink max-chat:pb-3',
  ),
  brandMark:
    'grid size-[2.35rem] shrink-0 place-items-center rounded-[0.8rem] bg-brand-accent text-[1.25rem] font-black text-brand-primary',
  brandTitle: 'block text-[1.12rem] font-extrabold tracking-[-0.04em]',
  brandSubtitle: 'mt-[0.2rem] block text-[0.72rem] font-normal text-sample-muted',
  menuGroup: 'flex flex-col gap-2',
  menuGroupTitle:
    'mt-0 mb-1 text-[0.72rem] font-extrabold tracking-[0.1em] text-sample-muted uppercase',
  menuItem: 'flex items-center gap-[0.6rem] rounded-[0.85rem] px-3 py-[0.68rem] text-[0.8rem] no-underline',
  activeMenuItem: 'bg-brand-accent font-bold text-brand-primary',
  inactiveMenuItem: 'bg-white font-semibold text-app-ink hover:bg-[#f6f7f8] hover:text-brand-primary',
  pendingMenuItem: 'cursor-default bg-[#f6f7f8] font-semibold text-sample-muted',
  menuBadge:
    'ml-auto inline-flex rounded-full bg-brand-accent px-[0.45rem] py-[0.1rem] text-[0.68rem] font-extrabold text-brand-primary',
  pendingBadge:
    'ml-auto inline-flex rounded-full bg-[#e9ecef] px-[0.45rem] py-[0.1rem] text-[0.62rem] font-bold text-sample-muted',
  account: 'mt-auto flex flex-col gap-[0.6rem] max-chat:mt-4',
  accountCard:
    'flex items-center gap-[0.65rem] rounded-[0.7rem] bg-[#f6f7f8] p-3',
  accountAvatar:
    'grid size-8 shrink-0 place-items-center rounded-[0.6rem] bg-brand-primary text-[0.85rem] font-extrabold text-white',
  accountName: 'block text-[0.8rem] font-bold text-app-ink',
  accountCompany:
    'mt-[0.1rem] block overflow-hidden text-[0.68rem] text-ellipsis whitespace-nowrap text-sample-muted',
  accountActions: 'flex items-center gap-3 pl-[0.35rem]',
  accountLink: 'text-[0.72rem] font-semibold text-brand-primary no-underline hover:underline',
  logoutButton: 'cursor-pointer border-0 bg-transparent p-0 text-[0.72rem] font-semibold text-sample-muted hover:text-brand-primary hover:underline',
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
