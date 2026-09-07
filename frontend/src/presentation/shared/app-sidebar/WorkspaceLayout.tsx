import { Outlet } from 'react-router'

import { AppSidebar } from './AppSidebar'
import { appSidebarStyles } from './AppSidebar.styles'

/**
 * 로그인 뒤 화면들의 공통 레이아웃입니다. 공용 헤더 대신 사이드바를 놓고 오른쪽에 각 화면을 그립니다.
 * 어떤 화면이 이 레이아웃에 들어가는지는 App의 라우트가 결정합니다.
 */
export function WorkspaceLayout() {
  return (
    <div className={appSidebarStyles.layout}>
      <AppSidebar />
      <div className={appSidebarStyles.workspace}>
        <Outlet />
      </div>
    </div>
  )
}
