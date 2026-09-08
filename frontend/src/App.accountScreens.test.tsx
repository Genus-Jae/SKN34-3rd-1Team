// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { appContainer } from './app/appContainer'
import { createAppStore } from './app/store'
import type { Account } from './domain/entities/Account'
import { loginMessages } from './presentation/features/auth/viewmodel/useLoginViewModel'
import { sessionRestored } from './presentation/shared/auth/state/authSlice'

vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({
  CoreApiConnectionStatus: () => null,
}))

const memberAccount: Account = { email: 'member@govbiz.local', role: 'USER', tier: 'MEMBER', emailVerified: true }
const adminAccount: Account = { email: 'admin@govbiz.local', role: 'ADMIN', tier: 'ADMIN', emailVerified: true }

beforeEach(() => {
  // 작업 화면 진입 후 readiness 확인도 실제 서버에 연결하지 않습니다.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('계정 화면', () => {
  it('회원가입 화면은 이메일과 비밀번호만 받는다', () => {
    renderApp('/signup')

    const form = screen.getByRole('form', { name: '회원가입' })
    expect(within(form).getByRole('heading', { name: '기업 계정 만들기' })).toBeTruthy()
    expect(within(form).getByLabelText('이메일')).toBeTruthy()
    expect(within(form).getByLabelText('비밀번호')).toBeTruthy()
    expect(within(form).getByLabelText('비밀번호 확인')).toBeTruthy()
    for (const removedField of ['담당자 이름', '기업명', '사업자등록번호', '소재지', '업종']) {
      expect(within(form).queryByLabelText(removedField)).toBeNull()
    }
  })

  it('로그인과 회원가입 화면은 서로를 오간다', () => {
    renderApp('/login')

    fireEvent.click(screen.getByRole('link', { name: '기업 계정 만들기' }))
    expect(screen.getByRole('heading', { name: '기업 계정 만들기' })).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: '로그인' }))
    expect(screen.getByRole('heading', { name: '다시 오셨군요' })).toBeTruthy()
  })

  it('아직 화면이 없는 비밀번호 재설정은 링크로 만들지 않는다', () => {
    renderApp('/login')

    expect(screen.queryByRole('link', { name: /비밀번호 재설정/ })).toBeNull()
    expect(screen.getByText('비밀번호 재설정 · 준비 중')).toBeTruthy()
  })

  it('회원가입 입력이 비어 있으면 데모 작업 화면으로 이동하지 않는다', () => {
    renderApp('/signup')
    fireEvent.submit(screen.getByRole('form', { name: '회원가입' }))
    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('이메일')
  })

  it('비밀번호 확인이 다르면 입력 화면에서 설명한다', () => {
    renderApp('/signup')
    const form = screen.getByRole('form', { name: '회원가입' })
    fireEvent.change(within(form).getByLabelText('이메일'), { target: { value: 'demo@example.test' } })
    fireEvent.change(within(form).getByLabelText('비밀번호'), { target: { value: 'Demo1234' } })
    fireEvent.change(within(form).getByLabelText('비밀번호 확인'), { target: { value: 'Different1234' } })
    fireEvent.submit(form)
    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('일치')
  })

  it('유효한 가입 입력을 확인하면 계정을 생성하지 않고 로그인 화면으로 안내한다', () => {
    renderApp('/signup')
    const form = screen.getByRole('form', { name: '회원가입' })
    fireEvent.change(within(form).getByLabelText('이메일'), { target: { value: 'demo@example.test' } })
    fireEvent.change(within(form).getByLabelText('비밀번호'), { target: { value: 'Demo1234' } })
    fireEvent.change(within(form).getByLabelText('비밀번호 확인'), { target: { value: 'Demo1234' } })
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '가입 입력 확인 · 데모' }))

    // 가입 API가 아직 없어 세션이 생기지 않으므로, 회원 전용 작업 화면 대신 로그인 화면으로 안내합니다.
    expect(screen.getByRole('heading', { name: '다시 오셨군요' })).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
    for (const [url, options] of vi.mocked(fetch).mock.calls) {
      expect(String(url)).not.toMatch(/demo@example|Demo1234/)
      expect(options?.body).toBeUndefined()
    }
  })

  it.each(['short1', 'abcdefgh', '12345678'])('안내한 비밀번호 조건을 충족하지 못하면 이동하지 않는다: %s', (password) => {
    renderApp('/signup')
    const form = screen.getByRole('form', { name: '회원가입' })
    fireEvent.change(within(form).getByLabelText('이메일'), { target: { value: 'demo@example.test' } })
    fireEvent.change(within(form).getByLabelText('비밀번호'), { target: { value: password } })
    fireEvent.change(within(form).getByLabelText('비밀번호 확인'), { target: { value: password } })
    fireEvent.submit(form)
    expect(screen.getByRole('alert').textContent).toContain('8자')
    expect(document.activeElement).toBe(within(form).getByLabelText('비밀번호'))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('회원가입 데모 안내와 모바일에서도 보이는 공개 검색 링크를 제공한다', () => {
    renderApp('/signup')
    const form = screen.getByRole('form')
    expect(within(form).getByText(/입력값은 전송·저장되지 않습니다/)).toBeTruthy()
    expect(within(form).getByRole('link', { name: /없이 지원사업 검색/ }).getAttribute('href')).toBe('/')
    expect(within(form).getByLabelText('비밀번호').getAttribute('autocomplete')).toBe('off')
  })

  it.each(['', 'invalid-email'])('로그인은 빈 값과 잘못된 이메일을 서버에 보내지 않는다: %s', (email) => {
    const execute = vi.spyOn(appContainer.resolve('logInUseCase'), 'execute')
    renderApp('/login')
    const form = screen.getByRole('form', { name: '로그인' })
    fireEvent.change(within(form).getByLabelText('이메일'), { target: { value: email } })
    fireEvent.submit(form)
    expect(screen.getByRole('alert').textContent).toContain('이메일')
    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
    expect(execute).not.toHaveBeenCalled()
  })

  it('로그인에 성공하면 세션을 올리고 사이드바가 있는 작업 화면으로 이동한다', async () => {
    const execute = vi.spyOn(appContainer.resolve('logInUseCase'), 'execute').mockResolvedValue({
      outcome: 'session',
      session: { expiresAt: '2026-10-06T12:00:00+09:00', account: memberAccount },
    })
    renderApp('/login')
    const form = screen.getByRole('form', { name: '로그인' })
    fireEvent.change(within(form).getByLabelText('이메일'), { target: { value: ' Member@GovBiz.local ' } })
    fireEvent.change(within(form).getByLabelText('비밀번호'), { target: { value: 'govbiz-admin1' } })
    fireEvent.click(within(form).getByLabelText('로그인 상태 유지'))
    fireEvent.click(within(form).getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(screen.getByRole('complementary', { name: '작업 사이드바' })).toBeTruthy())
    expect(execute).toHaveBeenCalledWith({ email: 'Member@GovBiz.local', password: 'govbiz-admin1', rememberMe: true })
    expect(screen.queryByRole('banner', { name: '앱 헤더' })).toBeNull()
    expect(within(screen.getByRole('complementary', { name: '작업 사이드바' })).getByText('member@govbiz.local')).toBeTruthy()
  })

  it('잘못된 비밀번호·정지·시도 제한은 화면에 구분해 안내한다', async () => {
    const execute = vi.spyOn(appContainer.resolve('logInUseCase'), 'execute')
      .mockResolvedValueOnce({ outcome: 'invalid-credentials' })
      .mockResolvedValueOnce({ outcome: 'suspended' })
      .mockResolvedValueOnce({ outcome: 'rate-limited', retryAfterSeconds: 30 })
    renderApp('/login')
    const form = screen.getByRole('form', { name: '로그인' })
    fireEvent.change(within(form).getByLabelText('이메일'), { target: { value: 'member@govbiz.local' } })
    fireEvent.change(within(form).getByLabelText('비밀번호'), { target: { value: 'wrong' } })

    for (const message of [loginMessages.invalidCredentials, loginMessages.suspended, loginMessages.rateLimited(30)]) {
      fireEvent.click(within(form).getByRole('button', { name: '로그인' }))
      await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(message))
    }
    expect(execute).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('complementary', { name: '작업 사이드바' })).toBeNull()
  })

  it('비로그인으로 작업 화면에 들어가면 로그인으로 보내고 로그인 뒤 원래 화면으로 돌아간다', async () => {
    vi.spyOn(appContainer.resolve('logInUseCase'), 'execute').mockResolvedValue({
      outcome: 'session',
      session: { expiresAt: '2026-10-06T12:00:00+09:00', account: memberAccount },
    })
    renderApp('/app/partners', null)

    const form = screen.getByRole('form', { name: '로그인' })
    fireEvent.change(within(form).getByLabelText('이메일'), { target: { value: 'member@govbiz.local' } })
    fireEvent.change(within(form).getByLabelText('비밀번호'), { target: { value: 'govbiz-admin1' } })
    fireEvent.click(within(form).getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: '함께 신청할 기업 찾기' })).toBeTruthy())
  })

  it('로그인 상태에서 로그인·회원가입 화면은 작업 화면으로 돌려보낸다', () => {
    renderApp('/login', memberAccount)
    expect(screen.getByRole('complementary', { name: '작업 사이드바' })).toBeTruthy()
    expect(screen.queryByRole('form', { name: '로그인' })).toBeNull()
  })

  it('사이드바에서 로그아웃하면 공개 화면으로 돌아간다', async () => {
    vi.spyOn(appContainer.resolve('logOutUseCase'), 'execute').mockResolvedValue(undefined)
    renderApp('/app/chat')

    fireEvent.click(within(screen.getByRole('complementary', { name: '작업 사이드바' })).getByRole('button', { name: '로그아웃' }))

    await waitFor(() => expect(screen.getByRole('form', { name: '로그인' })).toBeTruthy())
  })

  it('관리자 메뉴와 화면은 관리자에게만 보인다', () => {
    renderApp('/app/admin/members', memberAccount)
    // 회원은 관리자 화면 대신 작업 채팅으로 돌아가고 메뉴도 보지 못합니다.
    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    expect(within(sidebar).queryByRole('link', { name: '회원·기업' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '회원·기업 목록' })).toBeNull()
    expect(within(sidebar).getByText('회원 · 기업 미등록')).toBeTruthy()
  })
})

