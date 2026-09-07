/**
 * 우대·인증 서류의 등록 상태입니다. GovBiz는 자격을 판정하지 않고 등록된 상태만 표시하므로
 * '보유'와 '확인 필요'를 나누고, 판정 결과를 뜻하는 값은 두지 않습니다.
 */
export type CompanyQualificationStatus =
  | 'HELD'
  | 'NEEDS_CHECK'
  | 'NOT_APPLICABLE'
  | 'NOT_REGISTERED'

export type CompanyQualification = {
  label: string
  status: CompanyQualificationStatus
  /** 만료일처럼 상태를 보충하는 원문입니다. 없으면 null입니다. */
  detail: string | null
}

/**
 * 기업 프로필입니다. 지역·업종·업력은 추천 점수의 근거가 되고,
 * 역할·관심 분야·보유 역량은 파트너 매칭에서 다른 기업에게 보입니다.
 * 담당자 이름과 이메일은 파트너 제안을 수락하기 전까지 공개하지 않습니다.
 */
export type CompanyProfile = {
  companyName: string
  businessRegistrationNumber: string
  region: string
  industry: string
  foundedYear: number
  companyStage: string
  /** 선택 입력이라 아직 없으면 null입니다. */
  employeeCount: number | null
  homepageUrl: string | null
  introduction: string | null
  isDiscoverable: boolean
  availableRoles: string[]
  interestAreas: string[]
  capabilityNote: string
  qualifications: CompanyQualification[]
  managerName: string
  managerEmail: string
  isEmailVerified: boolean
}
