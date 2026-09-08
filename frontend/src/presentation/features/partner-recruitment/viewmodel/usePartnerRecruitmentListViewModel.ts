import { partnerRecruitmentDetail, partnerRecruitments, remainingRecruitmentCount } from '../../../shared/partner-recruitment/partnerRecruitmentPlaceholders'

/**
 * 파트너 모집 목록의 대표 ViewModel입니다. 목록과 사이드 요약이 쓸 값을 모아 돌려줍니다.
 * 모집 API가 생기면 이 자리에서 UseCase를 호출하고 View는 그대로 둡니다.
 */
export function usePartnerRecruitmentListViewModel() {
  return {
    recruitments: partnerRecruitments,
    availableDetailId: partnerRecruitmentDetail.id,
    remainingRecruitmentCount,
    tabs: [
      { label: '모집글', isActive: true },
      { label: '파트너 찾기', isActive: false },
      { label: '내 활동', isActive: false, count: '3' },
    ],
    filters: [
      { label: '찾는 역할: 참여기관', isActive: true },
      { label: '지역: 서울·수도권', isActive: true },
      { label: '분야', isActive: false },
      { label: '공고 마감', isActive: false },
      { label: '내 프로필과 맞는 모집만', isActive: false },
    ],
    resultSummary: '모집 중 12건 · 마감 임박순',
    profileSummary: '서울 · 소프트웨어 · 참여기관 가능 · 관심 분야 AI 기준입니다. 일치 항목만 근거로 정렬합니다.',
    // 일치한 항목만 추천 근거로 쓰고, 확인이 필요한 항목은 따로 표시합니다.
    recommendedRecruitments: [
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
    ],
    activityStats: [
      { value: '1', label: '내 모집글' },
      { value: '2', label: '받은 제안' },
      { value: '1', label: '보낸 제안' },
    ],
  }
}