describe('작업 화면 사이드바', () => {
  it('사이드바로 파트너 모집과 관리자 목록을 오간다', () => {
    renderApp('/app/chat', adminAccount)

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    fireEvent.click(within(sidebar).getByRole('link', { name: '파트너 모집' }))
    expect(screen.getByRole('heading', { name: '함께 신청할 기업 찾기' })).toBeTruthy()

    fireEvent.click(within(sidebar).getByRole('link', { name: '회원·기업' }))
    expect(screen.getByRole('heading', { name: '회원·기업 목록' })).toBeTruthy()
  })

  it('아직 화면이 없는 메뉴는 링크로 만들지 않는다', () => {
    renderApp('/app/chat')

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    expect(within(sidebar).queryByRole('link', { name: /관심 공고함/ })).toBeNull()
    expect(within(sidebar).getByText('관심 공고함')).toBeTruthy()
  })

  it('새 검색은 채팅 화면이 맡으므로 사이드바에는 두지 않는다', () => {
    renderApp('/app/chat')

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    expect(within(sidebar).queryByText('새 대화 시작')).toBeNull()

    const input = screen.getByRole('textbox', { name: '지원사업 검색어' })
    fireEvent.change(input, {
      target: { value: '수출 지원사업' },
    })
    expect(screen.queryByRole('button', { name: '새 검색' })).toBeNull()

    // 초안이 아닌 실제 대화가 시작되면 채팅 입력 영역에 새 검색을 제공합니다.
    fireEvent.submit(input.closest('form')!)
    expect(within(input.closest('form')!).getByRole('button', { name: '새 검색' })).toBeTruthy()
    expect(within(sidebar).queryByRole('button', { name: '새 검색' })).toBeNull()
  })
})

