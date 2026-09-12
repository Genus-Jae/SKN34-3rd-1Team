import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from 'react-redux'
import { appContainer } from '../../../../app/appContainer'
import type { AppStore } from '../../../../app/store'
import { useAppSelector } from '../../../../app/hooks'
import type { ChatConversationSnapshot, ChatConversationSummary } from '../../../../domain/entities/ChatConversation'
import type { ChatConversationUseCase } from '../../../../domain/usecases/ChatConversationUseCase'
import { selectCurrentAccount } from '../../../shared/auth/state/authSlice'
import { conversationHistoryOpened, createChatConversationSnapshot } from '../state/chatSlice'

type Entry = { snapshot: ChatConversationSnapshot; signature: string; saved: string | null; version: number; saving: boolean; error: boolean }
type Session = {
  email: string; alive: boolean; entries: Map<string, Entry>; controllers: Set<AbortController>
  opening: AbortController | null; listing: boolean
}
type HistoryState = { email: string | null; items: ChatConversationSummary[]; nextCursor: number | null;
  loading: boolean; openingId: string | null; loadError: string | null; saveError: boolean; saving: boolean }
const initialHistory: HistoryState = { email: null, items: [], nextCursor: null, loading: false,
  openingId: null, loadError: null, saveError: false, saving: false }

