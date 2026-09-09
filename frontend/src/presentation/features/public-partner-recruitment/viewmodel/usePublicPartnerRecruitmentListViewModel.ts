import { useState } from 'react'

import { defaultPartnerRecruitmentQuery, type PartnerRecruitmentQuery } from '../../../../domain/entities/PartnerRecruitmentQuery'
import { loginPathFor } from '../../../shared/auth/returnPath'
import { usePartnerRecruitmentBrowse } from '../../../shared/partner-recruitment/usePartnerRecruitmentBrowse'
import { publicPaths } from '../../../shared/routes/appPaths'

/**
 * 로그인 전 공개 파트너 모집 목록의 대표 ViewModel입니다. 모집 중인 글을 마감 임박순으로 읽기만 제공하고
 * 제안·작성·프로필 일치는 로그인으로 안내합니다.
 */
export function usePublicPartnerRecruitmentListViewModel() {
  const [query, setQuery] = useState<PartnerRecruitmentQuery>(defaultPartnerRecruitmentQuery)
  const { phase, page, retry } = usePartnerRecruitmentBrowse(query)

  return {
    phase,
    // 내가 쓴 모집글 구분은 로그인한 뒤에만 의미가 있으므로 공개 목록에서는 모두 남의 글로 보여 줍니다.
    recruitments: (page?.recruitments ?? []).map((recruitment) => ({ ...recruitment, isMine: false })),
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 0,
    currentPage: query.page,
    goToPage: (target: number) => setQuery((current) => ({ ...current, page: target })),
    retry,
    resultSummary: page === null ? '마감 임박순' : `모집 중 ${page.total}건 · 마감 임박순`,
    loginPath: loginPathFor(publicPaths.partners),
    signupPath: publicPaths.signup,
    // 로그인해야 할 수 있는 일을 화면 위쪽에서 한 번에 알립니다.
    memberBenefits: [
      '모집글에 참여 제안을 보내고 수락 뒤 담당자와 연락합니다.',
      '우리 기업 프로필과 모집 조건의 일치 항목을 확인합니다.',
      '공고에 묶인 모집글을 직접 올리고 제안을 받습니다.',
    ],
  }
}
