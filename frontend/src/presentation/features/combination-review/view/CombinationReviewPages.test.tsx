// @vitest-environment jsdom
import { asValue } from 'awilix/browser'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appContainer } from '../../../../app/appContainer'
import { createAppStore } from '../../../../app/store'
import { signedIn, signedOut } from '../../../shared/auth/state/authSlice'
import { CombinationReviewError } from '../../../../domain/errors/CombinationReviewError'
import { CombinationReviewUseCase } from '../../../../domain/usecases/CombinationReviewUseCase'
import { CombinationReviewRepositoryImpl } from '../../../../data/repositories/CombinationReviewRepositoryImpl'
import { supportPrograms } from '../../../../data/fixtures/supportPrograms'
import { CombinationReviewEditorPage, CombinationReviewListPage } from './CombinationReviewPages'
import { reviewFixture, runFixture } from '../testing/reviewFixtures'
import { useReviewSessionIsolation } from '../viewmodel/useReviewSessionIsolation'

const original = appContainer.resolve('combinationReviewUseCase')
const originalCatalog = appContainer.resolve('browseSupportProgramsUseCase')
const originalDetail = appContainer.resolve('getSupportProgramDetailUseCase')
const repository = { list: vi.fn(), get: vi.fn(), create: vi.fn(), delete: vi.fn(), replace: vi.fn(), runs: vi.fn(), run: vi.fn(), start: vi.fn(), source: vi.fn() }
beforeEach(() => {
  sessionStorage.clear(); vi.resetAllMocks()
  repository.get.mockResolvedValue(structuredClone(reviewFixture))
  repository.runs.mockResolvedValue({ items: [], nextBeforeId: null })
  repository.run.mockResolvedValue(structuredClone(runFixture))
  repository.list.mockResolvedValue({ items: [], nextBeforeId: null })
  repository.delete.mockResolvedValue(undefined)
  appContainer.register({
    combinationReviewUseCase: asValue(new CombinationReviewUseCase(repository)),
    getSupportProgramDetailUseCase: asValue({ execute: vi.fn(async (identity) => ({ ...supportPrograms[0], sourceCode: identity.sourceCode, id: identity.sourceProgramId, title: identity.sourceProgramId === 'PBLN_100' ? '청년창업 사업화 지원 공고' : '딥테크 성장 지원 공고' })) }),
  })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); appContainer.register({ combinationReviewUseCase: asValue(original), browseSupportProgramsUseCase: asValue(originalCatalog), getSupportProgramDetailUseCase: asValue(originalDetail) }) })
