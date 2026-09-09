import { useState } from 'react'

import { partnerRoleLabels, type PartnerRole } from '../../../../domain/entities/PartnerRecruitment'
import {
  defaultPartnerRecruitmentQuery,
  hasPartnerRecruitmentNarrowing,
  partnerRecruitmentSortLabels,
  type PartnerRecruitmentQuery,
  type PartnerRecruitmentSort,
} from '../../../../domain/entities/PartnerRecruitmentQuery'
import { regionNamesNationwideFirst } from '../../../../domain/entities/Region'
import { useAuthSession } from '../../../shared/auth/hooks/useAuthSession'
import { usePartnerRecruitmentBrowse } from '../../../shared/partner-recruitment/usePartnerRecruitmentBrowse'
import { appPaths } from '../../../shared/routes/appPaths'
import { toFilterChoiceOptions, type FilterChoiceOption } from '../../../shared/workspace/filterChoiceOptions'

const roleOptions: FilterChoiceOption[] = (Object.keys(partnerRoleLabels) as PartnerRole[])
  .map((role) => ({ value: role, label: partnerRoleLabels[role] }))
const regionOptions = toFilterChoiceOptions(regionNamesNationwideFirst)
const sortOptions: FilterChoiceOption[] = (Object.keys(partnerRecruitmentSortLabels) as PartnerRecruitmentSort[])
  .map((sort) => ({ value: sort, label: partnerRecruitmentSortLabels[sort] }))

/**
 * 파트너 모집 목록의 대표 ViewModel입니다. 검색어·찾는 역할·지역·내 글·정렬·페이지 조건을 소유하고
 * 모집 API로 조회하며, 세션의 기업 등록 여부로 작성 진입과 예시 추천 표시를 정합니다.
 */
export function usePartnerRecruitmentListViewModel() {
  const { account, hasCompany } = useAuthSession()
  const [query, setQuery] = useState<PartnerRecruitmentQuery>(defaultPartnerRecruitmentQuery)
  const { phase, page, retry } = usePartnerRecruitmentBrowse(query)

  /** 조건이 바뀌면 첫 페이지부터 다시 봅니다. */
  function update(patch: Partial<PartnerRecruitmentQuery>) {
    setQuery((current) => ({ ...current, page: 1, ...patch }))
  }

  return {
    hasCompany,
    /** 기업을 등록하지 않은 회원은 작성 대신 프로필로 안내합니다. */
    createPath: hasCompany ? appPaths.partnerNew : appPaths.profile,
    createLabel: hasCompany ? '모집글 작성' : '기업 등록 후 작성',
    phase,
    recruitments: page?.recruitments ?? [],
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 0,
    retry,
    query,
    roleOptions,
    regionOptions,
    sortOptions,
    updateKeyword: (keyword: string) => update({ keyword }),
    selectSeekingRole: (seekingRole: string) => update({ seekingRole: seekingRole as PartnerRole | '' }),
    selectRegion: (region: string) => update({ region }),
    toggleMineOnly: () => update({ mineOnly: !query.mineOnly }),
    selectSort: (sort: string) => update({ sort: sort as PartnerRecruitmentSort }),
    goToPage: (target: number) => setQuery((current) => ({ ...current, page: target })),
    hasActiveNarrowing: hasPartnerRecruitmentNarrowing(query),
    clearNarrowing: () => setQuery({ ...defaultPartnerRecruitmentQuery, sort: query.sort }),
    resultSummary: page === null ? partnerRecruitmentSortLabels[query.sort] : `${page.total}건 · ${partnerRecruitmentSortLabels[query.sort]}`,
    // 추천은 아직 예시입니다. 기업을 등록해야 계산할 수 있으므로 등록 전에는 비워 둡니다.
    recommendedRecruitments: hasCompany
      ? [
          {
            title: 'AI 실증 과제 데이터 구축·라벨링 참여기관',
            reasons: [
              { label: '지역 일치', isMatched: true },
              { label: '역할 일치', isMatched: true },
              { label: '역량 확인 필요', isMatched: false },
            ],
          },
          {
            title: '청년 창업기업 공동 R&D, AI 모델 개발 파트너',
            reasons: [
              { label: '분야 일치', isMatched: true },
              { label: '업력 일치', isMatched: true },
            ],
          },
        ]
      : [],
    profileSummary: hasCompany
      ? `${account?.company?.companyName} 기준 예시 추천입니다. 추천 API가 생기면 소재지·업종·설립연도 일치로 계산합니다.`
      : '기업을 등록하면 소재지·업종·설립연도로 모집 조건과의 일치를 보여 줍니다.',
    // 아직 API가 없는 기능은 목록에서 준비 중으로만 알립니다.
    upcomingFeatures: ['파트너 찾기(기업 검색)', '내 모집글 수정·마감', '프로필 기반 추천·매칭'],
  }
}
