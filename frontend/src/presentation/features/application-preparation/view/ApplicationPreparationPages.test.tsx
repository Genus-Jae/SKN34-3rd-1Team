// @vitest-environment jsdom
import { asValue } from 'awilix/browser'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appContainer } from '../../../../app/appContainer'
import { createAppStore } from '../../../../app/store'
import type { ApplicationForm, ApplicationPreparation, ApplicationPreparationPage } from '../../../../domain/entities/ApplicationPreparation'
import { ApplicationPreparationError } from '../../../../domain/errors/ApplicationPreparationError'
import { ApplicationPreparationUseCase } from '../../../../domain/usecases/ApplicationPreparationUseCase'
import { signedIn } from '../../../shared/auth/state/authSlice'
import { ApplicationPreparationEditorPage, ApplicationPreparationListPage } from './ApplicationPreparationPages'

const original = appContainer.resolve('applicationPreparationUseCase')
const firstForm: ApplicationForm = {
  formVersionId: 'verified-form-v1',
  sourceCode: 'BIZINFO',
  sourceProgramId: 'PBLN_1',
  programTitle: '혁신바우처 지원사업',
  formTitle: '혁신바우처 사업계획서',
  sourceUrl: 'https://www.bizinfo.go.kr/form',
  verificationStatus: 'SOURCE_HASH_AND_LOCATORS_VERIFIED',
  institutionReviewed: false,
  supportedServiceFields: ['CONSULTING', 'TECHNICAL_SUPPORT', 'MARKETING'],
  sections: [
    { key: 'company-overview', title: '기업 개요', locator: 'HWPX 문단 1', description: '기업을 설명합니다.', status: 'NOT_STARTED' },
    { key: 'voucher-plan', title: '바우처 활용 계획', locator: 'HWPX 문단 2', description: '계획을 설명합니다.', status: 'NOT_STARTED' },
  ],
}
const secondForm: ApplicationForm = {
  ...firstForm,
  formVersionId: 'marketing-form-v2',
  sourceProgramId: 'PBLN_2',
  programTitle: '수출 마케팅 지원사업',
  formTitle: '수출 실행계획서',
  sourceUrl: 'https://www.bizinfo.go.kr/marketing-form',
  supportedServiceFields: ['MARKETING'],
}
const detail = {
  id: 12,
  inputRevision: 3,
  serviceField: 'TECHNICAL_SUPPORT' as const,
  createdAt: '2026-09-11T00:00:00+09:00',
  updatedAt: '2026-09-11T01:00:00+09:00',
  form: structuredClone(firstForm),
}
const repository = { forms: vi.fn(), list: vi.fn(), get: vi.fn(), create: vi.fn() }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  repository.forms.mockResolvedValue([structuredClone(firstForm)])
  repository.list.mockResolvedValue({ items: [], nextBeforeId: null })
  repository.get.mockResolvedValue(structuredClone(detail))
  repository.create.mockResolvedValue(structuredClone(detail))
  appContainer.register({ applicationPreparationUseCase: asValue(new ApplicationPreparationUseCase(repository)) })
})

afterEach(() => {
  cleanup()
  appContainer.register({ applicationPreparationUseCase: asValue(original) })
})

function mount(path: string) {
  const store = createAppStore()
  store.dispatch(signedIn({ email: 'owner@example.com', role: 'USER', tier: 'MEMBER', emailVerified: false, company: null }))
  const rendered = render(<Provider store={store}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/app/application-preparations" element={<ApplicationPreparationListPage />} />
    <Route path="/app/application-preparations/new" element={<ApplicationPreparationEditorPage create />} />
    <Route path="/app/application-preparations/:preparationId" element={<ApplicationPreparationEditorPage />} />
  </Routes></MemoryRouter></Provider>)
  return { store, ...rendered }
}

