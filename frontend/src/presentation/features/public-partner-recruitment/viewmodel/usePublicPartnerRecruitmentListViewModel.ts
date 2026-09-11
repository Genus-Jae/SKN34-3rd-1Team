import { useState } from 'react'

import type { PartnerRecruitmentSummary } from '../../../../domain/entities/PartnerRecruitment'
import {
  defaultPartnerRecruitmentQuery,
  partnerRecruitmentSortLabels,
  type PartnerRecruitmentQuery,
  type PartnerRecruitmentSort,
} from '../../../../domain/entities/PartnerRecruitmentQuery'
import { loginPathFor } from '../../../shared/auth/returnPath'
import { usePartnerRecruitmentBrowse } from '../../../shared/partner-recruitment/usePartnerRecruitmentBrowse'
import { publicPaths } from '../../../shared/routes/appPaths'

/**
 * 로그인 전 공개 파트너 모집 목록의 대표 ViewModel입니다. 모집 중인 글을 마감 임박순·최근 등록순으로 읽기만 제공하고,
 * 자세히 보기를 누르면 로그인하면 할 수 있는 일을 다이얼로그로 안내합니다.
 */
export function usePublicPartnerRecruitmentListViewModel() {
  const [query, setQuery] = useState<PartnerRecruitmentQuery>(defaultPartnerRecruitmentQuery)
  // 검색어는 입력 중인 초안으로 두었다가 조회 버튼(Enter)에서 적용합니다.
  const [keywordDraft, setKeywordDraft] = useState('')
  const { phase, page, retry } = usePartnerRecruitmentBrowse(query)
  // 자세히 보기를 누른 모집글입니다. 로그인·회원가입 뒤 그 모집글의 내부 상세로 돌아오도록 복귀 경로를 담습니다.
  const [promptRecruitmentId, setPromptRecruitmentId] = useState<number | null>(null)
  const promptReturnPath = promptRecruitmentId === null
    ? null
    : `${publicPaths.partnerDetail}?${new URLSearchParams({ recruitmentId: String(promptRecruitmentId) })}`

  return {
    phase,
    // 내가 쓴 모집글 구분은 로그인한 뒤에만 의미가 있으므로 공개 목록에서는 모두 남의 글로 보여 줍니다.
    recruitments: (page?.recruitments ?? []).map((recruitment) => ({ ...recruitment, isMine: false })),
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 0,
    currentPage: query.page,
    goToPage: (target: number) => setQuery((current) => ({ ...current, page: target })),
    retry,
    keyword: keywordDraft,
    updateKeyword: setKeywordDraft,
    /** 조회 버튼·Enter로 검색어를 적용하고 첫 페이지부터 읽습니다. */
    submitSearch: () => setQuery((current) => ({ ...current, keyword: keywordDraft.trim(), page: 1 })),
    sort: query.sort,
    sortOptions: (Object.keys(partnerRecruitmentSortLabels) as PartnerRecruitmentSort[])
      .map((sort) => ({ value: sort, label: partnerRecruitmentSortLabels[sort] })),
    /** 정렬을 바꾸면 첫 페이지부터 다시 읽습니다. */
    selectSort: (sort: PartnerRecruitmentSort) => setQuery((current) => ({ ...current, sort, page: 1 })),
    resultSummary: page === null
      ? partnerRecruitmentSortLabels[query.sort]
      : `모집 중 ${page.total}건 · ${partnerRecruitmentSortLabels[query.sort]}`,
    loginPrompt: promptReturnPath === null ? null : { loginPath: loginPathFor(promptReturnPath) },
    openLoginPrompt: (recruitment: PartnerRecruitmentSummary) => setPromptRecruitmentId(recruitment.id),
    closeLoginPrompt: () => setPromptRecruitmentId(null),
  }
}
