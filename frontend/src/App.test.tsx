// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { appContainer } from './app/appContainer'
import { createAppStore } from './app/store'
import { conditionMatchedProgram, relocationReviewRequiredProgram, supportPrograms } from './data/fixtures/supportPrograms'
import type { SupportProgramSearchReadiness } from './domain/entities/SupportProgramSearchReadiness'
import { supportProgramEvidenceQuestionTimeoutMilliseconds } from './presentation/features/support-program-detail/viewmodel/useSupportProgramEvidenceQuestionViewModel'

vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({
  CoreApiConnectionStatus: () => null,
}))

const readinessHookMock = vi.hoisted(() => ({
  useSupportProgramSearchReadiness: vi.fn(),
}))

vi.mock('./presentation/features/chat/hooks/useSupportProgramSearchReadiness', () => (
  readinessHookMock
))

beforeEach(() => {
  readinessHookMock.useSupportProgramSearchReadiness.mockReturnValue(
    createReadinessHook(),
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('App navigation', () => {
  it('서울 조건 검색에서 전국 태그·경북 이전 확인 필요 공고를 조건 확인과 분리하고 상세 복귀 시 판정을 보존한다', async () => {
    const latest = { ...supportPrograms[3], recommendationScore: null }
    const programs = [relocationReviewRequiredProgram, conditionMatchedProgram, supportPrograms[1], latest]
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ query: '사업화', programs }))
      .mockResolvedValueOnce(jsonResponse({ ...conditionMatchedProgram, eligibilityReview: null, recommendationScore: null, matchedReasons: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const store = createAppStore()
    renderApp(store)
    fireEvent.click(screen.getByText('기업 조건 입력·수정 (선택)'))
    fireEvent.change(screen.getByLabelText('현재 소재지'), { target: { value: '서울' } })
    fireEvent.change(screen.getByLabelText('업종'), { target: { value: '소프트웨어 개발업' } })
    fireEvent.change(screen.getByLabelText('설립일'), { target: { value: '2024-02-29' } })
    fireEvent.click(screen.getByRole('button', { name: '조건 적용' }))
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(input, { target: { value: '사업화' } })
    fireEvent.submit(input.closest('form')!)

    const matchedSection = await screen.findByRole('region', { name: '조건 확인 공고' })
    const reviewSection = screen.getByRole('region', { name: '확인 필요 공고' })
    expect(within(matchedSection).getByRole('heading', { name: conditionMatchedProgram.title })).toBeTruthy()
    expect(within(matchedSection).queryByRole('heading', { name: relocationReviewRequiredProgram.title })).toBeNull()
    expect(within(reviewSection).getByRole('heading', { name: relocationReviewRequiredProgram.title })).toBeTruthy()
    expect(within(reviewSection).getByRole('heading', { name: supportPrograms[1].title })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: '최신 공고' })).getByRole('heading', { name: latest.title })).toBeTruthy()
    const relocationCard = getProgramCard(relocationReviewRequiredProgram.title)
    expect(within(relocationCard).getByText('지역 · 확인 필요')).toBeTruthy()
    expect(within(relocationCard).getByText('서울 소재지만 확인되었으며 경북 이전 의향은 확인되지 않았습니다.')).toBeTruthy()
    expect(relocationCard.querySelector('blockquote')?.textContent).toBe('소프트웨어 개발업 창업 7년 이내 중소기업')
    expect(Array.from(relocationCard.querySelectorAll('blockquote')).map((quote) => quote.textContent))
      .toContain('선정 후 경북으로 본사를 이전하는 창업기업을 지원합니다.')
    expect(within(relocationCard).getByText('관련도 99점 · 자격 충족 확률이 아닙니다.')).toBeTruthy()
    expect(within(relocationCard).getByText('전국 사업')).toBeTruthy()
    expect(relocationCard.textContent).not.toContain('✓')
    expect(relocationCard.textContent).not.toContain('AI 추천')
    expect(within(relocationCard).getByText(/기업마당 등 공식 API 본문 기준 · 첨부파일 미검증/)).toBeTruthy()
    expect(within(getProgramCard(supportPrograms[1].title)).getByText('자격 판정 없음 · 확인 필요')).toBeTruthy()
    expect(screen.getByRole('status').textContent)
      .toBe('지원사업 검색 결과 4건: 조건 확인 공고 1건, 확인 필요 공고 2건, 최신 공고 1건(자격 미평가)을 표시했습니다.')
    expect(store.getState().chat.messages.at(-1)?.text).toContain('조건 확인 공고 1건, 확인 필요 공고 2건')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      query: '사업화', acceptingOnly: true,
      companyConditions: { region: '서울', industry: '소프트웨어 개발업', establishedOn: '2024-02-29' },
    })

    fireEvent.change(screen.getByLabelText('현재 소재지'), { target: { value: '부산' } })
    fireEvent.click(screen.getByRole('button', { name: '조건 적용' }))
    expect(screen.getByText(/검색 당시 조건: 접수 중만 · 현재 소재지 서울/)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fireEvent.click(within(getProgramCard(conditionMatchedProgram.title)).getByRole('link', { name: '상세 조건 보기' }))
    await screen.findByText('자격 미평가 · 공고 상세 정보')
    expect(screen.getByText(/상세 조회는 검색 당시 기업 조건으로 자격을 다시 평가하지 않습니다/)).toBeTruthy()
    expect(screen.queryByText('조건 확인 · API 본문 기준')).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' }))
    expect(within(screen.getByRole('region', { name: '조건 확인 공고' })).getByRole('heading', { name: conditionMatchedProgram.title })).toBeTruthy()
    expect(screen.getByText(/검색 당시 조건: 접수 중만 · 현재 소재지 서울/)).toBeTruthy()
    expect(store.getState().chat.searchOptions.companyConditions?.region).toBe('부산')
    expect(store.getState().chat.messages.at(-1)?.programs?.[1]?.eligibilityReview)
      .toEqual(conditionMatchedProgram.eligibilityReview)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('근거가 없는 UNKNOWN을 표시하고 API 본문 인용의 HTML을 실행하지 않는다', async () => {
    const quote = '<img src=x onerror=alert(1)>'
    const program = {
      ...relocationReviewRequiredProgram,
      summary: quote,
      eligibilityReview: {
        ...relocationReviewRequiredProgram.eligibilityReview!,
        target: {
          ...relocationReviewRequiredProgram.eligibilityReview!.target,
          evidence: [{ field: 'SUMMARY', quote }],
        },
        region: { status: 'UNKNOWN', explanation: '현재 소재지에 적용할 지역 조건의 근거가 없습니다.', evidence: [] },
      },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ query: '사업화', programs: [program] })))
    renderApp(createAppStore())
    const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(input, { target: { value: '사업화' } })
    fireEvent.submit(input.closest('form')!)
    await screen.findByRole('region', { name: '확인 필요 공고' })
    const card = getProgramCard(program.title)
    expect(card.querySelector('blockquote')?.textContent).toBe(quote)
    expect(card.querySelector('img')).toBeNull()
    expect(within(card).getByText('확인 가능한 본문 인용 없음')).toBeTruthy()
    expect(screen.queryByRole('region', { name: '조건 확인 공고' })).toBeNull()
  })

  it('기업 조건을 명시적으로 적용·수정·해제하고 접수 상태와 함께 검색 JSON에 보낸다', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ query: '지원금', programs: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const store = createAppStore()
    renderApp(store)
    fireEvent.click(screen.getByText('기업 조건 입력·수정 (선택)'))
    expect(screen.getByText(/입력한 조건은 AI 추천에 사용되므로 개인정보·비밀정보는 입력하지 마세요/)).toBeTruthy()
    const region = screen.getByLabelText('현재 소재지') as HTMLInputElement
    const industry = screen.getByLabelText('업종') as HTMLInputElement
    const establishedOn = screen.getByLabelText('설립일')
    const purpose = screen.getByLabelText('지원 목적')
    fireEvent.change(region, { target: { value: ' 서울 ' } })
    fireEvent.change(industry, { target: { value: '소프트웨어 개발업' } })
    fireEvent.change(establishedOn, { target: { value: '2024-02-29' } })
    fireEvent.change(purpose, { target: { value: '사업화' } })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '현재 소재지 조건 해제' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '조건 적용' }))
    expect(screen.getByRole('button', { name: '현재 소재지 조건 해제' })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    const searchInput = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(searchInput, { target: { value: '지원금' } })
    await act(async () => fireEvent.submit(searchInput.closest('form')!))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      query: '지원금', acceptingOnly: true,
      companyConditions: { region: '서울', industry: '소프트웨어 개발업', establishedOn: '2024-02-29', supportPurpose: '사업화' },
    })

    fireEvent.change(region, { target: { value: '부산' } })
    fireEvent.click(screen.getByRole('button', { name: '조건 적용' }))
    fireEvent.click(screen.getByRole('button', { name: '업종 조건 해제' }))
    fireEvent.change(screen.getByRole('combobox', { name: '접수 상태' }), { target: { value: 'all' } })
    fireEvent.change(searchInput, { target: { value: '서울 지원금' } })
    await act(async () => fireEvent.submit(searchInput.closest('form')!))
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      query: '서울 지원금', acceptingOnly: false,
      companyConditions: { region: '부산', establishedOn: '2024-02-29', supportPurpose: '사업화' },
    })
    expect(screen.getByText(/검색 당시 조건: 접수 중만 · 현재 소재지 서울/)).toBeTruthy()
    expect(screen.getByText(/검색 당시 조건: 접수 상태 전체 · 현재 소재지 부산/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '조건 전체 초기화' }))
    expect(region.value).toBe('')
    expect(industry.value).toBe('')
    fireEvent.change(searchInput, { target: { value: '지원금' } })
    await act(async () => fireEvent.submit(searchInput.closest('form')!))
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)))
      .toEqual({ query: '지원금', acceptingOnly: true })
    expect(store.getState().chat.searchStatus).toBe('idle')

    fireEvent.change(region, { target: { value: '제주' } })
    fireEvent.click(screen.getByRole('button', { name: '조건 적용' }))
    fireEvent.click(screen.getByRole('button', { name: /새 대화 시작/ }))
    expect(region.value).toBe('')
    expect(screen.queryByText(/검색 당시 조건:/)).toBeNull()
    expect(store.getState().chat.searchOptions).toEqual({ acceptingOnly: true })
  })

  it('준비 상태와 오류 안내가 있어도 검색·취소 버튼을 입력창 안에 배치한다', async () => {
    let rejectSearch!: (reason: Error) => void
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((_resolve, reject) => {
      rejectSearch = reject
    }))
    vi.stubGlobal('fetch', fetchMock)
    renderApp(createAppStore())

    const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
    const inputGroup = input.parentElement!
    const notice = document.getElementById('support-program-search-readiness')!
    expect(inputGroup.classList.contains('relative')).toBe(true)
    expect(inputGroup.contains(notice)).toBe(false)
    expect(screen.getByRole('button', { name: '검색 전송' }).parentElement).toBe(inputGroup)

    fireEvent.change(input, { target: { value: '서울 AI' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByRole('button', { name: '취소' }).parentElement).toBe(inputGroup)

    await act(async () => rejectSearch(new Error('network failure')))
    const error = await screen.findByRole('alert')
    expect(inputGroup.contains(error)).toBe(false)
    expect(screen.getByRole('button', { name: '검색 전송' }).parentElement).toBe(inputGroup)
  })

  it('두 예제의 상태 수명과 Redux의 production DI·HTTP 흐름을 비교한다', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as {
        item: { category: string | null; name: string; note: string | null }
      }

      return new Response(JSON.stringify({
        item: request.item,
        phase: 'READY_FOR_PROCESSING',
        processing: { status: 'NOT_STARTED' },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const appStore = createAppStore()

    expect(Object.keys(appStore.getState())).toEqual(['chat', 'sampleItem'])

    renderApp(appStore)

    expect(screen.getByRole('heading', { name: 'GovBiz에게 물어보세요' })).toBeTruthy()
    const chatInput = screen.getByPlaceholderText('예: 서울에서 AI 창업지원 사업을 찾아줘')
    fireEvent.change(chatInput, { target: { value: '서울 AI 지원사업' } })

    fireEvent.click(screen.getByRole('link', { name: /상태관리 비교 예제/ }))

    expect(screen.getByRole('heading', { name: '재사용 가능한 수직 슬라이스' })).toBeTruthy()

    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: 'Hook에서만 유지되는 입력' },
    })

    fireEvent.click(screen.getByRole('link', { name: 'Redux Toolkit 버전' }))
    expect(screen.getByRole('heading', { name: 'Redux 기반 수직 슬라이스' })).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: 'Redux에 유지되는 입력' },
    })

    fireEvent.click(screen.getByRole('link', { name: 'React Hook 버전' }))
    expect(screen.getByRole('heading', { name: '재사용 가능한 수직 슬라이스' })).toBeTruthy()
    expect((screen.getByRole('textbox', { name: '이름' }) as HTMLInputElement).value).toBe('')

    fireEvent.click(screen.getByRole('link', { name: 'Redux Toolkit 버전' }))
    expect((screen.getByRole('textbox', { name: '이름' }) as HTMLInputElement).value).toBe(
      'Redux에 유지되는 입력',
    )

    await waitFor(() => {
      expect((screen.getByRole('button', { name: '준비 상태 확인' }) as HTMLButtonElement).disabled)
        .toBe(false)
    })
    fireEvent.click(screen.getByRole('button', { name: '준비 상태 확인' }))

    await screen.findByText('✓ Redux Store에 요청 성공 저장')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/api\/v1\/sample-items\/prepare$/)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      item: {
        category: null,
        name: 'Redux에 유지되는 입력',
        note: null,
      },
    })

    fireEvent.click(screen.getByRole('link', { name: 'React Hook 버전' }))
    fireEvent.click(screen.getByRole('link', { name: 'Redux Toolkit 버전' }))
    expect(screen.getByText('✓ Redux Store에 요청 성공 저장')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Redux 상태 초기화' }))
    expect((screen.getByRole('textbox', { name: '이름' }) as HTMLInputElement).value).toBe('')
    expect(screen.queryByText('✓ Redux Store에 요청 성공 저장')).toBeNull()
    expect((screen.getByRole('button', { name: '준비 상태 확인' }) as HTMLButtonElement).disabled)
      .toBe(true)

    fireEvent.click(screen.getByRole('link', { name: /지원사업 채팅으로 돌아가기/ }))

    expect(screen.getByRole('heading', { name: 'GovBiz에게 물어보세요' })).toBeTruthy()
    expect(
      (screen.getByPlaceholderText('예: 서울에서 AI 창업지원 사업을 찾아줘') as HTMLTextAreaElement)
        .value,
    ).toBe('서울 AI 지원사업')
  })

  it.each([
    ['/examples/sample-item/hook', '재사용 가능한 수직 슬라이스'],
    ['/examples/sample-item/redux', 'Redux 기반 수직 슬라이스'],
  ])('%s URL로 직접 진입한다', (path, heading) => {
    renderApp(createAppStore(), path)

    expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
  })

  it('검색 결과의 상세 조건 보기는 URL 기반 API 조회 화면으로 연결한다', async () => {
    const detail = { ...supportPrograms[0], matchedReasons: [], recommendationScore: null }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        query: '서울 AI',
        programs: [supportPrograms[0]],
      }))
      .mockResolvedValueOnce(jsonResponse(detail))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    const chatInput = screen.getByPlaceholderText('예: 서울에서 AI 창업지원 사업을 찾아줘')
    fireEvent.change(chatInput, { target: { value: '서울 AI' } })
    fireEvent.submit(chatInput.closest('form')!)

    const detailLink = await screen.findByRole('link', { name: '상세 조건 보기' })
    fireEvent.click(detailLink)

    await screen.findByRole('heading', { name: supportPrograms[0].title })
    expect(screen.getByText('서울 소재 창업 7년 이내 중소기업')).toBeTruthy()
    expect(screen.getByText('접수 중')).toBeTruthy()
    expect(screen.queryByText('이 공고를 추천한 이유')).toBeNull()

    const detailRequestUrl = new URL(String(fetchMock.mock.calls[1]?.[0]))
    expect(detailRequestUrl.pathname).toBe('/api/v1/support-programs/detail')
    expect(detailRequestUrl.searchParams.get('sourceCode')).toBe(supportPrograms[0].sourceCode)
    expect(detailRequestUrl.searchParams.get('sourceProgramId')).toBe(supportPrograms[0].id)

    const sourceLink = screen.getByRole('link', { name: /GovBiz 샘플 데이터 원문 보기/ })
    expect(sourceLink.getAttribute('href')).toBe(supportPrograms[0].sourceUrl)
    expect(sourceLink.getAttribute('target')).toBe('_blank')
    expect(sourceLink.getAttribute('rel')).toBe('noreferrer')

    fireEvent.click(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' }))
    expect(screen.getByRole('heading', { name: 'GovBiz에게 물어보세요' })).toBeTruthy()
  })

  it('상세에서 별도 질문 페이지로 이동하고 질문 제출 후에만 원문 근거 답변과 링크를 표시한다', async () => {
    const detail = { ...supportPrograms[0], matchedReasons: [], recommendationScore: null }
    const evidenceAnswer = {
      answer: '서울 소재 창업 7년 이내 중소기업이 신청 대상입니다.',
      answerStatus: 'ANSWERED',
      citations: [{
        excerpt: `${'공고 안내입니다. '.repeat(70)}\n지원 대상은 서울 소재 창업 7년 이내 중소기업입니다.`,
        sourceUrl: detail.sourceUrl,
        chunkOrder: 0,
      }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockResolvedValueOnce(jsonResponse(evidenceAnswer))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(
      createAppStore(),
      `/support-programs/detail?sourceCode=${detail.sourceCode}&sourceProgramId=${detail.id}`,
    )

    await screen.findByRole('heading', { name: detail.title })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(screen.queryByRole('textbox', { name: '공고 원문에 질문하기' })).toBeNull()

    const questionLink = screen.getByRole('link', { name: '이 공고에 질문하기' })
    const questionUrl = new URL(questionLink.getAttribute('href')!, 'http://localhost')
    expect(questionUrl.pathname).toBe('/support-programs/detail/question')
    expect(questionUrl.searchParams.get('sourceCode')).toBe(detail.sourceCode)
    expect(questionUrl.searchParams.get('sourceProgramId')).toBe(detail.id)
    fireEvent.click(questionLink)

    expect(screen.getByRole('heading', { name: '이 공고에 질문하기', level: 1 })).toBeTruthy()
    expect(screen.getByRole('link', { name: '← 공고 상세로 돌아가기' })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledOnce()

    const question = screen.getByRole('textbox', { name: '공고 원문에 질문하기' })
    expect(screen.getByRole('button', { name: '질문하고 근거 받기' })).toBeTruthy()
    fireEvent.change(question, { target: { value: '신청 대상은 누구인가요?' } })
    fireEvent.submit(question.closest('form')!)

    await screen.findByText(evidenceAnswer.answer)
    const requestUrl = new URL(String(fetchMock.mock.calls[1]?.[0]))
    expect(requestUrl.pathname).toBe('/api/v1/support-programs/detail/answers')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      sourceCode: detail.sourceCode,
      sourceProgramId: detail.id,
      question: '신청 대상은 누구인가요?',
    })

    const citationLink = screen.getByRole('link', { name: '근거 1 원문 보기 ↗' })
    expect(citationLink.getAttribute('href')).toBe(detail.sourceUrl)
    expect(citationLink.getAttribute('target')).toBe('_blank')
    expect(citationLink.getAttribute('rel')).toBe('noreferrer')
    expect(citationLink.closest('li')?.querySelector('blockquote')?.textContent)
      .toBe(evidenceAnswer.citations[0].excerpt)
  })

  it('K-Startup 상세에서는 원문 링크를 유지하고 질문 입력이나 근거 답변 HTTP 요청을 만들지 않는다', async () => {
    const detail = {
      ...supportPrograms[0], sourceCode: 'KSTARTUP', sourceName: 'K-Startup',
      sourceUrl: 'https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do',
      matchedReasons: [], recommendationScore: null,
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(detail))
    vi.stubGlobal('fetch', fetchMock)
    renderApp(createAppStore(), `/support-programs/detail?sourceCode=KSTARTUP&sourceProgramId=${detail.id}`)

    await screen.findByRole('heading', { name: detail.title })
    expect(screen.getByText('이 제공처 공고는 아직 원문 근거 답변을 지원하지 않습니다. 원문 공고에서 확인해 주세요.'))
      .toBeTruthy()
    expect(screen.queryByRole('textbox', { name: '공고 원문에 질문하기' })).toBeNull()
    expect(screen.queryByRole('button', { name: '질문하고 근거 받기' })).toBeNull()
    expect(screen.queryByRole('link', { name: '이 공고에 질문하기' })).toBeNull()
    expect(screen.getByRole('link', { name: 'K-Startup 원문 보기 ↗' }).getAttribute('href')).toBe(detail.sourceUrl)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname).toBe('/api/v1/support-programs/detail')
  })

  it('질문 URL로 직접 진입하면 자동 조회 없이 특수문자 식별자로 질문하고 같은 공고 상세로 돌아간다', async () => {
    const detail = {
      ...supportPrograms[0],
      id: 'fixture%20/공고?종류=AI&사업=창업+수출',
      matchedReasons: [],
      recommendationScore: null,
    }
    const answer = {
      answer: '지원 대상은 중소기업입니다.',
      answerStatus: 'ANSWERED',
      citations: [{ excerpt: '중소기업 지원사업', sourceUrl: detail.sourceUrl, chunkOrder: 0 }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(answer))
      .mockResolvedValueOnce(jsonResponse(detail))
    vi.stubGlobal('fetch', fetchMock)

    await act(async () => {
      renderApp(
        createAppStore(),
        `/support-programs/detail/question?sourceCode=${encodeURIComponent(detail.sourceCode)}&sourceProgramId=${encodeURIComponent(detail.id)}`,
      )
    })

    expect(screen.getByRole('heading', { name: '이 공고에 질문하기', level: 1 })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    const backLink = screen.getByRole('link', { name: '← 공고 상세로 돌아가기' })
    const backUrl = new URL(backLink.getAttribute('href')!, 'http://localhost')
    expect(backUrl.pathname).toBe('/support-programs/detail')
    expect(backUrl.searchParams.get('sourceCode')).toBe(detail.sourceCode)
    expect(backUrl.searchParams.get('sourceProgramId')).toBe(detail.id)

    const question = screen.getByRole('textbox', { name: '공고 원문에 질문하기' })
    fireEvent.change(question, { target: { value: '지원 대상은 누구인가요?' } })
    fireEvent.submit(question.closest('form')!)

    await screen.findByText(answer.answer)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname)
      .toBe('/api/v1/support-programs/detail/answers')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      sourceCode: detail.sourceCode,
      sourceProgramId: detail.id,
      question: '지원 대상은 누구인가요?',
    })

    fireEvent.click(backLink)
    await screen.findByRole('heading', { name: detail.title })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const detailRequestUrl = new URL(String(fetchMock.mock.calls[1]?.[0]))
    expect(detailRequestUrl.pathname).toBe('/api/v1/support-programs/detail')
    expect(detailRequestUrl.searchParams.get('sourceProgramId')).toBe(detail.id)
    expect(screen.queryByRole('textbox', { name: '공고 원문에 질문하기' })).toBeNull()
  })

  it.each([
    '/support-programs/detail/question',
    '/support-programs/detail/question?sourceCode=BIZINFO',
    '/support-programs/detail/question?sourceProgramId=missing-source-code',
    '/support-programs/detail/question?sourceCode=%20&sourceProgramId=blank-source-code',
    '/support-programs/detail/question?sourceCode=BIZINFO&sourceProgramId=%20',
  ])('질문 페이지 식별자가 누락되거나 공백인 URL(%s)은 폼과 API 요청 없이 안내한다', (path) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore(), path)

    expect(screen.getByRole('heading', { name: '공고 정보를 찾을 수 없습니다' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: '공고 원문에 질문하기' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('K-Startup 질문 URL로 직접 진입하면 미지원 안내만 표시하고 API를 호출하지 않는다', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await act(async () => {
      renderApp(createAppStore(), '/support-programs/detail/question?sourceCode=KSTARTUP&sourceProgramId=kstartup-program')
    })

    expect(screen.getByText('이 제공처 공고는 아직 원문 근거 답변을 지원하지 않습니다. 원문 공고에서 확인해 주세요.'))
      .toBeTruthy()
    expect(screen.queryByRole('textbox', { name: '공고 원문에 질문하기' })).toBeNull()
    expect(screen.queryByRole('button', { name: '질문하고 근거 받기' })).toBeNull()
    const backUrl = new URL(
      screen.getByRole('link', { name: '← 공고 상세로 돌아가기' }).getAttribute('href')!,
      'http://localhost',
    )
    expect(backUrl.searchParams.get('sourceCode')).toBe('KSTARTUP')
    expect(backUrl.searchParams.get('sourceProgramId')).toBe('kstartup-program')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('질문 요청 중 상세로 돌아가면 요청을 취소하고 재진입한 질문에 늦은 답변을 표시하지 않는다', async () => {
    const detail = { ...supportPrograms[0], matchedReasons: [], recommendationScore: null }
    let resolveAnswer!: (response: Response) => void
    const fetchMock = vi.fn()
      .mockReturnValueOnce(new Promise<Response>((resolve) => { resolveAnswer = resolve }))
      .mockResolvedValueOnce(jsonResponse(detail))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(
      createAppStore(),
      `/support-programs/detail/question?sourceCode=${detail.sourceCode}&sourceProgramId=${detail.id}`,
    )
    const question = screen.getByRole('textbox', { name: '공고 원문에 질문하기' })
    fireEvent.change(question, { target: { value: '이전 질문' } })
    fireEvent.submit(question.closest('form')!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal
    expect(signal.aborted).toBe(false)
    expect(screen.getByRole('button', { name: '질문 취소' })).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: '← 공고 상세로 돌아가기' }))
    expect(signal.aborted).toBe(true)
    await screen.findByRole('heading', { name: detail.title })
    fireEvent.click(screen.getByRole('link', { name: '이 공고에 질문하기' }))
    const nextQuestion = screen.getByRole('textbox', { name: '공고 원문에 질문하기' })
    expect((nextQuestion as HTMLTextAreaElement).value).toBe('')
    fireEvent.change(nextQuestion, { target: { value: '새 질문' } })

    await act(async () => resolveAnswer(jsonResponse({
      answer: '이전 질문의 늦은 답변입니다.',
      answerStatus: 'ANSWERED',
      citations: [{ excerpt: '이전 근거', sourceUrl: detail.sourceUrl, chunkOrder: 0 }],
    })))

    expect(screen.queryByText('이전 질문의 늦은 답변입니다.')).toBeNull()
    expect((nextQuestion as HTMLTextAreaElement).value).toBe('새 질문')
    expect((screen.getByRole('button', { name: '질문하고 근거 받기' }) as HTMLButtonElement).disabled)
      .toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('원문 질문이 응답하지 않으면 시간 초과를 알리고 같은 질문의 재전송을 허용한다', async () => {
    vi.useFakeTimers()
    const detail = supportPrograms[0]
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    renderApp(
      createAppStore(),
      `/support-programs/detail/question?sourceCode=${detail.sourceCode}&sourceProgramId=${detail.id}`,
    )
    const question = screen.getByRole('textbox', { name: '공고 원문에 질문하기' }) as HTMLTextAreaElement
    fireEvent.change(question, { target: { value: '신청 대상은 누구인가요?' } })
    fireEvent.submit(question.closest('form')!)
    expect(question.disabled).toBe(true)

    await act(async () => vi.advanceTimersByTimeAsync(supportProgramEvidenceQuestionTimeoutMilliseconds))
    expect(screen.getByRole('alert').textContent)
      .toBe('답변 시간이 초과되었습니다. 입력한 질문을 다시 전송해 주세요.')
    expect(question.disabled).toBe(false)
    expect(question.value).toBe('신청 대상은 누구인가요?')
    expect((screen.getByRole('button', { name: '질문하고 근거 받기' }) as HTMLButtonElement).disabled)
      .toBe(false)
    expect(fetchMock).toHaveBeenCalledOnce()
    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal
    expect(signal.aborted).toBe(true)
  })

  it.each([
    [{
      answer: '원문 근거가 부족합니다.',
      answerStatus: 'INSUFFICIENT_EVIDENCE',
      citations: [],
    }, '공고 원문에서 이 질문에 답할 만큼 충분한 근거를 찾지 못했습니다. 원문 공고를 확인해 주세요.'],
    [new Response('', { status: 422 }), '이 제공처 공고는 아직 원문 근거 답변을 지원하지 않습니다. 원문 공고에서 확인해 주세요.'],
    [new Response('', { status: 503 }), '원문 근거 답변을 지금 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.'],
    [requestRejectedResponse(429), '짧은 시간에 요청이 많아 잠시 제한되었습니다. 약 12초 후 직접 다시 시도해 주세요.'],
    [requestRejectedResponse(503), '현재 다른 요청을 처리하고 있어 새 요청을 시작할 수 없습니다. 약 12초 후 직접 다시 시도해 주세요.'],
  ])('원문 답변의 응답 상태에 안전한 안내를 표시한다', async (answerResponse, expectedMessage) => {
    const detail = { ...supportPrograms[0], matchedReasons: [], recommendationScore: null }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(detail))
      .mockResolvedValueOnce(answerResponse instanceof Response ? answerResponse : jsonResponse(answerResponse))
    vi.stubGlobal('fetch', fetchMock)

    // 상세 조회와 질문 페이지 진입의 초기 effect까지 끝내고 사용자 입력을 시작합니다.
    await act(async () => {
      renderApp(
        createAppStore(),
        `/support-programs/detail?sourceCode=${detail.sourceCode}&sourceProgramId=${detail.id}`,
      )
    })

    await screen.findByRole('heading', { name: detail.title })
    fireEvent.click(screen.getByRole('link', { name: '이 공고에 질문하기' }))
    const question = await screen.findByRole('textbox', { name: '공고 원문에 질문하기' })
    fireEvent.change(question, { target: { value: '신청 대상은 누구인가요?' } })
    await waitFor(() => {
      expect((screen.getByRole('button', { name: '질문하고 근거 받기' }) as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.submit(question.closest('form')!)

    expect(await screen.findByText(expectedMessage)).toBeTruthy()
    expect((question as HTMLTextAreaElement).value).toBe('신청 대상은 누구인가요?')
    expect((screen.getByRole('button', { name: '질문하고 근거 받기' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText('private server detail')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    [429, '짧은 시간에 요청이 많아 잠시 제한되었습니다. 약 12초 후 직접 다시 시도해 주세요.'],
    [503, '현재 다른 요청을 처리하고 있어 새 요청을 시작할 수 없습니다. 약 12초 후 직접 다시 시도해 주세요.'],
  ])('검색 HTTP %s를 장애와 구별하여 안내하고 직접 다시 검색할 수 있다', async (status, message) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(requestRejectedResponse(status))
      .mockResolvedValueOnce(jsonResponse({ query: '서울 AI', programs: [supportPrograms[0]] }))
    vi.stubGlobal('fetch', fetchMock)
    const store = createAppStore()
    renderApp(store)

    const searchInput = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(searchInput, { target: { value: '서울 AI' } })
    fireEvent.submit(searchInput.closest('form')!)
    expect((await screen.findByText(message)).closest('[role="alert"]')).toBeTruthy()
    expect((searchInput as HTMLTextAreaElement).value).toBe('서울 AI')
    expect(screen.queryByText('private server detail')).toBeNull()
    const rejectedMessages = [...store.getState().chat.messages]
    expect(fetchMock).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: '다시 검색' }))
    await screen.findByRole('link', { name: '상세 조건 보기' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(store.getState().chat.messages.slice(0, rejectedMessages.length)).toEqual(rejectedMessages)
  })

  it('제공처가 다른 동일 원본 ID 공고를 각각 표시하고 올바른 상세 식별자로 조회한다', async () => {
    const sharedProgramId = 'SHARED-PROGRAM-ID'
    const bizInfoProgram = {
      ...supportPrograms[0],
      id: sharedProgramId,
      title: '기업마당 동일 원본 ID 공고',
    }
    const otherProgram = {
      ...supportPrograms[1],
      sourceCode: 'OTHER',
      id: sharedProgramId,
      title: '기타 제공처 동일 원본 ID 공고',
      sourceName: '테스트 제공처',
      sourceUrl: 'https://support-programs.other.test/programs/shared',
    }
    // 아직 연동하지 않은 제공처는 HTTP allowlist에 추가하지 않고 Domain 경계에서 대역을 제공합니다.
    const repository = appContainer.resolve('supportProgramRepository')
    vi.spyOn(repository, 'search').mockResolvedValue([bizInfoProgram, otherProgram])
    const getDetail = vi.spyOn(repository, 'getDetail')
      .mockResolvedValueOnce({
        ...bizInfoProgram,
        matchedReasons: [],
        recommendationScore: null,
      })
      .mockResolvedValueOnce({
        ...otherProgram,
        matchedReasons: [],
        recommendationScore: null,
      })

    renderApp(createAppStore())

    const chatInput = screen.getByPlaceholderText('예: 서울에서 AI 창업지원 사업을 찾아줘')
    fireEvent.change(chatInput, { target: { value: '동일 ID' } })
    fireEvent.submit(chatInput.closest('form')!)

    await screen.findByRole('heading', { name: bizInfoProgram.title, level: 2 })
    await screen.findByRole('heading', { name: otherProgram.title, level: 2 })

    const bizInfoCard = getProgramCard(bizInfoProgram.title)
    const otherCard = getProgramCard(otherProgram.title)
    expect(within(bizInfoCard).getByRole('link', { name: '원문 보기 ↗' }).getAttribute('href'))
      .toBe(bizInfoProgram.sourceUrl)
    expect(within(otherCard).getByRole('link', { name: '원문 보기 ↗' }).getAttribute('href'))
      .toBe(otherProgram.sourceUrl)

    fireEvent.click(within(bizInfoCard).getByRole('link', { name: '상세 조건 보기' }))
    await screen.findByRole('heading', { name: bizInfoProgram.title, level: 1 })
    expect(getDetail).toHaveBeenNthCalledWith(1, {
      sourceCode: bizInfoProgram.sourceCode,
      sourceProgramId: sharedProgramId,
    }, expect.any(AbortSignal))

    fireEvent.click(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' }))
    await screen.findByRole('heading', { name: otherProgram.title, level: 2 })

    fireEvent.click(within(getProgramCard(otherProgram.title)).getByRole('link', { name: '상세 조건 보기' }))
    await screen.findByRole('heading', { name: otherProgram.title, level: 1 })
    expect(getDetail).toHaveBeenNthCalledWith(2, {
      sourceCode: otherProgram.sourceCode,
      sourceProgramId: sharedProgramId,
    }, expect.any(AbortSignal))
    expect(screen.queryByRole('textbox', { name: '공고 원문에 질문하기' })).toBeNull()
    expect(screen.getByText('이 제공처 공고는 아직 원문 근거 답변을 지원하지 않습니다. 원문 공고에서 확인해 주세요.'))
      .toBeTruthy()
  })

  it('한글 조합 중 Enter는 검색을 전송하지 않고 조합이 끝난 뒤 전송한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      query: '서울 AI',
      programs: [supportPrograms[0]],
    }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    const chatInput = screen.getByPlaceholderText('예: 서울에서 AI 창업지원 사업을 찾아줘')
    fireEvent.change(chatInput, { target: { value: '서울 AI' } })
    fireEvent.compositionStart(chatInput)
    fireEvent.keyDown(chatInput, { isComposing: true, key: 'Enter' })

    expect(fetchMock).not.toHaveBeenCalled()
    expect((chatInput as HTMLTextAreaElement).value).toBe('서울 AI')

    fireEvent.compositionEnd(chatInput)
    fireEvent.keyDown(chatInput, { key: 'Enter' })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
  })

  it('Safari가 한글 조합 완료 직후 보내는 Enter도 검색을 전송하지 않는다', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    const chatInput = screen.getByPlaceholderText('예: 서울에서 AI 창업지원 사업을 찾아줘')
    fireEvent.change(chatInput, { target: { value: '서울 AI' } })
    fireEvent.compositionStart(chatInput)
    fireEvent.compositionEnd(chatInput)
    fireEvent.keyDown(chatInput, { key: 'Enter', keyCode: 229 })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('500자를 넘는 검색어는 API를 호출하지 않고 이유를 안내한다', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    const overlongQuery = '가'.repeat(501)
    const chatInput = screen.getByPlaceholderText('예: 서울에서 AI 창업지원 사업을 찾아줘')
    fireEvent.change(chatInput, { target: { value: overlongQuery } })
    fireEvent.submit(chatInput.closest('form')!)

    expect(fetchMock).not.toHaveBeenCalled()
    expect((chatInput as HTMLTextAreaElement).value).toBe(overlongQuery)
    expect(screen.getByRole('alert').textContent).toBe(
      '검색어는 500자 이하로 입력해 주세요. 현재 501자입니다.',
    )
  })

  it('검색 실패 시 검색어를 복구하고 다시 검색할 수 있다', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce(jsonResponse({
        query: '서울 AI',
        programs: [supportPrograms[0]],
      }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    const chatInput = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(chatInput, { target: { value: '서울 AI' } })
    fireEvent.submit(chatInput.closest('form')!)

    await screen.findByRole('alert')
    expect((chatInput as HTMLTextAreaElement).value).toBe('서울 AI')

    fireEvent.click(screen.getByRole('button', { name: '다시 검색' }))

    await screen.findByText('현재 접수 중인 공고에서 조건 확인 공고 0건, 확인 필요 공고 1건을 찾았습니다. 조건 확인은 공식 API 본문 기준이며 최종 신청 자격을 보장하지 않습니다. 확인 필요 공고는 원문 조건을 추가로 확인해 주세요.')
    expect(screen.getByRole('status').textContent).toBe('지원사업 검색 결과 1건: 조건 확인 공고 0건, 확인 필요 공고 1건을 표시했습니다.')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('초기 공고 데이터 준비 중에는 검색을 막고 준비 완료를 안내한다', () => {
    readinessHookMock.useSupportProgramSearchReadiness.mockReturnValue(
      createReadinessHook({
        canSearch: false,
        data: {
          searchState: 'PREPARING',
          programCount: 0,
          indexReady: false,
          lastSuccessfulSyncAt: null,
          lastFailedSyncAt: null,
        },
      }),
    )
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    expect(screen.getByText('초기 공고 데이터를 준비하고 있습니다.')).toBeTruthy()
    expect(screen.getByText('준비가 완료되면 자동으로 검색할 수 있습니다.')).toBeTruthy()
    const searchInput = screen.getByRole('textbox', { name: '지원사업 검색어' })
    expect((searchInput as HTMLTextAreaElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '검색 전송' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getAllByRole('button', { name: '서울 AI 창업지원 사업 찾아줘' })[0] as HTMLButtonElement).disabled)
      .toBe(true)
    fireEvent.submit(searchInput.closest('form')!)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('공고 상태를 처음 확인하는 동안에는 준비 중과 구분된 안내를 표시한다', () => {
    readinessHookMock.useSupportProgramSearchReadiness.mockReturnValue(
      createReadinessHook({
        canSearch: false,
        data: undefined,
        isInitialLoading: true,
      }),
    )

    renderApp(createAppStore())

    expect(screen.getByText('공고 데이터 상태를 확인하고 있습니다.')).toBeTruthy()
    expect((screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement).disabled)
      .toBe(true)
  })

  it('최신 동기화가 실패해도 이전 공고 검색은 유지하고 동기화 시각을 보여 준다', async () => {
    readinessHookMock.useSupportProgramSearchReadiness.mockReturnValue(
      createReadinessHook({
        data: {
          searchState: 'SEARCHABLE_WITH_SYNC_FAILURE',
          programCount: 12,
          indexReady: true,
          lastSuccessfulSyncAt: '2026-09-05T09:00:00+09:00',
          lastFailedSyncAt: '2026-09-05T10:00:00+09:00',
        },
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      query: '서울 AI',
      programs: [supportPrograms[0]],
    }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    expect(screen.getByText('이전 공고 데이터로 검색할 수 있습니다.')).toBeTruthy()
    expect(screen.getByText('최신 공고 동기화에 실패했지만, 이전에 저장된 공고는 계속 검색할 수 있습니다.'))
      .toBeTruthy()
    expect(screen.getByText('마지막 성공 동기화')).toBeTruthy()
    expect(screen.getByText('마지막 실패 동기화')).toBeTruthy()
    expect(screen.getAllByText('12건').length).toBeGreaterThan(0)

    const searchInput = screen.getByRole('textbox', { name: '지원사업 검색어' })
    expect((searchInput as HTMLTextAreaElement).disabled).toBe(false)
    fireEvent.change(searchInput, { target: { value: '서울 AI' } })
    fireEvent.submit(searchInput.closest('form')!)
    await screen.findByRole('heading', { name: supportPrograms[0].title, level: 2 })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('검색 불가 상태는 검색을 막고 상태 확인을 다시 요청할 수 있다', () => {
    const refetch = vi.fn()
    readinessHookMock.useSupportProgramSearchReadiness.mockReturnValue(
      createReadinessHook({
        canSearch: false,
        data: {
          searchState: 'UNAVAILABLE',
          programCount: 0,
          indexReady: false,
          lastSuccessfulSyncAt: null,
          lastFailedSyncAt: '2026-09-05T10:00:00+09:00',
        },
        refetch,
      }),
    )

    renderApp(createAppStore())

    expect(screen.getByRole('alert').textContent).toContain('현재 공고 데이터를 검색할 수 없습니다.')
    expect((screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement).disabled)
      .toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '상태 다시 확인' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('일부 제공처만 준비되어도 검색을 허용하고 제공처별 상태와 검색 범위를 보여 준다', async () => {
    const refetch = vi.fn()
    readinessHookMock.useSupportProgramSearchReadiness.mockReturnValue(
      createReadinessHook({
        data: {
          searchState: 'SEARCHABLE_WITH_PARTIAL_SOURCES', programCount: 12, indexReady: true,
          lastSuccessfulSyncAt: '2026-09-05T09:00:00+09:00',
          lastFailedSyncAt: '2026-09-05T10:00:00+09:00',
          sources: [{
            sourceCode: 'BIZINFO', sourceName: '기업마당', searchState: 'SEARCHABLE_WITH_SYNC_FAILURE',
            programCount: 12, indexReady: true,
            lastSuccessfulSyncAt: '2026-09-05T09:00:00+09:00',
            lastFailedSyncAt: '2026-09-05T10:00:00+09:00',
          }, {
            sourceCode: 'KSTARTUP', sourceName: 'K-Startup', searchState: 'PREPARING',
            programCount: 7, indexReady: false, lastSuccessfulSyncAt: null, lastFailedSyncAt: null,
          }],
        },
        refetch,
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ query: '창업', programs: [supportPrograms[0]] }))
    vi.stubGlobal('fetch', fetchMock)
    renderApp(createAppStore())

    expect(screen.getByText('일부 제공처의 공고를 검색할 수 있습니다.')).toBeTruthy()
    expect(screen.getByText('현재 검색 범위: 기업마당. 나머지 제공처는 준비가 완료되면 검색에 포함됩니다.')).toBeTruthy()
    const sources = within(screen.getByRole('list', { name: '제공처별 공고 준비 상태' })).getAllByRole('listitem')
    expect(sources).toHaveLength(2)
    expect(within(sources[0]).getByText('기업마당')).toBeTruthy()
    expect(within(sources[0]).getByText('이전 공고 검색 가능 · 최신 동기화 실패')).toBeTruthy()
    expect(within(sources[0]).getByText('12건')).toBeTruthy()
    expect(within(sources[0]).getByText('2026. 9. 5. 오전 9:00')).toBeTruthy()
    expect(within(sources[0]).getByText('2026. 9. 5. 오전 10:00')).toBeTruthy()
    expect(within(sources[1]).getByText('K-Startup')).toBeTruthy()
    expect(within(sources[1]).getByText('초기 준비 중')).toBeTruthy()
    expect(within(sources[1]).getByText('7건')).toBeTruthy()
    expect(within(sources[1]).getAllByText('기록 없음')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '상태 다시 확인' }))
    expect(refetch).toHaveBeenCalledOnce()

    const searchInput = screen.getByRole('textbox', { name: '지원사업 검색어' })
    expect((searchInput as HTMLTextAreaElement).disabled).toBe(false)
    fireEvent.change(searchInput, { target: { value: '창업' } })
    fireEvent.submit(searchInput.closest('form')!)
    await screen.findByRole('heading', { name: supportPrograms[0].title, level: 2 })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('검색 실패 뒤 공고 상태가 검색 불가로 바뀌면 다시 검색 버튼을 숨긴다', async () => {
    let currentReadiness = createReadinessHook()
    readinessHookMock.useSupportProgramSearchReadiness.mockImplementation(
      () => currentReadiness,
    )
    const fetchMock = vi.fn(() => {
      currentReadiness = createReadinessHook({
        canSearch: false,
        data: {
          searchState: 'UNAVAILABLE',
          programCount: 0,
          indexReady: false,
          lastSuccessfulSyncAt: null,
          lastFailedSyncAt: '2026-09-05T10:00:00+09:00',
        },
      })
      return Promise.reject(new Error('temporary search failure'))
    })
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    const searchInput = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(searchInput, { target: { value: '서울 AI' } })
    fireEvent.submit(searchInput.closest('form')!)

    await screen.findByText('지원사업을 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    expect(screen.queryByRole('button', { name: '다시 검색' })).toBeNull()
    expect((screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement).disabled)
      .toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('검색 가능한 상태에서 빈 검색 결과는 공고 없음으로 안내한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      query: '존재하지 않는 조건',
      programs: [],
    }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    const searchInput = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(searchInput, { target: { value: '존재하지 않는 조건' } })
    fireEvent.submit(searchInput.closest('form')!)

    await screen.findByText('현재 일치하는 공고를 찾지 못했습니다. 지역이나 분야를 바꿔 다시 검색해 보세요.')
    expect(screen.getByText('공고 검색이 가능합니다.')).toBeTruthy()
  })

  it('진행 중인 검색은 취소할 수 있고 검색어를 유지한다', async () => {
    let requestSignal: AbortSignal | undefined
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>(
      (_resolve, reject) => {
        requestSignal = init?.signal ?? undefined
        requestSignal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
          once: true,
        })
      },
    ))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore())

    const chatInput = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(chatInput, { target: { value: '수출' } })
    fireEvent.submit(chatInput.closest('form')!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(requestSignal?.aborted).toBe(true)
    expect((chatInput as HTMLTextAreaElement).value).toBe('수출')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('모바일 메뉴는 포커스를 사이드바에 가두고 닫을 때 메뉴 버튼으로 돌려준다', () => {
    installMobileMediaQuery()
    renderApp(createAppStore())

    const sidebar = screen.getByLabelText('지원사업 검색 메뉴')
    expect(sidebar.className).toContain('max-chat:invisible')
    expect(sidebar.className).toContain('max-chat:pointer-events-none')
    expect(screen.getByText('추천 질문')).toBeTruthy()
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByRole('button', { name: '검색 전송' })).toBeTruthy()

    const menuButton = screen.getByRole('button', { name: '메뉴 열기' })
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    menuButton.focus()
    fireEvent.click(menuButton)
    expect(menuButton.getAttribute('aria-expanded')).toBe('true')
    expect(sidebar.getAttribute('role')).toBe('dialog')
    expect(sidebar.getAttribute('aria-modal')).toBe('true')
    expect(menuButton.closest('section')?.hasAttribute('inert')).toBe(true)

    const sidebarCloseButton = within(sidebar).getByRole('button', { name: '메뉴 닫기' })
    const sidebarFocusableElements = Array.from(
      sidebar.querySelectorAll<HTMLElement>('button, a[href]'),
    )
    const firstSidebarElement = sidebarFocusableElements[0]
    const lastSidebarElement = sidebarFocusableElements.at(-1)
    expect(document.activeElement).toBe(sidebarCloseButton)

    screen.getByRole('textbox', { name: '지원사업 검색어' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(firstSidebarElement)

    lastSidebarElement?.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(firstSidebarElement)

    firstSidebarElement?.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(lastSidebarElement)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(menuButton)
    expect(menuButton.closest('section')?.hasAttribute('inert')).toBe(false)

    fireEvent.click(menuButton)
    fireEvent.click(screen.getByRole('button', { name: '메뉴 닫기' }))
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(menuButton)

    fireEvent.click(menuButton)
    const backdrop = document.querySelector('main > div[aria-hidden="true"]')
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop!)
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(menuButton)
  })

  it('모바일 메뉴를 연 뒤 데스크톱으로 전환하면 drawer 상태와 포커스를 정리한다', () => {
    const mobileMediaQuery = installMobileMediaQuery()
    renderApp(createAppStore())

    const menuButton = screen.getByRole('button', { name: '메뉴 열기' })
    const sidebar = screen.getByLabelText('지원사업 검색 메뉴')
    const workspace = menuButton.closest('section')
    const primarySidebarAction = within(sidebar).getByRole('button', { name: /새 대화 시작/ })

    fireEvent.click(menuButton)
    expect(sidebar.getAttribute('role')).toBe('dialog')
    expect(workspace?.hasAttribute('inert')).toBe(true)

    act(() => mobileMediaQuery.moveToDesktop())

    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(sidebar.getAttribute('role')).toBeNull()
    expect(sidebar.getAttribute('aria-modal')).toBeNull()
    expect(workspace?.hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(primarySidebarAction)
  })

  it('새로고침 또는 공유 URL의 직접 진입도 Core API에서 상세 정보를 다시 조회한다', async () => {
    const detail = { ...supportPrograms[0], matchedReasons: [], recommendationScore: null }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(detail))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(
      createAppStore(),
      `/support-programs/detail?sourceCode=${encodeURIComponent(detail.sourceCode)}&sourceProgramId=${encodeURIComponent(detail.id)}`,
    )

    expect(screen.getByRole('heading', { name: '공고 정보를 불러오는 중입니다' })).toBeTruthy()
    await screen.findByRole('heading', { name: detail.title })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('존재하지 않거나 비활성화된 공고는 404 안내를 보여 준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))

    renderApp(createAppStore(), '/support-programs/detail?sourceCode=BIZINFO&sourceProgramId=unknown-program')

    await screen.findByRole('heading', { name: '공고 정보를 찾을 수 없습니다' })
    expect(screen.getByText(/존재하지 않거나 더 이상 제공되지 않는 공고입니다/)).toBeTruthy()
    expect(screen.getByRole('link', { name: '← 검색 결과로 돌아가기' })).toBeTruthy()
  })

  it.each([
    '/support-programs/detail',
    '/support-programs/detail?sourceCode=BIZINFO',
    '/support-programs/detail?sourceProgramId=missing-source-code',
    '/support-programs/detail?sourceCode=%20&sourceProgramId=blank-source-code',
    '/support-programs/detail?sourceCode=BIZINFO&sourceProgramId=%20',
  ])('식별자가 누락되거나 공백인 URL(%s)은 API를 호출하지 않는다', (path) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderApp(createAppStore(), path)

    expect(screen.getByRole('heading', { name: '공고 정보를 찾을 수 없습니다' })).toBeTruthy()
    expect(screen.getByText('공고 주소가 올바르지 않습니다. 검색 결과에서 공고를 다시 선택해 주세요.'))
      .toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('상세 조회 API가 실패하면 안전한 오류 안내를 보여 준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))

    renderApp(
      createAppStore(),
      '/support-programs/detail?sourceCode=BIZINFO&sourceProgramId=temporarily-unavailable',
    )

    await screen.findByRole('heading', { name: '공고 정보를 불러오지 못했습니다' })
    expect(screen.getByText(/잠시 후 다시 시도해 주세요/)).toBeTruthy()
  })

  it('퍼센트와 슬래시가 포함된 원본 공고 ID도 URL 인코딩 후 상세 조회한다', async () => {
    const program = {
      ...supportPrograms[0],
      id: 'fixture%20/program?',
      matchedReasons: [],
      recommendationScore: null,
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(program))
    vi.stubGlobal('fetch', fetchMock)

    renderApp(
      createAppStore(),
      `/support-programs/detail?sourceCode=${encodeURIComponent(program.sourceCode)}&sourceProgramId=${encodeURIComponent(program.id)}`,
    )

    await screen.findByRole('heading', { name: program.title })
    const detailRequestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(detailRequestUrl.searchParams.get('sourceProgramId')).toBe(program.id)
  })
})

function renderApp(
  appStore: ReturnType<typeof createAppStore>,
  initialEntry = '/',
) {
  return render(
    <Provider store={appStore}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </Provider>,
  )
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function requestRejectedResponse(status: number) {
  return new Response(JSON.stringify({
    type: 'about:blank', title: 'Request rejected', status,
    detail: 'private server detail', instance: '/api/v1/support-programs/search',
    code: status === 429 ? 'SUPPORT_PROGRAM_RATE_LIMITED' : 'SUPPORT_PROGRAM_BUSY',
    retryAfterSeconds: 12,
  }), {
    status,
    headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '12' },
  })
}

function getProgramCard(title: string): HTMLElement {
  const card = screen.getByRole('heading', { name: title, level: 2 }).closest('article')
  if (!card) throw new Error(`지원사업 카드가 없습니다: ${title}`)
  return card
}

function createReadinessHook(overrides: {
  data?: Omit<SupportProgramSearchReadiness, 'sources'> & { sources?: SupportProgramSearchReadiness['sources'] }
  isError?: boolean
  isInitialLoading?: boolean
  isRefreshing?: boolean
  canSearch?: boolean
  refetch?: () => unknown
} = {}) {
  const data = 'data' in overrides ? overrides.data : {
    searchState: 'SEARCHABLE' as const,
    programCount: 12,
    indexReady: true,
    lastSuccessfulSyncAt: '2026-09-05T09:00:00+09:00',
    lastFailedSyncAt: null,
  }
  return {
    isError: false,
    isInitialLoading: false,
    isRefreshing: false,
    canSearch: true,
    refetch: vi.fn(),
    ...overrides,
    data: data ? {
      ...data,
      sources: data.sources ?? [{
        sourceCode: 'BIZINFO', sourceName: '기업마당',
        searchState: data.searchState === 'SEARCHABLE_WITH_PARTIAL_SOURCES' ? 'SEARCHABLE' : data.searchState,
        programCount: data.programCount, indexReady: data.indexReady,
        lastSuccessfulSyncAt: data.lastSuccessfulSyncAt, lastFailedSyncAt: data.lastFailedSyncAt,
      }],
    } : undefined,
  }
}

function installMobileMediaQuery() {
  let listener: ((event: MediaQueryListEvent) => void) | undefined

  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    addEventListener(_type: string, eventListener: EventListenerOrEventListenerObject | null) {
      if (typeof eventListener === 'function') {
        listener = eventListener as (event: MediaQueryListEvent) => void
      }
    },
    removeEventListener() {
      listener = undefined
    },
  }))

  return {
    moveToDesktop() {
      listener?.({ matches: false } as MediaQueryListEvent)
    },
  }
}
