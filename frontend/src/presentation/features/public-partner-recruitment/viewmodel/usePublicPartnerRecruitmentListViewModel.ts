import { loginPathFor } from '../../../shared/auth/returnPath'
import {
  partnerRecruitmentDetail,
  partnerRecruitments,
  remainingRecruitmentCount,
} from '../../../shared/partner-recruitment/partnerRecruitmentPlaceholders'
import { publicPaths } from '../../../shared/routes/appPaths'

/**
 * 로그인 전 공개 파트너 모집 목록의 대표 ViewModel입니다. 읽기만 제공하고 제안·작성은 로그인으로 안내합니다.
 * 모집 API가 생기면 이 자리에서 같은 UseCase를 호출하고, 내 프로필 일치 같은 회원 전용 값은 계속 내려주지 않습니다.
 */
export function usePublicPartnerRecruitmentListViewModel() {
  return {
    // 내가 쓴 모집글 구분은 로그인한 뒤에만 의미가 있으므로 공개 목록에서는 모두 남의 글로 보여 줍니다.
    recruitments: partnerRecruitments.map((recruitment) => ({ ...recruitment, isMine: false })),
    availableDetailId: partnerRecruitmentDetail.id,
    remainingRecruitmentCount,
    resultSummary: '모집 중 12건 · 마감 임박순',
    loginPath: loginPathFor(publicPaths.partners),
    signupPath: '/signup',
    // 로그인해야 할 수 있는 일을 화면 위쪽에서 한 번에 알립니다.
    memberBenefits: [
      '모집글에 참여 제안을 보내고 수락 뒤 담당자와 연락합니다.',
      '우리 기업 프로필과 모집 조건의 일치 항목을 확인합니다.',
      '공고에 묶인 모집글을 직접 올리고 제안을 받습니다.',
    ],
  }
}
