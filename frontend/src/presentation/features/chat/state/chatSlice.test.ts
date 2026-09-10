import { describe, expect, it } from 'vitest'

import { createAppStore, type AppStore } from '../../../../app/store'
import { emptyConversationContext, readyConversationProposal, seoulConversationContext } from '../../../../data/fixtures/supportProgramConversation'
import { supportPrograms } from '../../../../data/fixtures/supportPrograms'
import type { Account } from '../../../../domain/entities/Account'
import { sessionRestored, signedIn, signedOut } from '../../../shared/auth/state/authSlice'
import {
  conversationReset,
  draftChanged,
  interpretationFailed,
  interpretationStarted,
  interpretationSucceeded,
  proposalConfirmed,
  searchCancelled,
  searchFailed,
  searchStarted,
  searchSucceeded,
  searchTimedOut,
  selectConversationContext,
  selectConversationCount,
} from './chatSlice'

const account: Account = {
  email: 'first@example.test', role: 'USER', tier: 'MEMBER', emailVerified: true, company: null,
}
const otherAccount: Account = { ...account, email: 'second@example.test' }

describe('대화의 로그인 세션 경계', () => {
  it.each([
    ['로그아웃', signedOut()],
    ['다른 계정 로그인', signedIn(otherAccount)],
    ['다른 계정 세션 복원', sessionRestored(otherAccount)],
    ['세션 종료 확인', sessionRestored(null)],
  ] as const)('%s 시 완료된 대화·검색 결과·기업 조건·작성 중 초안을 비운다', (_label, action) => {
    const store = createAppStore()
    store.dispatch(signedIn(account))
    completeSearch(store)
    store.dispatch(draftChanged('아직 보내지 않은 우리 회사의 다음 질문'))
    expect(selectConversationCount(store.getState())).toBe(1)
    expect(store.getState().chat.messages.at(-1)?.programs).toEqual([supportPrograms[0]])
    expect(selectConversationContext(store.getState())).toEqual(seoulConversationContext)

    store.dispatch(action)

    expectClearedConversation(store, store.getState().auth.account?.email ?? null)
  })

  it.each(['검색 실패', '추가 질문', '미확정 제안', '해석 실패'] as const)('로그아웃은 %s 상태와 재시도에 쓰는 이전 요청도 비운다', (phase) => {
    const store = createAppStore()
    store.dispatch(signedIn(account))
    completeSearch(store)
    if (phase === '검색 실패') {
      const started = searchStarted('다음 지원사업')
      store.dispatch(started)
      store.dispatch(searchFailed({ query: '다음 지원사업', requestId: started.payload.requestId, message: '다시 검색해 주세요.' }))
      expect(store.getState().chat.searchStatus).toBe('failed')
    } else {
      const started = interpretationStarted({ message: '설립한 지 2년입니다', context: seoulConversationContext })
      store.dispatch(started)
      if (phase === '추가 질문') {
        store.dispatch(interpretationSucceeded({ requestId: started.payload.requestId, result: {
          status: 'CLARIFICATION_REQUIRED', proposedContext: seoulConversationContext,
          clarificationQuestion: '정확한 설립일을 알려주세요.', changedFields: [],
        } }))
        expect(store.getState().chat.pendingClarification).not.toBeNull()
      } else if (phase === '미확정 제안') {
        store.dispatch(interpretationSucceeded({ requestId: started.payload.requestId,
          result: readyConversationProposal(seoulConversationContext) }))
        expect(store.getState().chat.pendingProposal).not.toBeNull()
      } else {
        store.dispatch(interpretationFailed({ requestId: started.payload.requestId, message: '다시 해석해 주세요.' }))
        expect(store.getState().chat.interpretation.status).toBe('failed')
      }
    }

    store.dispatch(signedOut())

    expectClearedConversation(store, null)
  })

  it('최근 검색 요약은 확정 화면 조건이 아니라 실제 요청의 검색어·조건을 기록한다', () => {
    const store = createAppStore()
    completeSearch(store)
    const search = searchStarted('다른 무역 검색', { acceptingOnly: false, companyConditions: { region: '대구' } })
    store.dispatch(search)
    expect(store.getState().chat.lastSearch).toBeNull()
    store.dispatch(searchSucceeded({ requestId: search.payload.requestId, programs: [] }))
    expect(store.getState().chat.lastSearch).toEqual({ resultCount: 0, context: {
      ...emptyConversationContext, query: '다른 무역 검색', acceptingOnly: false,
      companyConditions: { ...emptyConversationContext.companyConditions, region: '대구' },
    } })
    expect(store.getState().chat.messages.at(-1)).toMatchObject({ searchQuery: '다른 무역 검색',
      searchOptions: { acceptingOnly: false, companyConditions: { region: '대구' } } })
    expect(selectConversationContext(store.getState())).toEqual(seoulConversationContext)
  })

  it('같은 계정의 기업정보 갱신과 세션 재확인은 대화를 유지하며 새 검색도 계정 소유를 유지한다', () => {
    const store = createAppStore()
    store.dispatch(signedIn(account))
    completeSearch(store)
    const previousConversation = store.getState().chat
    const updatedAccount: Account = { ...account, tier: 'COMPANY',
      company: { companyName: '서울 소프트웨어', businessNumber: '1248100998' } }

    store.dispatch(signedIn(updatedAccount))
    expect(store.getState().chat).toBe(previousConversation)
    store.dispatch(sessionRestored(updatedAccount))
    expect(store.getState().chat).toBe(previousConversation)

    store.dispatch(conversationReset())
    expectClearedConversation(store, account.email)
    store.dispatch(draftChanged('새 대화 초안'))
    store.dispatch(signedIn(updatedAccount))
    expect(store.getState().chat.draft).toBe('새 대화 초안')
  })

  it('비로그인 세션 확인은 공개 검색 대화를 유지하고 로그인하면 새 계정의 대화로 시작한다', () => {
    const store = createAppStore()
    store.dispatch(sessionRestored(null))
    completeSearch(store)
    const publicConversation = store.getState().chat

    store.dispatch(sessionRestored(null))
    expect(store.getState().chat).toBe(publicConversation)
    store.dispatch(signedIn(account))
    expectClearedConversation(store, account.email)
  })

  it.each([false, true])('로그아웃 전 검색 응답은 초기화된 상태나 새 계정의 검색을 되살리거나 덮어쓰지 않는다 (새 검색: %s)', (startNextSearch) => {
    const store = createAppStore()
    store.dispatch(signedIn(account))
    const oldSearch = searchStarted('이전 계정 검색')
    store.dispatch(oldSearch)
    store.dispatch(signedOut())
    expectClearedConversation(store, null)
    const nextSearch = searchStarted('새 계정 검색')
    if (startNextSearch) {
      store.dispatch(signedIn(otherAccount))
      store.dispatch(nextSearch)
    }
    const nextState = store.getState().chat
    const oldRequest = { query: oldSearch.payload.query, requestId: oldSearch.payload.requestId }

    store.dispatch(searchSucceeded({ requestId: oldRequest.requestId, programs: [supportPrograms[0]] }))
    store.dispatch(searchFailed({ ...oldRequest, message: '이전 계정의 오류' }))
    store.dispatch(searchTimedOut(oldRequest))
    store.dispatch(searchCancelled(oldRequest))

    expect(store.getState().chat).toBe(nextState)
    if (startNextSearch) {
      store.dispatch(searchSucceeded({ requestId: nextSearch.payload.requestId, programs: [supportPrograms[1]] }))
      expect(store.getState().chat.messages.at(-1)?.programs).toEqual([supportPrograms[1]])
    }
  })

  it.each([false, true])('로그아웃 전 해석의 성공·실패 응답은 초기화된 상태나 새 계정의 해석에 반영하지 않는다 (새 해석: %s)', (startNextInterpretation) => {
    const store = createAppStore()
    store.dispatch(signedIn(account))
    const oldInterpretation = interpretationStarted({ message: '이전 회사 조건', context: emptyConversationContext })
    store.dispatch(oldInterpretation)
    store.dispatch(signedOut())
    expectClearedConversation(store, null)
    const nextInterpretation = interpretationStarted({ message: '새 회사 조건', context: emptyConversationContext })
    if (startNextInterpretation) {
      store.dispatch(signedIn(otherAccount))
      store.dispatch(nextInterpretation)
    }
    const nextState = store.getState().chat

    store.dispatch(interpretationSucceeded({ requestId: oldInterpretation.payload.requestId,
      result: readyConversationProposal(seoulConversationContext) }))
    store.dispatch(interpretationFailed({ requestId: oldInterpretation.payload.requestId, message: '이전 회사의 오류' }))

    expect(store.getState().chat).toBe(nextState)
    if (startNextInterpretation) {
      store.dispatch(interpretationSucceeded({ requestId: nextInterpretation.payload.requestId,
        result: readyConversationProposal({ ...emptyConversationContext, query: '새 회사 지원사업' }) }))
      expect(store.getState().chat.interpretation.result?.proposedContext.query).toBe('새 회사 지원사업')
    }
  })
})

function completeSearch(store: AppStore) {
  const interpretation = interpretationStarted({ message: '서울 SW 사업화 지원', context: emptyConversationContext })
  store.dispatch(interpretation)
  store.dispatch(interpretationSucceeded({ requestId: interpretation.payload.requestId,
    result: readyConversationProposal(seoulConversationContext) }))
  store.dispatch(proposalConfirmed(interpretation.payload.requestId))
  const search = searchStarted(seoulConversationContext.query!, store.getState().chat.searchOptions, interpretation.payload.messageId)
  store.dispatch(search)
  store.dispatch(searchSucceeded({ requestId: search.payload.requestId, programs: [supportPrograms[0]] }))
}

function expectClearedConversation(store: AppStore, accountEmail: string | null) {
  const fresh = createAppStore().getState().chat
  expect(store.getState().chat).toEqual({
    ...fresh,
    accountEmail,
    messages: [{ ...fresh.messages[0], id: expect.any(String) }],
  })
  expect(selectConversationCount(store.getState())).toBe(0)
  expect(selectConversationContext(store.getState())).toEqual(emptyConversationContext)
}
