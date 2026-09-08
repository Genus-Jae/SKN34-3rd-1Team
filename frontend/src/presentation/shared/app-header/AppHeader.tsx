import { Link, useLocation } from 'react-router'

import { useAuthSession } from '../auth/hooks/useAuthSession'
import { appHeaderStyles } from './AppHeader.styles'

/** 경로별 현재 화면 이름입니다. 등록되지 않은 경로는 이름을 표시하지 않습니다. */
const pageTitles: Array<{ matches: (pathname: string) => boolean; title: string }> = [
  { matches: (pathname) => pathname === '/', title: 'AI 채팅' },
  { matches: (pathname) => pathname === '/pricing' || pathname === '/pricing/', title: '요금제' },
  { matches: (pathname) => pathname === '/support-programs/detail', title: '공고 상세' },
  { matches: (pathname) => pathname === '/support-programs/detail/question', title: '원문 질문' },
  { matches: (pathname) => pathname.startsWith('/examples/sample-item'), title: '상태관리 비교 예제' },
]

/**
 * 로그인 전 화면 위에 놓이는 앱 헤더입니다. 브랜드, 가운데의 현재 화면 이름, 화면 이동과 계정 진입점만 담당하며
 * 특정 페이지 ViewModel에 속하지 않습니다. 로그인 상태는 shared의 `useAuthSession`에서 읽습니다.
 */
export function AppHeader() {
  const { pathname } = useLocation()
  const isPricing = pathname === '/pricing' || pathname === '/pricing/'
  const isMarketingPage = pathname === '/' || isPricing
  const currentTitle = pageTitles.find((page) => page.matches(pathname))?.title ?? null

  return (
    <header className={isMarketingPage ? appHeaderStyles.landingHeader : appHeaderStyles.header} aria-label="앱 헤더">
      <Link className={isMarketingPage ? appHeaderStyles.landingBrand : appHeaderStyles.brand} to="/">
        <span className={isMarketingPage ? appHeaderStyles.landingBrandMark : appHeaderStyles.brandMark} aria-hidden="true">G</span>
        <span>
          <strong className={isMarketingPage ? appHeaderStyles.landingBrandTitle : appHeaderStyles.brandTitle}>GovBiz</strong>
          <span className={isMarketingPage ? 'sr-only' : appHeaderStyles.brandSubtitle}>지원사업 탐색 도우미</span>
        </span>
      </Link>

      <p className={isMarketingPage ? 'sr-only' : appHeaderStyles.currentPage} aria-current="page">
        {currentTitle}
      </p>

      <nav className={isMarketingPage ? appHeaderStyles.landingNav : appHeaderStyles.nav} aria-label="화면 이동">
        <div className={isMarketingPage ? appHeaderStyles.landingNavLinks : 'contents'}>
          {isMarketingPage ? <>
            <Link className={appHeaderStyles.landingNavLink} to="/" aria-current={pathname === '/' ? 'page' : undefined}>지원사업 찾기</Link>
            <Link className={appHeaderStyles.landingNavLink} to="/partners" aria-label="파트너 모집 (데모)" title="현재 예시 화면으로 제공됩니다">파트너 모집</Link>
          </> : null}
          <Link
            className={isMarketingPage ? appHeaderStyles.landingNavLink : appHeaderStyles.navLink}
            to="/pricing"
            aria-current={isPricing ? 'page' : undefined}
          >
            요금제
          </Link>
          <Link className={isMarketingPage ? appHeaderStyles.landingNavLink : appHeaderStyles.navLink} to="/examples/sample-item/hook">
            상태관리 비교 예제
          </Link>
        </div>
        <AccountMenu isMarketingPage={isMarketingPage} />
      </nav>
    </header>
  )
}

/**
 * 세션 복원 전에는 아무것도 그리지 않아 로그인 버튼이 깜빡이지 않게 합니다. 로그인 뒤에는 작업 화면 링크와
 * 로그아웃을, 로그인 전에는 회원가입·로그인과 개발 빌드 전용 시드 로그인을 보여 줍니다.
 */
function AccountMenu({ isMarketingPage }: { isMarketingPage: boolean }) {
  const { account, status, logOut, logInAsDeveloper, isDevLoggingIn, devLogInError } = useAuthSession()

  if (status === 'unknown') return null

  if (account) {
    return (
      <div className={isMarketingPage ? appHeaderStyles.landingAccountLinks : appHeaderStyles.account}>
        <Link className={isMarketingPage ? appHeaderStyles.landingAccountButton : appHeaderStyles.loginButton} to="/chat">
          작업 화면
        </Link>
        <span className={appHeaderStyles.accountEmail} title={account.email}>{account.email}</span>
        <button className={appHeaderStyles.logoutButton} type="button" onClick={() => void logOut()}>
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <div className={isMarketingPage ? appHeaderStyles.landingAccountLinks : appHeaderStyles.account}>
      <Link className={isMarketingPage ? appHeaderStyles.landingAccountButton : appHeaderStyles.navLink} to="/signup">
        회원가입
      </Link>
      <Link className={isMarketingPage ? appHeaderStyles.landingAccountButton : appHeaderStyles.loginButton} to="/login">
        로그인
      </Link>
      {import.meta.env.DEV ? (
        <span className={appHeaderStyles.devLogin}>
          <button
            className={appHeaderStyles.devLoginButton}
            type="button"
            disabled={isDevLoggingIn}
            onClick={() => void logInAsDeveloper('ADMIN')}
          >
            개발 로그인 · 관리자
          </button>
          <button
            className={appHeaderStyles.devLoginButton}
            type="button"
            disabled={isDevLoggingIn}
            onClick={() => void logInAsDeveloper('USER')}
          >
            개발 로그인 · 회원
          </button>
          {devLogInError ? <span className={appHeaderStyles.devLoginError} role="alert">{devLogInError}</span> : null}
        </span>
      ) : null}
    </div>
  )
}
