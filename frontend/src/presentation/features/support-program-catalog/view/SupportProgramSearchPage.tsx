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
  const hasConversation = useAppSelector(selectConversationCount) > 0
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const select = (filter: boolean) => {
    const next = new URLSearchParams(params)
    if (filter) next.set('mode', 'filter')
    else next.delete('mode')
    setParams(next)
  }
  const handleKey = (event: KeyboardEvent, index: number) => {
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : ['ArrowRight', 'ArrowLeft'].includes(event.key) ? 1 - index : null
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
  const searchTabs = <div role="tablist" aria-label="지원사업 검색 방식" aria-orientation="horizontal"
    className="inline-flex gap-1 rounded-full border border-sample-border bg-white p-1">
    {['AI 대화 검색', '필터 검색'].map((label, index) => <button type="button" key={label} role="tab" id={`search-tab-${index}`}
      ref={(node) => { tabs.current[index] = node }} aria-controls={`search-panel-${index}`} aria-selected={isFilter === (index === 1)}
      tabIndex={isFilter === (index === 1) ? 0 : -1} onKeyDown={(event) => handleKey(event, index)} onClick={() => select(index === 1)}
      className={`min-h-10 cursor-pointer rounded-full px-6 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary max-chat:px-5 ${isFilter === (index === 1) ? 'bg-white text-brand-primary shadow-sm' : 'text-sample-muted hover:text-app-ink'}`}>
      {label}
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

  return isGuest ? <GuestSearchLayout showConversationPanel={hasConversation && !isFilter} searchTabs={searchTabs} onNewChat={startNewChat}>{panels}</GuestSearchLayout>
    : <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 justify-center bg-white px-4 pt-3 pb-2">{searchTabs}</div>
      {panels}
    </div>
}