describe('기업 프로필 화면', () => {
  it('사이드바에서 내 프로필로 이동한다', () => {
    renderApp('/app/chat')

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    fireEvent.click(within(sidebar).getByRole('link', { name: '내 프로필' }))

    expect(screen.getByRole('heading', { name: '기업 프로필' })).toBeTruthy()
    expect(screen.getByRole('region', { name: '기업 기본정보' })).toBeTruthy()
  })

  it('아직 채우지 않은 선택 항목은 미입력으로 표시한다', () => {
    renderApp('/app/profile')

    const basics = screen.getByRole('region', { name: '기업 기본정보' })
    expect(within(basics).getByText('홈페이지')).toBeTruthy()
    expect(within(basics).getAllByText('미입력').length).toBe(2)
  })

  it('완성도는 체크리스트에서 끝난 항목으로 계산한다', () => {
    renderApp('/app/profile')

    const completion = screen.getByRole('progressbar', { name: '프로필 완성도' })
    expect(completion.getAttribute('aria-valuenow')).toBe('60')

    // 관심 분야를 모두 끄면 '참여 역할과 관심 분야' 항목이 끝나지 않은 상태가 됩니다.
    const settings = screen.getByRole('region', { name: '협업·파트너 설정' })
    for (const area of ['AI', '사업화']) {
      fireEvent.click(within(settings).getByRole('button', { name: area, pressed: true }))
    }

    expect(completion.getAttribute('aria-valuenow')).toBe('40')
  })

  it('담당자 정보와 서류 상태는 제안을 수락한 뒤에만 공개한다', () => {
    renderApp('/app/profile')

    const publicity = screen.getByRole('region', { name: '공개 범위' })
    const managerRow = within(publicity).getByText('담당자 이름·이메일').closest('tr')!
    const cells = within(managerRow).getAllByRole('cell')

    expect(cells[1]!.textContent).toBe('비공개')
    expect(cells[2]!.textContent).toBe('공개')
  })

  it('우대·인증 자격은 판정하지 않고 등록 상태만 표시한다', () => {
    renderApp('/app/profile')

    const qualifications = screen.getByRole('region', { name: '우대·인증 자격' })
    expect(within(qualifications).getByText('확인 필요')).toBeTruthy()
    expect(within(qualifications).getByText('보유 · 2027-03 만료')).toBeTruthy()
    expect(within(qualifications).queryByText('자격 있음')).toBeNull()
  })

  it('프로필 임시 변경은 저장된 것처럼 표시하지 않고 화면 재진입 시 초기화한다', () => {
    renderApp('/app/profile')
    expect(screen.getByText(/설정 변경은 저장·공개되지 않으며/)).toBeTruthy()
    const input = screen.getByLabelText('보유 역량·실적') as HTMLTextAreaElement
    const original = input.value
    fireEvent.change(input, { target: { value: '임시 데모 입력' } })
    fireEvent.click(screen.getByRole('link', { name: '파트너 모집' }))
    fireEvent.click(screen.getByRole('link', { name: '내 프로필' }))
    expect((screen.getByLabelText('보유 역량·실적') as HTMLTextAreaElement).value).toBe(original)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('파트너 모집 화면', () => {
  it('목록에서 모집글 상세로 이동해 매칭 결과와 제안 폼을 보여준다', () => {
    renderApp('/app/partners')

    expect(
      screen.getByRole('article', {
        name: 'AI 실증 과제 데이터 구축·라벨링 참여기관 구합니다',
      }),
    ).toBeTruthy()

    fireEvent.click(screen.getAllByRole('link', { name: '자세히 보기' })[0]!)

    expect(screen.getByRole('heading', { name: '모집글 상세' })).toBeTruthy()
    const proposal = screen.getByRole('form', { name: '참여 제안' })
    expect(within(proposal).getByLabelText('제안 메시지')).toBeTruthy()
    // 확인이 필요한 항목은 일치로 표시하지 않습니다.
    expect(screen.getAllByText('확인 필요').length).toBeGreaterThan(0)
  })

  it('제안 메시지 글자 수를 세어 보여준다', () => {
    renderApp('/app/partners/detail')

    const proposal = screen.getByRole('form', { name: '참여 제안' })
    fireEvent.change(within(proposal).getByLabelText('제안 메시지'), {
      target: { value: '안녕하세요' },
    })

    expect(within(proposal).getByText('5 / 500')).toBeTruthy()
  })

  it('모집글 작성에서 필요 역량을 추가하고 지운다', () => {
    renderApp('/app/partners/new')

    const form = screen.getByRole('form', { name: '모집글 작성' })
    const capabilityInput = within(form).getByLabelText('필요 역량')

    fireEvent.change(capabilityInput, { target: { value: '데이터 라벨링' } })
    fireEvent.keyDown(capabilityInput, { key: 'Enter' })
    expect(within(form).getByText('데이터 라벨링')).toBeTruthy()

    fireEvent.click(within(form).getByRole('button', { name: '데이터 라벨링 삭제' }))
    expect(within(form).queryByText('데이터 라벨링')).toBeNull()
  })

  it.each([{ isComposing: true }, { keyCode: 229 }])('한글 조합 Enter에서는 필요 역량 입력을 확정하거나 지우지 않는다: %o', (composition) => {
    renderApp('/app/partners/new')
    const input = screen.getByLabelText('필요 역량') as HTMLInputElement
    fireEvent.change(input, { target: { value: '데이터 구축' } })
    fireEvent.keyDown(input, { key: 'Enter', ...composition })
    expect(input.value).toBe('데이터 구축')
    expect(screen.queryByRole('button', { name: '데이터 구축 삭제' })).toBeNull()
  })

  it('모집글 입력을 확인하면 저장하지 않고 데모 목록으로 돌아간다', () => {
    renderApp('/app/partners/new')
    expect(screen.getByText('데모 입력 · 저장되지 않음')).toBeTruthy()
    expect(screen.queryByText(/임시 저장됨/)).toBeNull()
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '데모 모집글' } })
    fireEvent.change(screen.getByLabelText('본문'), { target: { value: '데모 소개' } })
    fireEvent.click(screen.getByRole('button', { name: '입력 확인 후 목록으로' }))

    expect(screen.getByRole('heading', { name: '함께 신청할 기업 찾기' })).toBeTruthy()
    expect(screen.queryByRole('article', { name: '데모 모집글' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('모집 마감일은 연결한 공고 마감일 이전만 고를 수 있다', () => {
    renderApp('/app/partners/new')

    const form = screen.getByRole('form', { name: '모집글 작성' })
    const deadline = within(form).getByLabelText('모집 마감일') as HTMLInputElement

    expect(deadline.max).toBe('2026-09-29')
    fireEvent.change(deadline, { target: { value: '2026-09-25' } })
    expect(deadline.value).toBe('2026-09-25')
  })

  it('공고 마감 당일은 모집 마감일로 제출하지 못한다', () => {
    renderApp('/app/partners/new')
    fireEvent.change(screen.getByLabelText('모집 마감일'), { target: { value: '2026-09-30' } })
    fireEvent.submit(screen.getByRole('form', { name: '모집글 작성' }))
    expect(screen.getByRole('alert').textContent).toContain('2026-09-29')
    expect(screen.getByRole('heading', { name: '모집글 작성', level: 1 })).toBeTruthy()
  })

  it('상세가 없는 카드는 다른 모집글 상세로 연결하지 않는다', () => {
    renderApp('/app/partners')
    expect(screen.getAllByRole('link', { name: '자세히 보기' }).length).toBe(1)
    expect(screen.getByRole('link', { name: '자세히 보기' }).getAttribute('href')).toBe('/app/partners/detail?recruitmentId=ai-labeling')
    const other = screen.getByRole('article', { name: /스마트공장 고도화/ })
    expect(within(other).queryByRole('link')).toBeNull()
    expect(within(other).getByText('상세 · 준비 중')).toBeTruthy()
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it.each(['smart-factory', '', 'ai-labeling&recruitmentId=smart-factory'])('준비되지 않은 상세 식별자는 첫 예시로 대체하지 않는다: %s', (id) => {
    renderApp(`/app/partners/detail?recruitmentId=${id}`)
    expect(screen.getByRole('heading', { name: '준비되지 않은 모집글 상세입니다' })).toBeTruthy()
    expect(screen.queryByRole('form', { name: '참여 제안' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('미연결 참여 제안은 보내진 것처럼 처리하지 않는다', () => {
    renderApp('/app/partners/detail?recruitmentId=ai-labeling')
    const button = screen.getByRole('button', { name: '참여 제안 보내기 · 준비 중' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByText(/제안은 전송되지 않습니다/)).toBeTruthy()
    fireEvent.click(button)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('아직 화면이 없는 기업 프로필 보기는 링크로 만들지 않는다', () => {
    renderApp('/app/partners/detail')

    expect(screen.queryByRole('link', { name: /기업 프로필 보기/ })).toBeNull()
    expect(screen.getByText('기업 프로필 보기 · 준비 중')).toBeTruthy()
  })
})

describe('관리자 회원·기업 목록', () => {
  it('회원 상태와 인증 여부에 따라 다른 조치를 보여준다', () => {
    renderApp('/app/admin/members')

    const list = screen.getByRole('region', { name: '회원·기업 목록' })
    expect(within(list).getByText('예시 소프트웨어 주식회사')).toBeTruthy()
    expect(within(list).getByText('제안 정지')).toBeTruthy()
    // 미인증 계정은 정지가 아니라 인증 메일 재발송을 먼저 제안합니다.
    expect(within(list).getAllByRole('button', { name: '인증 메일 재발송' }).length).toBe(2)
  })

  it('운영 규칙은 읽기만 하고 이 화면에서 바꾸지 않는다', () => {
    renderApp('/app/admin/members')

    const policies = screen.getByRole('region', { name: '모집·제안 운영 규칙' })
    expect(within(policies).getByText('제안 유효기간')).toBeTruthy()
    expect(within(policies).queryByRole('textbox')).toBeNull()
  })

  it('관리자 예시 조치와 단일 페이지 이전·다음은 실행 가능한 버튼으로 표시하지 않는다', () => {
    renderApp('/app/admin/members')
    expect(screen.getByText(/회원·정책은 예시이며/)).toBeTruthy()
    // 사이드바의 로그아웃은 실제 동작이므로 화면 본문의 버튼만 봅니다.
    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    for (const button of screen.getAllByRole('button').filter((element) => !sidebar.contains(element))) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
    expect(screen.getByRole('region', { name: '회원·기업 표 가로 스크롤' }).tabIndex).toBe(0)
    expect(fetch).not.toHaveBeenCalled()
  })
})

/** 로그인 전 화면은 비로그인으로, 작업 화면은 회원으로 시작합니다. `account`를 넘기면 그 계정으로 고정합니다. */
function renderApp(initialEntry: string, account: Account | null = defaultAccountFor(initialEntry)) {
  const store = createAppStore()
  store.dispatch(sessionRestored(account))
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </Provider>,
  )
}

function defaultAccountFor(initialEntry: string): Account | null {
  if (initialEntry.startsWith('/login') || initialEntry.startsWith('/signup')) return null
  return initialEntry.startsWith('/app/admin') ? adminAccount : memberAccount
}
