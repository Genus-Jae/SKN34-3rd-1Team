import { useLocation, useSearchParams } from 'react-router'

import { loginPathFor } from '../../../shared/auth/returnPath'
import { partnerRecruitmentDetail } from '../../../shared/partner-recruitment/partnerRecruitmentPlaceholders'

/**
 * 로그인 전 공개 모집글 상세의 대표 ViewModel입니다. 공고 원문과 모집 조건은 그대로 보여 주고,
 * 매칭·제안은 로그인 뒤 같은 화면으로 돌아오도록 안내합니다.
 */
export function usePublicPartnerRecruitmentDetailViewModel() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const requestedIds = searchParams.getAll('recruitmentId')
  const hasAvailableDetail = requestedIds.length === 0
    || (requestedIds.length === 1 && requestedIds[0] === partnerRecruitmentDetail.id)

  return {
    recruitment: hasAvailableDetail ? partnerRecruitmentDetail : null,
    // 로그인 뒤 내부 상세로 이어지도록 현재 주소를 복귀 경로로 넘깁니다.
    loginPath: loginPathFor(`${location.pathname}${location.search}`),
    signupPath: '/signup',
    proposalFlowSteps: ['대기', '수락 · 메시지', '컨소시엄 확정'],
  }
}
