import { Navigate, Outlet, Route, Routes } from 'react-router'

import { AdminMembersPage } from './presentation/features/admin/view/AdminMembersPage'
import { LoginPage } from './presentation/features/auth/view/LoginPage'
import { SignupPage } from './presentation/features/auth/view/SignupPage'
import { ChatPage } from './presentation/features/chat/view/ChatPage'
import { CompanyProfilePage } from './presentation/features/company-profile/view/CompanyProfilePage'
import { PartnerRecruitmentCreatePage } from './presentation/features/partner-recruitment/view/PartnerRecruitmentCreatePage'
import { PartnerRecruitmentDetailPage } from './presentation/features/partner-recruitment/view/PartnerRecruitmentDetailPage'
import { PartnerRecruitmentListPage } from './presentation/features/partner-recruitment/view/PartnerRecruitmentListPage'
import { PricingPage } from './presentation/features/pricing/view/PricingPage'
import { SupportProgramDetailPage } from './presentation/features/support-program-detail/view/SupportProgramDetailPage'
import { SupportProgramEvidenceQuestionPage } from './presentation/features/support-program-detail/view/SupportProgramEvidenceQuestionPage'
import { ReduxSampleItemPage } from './presentation/features/sample-item/view/ReduxSampleItemPage'
import { SampleItemPage } from './presentation/features/sample-item/view/SampleItemPage'
import { AppHeader } from './presentation/shared/app-header/AppHeader'
import { WorkspaceLayout } from './presentation/shared/app-sidebar/WorkspaceLayout'

/** 로그인 전 화면들의 레이아웃입니다. 공용 헤더가 브랜드와 로그인 진입점을 담당합니다. */
function PublicLayout() {
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  )
}

/**
 * GovBiz의 첫 진입점은 공고를 찾는 채팅 화면입니다.
 * 로그인 전 화면은 공용 헤더를, 로그인 뒤 작업 화면은 사이드바를 씁니다.
 * 로그인·회원가입은 둘 다 쓰지 않는 단독 화면입니다.
 */
function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route
          path="/support-programs/detail"
          element={<SupportProgramDetailPage />}
        />
        <Route
          path="/support-programs/detail/question"
          element={<SupportProgramEvidenceQuestionPage />}
        />
        <Route path="/examples/sample-item/hook" element={<SampleItemPage />} />
        <Route path="/examples/sample-item/redux" element={<ReduxSampleItemPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<WorkspaceLayout />}>
        <Route path="/chat" element={<ChatPage layout="workspace" />} />
        <Route path="/partners" element={<PartnerRecruitmentListPage />} />
        <Route path="/partners/new" element={<PartnerRecruitmentCreatePage />} />
        <Route path="/partners/detail" element={<PartnerRecruitmentDetailPage />} />
        <Route path="/profile" element={<CompanyProfilePage />} />
        <Route path="/admin/members" element={<AdminMembersPage />} />
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
