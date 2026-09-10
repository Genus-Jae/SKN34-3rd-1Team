import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { workspacePageStyles } from './WorkspacePage.styles'

/**
 * 로그인 뒤 작업 화면들이 함께 쓰는 머리글입니다. 제목을 왼쪽에, 버튼·태그 같은 동작을 오른쪽 끝에 둡니다.
 * - [parent]를 주면 "파트너 관리 › 모집글 작성"처럼 상위 화면 이름이 제목 앞에 링크로 붙어, 누르면 상위 화면으로 돌아갑니다.
 * - [tabs]를 주면 제목 바로 옆 같은 줄에 화면을 오가는 탭이 붙습니다.
 */
export function WorkspacePageHeader({
  parent,
  title,
  tabs,
  actions,
}: {
  parent?: { to: string; label: string }
  title: string
  tabs?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className={workspacePageStyles.header}>
      <div className={workspacePageStyles.headerTitleGroup}>
        {parent ? (
          <nav className={workspacePageStyles.headerCrumb} aria-label="상위 화면">
            <Link className={workspacePageStyles.headerCrumbLink} to={parent.to}>
              {parent.label}
            </Link>
            <svg
              className={workspacePageStyles.headerCrumbSeparator}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </nav>
        ) : null}
        <h1 className={workspacePageStyles.title}>{title}</h1>
      </div>
      {tabs ? (
        <>
          <span className={workspacePageStyles.headerDivider} aria-hidden="true" />
          <div className={workspacePageStyles.headerTabs}>{tabs}</div>
        </>
      ) : null}
      {actions ? <div className={workspacePageStyles.headerActions}>{actions}</div> : null}
    </header>
  )
}
