import type {
  PartnerRecruitment,
  PartnerRecruitmentDetail,
} from '../../../../domain/entities/PartnerRecruitment'

// 화면을 먼저 만드는 단계에서 ViewModel이 쓰는 예시 값입니다. 실제 공고·기업이 아닙니다.
// API가 생기면 이 상수 대신 UseCase 호출 결과를 반환합니다. 테스트용 fixture는 data/fixtures가 따로 맡습니다.
export const partnerRecruitments: PartnerRecruitment[] = [
  {
    id: 'ai-labeling',
    title: 'AI 실증 과제 데이터 구축·라벨링 참여기관 구합니다',
    recruitmentDeadline: '모집 마감 D-5',
    programTitle: '서울 AI 스타트업 실증 지원사업',
    programOrganization: '서울경제진흥원',
    programDeadline: '공고 마감 2026-09-30',
    company: {
      initial: '데',
      name: '데이터브릿지 주식회사',
      profileSummary: '서울 · 소프트웨어 · 설립 2021 · 주관기관',
      isEmailVerified: true,
      isBusinessNumberChecked: true,
    },
    conditionTags: ['찾는 역할 · 참여기관 1곳', '지역 · 수도권', '역량 · 데이터 구축, 라벨링'],
    matchedConditionCount: 3,
    proposalCount: 3,
    unreadProposalCount: 0,
    isMine: false,
  },
  {
    id: 'smart-factory',
    title: '스마트공장 고도화 과제, 제조 현장 보유 기업과 함께 하실 분',
    recruitmentDeadline: '모집 마감 D-9',
    programTitle: '2026 스마트제조 혁신 지원사업',
    programOrganization: '중소벤처기업부',
    programDeadline: '공고 마감 2026-10-08',
    company: {
      initial: '비',
      name: '비전솔루션',
      profileSummary: '경기 · 소프트웨어 · 설립 2019 · 참여기관 희망',
      isEmailVerified: true,
      isBusinessNumberChecked: true,
    },
    conditionTags: ['찾는 역할 · 주관기관', '지역 · 전국', '역량 · 제조 현장 보유'],
    matchedConditionCount: 1,
    proposalCount: 0,
    unreadProposalCount: 0,
    isMine: false,
  },
  {
    id: 'overseas-expo',
    title: '해외 전시회 공동 참가, 동남아 유통망 있는 기업 찾습니다',
    recruitmentDeadline: '모집 마감 D-12',
    programTitle: '수출 유망 중소기업 해외전시 지원',
    programOrganization: '코트라',
    programDeadline: '공고 마감 2026-10-15',
    company: {
      initial: '그',
      name: '그린푸드랩',
      profileSummary: '부산 · 식품 제조 · 설립 2018 · 주관기관',
      isEmailVerified: false,
      isBusinessNumberChecked: true,
    },
    conditionTags: ['찾는 역할 · 참여기관 2곳', '지역 · 전국', '역량 · 해외 유통'],
    matchedConditionCount: 0,
    proposalCount: 5,
    unreadProposalCount: 0,
    isMine: false,
  },
  {
    id: 'document-ai',
    title: '문서 분류 AI 사업화 과제, 공공 레퍼런스 보유 주관기관 찾습니다',
    recruitmentDeadline: '모집 마감 D-20',
    programTitle: '서울 AI 스타트업 실증 지원사업',
    programOrganization: '서울경제진흥원',
    programDeadline: '공고 마감 2026-09-30',
    company: {
      initial: '예',
      name: '예시 소프트웨어 주식회사',
      profileSummary: '서울 · 소프트웨어 · 설립 2024 · 참여기관',
      isEmailVerified: true,
      isBusinessNumberChecked: true,
    },
    conditionTags: ['찾는 역할 · 주관기관', '지역 · 서울'],
    matchedConditionCount: 0,
    proposalCount: 2,
    unreadProposalCount: 1,
    isMine: true,
  },
]