/** 로그인 작업 화면에서만 구독합니다. 대화별 저장을 순서대로 보내고 계정 변경 시 요청·메모리를 함께 폐기합니다. */
export function useChatHistory(useCase: Pick<ChatConversationUseCase, 'list' | 'get' | 'save'> = appContainer.resolve('chatConversationUseCase')) {
  const store = useStore() as AppStore
  const email = useAppSelector(selectCurrentAccount)?.email ?? null
  const activeId = useAppSelector((state) => state.chat.messages.find((message) => message.role === 'user')?.id ?? null)
  const [state, setState] = useState<HistoryState>(initialHistory)
  const session = useRef<Session | null>(null)

  const isCurrent = useCallback((current: Session) => {
    const auth = store.getState().auth
    return current.alive && session.current === current && auth.status === 'authenticated' && auth.account?.email === current.email
  }, [store])
  const update = useCallback((current: Session, change: (previous: HistoryState) => HistoryState) => {
    if (isCurrent(current)) setState((previous) => previous.email === current.email ? change(previous) : previous)
  }, [isCurrent])
  const updateSaveState = useCallback((current: Session) => {
    update(current, (previous) => ({ ...previous,
      saving: [...current.entries.values()].some((entry) => entry.saving),
      saveError: [...current.entries.values()].some((entry) => entry.error),
    }))
  }, [update])
  const save = useCallback(async function saveEntry(current: Session, id: string, entry: Entry) {
    if (!isCurrent(current) || entry.saving || entry.error || entry.saved === entry.signature) return
    entry.saving = true
    updateSaveState(current)
    const controller = new AbortController()
    current.controllers.add(controller)
    const signature = entry.signature
    try {
      const summary = await useCase.save(current.email, id, entry.version, entry.snapshot, controller.signal)
      if (!isCurrent(current) || controller.signal.aborted) return
      entry.version = summary.version
      entry.saved = signature
      update(current, (previous) => ({ ...previous, items: previous.items.map((item) => item.id === id ? summary : item) }))
    } catch {
      if (isCurrent(current) && !controller.signal.aborted) entry.error = true
    } finally {
      current.controllers.delete(controller)
      entry.saving = false
      updateSaveState(current)
      // 이전 저장 중에 도착한 답변·조건 변경은 최신 스냅샷으로 이어서 저장합니다.
      if (isCurrent(current) && !entry.error && entry.saved !== entry.signature) void saveEntry(current, id, entry)
    }
  }, [isCurrent, update, updateSaveState, useCase])
  const capture = useCallback((current: Session) => {
    if (!isCurrent(current)) return
    const chat = store.getState().chat
    if (chat.accountEmail !== current.email) return
    const question = chat.messages.find((message) => message.role === 'user')
    if (!question) return
    const snapshot = createChatConversationSnapshot(chat)
    const signature = JSON.stringify(snapshot)
    let entry = current.entries.get(question.id)
    if (entry?.signature === signature) return
    if (entry) { entry.snapshot = snapshot; entry.signature = signature }
    else {
      entry = { snapshot, signature, saved: null, version: 0, saving: false, error: false }
      current.entries.set(question.id, entry)
      const summary = { id: question.id, title: Array.from(question.text.trim().replace(/\s+/g, ' ')).slice(0, 80).join(''), version: 0, updatedAt: '' }
      update(current, (previous) => ({ ...previous, items: [summary, ...previous.items.filter((item) => item.id !== question.id)] }))
    }
    void save(current, question.id, entry)
  }, [isCurrent, save, store, update])
  const load = useCallback(async (current: Session, before: number | null) => {
    if (!isCurrent(current) || current.listing) return
    current.listing = true
    update(current, (previous) => ({ ...previous, loading: true, loadError: null }))
    const controller = new AbortController()
    current.controllers.add(controller)
    try {
      const page = await useCase.list(current.email, before, controller.signal)
      if (!isCurrent(current) || controller.signal.aborted) return
      update(current, (previous) => ({ ...previous, nextCursor: page.nextCursor,
        items: [...previous.items, ...page.items.filter((item) => !previous.items.some((existing) => existing.id === item.id))] }))
    } catch {
      update(current, (previous) => ({ ...previous, loadError: '대화 기록을 불러오지 못했습니다. 다시 시도해 주세요.' }))
    } finally {
      current.controllers.delete(controller)
      current.listing = false
      update(current, (previous) => ({ ...previous, loading: false }))
    }
  }, [isCurrent, update, useCase])

  useEffect(() => {
    if (!email) return
    const current: Session = { email, alive: true, entries: new Map(), controllers: new Set(), opening: null, listing: false }
    session.current = current
    setState({ ...initialHistory, email })
    // StrictMode의 첫 setup/cleanup은 실제 HTTP 요청 전에 취소됩니다.
    void Promise.resolve().then(() => { if (isCurrent(current)) { capture(current); void load(current, null) } })
    const unsubscribe = store.subscribe(() => capture(current))
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (isCurrent(current) && [...current.entries.values()].some((entry) => entry.saved !== entry.signature)) {
        event.preventDefault(); event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warnUnsaved)
    return () => {
      current.alive = false
      unsubscribe()
      current.controllers.forEach((controller) => controller.abort())
      current.opening?.abort()
      current.entries.clear()
      window.removeEventListener('beforeunload', warnUnsaved)
    }
    // 세션 수명에 연결하고 store 구독은 현재 Redux 상태를 직접 읽습니다.
  }, [email, store, capture, isCurrent, load])

  const cancelOpening = useCallback(() => {
    const current = session.current
    current?.opening?.abort()
    if (current) { current.opening = null; update(current, (previous) => ({ ...previous, openingId: null })) }
  }, [update])
  async function open(id: string): Promise<boolean> {
    const current = session.current
    if (!current || !isCurrent(current)) return false
    cancelOpening()
    if (store.getState().chat.messages.find((message) => message.role === 'user')?.id === id) return true
    capture(current)
    const previousChat = store.getState().chat
    const cached = current.entries.get(id)
    // 미저장 답변은 서버의 이전 버전으로 덮지 않고 현재 창에서 그대로 다시 엽니다.
    if (cached) {
      store.dispatch(conversationHistoryOpened({ accountEmail: current.email, snapshot: cached.snapshot }))
      return true
    }
    const controller = new AbortController()
    current.opening = controller
    update(current, (previous) => ({ ...previous, openingId: id, loadError: null }))
    try {
      const detail = await useCase.get(current.email, id, controller.signal)
      if (!isCurrent(current) || controller.signal.aborted || store.getState().chat !== previousChat) return false
      const signature = JSON.stringify(detail.snapshot)
      current.entries.set(id, { snapshot: detail.snapshot, signature, saved: signature, version: detail.conversation.version, saving: false, error: false })
      store.dispatch(conversationHistoryOpened({ accountEmail: current.email, snapshot: detail.snapshot }))
      return true
    } catch {
      if (!controller.signal.aborted) update(current, (previous) => ({ ...previous, loadError: '선택한 대화를 불러오지 못했습니다. 기록을 다시 눌러 주세요.' }))
      return false
    } finally {
      if (current.opening === controller) {
        current.opening = null
        update(current, (previous) => ({ ...previous, openingId: null }))
      }
    }
  }
  function retrySave() {
    const current = session.current
    if (!current || !isCurrent(current)) return
    current.entries.forEach((entry, id) => { entry.error = false; void save(current, id, entry) })
    updateSaveState(current)
  }
  const visible = state.email === email ? state : initialHistory
  return { ...visible, activeId, open, cancelOpening, retrySave,
    loadMore: () => { const current = session.current; if (current) void load(current, visible.nextCursor) } }
}

export type ChatHistoryViewModel = ReturnType<typeof useChatHistory>
