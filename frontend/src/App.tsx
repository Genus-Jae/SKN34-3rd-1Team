import { Navigate, Route, Routes } from 'react-router'

import { ChatPage } from './presentation/features/chat/view/ChatPage'
import { SupportProgramDetailPage } from './presentation/features/support-program-detail/view/SupportProgramDetailPage'
import { SupportProgramEvidenceQuestionPage } from './presentation/features/support-program-detail/view/SupportProgramEvidenceQuestionPage'
import { ReduxSampleItemPage } from './presentation/features/sample-item/view/ReduxSampleItemPage'
import { SampleItemPage } from './presentation/features/sample-item/view/SampleItemPage'
import { AppHeader } from './presentation/shared/app-header/AppHeader'

/** GovBiz의 첫 진입점은 공고를 찾는 채팅 화면입니다. 공용 헤더는 모든 화면 위에 놓입니다. */
function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<ChatPage />} />
      <Route path="/chat" element={<ChatPage layout="workspace" />} />
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
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </>
  )
}

export default App
