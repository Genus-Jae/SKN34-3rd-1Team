import { useRef, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import { useSearchParams } from 'react-router'

import { useAppDispatch, useAppSelector } from '../../../../app/hooks'
import { conversationReset, selectConversationCount } from '../../chat/state/chatSlice'
import { ChatPage, type ChatPageLayout } from '../../chat/view/ChatPage'
import { GuestSearchLayout } from './GuestSearchLayout'
import { SupportProgramCatalogPanel } from './SupportProgramCatalogPanel'

/** AI 대화는 탭 전환 시에도 유지하고, 목록 조회는 떠날 때 취소합니다. */
export function SupportProgramSearchPage({ layout = 'landing' }: { layout?: ChatPageLayout }) {
  const [params, setParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const contentRef = useRef<HTMLDivElement>(null)
  const isFilter = params.get('mode') === 'filter'
  const isGuest = layout === 'landing'
  const conversationCount = useAppSelector(selectConversationCount)
  const hasConversation = conversationCount > 0
  const hasGuestSidebar = isGuest && hasConversation
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const select = (filter: boolean) => {
    const next = new URLSearchParams(params)
    if (filter) next.set('mode', 'filter')
    else next.delete('mode')
    setParams(next)
  }
  const handleKey = (event: KeyboardEvent, index: number) => {
    const arrows = hasGuestSidebar ? ['ArrowDown', 'ArrowUp'] : ['ArrowRight', 'ArrowLeft']
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : arrows.includes(event.key) ? 1 - index : null
    if (target === null) return
    event.preventDefault()
    select(target === 1)
    tabs.current[target]?.focus()
  }
  const startNewChat = () => {
    // 같은 ChatPage를 유지하면서 요청 ID도 초기화하므로 진행 중 요청과 늦은 응답을 취소합니다.
    flushSync(() => {
      dispatch(conversationReset())
      select(false)
    })
    contentRef.current?.querySelector<HTMLTextAreaElement>('textarea[aria-label="지원사업 검색어"]')?.focus()
  }
  const searchTabs = <div role="tablist" aria-label="지원사업 검색 방식" aria-orientation={hasGuestSidebar ? 'vertical' : 'horizontal'}
    className={hasGuestSidebar ? 'grid gap-1' : 'inline-flex gap-1 rounded-full border border-sample-border bg-white p-1'}>
    {['AI 대화 검색', '필터 검색'].map((label, index) => <button type="button" key={label} role="tab" id={`search-tab-${index}`}
      ref={(node) => { tabs.current[index] = node }} aria-controls={`search-panel-${index}`} aria-selected={isFilter === (index === 1)}
      tabIndex={isFilter === (index === 1) ? 0 : -1} onKeyDown={(event) => handleKey(event, index)} onClick={() => select(index === 1)}
      className={hasGuestSidebar
        ? `flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-brand-primary ${isFilter === (index === 1) ? 'bg-[#e7eeea] font-medium text-[#165c38]' : 'text-app-ink hover:bg-black/5'}`
        : `min-h-10 cursor-pointer rounded-full px-6 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary max-chat:px-5 ${isFilter === (index === 1) ? 'bg-white text-brand-primary shadow-sm' : 'text-sample-muted hover:text-app-ink'}`}>
      {hasGuestSidebar ? <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {index === 0 ? <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 1 1 19 0ZM7 9h8M7 13h5" />
          : <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6M7 10h6m-3-3v6" /></>}
      </svg> : null}{label}
    </button>)}
  </div>
  const panels = <div ref={contentRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <div role="tabpanel" id="search-panel-0" aria-labelledby="search-tab-0" hidden={isFilter} className={isFilter ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
      <ChatPage layout={layout} />
    </div>
    <div role="tabpanel" id="search-panel-1" aria-labelledby="search-tab-1" hidden={!isFilter} className={!isFilter ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
      {isFilter ? <SupportProgramCatalogPanel /> : null}
    </div>
  </div>

  return isGuest ? <GuestSearchLayout hasConversation={hasConversation} searchTabs={searchTabs} isFilter={isFilter} onNewChat={startNewChat}>{panels}</GuestSearchLayout>
    : <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 justify-center bg-white px-4 pt-3 pb-2">{searchTabs}</div>
      {panels}
    </div>
}
