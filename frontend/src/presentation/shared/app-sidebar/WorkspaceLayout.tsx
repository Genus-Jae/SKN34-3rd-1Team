import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useAppDispatch } from '../../../app/hooks'
import { conversationReset } from '../../features/chat/state/chatSlice'
import { useChatHistory } from '../../features/chat/hooks/useChatHistory'
import { appPaths } from '../routes/appPaths'
import { AppSidebar, SidebarActionIcon } from './AppSidebar'
import { appSidebarStyles } from './AppSidebar.styles'

/** 로그인 화면은 본문을 유지한 채 PC 사이드바를 접거나 모바일 메뉴를 엽니다. */
export function WorkspaceLayout() {
  const [isMobile, setIsMobile] = useState(() => typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 759px)').matches)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const shouldFocusComposer = useRef(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const history = useChatHistory()
  const { cancelOpening } = history

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 759px)')
    const update = () => { setIsMobile(media.matches); setIsMenuOpen(false) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => { setIsMenuOpen(false) }, [location.key])
  // 다른 화면으로 이동한 뒤 늦게 도착한 기록 조회가 채팅으로 다시 끌고 가지 않게 합니다.
  useEffect(() => { cancelOpening() }, [location.key, cancelOpening])

  useEffect(() => {
    if (isMobile && isMenuOpen) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [isMobile, isMenuOpen])

  useEffect(() => {
    if (!shouldFocusComposer.current || isMenuOpen) return
    const input = workspaceRef.current?.querySelector<HTMLTextAreaElement>('textarea[aria-label="지원사업 검색어"]')
    // 라우터가 필터 탭에서 AI 탭으로 전환하고 모달이 닫힌 뒤 포커스를 줍니다.
    if (input && !input.closest('[hidden]')) {
      input.focus()
      shouldFocusComposer.current = false
    }
  }, [location.key, isMenuOpen])

  function closeSidebar() {
    flushSync(() => {
      if (isMobile) setIsMenuOpen(false)
      else setIsCollapsed(true)
    })
    menuButtonRef.current?.focus()
  }

  function openSidebar() {
    flushSync(() => {
      if (isMobile) setIsMenuOpen(true)
      else setIsCollapsed(false)
    })
    if (!isMobile) sidebarRef.current?.querySelector<HTMLButtonElement>('button[aria-label="사이드바 접기"]')?.focus()
  }

  function startNewChat() {
    history.cancelOpening()
    shouldFocusComposer.current = true
    // 요청 ID까지 함께 비워 진행 중인 해석·검색을 취소하고 늦은 응답이 대화를 되살리지 않게 합니다.
    flushSync(() => {
      dispatch(conversationReset())
      setIsMenuOpen(false)
      navigate(appPaths.chat)
    })
  }

  async function openChatHistory(id: string) {
    if (!await history.open(id)) return
    shouldFocusComposer.current = true
    setIsMenuOpen(false)
    navigate(appPaths.chat)
  }

  const sidebar = <AppSidebar onClose={closeSidebar} onNewChat={startNewChat}
    history={history} onOpenHistory={(id) => { void openChatHistory(id) }}
    closeLabel={isMobile ? '메뉴 닫기' : '사이드바 접기'} onNavigate={() => setIsMenuOpen(false)} />

  return (
    <div className={appSidebarStyles.layout}>
      {isMobile ? <dialog ref={dialogRef} aria-label="작업 메뉴" onClose={() => setIsMenuOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) closeSidebar() }}
        className={appSidebarStyles.mobileDialog}>
        {sidebar}
      </dialog> : <div ref={sidebarRef} hidden={isCollapsed}
        className={isCollapsed ? 'hidden' : 'h-full w-[260px] shrink-0'}>
        {sidebar}
      </div>}
      <div className={appSidebarStyles.workspace} ref={workspaceRef}>
        {isMobile || isCollapsed ? <header className={appSidebarStyles.compactHeader} aria-label="작업 메뉴 열기">
          <button ref={menuButtonRef} type="button" className={appSidebarStyles.iconButton}
            aria-label={isMobile ? '메뉴 열기' : '사이드바 펼치기'} title={isMobile ? '메뉴 열기' : '사이드바 펼치기'}
            aria-expanded={isMobile ? isMenuOpen : false} aria-haspopup={isMobile ? 'dialog' : undefined}
            onClick={openSidebar}><SidebarActionIcon name="panel" /></button>
          <Link to={appPaths.chat} className="text-lg font-semibold tracking-tight text-app-ink no-underline">GovBiz</Link>
          <button type="button" className={`${appSidebarStyles.iconButton} ml-auto`} aria-label="지원사업 새검색"
            title="지원사업 새검색" onClick={startNewChat}><SidebarActionIcon name="newChat" /></button>
        </header> : null}
        <Outlet />
      </div>
    </div>
  )
}
