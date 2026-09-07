import type { CompanyProfile } from '../../../../domain/entities/CompanyProfile'

// 화면을 먼저 만드는 단계에서 ViewModel이 쓰는 예시 값입니다. 실제 기업이 아닙니다.
// API가 생기면 이 상수 대신 UseCase 호출 결과를 반환합니다. 테스트용 fixture는 data/fixtures가 따로 맡습니다.
export const companyProfile: CompanyProfile = {
  companyName: '예시 소프트웨어 주식회사',
  businessRegistrationNumber: '000-00-00000',
  region: '서울특별시 강남구',
  industry: '소프트웨어 개발·공급',
  foundedYear: 2024,
  companyStage: '창업 3년 미만',
  employeeCount: 5,
  homepageUrl: null,
  introduction: null,
  isDiscoverable: true,
  availableRoles: ['참여기관'],
  interestAreas: ['AI', '사업화'],
  capabilityNote:
    'AI 기반 문서 분류 SaaS 개발. 2025년 공공기관 시범 도입 1건, 특허 출원 1건. 참여기관으로 기술 개발과 시스템 구축 역할을 맡을 수 있습니다.',
  qualifications: [
    { label: '중소기업 확인서', status: 'NEEDS_CHECK', detail: null },
    { label: '벤처기업 확인', status: 'HELD', detail: '2027-03 만료' },
    { label: '여성기업 · 장애인기업', status: 'NOT_APPLICABLE', detail: null },
    { label: '직접생산확인증명', status: 'NOT_REGISTERED', detail: null },
  ],
  managerName: '홍길동',
  managerEmail: 'manager@company.co.kr',
  isEmailVerified: true,
}

/** 프로필에서 고를 수 있는 값입니다. API가 생기면 서버가 내려주는 코드 목록으로 바꿉니다. */
export const selectableRoles = ['주관기관', '참여기관']
export const selectableInterestAreas = ['AI', '사업화', 'R&D', '수출']