/** 목록에 아직 싣지 않은 모집글 수입니다. 페이지 조회 API가 생기면 응답의 남은 건수로 바꿉니다. */
export const remainingRecruitmentCount = 8

/** 상세 화면 예시입니다. 목록에서 어떤 카드를 눌러도 지금은 이 하나를 보여줍니다. */
export const partnerRecruitmentDetail: PartnerRecruitmentDetail = {
  ...partnerRecruitments[0],
  recruitmentStatusLabel: '모집 중',
  recruitmentDeadlineDate: '2026-09-20',
  programStatusLabel: '접수 중',
  programDeadlineBadge: 'D-15',
  companyDetailSummary: '서울 강남구 · 소프트웨어 개발·공급 · 설립 2021 · 직원 18명 · 이 과제의 주관기관',
  conditions: [
    { label: '찾는 역할', value: '참여기관 1곳' },
    { label: '희망 지역', value: '서울·경기·인천' },
    { label: '희망 업력', value: '무관' },
    { label: '필요 역량', value: '데이터 구축, 라벨링 운영' },
    { label: '우대 사항', value: '공공 데이터 구축 실적' },
    { label: '제안 현황', value: '3건 접수 · 검토 중' },
  ],
  programSummary:
    '서울 소재 AI 스타트업이 공공·민간 수요처와 실증 과제를 수행하도록 지원합니다. 주관기관 1곳과 참여기관 1곳 이상으로 컨소시엄을 구성해 신청합니다.',
  programApplicationPeriodRaw: '2026. 9. 1. ~ 2026. 9. 30. 18:00',
  programTargetRaw: '서울 소재 창업 7년 이내 AI 기업 (컨소시엄 구성 시 참여기관은 지역 무관)',
  programSourceUrl: 'https://www.bizinfo.go.kr',
  introductionParagraphs: [
    '저희는 문서 분류 AI를 공공기관 민원 시스템에 적용하는 실증 과제를 준비 중입니다. 학습용 민원 문서 약 5만 건의 정제와 라벨링을 맡아 주실 참여기관을 찾습니다. 라벨링 가이드는 저희가 작성하고, 참여기관은 인력 운영과 품질 검수를 담당합니다.',
    '예산 배분은 총 사업비의 30% 내외를 참여기관 몫으로 생각하고 있으며, 세부 비율은 협의 가능합니다. 9월 22일까지 컨소시엄 협약서 초안을 마무리하고 9월 26일 신청서를 제출할 계획입니다.',
  ],
  preparationItems: [
    '컨소시엄 협약서 및 역할 분담표',
    '참여기관 사업자등록증, 중소기업 확인서',
    '데이터 구축 실적 증빙 1건 이상',
  ],
  matches: [
    { label: '지역 · 서울', isMatched: true },
    { label: '역할 · 참여기관 가능', isMatched: true },
    { label: '관심 분야 · AI', isMatched: true },
    { label: '역량 · 데이터 구축 실적', isMatched: false },
    { label: '서류 · 중소기업 확인서', isMatched: false },
  ],
}

/** 모집글 작성 화면에서 "우리 기업"으로 보여주는 예시입니다. 프로필 API가 생기면 내 프로필 조회 결과로 바꿉니다. */
export const ownCompany = {
  initial: '예',
  name: '예시 소프트웨어 주식회사',
  profileSummary: '서울 · 소프트웨어 · 설립 2024 · 창업 3년 미만',
  isEmailVerified: true,
  isBusinessNumberChecked: true,
  profileCompletionPercent: 60,
}

/** 모집글에 연결할 공고 예시입니다. 관심 공고함이 생기면 거기서 고른 공고로 바꿉니다. */
export const selectedProgram = {
  title: '서울 AI 스타트업 실증 지원사업',
  organization: '서울경제진흥원',
  deadlineDate: '2026-09-30',
  deadline: '공고 마감 2026-09-30',
  source: '기업마당 · 접수 중',
  selectedFrom: '관심 공고함에서 선택됨',
  targetRaw: '서울 소재 창업 7년 이내 AI 기업',
}
