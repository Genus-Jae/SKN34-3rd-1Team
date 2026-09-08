import { Link, useLocation } from 'react-router'

import { appHeaderStyles } from './AppHeader.styles'

/** 경로별 현재 화면 이름입니다. 등록되지 않은 경로는 이름을 표시하지 않습니다. */
const pageTitles: Array<{ matches: (pathname: string) => boolean; title: string }> = [
  { matches: (pathname) => pathname === '/', title: 'AI 채팅' },
  { matches: (pathname) => pathname === '/support-programs/detail', title: '공고 상세' },
  { matches: (pathname) => pathname === '/support-programs/detail/question', title: '원문 질문' },
  { matches: (pathname) => pathname.startsWith('/examples/sample-item'), title: '상태관리 비교 예제' },
]

/**
 * 모든 화면 위에 놓이는 앱 헤더입니다. 브랜드, 가운데의 현재 화면 이름, 화면 이동 진입점만 담당하며
 * 특정 페이지 ViewModel에 속하지 않습니다. 로그인·계정 같은 앱 공통 진입점은 이 헤더에 추가합니다.
 */
export function AppHeader() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const currentTitle = pageTitles.find((page) => page.matches(pathname))?.title ?? null

  return (
    <header className={isLanding ? appHeaderStyles.landingHeader : appHeaderStyles.header} aria-label="앱 헤더">
      <Link className={isLanding ? appHeaderStyles.landingBrand : appHeaderStyles.brand} to="/">
        <span className={isLanding ? appHeaderStyles.landingBrandMark : appHeaderStyles.brandMark} aria-hidden="true">G</span>
        <span>
          <strong className={isLanding ? appHeaderStyles.landingBrandTitle : appHeaderStyles.brandTitle}>GovBiz</strong>
          <span className={isLanding ? 'sr-only' : appHeaderStyles.brandSubtitle}>지원사업 탐색 도우미</span>
        </span>
      </Link>

      <p className={isLanding ? 'sr-only' : appHeaderStyles.currentPage} aria-current="page">
        {currentTitle}
      </p>

      <nav className={isLanding ? appHeaderStyles.landingNav : appHeaderStyles.nav} aria-label="화면 이동">
        <div className={isLanding ? appHeaderStyles.landingNavLinks : 'contents'}>
          {isLanding ? <>
            <Link className={appHeaderStyles.landingNavLink} to="/" aria-current="page">지원사업 찾기</Link>
            <Link className={appHeaderStyles.landingNavLink} to="/partners" aria-label="파트너 모집 (데모)" title="현재 예시 화면으로 제공됩니다">파트너 모집</Link>
          </> : null}
          <Link className={isLanding ? appHeaderStyles.landingNavLink : appHeaderStyles.navLink} to="/examples/sample-item/hook">
            상태관리 비교 예제
          </Link>
        </div>
        <div className={isLanding ? appHeaderStyles.landingAccountLinks : 'contents'}>
          <Link className={isLanding ? appHeaderStyles.landingAccountButton : appHeaderStyles.navLink} to="/signup">
            회원가입
          </Link>
          {/* 세션 연결은 다음 단계입니다. 지금은 로그인 화면까지만 이동합니다. */}
          <Link className={isLanding ? appHeaderStyles.landingAccountButton : appHeaderStyles.loginButton} to="/login">
            로그인
          </Link>
        </div>
      </nav>
    </header>
  )
}
