// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createAppStore } from './app/store'

vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({
  CoreApiConnectionStatus: () => null,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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

  it('가입하면 사이드바가 있는 작업 화면으로 이동한다', () => {
    renderApp('/signup')

    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))

    expect(screen.getByRole('complementary', { name: '작업 사이드바' })).toBeTruthy()
    expect(screen.queryByRole('banner', { name: '앱 헤더' })).toBeNull()
  })
})

describe('작업 화면 사이드바', () => {
  it('사이드바로 파트너 모집과 관리자 목록을 오간다', () => {
    renderApp('/chat')

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    fireEvent.click(within(sidebar).getByRole('link', { name: '파트너 모집' }))
    expect(screen.getByRole('heading', { name: '함께 신청할 기업 찾기' })).toBeTruthy()

    fireEvent.click(within(sidebar).getByRole('link', { name: '회원·기업' }))
    expect(screen.getByRole('heading', { name: '회원·기업 목록' })).toBeTruthy()
  })

  it('아직 화면이 없는 메뉴는 링크로 만들지 않는다', () => {
    renderApp('/chat')

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    expect(within(sidebar).queryByRole('link', { name: /관심 공고함/ })).toBeNull()
    expect(within(sidebar).getByText('관심 공고함')).toBeTruthy()
  })

  it('새 검색은 채팅 화면이 맡으므로 사이드바에는 두지 않는다', () => {
    renderApp('/chat')

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    expect(within(sidebar).queryByText('새 대화 시작')).toBeNull()

    // 초기화할 대화가 생겼을 때 채팅 화면이 새 검색을 제공합니다.
    fireEvent.change(screen.getByRole('textbox', { name: '지원사업 검색어' }), {
      target: { value: '수출 지원사업' },
    })
    expect(screen.getByRole('button', { name: '새 검색' })).toBeTruthy()
  })
})

describe('기업 프로필 화면', () => {
  it('사이드바에서 내 프로필로 이동한다', () => {
    renderApp('/chat')

    const sidebar = screen.getByRole('complementary', { name: '작업 사이드바' })
    fireEvent.click(within(sidebar).getByRole('link', { name: '내 프로필' }))

    expect(screen.getByRole('heading', { name: '기업 프로필' })).toBeTruthy()
    expect(screen.getByRole('region', { name: '기업 기본정보' })).toBeTruthy()
  })

  it('아직 채우지 않은 선택 항목은 미입력으로 표시한다', () => {
    renderApp('/profile')

    const basics = screen.getByRole('region', { name: '기업 기본정보' })
    expect(within(basics).getByText('홈페이지')).toBeTruthy()
    expect(within(basics).getAllByText('미입력').length).toBe(2)
  })

  it('완성도는 체크리스트에서 끝난 항목으로 계산한다', () => {
    renderApp('/profile')

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
    renderApp('/profile')

    const publicity = screen.getByRole('region', { name: '공개 범위' })
    const managerRow = within(publicity).getByText('담당자 이름·이메일').closest('tr')!
    const cells = within(managerRow).getAllByRole('cell')

    expect(cells[1]!.textContent).toBe('비공개')
    expect(cells[2]!.textContent).toBe('공개')
  })

  it('우대·인증 자격은 판정하지 않고 등록 상태만 표시한다', () => {
    renderApp('/profile')

    const qualifications = screen.getByRole('region', { name: '우대·인증 자격' })
    expect(within(qualifications).getByText('확인 필요')).toBeTruthy()
    expect(within(qualifications).getByText('보유 · 2027-03 만료')).toBeTruthy()
    expect(within(qualifications).queryByText('자격 있음')).toBeNull()
  })
})

describe('파트너 모집 화면', () => {
  it('목록에서 모집글 상세로 이동해 매칭 결과와 제안 폼을 보여준다', () => {
    renderApp('/partners')

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
    renderApp('/partners/detail')

    const proposal = screen.getByRole('form', { name: '참여 제안' })
    fireEvent.change(within(proposal).getByLabelText('제안 메시지'), {
      target: { value: '안녕하세요' },
    })

    expect(within(proposal).getByText('5 / 500')).toBeTruthy()
  })

  it('모집글 작성에서 필요 역량을 추가하고 지운다', () => {
    renderApp('/partners/new')

    const form = screen.getByRole('form', { name: '모집글 작성' })
    const capabilityInput = within(form).getByLabelText('필요 역량')

    fireEvent.change(capabilityInput, { target: { value: '데이터 라벨링' } })
    fireEvent.keyDown(capabilityInput, { key: 'Enter' })
    expect(within(form).getByText('데이터 라벨링')).toBeTruthy()

    fireEvent.click(within(form).getByRole('button', { name: '데이터 라벨링 삭제' }))
    expect(within(form).queryByText('데이터 라벨링')).toBeNull()
  })

  it('모집글을 등록하면 목록으로 돌아간다', () => {
    renderApp('/partners/new')

    fireEvent.click(screen.getByRole('button', { name: '모집글 등록' }))

    expect(screen.getByRole('heading', { name: '함께 신청할 기업 찾기' })).toBeTruthy()
  })

  it('모집 마감일은 연결한 공고 마감일 이전만 고를 수 있다', () => {
    renderApp('/partners/new')

    const form = screen.getByRole('form', { name: '모집글 작성' })
    const deadline = within(form).getByLabelText('모집 마감일') as HTMLInputElement

    expect(deadline.max).toBe('2026-09-30')
    fireEvent.change(deadline, { target: { value: '2026-09-25' } })
    expect(deadline.value).toBe('2026-09-25')
  })

  it('아직 화면이 없는 기업 프로필 보기는 링크로 만들지 않는다', () => {
    renderApp('/partners/detail')

    expect(screen.queryByRole('link', { name: /기업 프로필 보기/ })).toBeNull()
    expect(screen.getByText('기업 프로필 보기 · 준비 중')).toBeTruthy()
  })
})

describe('관리자 회원·기업 목록', () => {
  it('회원 상태와 인증 여부에 따라 다른 조치를 보여준다', () => {
    renderApp('/admin/members')

    const list = screen.getByRole('region', { name: '회원·기업 목록' })
    expect(within(list).getByText('예시 소프트웨어 주식회사')).toBeTruthy()
    expect(within(list).getByText('제안 정지')).toBeTruthy()
    // 미인증 계정은 정지가 아니라 인증 메일 재발송을 먼저 제안합니다.
    expect(within(list).getAllByRole('button', { name: '인증 메일 재발송' }).length).toBe(2)
  })

  it('운영 규칙은 읽기만 하고 이 화면에서 바꾸지 않는다', () => {
    renderApp('/admin/members')

    const policies = screen.getByRole('region', { name: '모집·제안 운영 규칙' })
    expect(within(policies).getByText('제안 유효기간')).toBeTruthy()
    expect(within(policies).queryByRole('textbox')).toBeNull()
  })
})

function renderApp(initialEntry: string) {
  return render(
    <Provider store={createAppStore()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </Provider>,
  )
}
