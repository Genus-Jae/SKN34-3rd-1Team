import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { appSidebarStyles, sidebarMenuItemClassName } from './AppSidebar.styles'
import { sidebarAccount } from './sidebarAccountPlaceholder'

type MenuIcon = 'search' | 'bookmark' | 'users' | 'building' | 'shield'

/** 사이드바 메뉴 한 줄입니다. `to`가 없으면 아직 화면이 없는 메뉴이므로 링크로 만들지 않습니다. */
type MenuItem = {
  label: string
  icon: MenuIcon
  to?: string
  badge?: string
  matches?: (pathname: string) => boolean
}

type MenuGroup = { title: string; items: MenuItem[] }

const menuGroups: MenuGroup[] = [
  {
    title: '메뉴',
    items: [
      {
        label: '지원사업 검색',
        icon: 'search',
        to: '/chat',
        matches: (pathname) => pathname === '/chat' || pathname.startsWith('/support-programs'),
      },
      { label: '관심 공고함', icon: 'bookmark', badge: '준비 중' },
      {
        label: '파트너 모집',
        icon: 'users',
        to: '/partners',
        matches: (pathname) => pathname.startsWith('/partners'),
      },
      {
        label: '내 프로필',
        icon: 'building',
        to: '/profile',
        matches: (pathname) => pathname.startsWith('/profile'),
      },
    ],
  },
  {
    title: '관리자',
    items: [
      {
        label: '회원·기업',
        icon: 'shield',
        to: '/admin/members',
        matches: (pathname) => pathname.startsWith('/admin'),
      },
    ],
  },
]

const iconPaths: Record<MenuIcon, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
}

function MenuIconGraphic({ name }: { name: MenuIcon }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

/**
 * 로그인 뒤 작업 화면의 사이드바입니다. 공용 헤더를 대신해 화면 이동과 계정 진입점을 담당합니다.
 * 세션 연결 전까지는 계정 정보를 예시 값으로 표시하고, 화면이 없는 메뉴는 링크로 만들지 않습니다.
 */
export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className={appSidebarStyles.sidebar} aria-label="작업 사이드바">
      <Link className={appSidebarStyles.brand} to="/chat">
        <span className={appSidebarStyles.brandMark} aria-hidden="true">G</span>
        <span>
          <strong className={appSidebarStyles.brandTitle}>GovBiz</strong>
          <span className={appSidebarStyles.brandSubtitle}>지원사업 탐색 도우미</span>
        </span>
      </Link>

      {menuGroups.map((group) => (
        <nav className={appSidebarStyles.menuGroup} key={group.title} aria-label={group.title}>
          <p className={appSidebarStyles.menuGroupTitle}>{group.title}</p>
          {group.items.map((item) =>
            item.to ? (
              <Link
                className={sidebarMenuItemClassName(
                  item.matches?.(pathname) ? 'active' : 'inactive',
                )}
                key={item.label}
                to={item.to}
                aria-current={item.matches?.(pathname) ? 'page' : undefined}
              >
                <MenuIconGraphic name={item.icon} />
                <span>{item.label}</span>
                {item.badge ? <span className={appSidebarStyles.menuBadge}>{item.badge}</span> : null}
              </Link>
            ) : (
              <span
                className={sidebarMenuItemClassName('pending')}
                key={item.label}
                aria-disabled="true"
              >
                <MenuIconGraphic name={item.icon} />
                <span>{item.label}</span>
                {item.badge ? <span className={appSidebarStyles.pendingBadge}>{item.badge}</span> : null}
              </span>
            ),
          )}
        </nav>
      ))}

      <div className={appSidebarStyles.account}>
        <p className={appSidebarStyles.demoNotice}>예시 계정 · 인증 미연결</p>
        <div className={appSidebarStyles.accountCard}>
          <span className={appSidebarStyles.accountAvatar} aria-hidden="true">
            {sidebarAccount.initial}
          </span>
          <span className="min-w-0">
            <strong className={appSidebarStyles.accountName}>{sidebarAccount.name}</strong>
            <span className={appSidebarStyles.accountCompany}>{sidebarAccount.companyName}</span>
          </span>
        </div>
        <Link className={appSidebarStyles.publicSearchLink} to="/">
          공개 검색으로
        </Link>
      </div>
    </aside>
  )
}