function Isolation() { useReviewSessionIsolation(); return null }
function mount(path = '/app/combination-reviews/12?step=analysis') {
  const store = createAppStore()
  store.dispatch(signedIn({ email: 'a@example.com', role: 'USER', tier: 'MEMBER', emailVerified: false, hasPassword: true, company: null }))
  const rendered = render(<Provider store={store}><Isolation /><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/app/combination-reviews" element={<CombinationReviewListPage />} />
    <Route path="/app/combination-reviews/new" element={<CombinationReviewEditorPage create />} />
    <Route path="/app/combination-reviews/:reviewId" element={<CombinationReviewEditorPage />} />
  </Routes></MemoryRouter></Provider>)
  return { store, ...rendered }
}
describe('review screens and execution safety', () => {
  it.each([201, 404])('handles new review save HTTP %s through the production adapter', async (status) => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      if (_url.includes('/catalog')) return Response.json({ programs: supportPrograms.slice(0, 2).map((program) => ({ ...program, recommendationScore: null, eligibilityReview: null, matchedReasons: [] })), total: 2, page: 1, pageSize: 10, totalPages: 1, regions: [], categories: [], startupStages: [], applicantTypes: [], founderAges: [] })
      if (init?.method === 'POST') return Response.json(status === 201 ? reviewFixture : { status: 404, error: 'Not Found' }, { status })
      return Response.json(_url.includes('/runs') ? { items: [], nextBeforeId: null } : reviewFixture)
    })
    vi.stubGlobal('fetch', fetch)
    appContainer.register({
      combinationReviewUseCase: asValue(new CombinationReviewUseCase(new CombinationReviewRepositoryImpl())),
      browseSupportProgramsUseCase: asValue(originalCatalog),
    })
    mount('/app/combination-reviews/new')
    fireEvent.change(screen.getByLabelText('검토 제목'), { target: { value: reviewFixture.title } })
    fireEvent.click(screen.getByText('공고 검색'))
    const choices = await screen.findAllByRole('button', { name: '선택' })
    fireEvent.click(choices[0]); fireEvent.click(choices[1])
    expect(fetch).toHaveBeenCalledOnce()
    expect(new URL(fetch.mock.calls[0][0]).pathname).toMatch(/\/catalog$/)
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get('status')).toBe('ALL')
    fireEvent.click(screen.getByText('다음: 참여 상태 설정'))
    fireEvent.click(screen.getByText('설정 완료 후 공고 분석'))
    if (status === 201) {
      await screen.findByRole('heading', { name: '공고 분석' })
    } else {
      expect((await screen.findByRole('alert')).textContent).toContain('Core API 실행 버전')
      fireEvent.click(screen.getByText('이전: 제목·공고 선택'))
      expect(screen.getByDisplayValue(reviewFixture.title)).toBeTruthy()
      expect(screen.getByRole('heading', { name: '새 검토' })).toBeTruthy()
    }
    const posts = fetch.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0][0]).toMatch(/\/api\/v1\/combination-reviews$/)
  })
  it('updates the acknowledged input version on empty PUT success without automatic GET or analysis', async () => {
    repository.replace.mockResolvedValue(undefined)
    mount('/app/combination-reviews/12'); await screen.findByDisplayValue(reviewFixture.title)
    fireEvent.change(screen.getByLabelText('검토 제목'), { target: { value: '수정된 제목' } })
    fireEvent.click(screen.getByText('다음: 참여 상태 설정'))
    fireEvent.click(screen.getByText('설정 완료 후 공고 분석'))
    await screen.findByText('입력을 저장했습니다. 분석은 시작하지 않았습니다.')
    expect(screen.getByText('검토 #12 · 저장 입력 버전 3')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '공고 분석' })).toBeTruthy()
    expect(repository.get).toHaveBeenCalledTimes(1)
    expect(repository.start).not.toHaveBeenCalled()
  })
  it('focuses the server version error and preserves edited inputs', async () => {
    repository.replace.mockRejectedValue(new CombinationReviewError(404, 'COMBINATION_REVIEW_API_UNAVAILABLE'))
    mount('/app/combination-reviews/12'); await screen.findByDisplayValue(reviewFixture.title)
    fireEvent.change(screen.getByLabelText('검토 제목'), { target: { value: '보존할 입력' } })
    fireEvent.click(screen.getByText('다음: 참여 상태 설정'))
    fireEvent.click(screen.getByText('설정 완료 후 공고 분석'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Core API 실행 버전')
    expect(document.activeElement).toBe(alert)
    fireEvent.click(screen.getByText('이전: 제목·공고 선택'))
    expect(screen.getByDisplayValue('보존할 입력')).toBeTruthy()
  })
  it('mounts with GET only and renders empty list', async () => {
    mount('/app/combination-reviews')
    await screen.findByText('아직 저장한 검토가 없습니다.')
    expect(repository.create).not.toHaveBeenCalled(); expect(repository.start).not.toHaveBeenCalled()
  })
  it('appends cursor pages', async () => {
    repository.list.mockResolvedValueOnce({ items: [reviewFixture], nextBeforeId: 12 }).mockResolvedValueOnce({ items: [{ ...reviewFixture, id: 11, title: '이전 검토' }], nextBeforeId: null })
    mount('/app/combination-reviews')
    fireEvent.click(await screen.findByText('이전 검토 더 보기'))
    await screen.findByText('이전 검토')
    expect(repository.list.mock.calls[1][0]).toBe(12)
    expect(screen.getByText(reviewFixture.title)).toBeTruthy()
  })
  it('deletes a review only after explicit confirmation and removes it from the list', async () => {
    repository.list.mockResolvedValue({ items: [reviewFixture], nextBeforeId: null })
    mount('/app/combination-reviews')
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }))
    expect(repository.delete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '정말 삭제' }))
    await screen.findByText('아직 저장한 검토가 없습니다.')
    expect(repository.delete).toHaveBeenCalledWith(reviewFixture.id, expect.any(AbortSignal))
  })
  it('preserves form on 409 and only adopts latest after explicit selection', async () => {
    repository.replace.mockRejectedValue(new CombinationReviewError(409, 'COMBINATION_REVIEW_REVISION_CONFLICT'))
    mount('/app/combination-reviews/12'); await screen.findByDisplayValue(reviewFixture.title)
    fireEvent.change(screen.getByLabelText('검토 제목'), { target: { value: '내 편집 내용' } })
    fireEvent.click(screen.getByText('다음: 참여 상태 설정'))
    fireEvent.click(screen.getByText('설정 완료 후 공고 분석'))
    await screen.findByRole('alert')
    expect(repository.replace.mock.calls[0][1]).toBe(2)
    repository.get.mockResolvedValue({ ...reviewFixture, inputRevision: 3, title: '서버 최신 제목' })
    fireEvent.click(screen.getByText('최신 입력 조회'))
    await screen.findByText('최신 버전 3 · 서버 최신 제목')
    fireEvent.click(screen.getByText('이전: 제목·공고 선택'))
    expect(screen.getByDisplayValue('내 편집 내용')).toBeTruthy()
    fireEvent.click(screen.getByText('다음: 참여 상태 설정'))
    fireEvent.click(screen.getByText('내 편집 내용을 버리고 최신 입력 사용'))
    fireEvent.click(screen.getByText('이전: 제목·공고 선택'))
    expect(screen.getByDisplayValue('서버 최신 제목')).toBeTruthy()
    expect(repository.replace).toHaveBeenCalledTimes(1)
  })
  it('retains one logical request after response loss and across remount, with no automatic POST', async () => {
    repository.start.mockRejectedValueOnce(new TypeError('network lost')).mockImplementation(async (_id, request) => ({ ...runFixture, requestKey: request.requestKey }))
    const view = mount(); await screen.findByText('새 분석 실행')
    fireEvent.change(screen.getByLabelText('이번 실행의 추가 설명'), { target: { value: '한 번만 전달할 설명' } })
    const button = screen.getByText('새 분석 실행'); fireEvent.click(button); fireEvent.click(button)
    await screen.findByRole('alert')
    expect(repository.start).toHaveBeenCalledTimes(1)
    const input = repository.start.mock.calls[0][1]
    view.unmount(); mount(); await screen.findByText('같은 요청 확인')
    expect(repository.start).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('같은 요청 확인'))
    await screen.findByText('실행 #30 · 분석 완료')
    expect(repository.start.mock.calls[1][1]).toEqual(input)
  })
  it.each([422, 429, 503])('shows %s as technical error with saved failed run', async (status) => {
    repository.start.mockRejectedValue(new CombinationReviewError(status, 'SOURCE_UNSUPPORTED', 30))
    repository.run.mockResolvedValue({ ...runFixture, status: 'FAILED', analysis: null, failureCode: 'SOURCE_UNSUPPORTED' })
    mount(); await screen.findByText('새 분석 실행')
    fireEvent.click(screen.getByText('새 분석 실행'))
    fireEvent.click(await screen.findByText('실패 실행 #30 확인'))
    await screen.findByText('실행 #30 · 기술 실패')
    expect(screen.queryByText('공식 근거 부족')).toBeNull()
  })
  it('shows auth expiry and clears personal view', async () => {
    repository.get.mockRejectedValue(new CombinationReviewError(401, 'UNAUTHENTICATED'))
    const { store } = mount()
    fireEvent.click(await screen.findByText('다시 로그인'))
    expect(store.getState().auth.status).toBe('anonymous')
    expect(screen.queryByRole('heading', { name: '공고 분석' })).toBeNull()
  })
  it('allows explicit cleanup only after a confirmed revision rejection, without another POST', async () => {
    repository.start.mockRejectedValue(new CombinationReviewError(409, 'COMBINATION_REVIEW_REVISION_CONFLICT'))
    mount(); await screen.findByText('새 분석 실행')
    fireEvent.click(screen.getByText('새 분석 실행'))
    fireEvent.click(await screen.findByText('버전 충돌로 거절된 실행 요청 정리'))
    expect(screen.queryByText('같은 요청 확인')).toBeNull()
    expect(Object.keys(sessionStorage)).toHaveLength(0)
    expect(repository.start).toHaveBeenCalledTimes(1)
  })
  it('drops late analysis on account switch and clears request journal', async () => {
    let finish!: (value: typeof runFixture) => void
    repository.start.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const { store } = mount(); await screen.findByText('새 분석 실행')
    fireEvent.click(screen.getByText('새 분석 실행'))
    expect(Object.keys(sessionStorage).length).toBe(1)
    act(() => { store.dispatch(signedIn({ email: 'b@example.com', role: 'USER', tier: 'MEMBER', emailVerified: false, hasPassword: true, company: null })) })
    await act(async () => finish(runFixture))
    expect(Object.keys(sessionStorage).length).toBe(0)
    expect(screen.queryByText('실행 #30 · 분석 완료')).toBeNull()
    expect(repository.start.mock.calls[0][2].aborted).toBe(true)
    act(() => { store.dispatch(signedOut()) })
  })
  it('uses the run snapshot order, six stages and source index', async () => {
    repository.runs.mockResolvedValue({ items: [runFixture], nextBeforeId: null })
    mount(); await screen.findByText('새 분석 실행')
    fireEvent.click(screen.getByText(/#30 · 입력 버전 1/))
    await screen.findByText('실행 #30 · 분석 완료')
    expect(screen.getByText(/과거 입력 버전의 결과/)).toBeTruthy()
    expect(screen.getByText('BIZINFO:PBLN_200 ↔ BIZINFO:PBLN_100')).toBeTruthy()
    expect(screen.getAllByText(/· (사용자 정보 부족|공식 근거 부족|규정 충돌|제한 적용|명시된 범위 내 허용)$/)).toHaveLength(6)
    expect(screen.queryByText(/PDF 3쪽, 문단 2/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '신청 · 사용자 정보 부족 보기' }))
    expect(screen.getByText(/PDF 3쪽, 문단 2/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '신청 · 사용자 정보 부족 접기' }).getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: '선정 · 공식 근거 부족 보기' }))
    expect(screen.getByRole('button', { name: '신청 · 사용자 정보 부족 보기' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getAllByText(/PDF 3쪽, 문단 2/)).toHaveLength(1)
    expect(repository.start).not.toHaveBeenCalled()
  })
  it('keeps UNKNOWN independent from other participation fields', async () => {
    mount('/app/combination-reviews/12'); await screen.findByDisplayValue(reviewFixture.title)
    fireEvent.click(screen.getByText('다음: 참여 상태 설정'))
    expect(screen.getByText(/사업 1 · 청년창업 사업화 지원 공고/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('사업 1 신청'), { target: { value: 'YES' } })
    expect((screen.getByLabelText('사업 1 교부') as HTMLSelectElement).value).toBe('UNKNOWN')
    expect((screen.getByLabelText('사업 1 확약') as HTMLSelectElement).value).toBe('NO')
    await waitFor(() => expect(repository.start).not.toHaveBeenCalled())
  })
})
