import { afterEach, describe, expect, it, vi } from 'vitest'

import { emptyConversationContext, readyConversationProposal, seoulConversationContext } from '../../fixtures/supportProgramConversation'
import { SupportProgramRepositoryImpl } from '../../repositories/SupportProgramRepositoryImpl'
import { interpretSupportProgramConversationApi } from '../supportProgramApi'
import { SupportProgramRequestError } from '../../../domain/errors/SupportProgramRequestError'

afterEach(() => vi.unstubAllGlobals())

describe('공개 조건 해석 HTTP 경계', () => {
  const command = { message: '서울 SW 사업화', context: emptyConversationContext, pendingClarification: null }
  it('필수 null context 필드를 JSON으로 보내고 제안을 도메인으로 변환한다', async () => {
    const proposal = readyConversationProposal(seoulConversationContext)
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(proposal)))
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal
    await expect(new SupportProgramRepositoryImpl().interpretConversation(command, signal)).resolves.toEqual(proposal)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new URL(url).pathname).toBe('/api/v1/support-programs/conversation/interpret')
    expect(new URL(url).search).toBe('')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual(command)
    expect(init.signal).toBe(signal)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('잘못된 READY와 장애를 정보 부족이나 검색 성공으로 바꾸지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      ...readyConversationProposal(emptyConversationContext),
    }))).mockResolvedValueOnce(new Response('', { status: 503 })))
    await expect(interpretSupportProgramConversationApi(command)).rejects.toThrow()
    await expect(new SupportProgramRepositoryImpl().interpretConversation(command)).rejects.toThrow()
  })

  it('해석도 기존 요청 제한 계약을 안전한 도메인 오류로 전달한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ type: 'urn:limited', title: 'Limited', status: 429,
      detail: 'private', instance: '/api/v1/support-programs/conversation/interpret', code: 'SUPPORT_PROGRAM_RATE_LIMITED', retryAfterSeconds: 10,
    }), { status: 429, headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '10' } })))
    await expect(new SupportProgramRepositoryImpl().interpretConversation(command))
      .rejects.toEqual(new SupportProgramRequestError('rate-limited', 10))
  })

  it('요청 취소를 숨기지 않는다', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })))
    const promise = interpretSupportProgramConversationApi(command, controller.signal)
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})
