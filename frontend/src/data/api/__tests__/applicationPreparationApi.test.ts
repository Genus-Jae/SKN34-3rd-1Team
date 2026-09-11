import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApplicationPreparationRepositoryImpl } from '../../repositories/ApplicationPreparationRepositoryImpl'

afterEach(() => vi.unstubAllGlobals())

const form = {
  formVersionId: 'verified-form-v1',
  sourceCode: 'BIZINFO',
  sourceProgramId: 'PBLN_1',
  programTitle: '지원사업',
  formTitle: '사업계획서',
  sourceUrl: 'https://www.bizinfo.go.kr/form',
  attachmentFileName: '사업계획서.hwpx',
  attachmentSha256: 'a'.repeat(64),
  verificationStatus: 'SOURCE_HASH_AND_LOCATORS_VERIFIED',
  institutionReviewed: false,
  supportedServiceFields: ['TECHNICAL_SUPPORT'],
  sections: [{
    key: 'company-overview', title: '기업 개요', locator: 'HWPX paragraph 1', description: '기업을 설명합니다.', status: 'NOT_STARTED',
    fields: [{ key: 'company-name', label: '업체명', guidance: '업체명을 입력합니다.', required: true }], facts: [],
  }],
}
const detail = {
  id: 1,
  inputRevision: 1,
  serviceField: 'TECHNICAL_SUPPORT',
  createdAt: '2026-09-11T00:00:00+09:00',
  updatedAt: '2026-09-11T00:00:00+09:00',
  form,
}
const creation = {
  sourceCode: form.sourceCode,
  sourceProgramId: form.sourceProgramId,
  formVersionId: form.formVersionId,
  serviceField: 'TECHNICAL_SUPPORT' as const,
}

