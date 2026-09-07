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
  const currentTitle = pageTitles.find((page) => page.matches(pathname))?.title ?? null

  return (
    <header className={appHeaderStyles.header} aria-label="앱 헤더">
      <Link className={appHeaderStyles.brand} to="/">
        <span className={appHeaderStyles.brandMark} aria-hidden="true">G</span>
        <span>
          <strong className={appHeaderStyles.brandTitle}>GovBiz</strong>
          <span className={appHeaderStyles.brandSubtitle}>지원사업 탐색 도우미</span>
        </span>
      </Link>

      <p className={appHeaderStyles.currentPage} aria-current="page">
        {currentTitle}
      </p>

      <nav className={appHeaderStyles.nav} aria-label="화면 이동">
        <Link className={appHeaderStyles.navLink} to="/examples/sample-item/hook">
          상태관리 비교 예제
        </Link>
        <Link className={appHeaderStyles.navLink} to="/signup">
          회원가입
        </Link>
        {/* 세션 연결은 다음 단계입니다. 지금은 로그인 화면까지만 이동합니다. */}
        <Link className={appHeaderStyles.loginButton} to="/login">
          로그인
        </Link>
      </nav>
    </header>
  )
}
