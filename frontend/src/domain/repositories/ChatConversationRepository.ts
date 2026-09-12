import type { ChatConversationDetail, ChatConversationPage, ChatConversationSnapshot, ChatConversationSummary } from '../entities/ChatConversation'

export interface ChatConversationRepository {
  list(accountEmail: string, before: number | null, signal?: AbortSignal): Promise<ChatConversationPage>
  get(accountEmail: string, id: string, signal?: AbortSignal): Promise<ChatConversationDetail>
  save(accountEmail: string, id: string, expectedVersion: number, snapshot: ChatConversationSnapshot, signal?: AbortSignal): Promise<ChatConversationSummary>
}
