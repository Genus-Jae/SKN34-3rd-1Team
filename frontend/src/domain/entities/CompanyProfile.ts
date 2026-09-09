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
 * 아직 API가 없는 프로필 섹션(협업·파트너 설정, 우대·인증 자격, 담당자·알림)의 예시 값입니다.
 * 기업 기본정보는 `Company`가 맡습니다. 담당자 이름과 이메일은 파트너 제안을 수락하기 전까지 공개하지 않습니다.
 */
export type CompanyProfileDemo = {
  isDiscoverable: boolean
  availableRoles: string[]
  interestAreas: string[]
  capabilityNote: string
  qualifications: CompanyQualification[]
  managerName: string
  managerEmail: string
  isEmailVerified: boolean
}