describe('application preparation list', () => {
  it('announces initial loading and then shows the empty state', async () => {
    const request = deferred<ApplicationPreparationPage>()
    repository.list.mockReturnValueOnce(request.promise)
    mount('/app/application-preparations')

    expect(screen.getByRole('status').textContent).toContain('목록을 불러오는 중')
    await act(async () => request.resolve({ items: [], nextBeforeId: null }))

    expect(screen.getByRole('heading', { name: '아직 시작한 신청 문서가 없습니다.' })).toBeTruthy()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('shows a focused error and retries the failed request', async () => {
    repository.list
      .mockRejectedValueOnce(new Error('목록을 잠시 불러올 수 없습니다.'))
      .mockResolvedValueOnce({ items: [], nextBeforeId: null })
    mount('/app/application-preparations')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('목록을 잠시 불러올 수 없습니다.')
    expect(document.activeElement).toBe(alert)
    fireEvent.click(within(alert).getByRole('button', { name: '목록 다시 불러오기' }))

    await screen.findByRole('heading', { name: '아직 시작한 신청 문서가 없습니다.' })
    expect(repository.list).toHaveBeenCalledTimes(2)
  })

  it('appends a cursor page and announces the more-loading state', async () => {
    const nextPage = deferred<ApplicationPreparationPage>()
    repository.list
      .mockResolvedValueOnce({
        items: [{ id: 12, inputRevision: 1, serviceField: 'TECHNICAL_SUPPORT', programTitle: firstForm.programTitle, formTitle: firstForm.formTitle, updatedAt: detail.updatedAt }],
        nextBeforeId: 12,
      })
      .mockReturnValueOnce(nextPage.promise)
    mount('/app/application-preparations')

    fireEvent.click(await screen.findByRole('button', { name: '이전 작업 더 보기' }))
    expect(screen.getByRole('status').textContent).toContain('이전 신청 준비')
    expect((screen.getByRole('button', { name: '이전 작업 불러오는 중…' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => nextPage.resolve({
      items: [{ id: 11, inputRevision: 1, serviceField: 'MARKETING', programTitle: secondForm.programTitle, formTitle: secondForm.formTitle, updatedAt: detail.updatedAt }],
      nextBeforeId: null,
    }))

    expect(await screen.findByText(secondForm.programTitle)).toBeTruthy()
    expect(repository.list.mock.calls[1]?.[0]).toBe(12)
  })

  it('aborts the previous account request and ignores its late response', async () => {
    const firstRequest = deferred<ApplicationPreparationPage>()
    const secondRequest = deferred<ApplicationPreparationPage>()
    repository.list.mockReturnValueOnce(firstRequest.promise).mockReturnValueOnce(secondRequest.promise)
    const { store } = mount('/app/application-preparations')
    const firstSignal = repository.list.mock.calls[0]?.[1] as AbortSignal

    act(() => {
      store.dispatch(signedIn({ email: 'next@example.com', role: 'USER', tier: 'MEMBER', emailVerified: false, company: null }))
    })
    expect(firstSignal.aborted).toBe(true)
    await act(async () => secondRequest.resolve({
      items: [{ id: 21, inputRevision: 1, serviceField: 'MARKETING', programTitle: '최신 사용자 신청', formTitle: secondForm.formTitle, updatedAt: detail.updatedAt }],
      nextBeforeId: null,
    }))
    expect(await screen.findByText('최신 사용자 신청')).toBeTruthy()

    await act(async () => firstRequest.resolve({
      items: [{ id: 20, inputRevision: 1, serviceField: 'CONSULTING', programTitle: '이전 사용자 신청', formTitle: firstForm.formTitle, updatedAt: detail.updatedAt }],
      nextBeforeId: null,
    }))
    expect(screen.queryByText('이전 사용자 신청')).toBeNull()
  })
})

describe('application preparation creation and detail', () => {
  it('lets the user choose among official forms and limits service fields to the selected form', async () => {
    repository.forms.mockResolvedValueOnce([structuredClone(firstForm), structuredClone(secondForm)])
    mount('/app/application-preparations/new')

    const formSelect = await screen.findByLabelText('작성할 공식 양식')
    expect(within(formSelect).getAllByRole('option')).toHaveLength(2)
    fireEvent.change(formSelect, { target: { value: secondForm.formVersionId } })

    expect(screen.getByText(secondForm.programTitle)).toBeTruthy()
    const fieldSelect = screen.getByLabelText('작성할 지원 분야')
    expect(within(fieldSelect).getAllByRole('option').map((option) => option.textContent)).toEqual(['마케팅'])
    expect((fieldSelect as HTMLSelectElement).value).toBe('MARKETING')
  })

  it('prevents duplicate submissions and opens the created detail', async () => {
    const creation = deferred<ApplicationPreparation>()
    repository.create.mockReturnValueOnce(creation.promise)
    mount('/app/application-preparations/new')
    await screen.findByText(firstForm.programTitle)
    fireEvent.change(screen.getByLabelText('작성할 지원 분야'), { target: { value: 'MARKETING' } })

    const submit = screen.getByRole('button', { name: '신청 문서 작성 시작' })
    fireEvent.click(submit)
    fireEvent.submit(submit.closest('form')!)

    expect(repository.create).toHaveBeenCalledOnce()
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      formVersionId: firstForm.formVersionId,
      serviceField: 'MARKETING',
    }), expect.any(AbortSignal))
    expect(screen.getByRole('status').textContent).toContain('생성하고 있습니다')
    await act(async () => creation.resolve({ ...structuredClone(detail), serviceField: 'MARKETING' }))

    expect(await screen.findByRole('heading', { name: '공식 작성 항목' })).toBeTruthy()
    expect(repository.get).toHaveBeenCalledWith(12, expect.any(AbortSignal))
  })

  it('displays the complete official detail without starting AI', async () => {
    mount('/app/application-preparations/12')
    await screen.findByRole('heading', { name: '공식 작성 항목' })

    expect(screen.getByText(firstForm.programTitle)).toBeTruthy()
    expect(screen.getByText(firstForm.formTitle)).toBeTruthy()
    expect(screen.getByText('기술지원')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByRole('link', { name: /공식 공고 열기/ }).getAttribute('href')).toBe(firstForm.sourceUrl)
    expect(screen.getAllByLabelText('작성 상태: 작성 전')).toHaveLength(2)
    expect(screen.getByText('공식 양식 위치: HWPX 문단 1')).toBeTruthy()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('rejects a malformed detail id without making a request', () => {
    mount('/app/application-preparations/not-a-number')
    expect(screen.getByRole('alert').textContent).toContain('올바른 신청 준비 주소')
    expect(repository.get).not.toHaveBeenCalled()
  })

  it.each([
    [new ApplicationPreparationError(401, 'AUTHENTICATION_REQUIRED'), '로그인이 만료되었습니다.'],
    [new ApplicationPreparationError(422, 'APPLICATION_FORM_NOT_SUPPORTED'), '현재 지원하지 않는 공고·양식·지원 분야입니다.'],
    [new ApplicationPreparationError(404, 'APPLICATION_PREPARATION_NOT_FOUND'), '신청 준비 건을 찾을 수 없습니다.'],
    [new ApplicationPreparationError(502, 'INVALID_RESPONSE'), '신청 준비 응답 형식을 확인하지 못했습니다.'],
  ] as const)('shows an understandable API failure for detail requests', async (failure, message) => {
    repository.get.mockRejectedValueOnce(failure)
    mount('/app/application-preparations/12')
    expect((await screen.findByRole('alert')).textContent).toContain(message)
  })

  it('aborts an in-flight form request when the screen unmounts', () => {
    const formsRequest = deferred<ApplicationForm[]>()
    repository.forms.mockReturnValueOnce(formsRequest.promise)
    const { unmount } = mount('/app/application-preparations/new')
    const signal = repository.forms.mock.calls[0]?.[0] as AbortSignal

    unmount()

    expect(signal.aborted).toBe(true)
  })
})
