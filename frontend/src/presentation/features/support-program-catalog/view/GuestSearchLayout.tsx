import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router'

import { AppHeader } from '../../../shared/app-header/AppHeader'
import { useAuthSession } from '../../../shared/auth/hooks/useAuthSession'
import { publicPaths } from '../../../shared/routes/appPaths'

const iconPaths = {
  panel: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></>,
  new: <><path d="M12 4H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-6" /><path d="m16 3 5 5-9 9H7v-5Z" /></>,
  partners: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2" /></>,
  pricing: <><path d="m12 3 8 4v10l-8 4-8-4V7Z" /><path d="M9 12h6m-3-3v6" /></>,
}

function Icon({ name }: { name: keyof typeof iconPaths }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>
}

const iconButton = 'grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-[#626262] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'
const menuItem = 'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-app-ink no-underline hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-brand-primary'

/** 비로그인 검색의 메뉴·계정 진입점입니다. 모바일 메뉴는 네이티브 모달로 포커스를 관리합니다. */
export function GuestSearchLayout({ children, searchTabs, isFilter, onNewChat, hasConversation }: {
  hasConversation: boolean
  children: ReactNode
  searchTabs: ReactNode
  isFilter: boolean
  onNewChat: () => void
}) {
  const [isMobile, setIsMobile] = useState(() => typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 759px)').matches)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const { status, logInAsDeveloper, isDevLoggingIn, devLogInError } = useAuthSession()

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 759px)')
    const update = () => { setIsMobile(media.matches); setIsMenuOpen(false) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (hasConversation && isMobile && isMenuOpen) dialog?.showModal()
    else dialog?.close()
  }, [hasConversation, isMobile, isMenuOpen])

  useEffect(() => {
    if (!hasConversation) {
      setIsCollapsed(false)
      setIsMenuOpen(false)
    }
  }, [hasConversation])

  function toggleSidebar(collapsed: boolean) {
    flushSync(() => setIsCollapsed(collapsed))
    ;(collapsed ? menuButtonRef : sidebarToggleRef).current?.focus()
  }

  function closeMenu() {
    dialogRef.current?.close()
    setIsMenuOpen(false)
  }

  const sidebar = <div className="flex h-full min-h-0 flex-col bg-[#f8f9f8]">
    <div className="flex h-17 shrink-0 items-center justify-between px-4">
      <Link to={publicPaths.landing} reloadDocument aria-label="GovBiz 홈으로"
        className="flex items-center gap-2.5 rounded-lg text-app-ink no-underline focus-visible:outline-2 focus-visible:outline-brand-primary">
        <span className="grid size-8 place-items-center rounded-xl bg-brand-primary text-lg font-black text-white" aria-hidden="true">G</span>
        <strong className="text-lg tracking-tight">GovBiz</strong>
      </Link>
      <button ref={sidebarToggleRef} type="button" className={iconButton} aria-label={isMobile ? '메뉴 닫기' : '사이드바 접기'}
        onClick={() => isMobile ? closeMenu() : toggleSidebar(true)}><Icon name="panel" /></button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3">
      <button type="button" className={menuItem} onClick={() => { closeMenu(); onNewChat() }}>
        <Icon name="new" /><span>새 채팅</span>
      </button>
      <p className="mt-7 mb-2 px-3 text-xs font-medium text-[#767b78]">지원사업 탐색</p>
      <div onClick={closeMenu}>{searchTabs}</div>
      <nav aria-label="화면 이동" className="mt-1">
        <Link to={publicPaths.partners} className={menuItem}><Icon name="partners" /><span>파트너 모집</span></Link>
        <Link to={publicPaths.pricing} className={menuItem}><Icon name="pricing" /><span>요금제</span></Link>
      </nav>
    </div>
    <div className="shrink-0 border-t border-[#e6e8e6] px-5 pt-5 pb-4">
      <strong className="text-sm font-semibold">우리 회사에 맞는 기회를 찾아보세요</strong>
      <p className="mt-2 mb-4 text-[0.8rem] leading-6 text-sample-muted">
        지금은 검색 결과 2건을 볼 수 있어요.<br />무료 회원가입 후 로그인하면<br />최대 5건을 모두 확인할 수 있어요.
      </p>
      <Link to="/login" aria-label="로그인하고 전체 결과 보기"
        className="flex min-h-11 items-center justify-center rounded-full border border-[#d8dcd9] bg-white text-sm font-medium text-app-ink no-underline hover:bg-[#f0f2f0] focus-visible:outline-2 focus-visible:outline-brand-primary">로그인</Link>
      {import.meta.env.DEV ? <details className="mt-3 text-xs text-sample-muted">
        <summary className="w-fit cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-brand-primary">개발용 로그인</summary>
        <div className="mt-2 grid gap-2">
          <button type="button" className="cursor-pointer rounded py-1 text-left" disabled={isDevLoggingIn} onClick={() => void logInAsDeveloper('ADMIN')}>개발 로그인 · 관리자</button>
          <button type="button" className="cursor-pointer rounded py-1 text-left" disabled={isDevLoggingIn} onClick={() => void logInAsDeveloper('USER')}>개발 로그인 · 회원</button>
          {devLogInError ? <p role="alert">{devLogInError}</p> : null}
        </div>
      </details> : null}
    </div>
  </div>

  return <div className="flex min-h-0 flex-1 overflow-hidden bg-white" data-guest-search-layout={hasConversation ? 'conversation' : 'intro'}>
    {hasConversation ? (isMobile ? <dialog ref={dialogRef} aria-label="검색 메뉴" onClose={() => setIsMenuOpen(false)}
      onClick={(event) => { if (event.target === event.currentTarget) closeMenu() }}
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(290px,85vw)] max-w-none border-0 p-0 backdrop:bg-black/25">
      {sidebar}
    </dialog> : <aside aria-label="검색 사이드바" id="guest-search-sidebar" hidden={isCollapsed} className={isCollapsed ? 'hidden' : 'w-[260px] shrink-0 border-r border-[#eef0ed]'}>
      {sidebar}
    </aside>) : null}
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {hasConversation ? <header aria-label="앱 헤더" className="flex min-h-17 shrink-0 items-center justify-between gap-2 px-7 py-3 max-chat:min-h-15 max-chat:px-3 max-chat:py-2">
        <div className="flex min-w-0 items-center gap-2">
          {isMobile || isCollapsed ? <button ref={menuButtonRef} type="button" className={iconButton}
            aria-label={isMobile ? '메뉴 열기' : '사이드바 펼치기'} aria-haspopup={isMobile ? 'dialog' : undefined}
            aria-expanded={isMobile ? isMenuOpen : false}
            onClick={() => isMobile ? setIsMenuOpen(true) : toggleSidebar(false)}><Icon name="panel" /></button> : null}
          <p className="m-0 truncate text-lg font-semibold tracking-tight max-chat:text-sm">{isFilter ? '필터 검색' : 'AI 대화 검색'}</p>
        </div>
        {status !== 'unknown' ? <nav aria-label="계정" className="flex shrink-0 items-center gap-2">
          <Link to="/login" className="inline-flex min-h-10 items-center rounded-full bg-[#202124] px-5 text-sm font-medium text-white no-underline hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary max-chat:px-3.5 max-chat:text-xs">로그인</Link>
          <Link to="/signup" className="inline-flex min-h-10 items-center rounded-full border border-[#dce0dd] px-5 text-sm font-medium text-app-ink no-underline hover:bg-[#f5f6f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary max-chat:px-3.5 max-chat:text-xs">무료 회원가입</Link>
        </nav> : null}
      </header> : <AppHeader />}
      {!hasConversation ? <div className="flex shrink-0 justify-center px-4 pt-3 pb-2">{searchTabs}</div> : null}
      {/* 레이아웃이 바뀌어도 대화·입력·요청을 소유한 자식은 같은 위치에서 유지합니다. */}
      {children}
    </div>
  </div>
}