describe('application preparation HTTP boundary', () => {
  it('uses the exact URLs, methods, body, session cookie and no-store options', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ items: [form] }))
      .mockResolvedValueOnce(Response.json({ items: [form], warnings: [], cached: false }))
      .mockResolvedValueOnce(Response.json({ items: [], nextBeforeId: null }))
      .mockResolvedValueOnce(Response.json(detail, { status: 201 }))
      .mockResolvedValueOnce(Response.json(detail))
    vi.stubGlobal('fetch', fetchMock)
    const repository = new ApplicationPreparationRepositoryImpl()
    await repository.forms()
    await repository.discover('BIZINFO', 'PBLN_1')
    await repository.list(20)
    await repository.create(creation)
    await repository.get(1)

    const calls = fetchMock.mock.calls as [string, RequestInit][]
    expect(calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/\/api\/v1\/application-preparations\/forms$/),
      expect.stringMatching(/\/api\/v1\/application-preparations\/forms\/discover$/),
      expect.stringMatching(/\/api\/v1\/application-preparations\?size=20&beforeId=20$/),
      expect.stringMatching(/\/api\/v1\/application-preparations$/),
      expect.stringMatching(/\/api\/v1\/application-preparations\/1$/),
    ])
    expect(calls.map(([, options]) => options.method)).toEqual(['GET', 'POST', 'GET', 'POST', 'GET'])
    for (const [, options] of calls) {
      expect(options).toMatchObject({ credentials: 'include', cache: 'no-store' })
      expect(options.signal).toBeInstanceOf(AbortSignal)
    }
    expect(calls[0]?.[1].body).toBeUndefined()
    expect(JSON.parse(calls[1]?.[1].body as string)).toEqual({ sourceCode: 'BIZINFO', sourceProgramId: 'PBLN_1' })
    expect(calls[3]?.[1].headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(calls[3]?.[1].body as string)).toEqual(creation)
  })

  it('preserves known server errors and converts authentication failures', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'APPLICATION_FORM_NOT_SUPPORTED' }, { status: 422 }))
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 })))
    const repository = new ApplicationPreparationRepositoryImpl()

    await expect(repository.create(creation)).rejects.toMatchObject({
      status: 422,
      code: 'APPLICATION_FORM_NOT_SUPPORTED',
      message: '현재 지원하지 않는 공고·양식·지원 분야입니다.',
    })
    await expect(repository.get(1)).rejects.toMatchObject({
      status: 401,
      message: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
    })
  })

  it('distinguishes an unavailable feature endpoint from a missing owned preparation', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
      .mockResolvedValueOnce(Response.json({ code: 'APPLICATION_PREPARATION_NOT_FOUND' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ code: 'APPLICATION_PREPARATION_NOT_FOUND' }, { status: 404 })))
    const repository = new ApplicationPreparationRepositoryImpl()

    await expect(repository.forms()).rejects.toMatchObject({
      status: 404,
      code: 'APPLICATION_PREPARATION_API_UNAVAILABLE',
      message: expect.stringContaining('Core·AI Service 이미지를 갱신'),
    })
    await expect(repository.list()).rejects.toMatchObject({
      status: 404,
      code: 'APPLICATION_PREPARATION_API_UNAVAILABLE',
    })
    await expect(repository.get(404)).rejects.toMatchObject({
      status: 404,
      code: 'APPLICATION_PREPARATION_NOT_FOUND',
      message: '신청 준비 건을 찾을 수 없습니다.',
    })
  })

  it('rejects malformed JSON, contract violations, mismatched ids and mismatched creation selections', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{', { headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(Response.json({ ...detail, form: { ...form, institutionReviewed: true } }))
      .mockResolvedValueOnce(Response.json({ ...detail, id: 2 }))
      .mockResolvedValueOnce(Response.json({ ...detail, form: { ...form, formVersionId: 'another-form-v1' } })))
    const repository = new ApplicationPreparationRepositoryImpl()

    await expect(repository.get(1)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    await expect(repository.get(1)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    await expect(repository.get(1)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    await expect(repository.create(creation)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it('converts network failures to a safe message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('socket path and host details')))

    await expect(new ApplicationPreparationRepositoryImpl().list()).rejects.toMatchObject({
      status: 0,
      code: 'REQUEST_FAILED',
      message: 'Core API에 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.',
    })
  })

  it('posts interpretation and puts only the confirmed input snapshot', async () => {
    const interpreted = {
      runId: 5,
      inputRevision: 1,
      sectionKey: 'company-overview',
      suggestions: [{ fieldKey: 'company-name', status: 'PROVIDED', value: '새봄테크', evidenceQuote: '새봄테크' }],
      missingFields: [],
      nextQuestion: null,
    }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json(interpreted))
      .mockResolvedValueOnce(Response.json({ ...detail, inputRevision: 2 })))
    const repository = new ApplicationPreparationRepositoryImpl()
    const interpretation = { expectedRevision: 1, requestKey: crypto.randomUUID(), message: '새봄테크' }
    await repository.interpret(1, 'company-overview', interpretation)
    const inputs = { expectedRevision: 1, facts: [{ fieldKey: 'company-name', status: 'PROVIDED' as const, value: '새봄테크', sourceText: '새봄테크' }] }
    await repository.replaceInputs(1, 'company-overview', inputs)

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit][]
    expect(calls.map(([, options]) => options.method)).toEqual(['POST', 'PUT'])
    expect(calls[0]?.[0]).toMatch(/\/1\/sections\/company-overview\/messages$/)
    expect(calls[1]?.[0]).toMatch(/\/1\/sections\/company-overview\/inputs$/)
    expect(JSON.parse(calls[0]?.[1].body as string)).toEqual(interpretation)
    expect(JSON.parse(calls[1]?.[1].body as string)).toEqual(inputs)
  })

  it('propagates cancellation to fetch without converting it to a visible request error', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
    }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    const request = new ApplicationPreparationRepositoryImpl().list(undefined, controller.signal)

    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    const requestSignal = fetchMock.mock.calls[0]?.[1]?.signal
    expect(requestSignal?.aborted).toBe(true)
  })
})
