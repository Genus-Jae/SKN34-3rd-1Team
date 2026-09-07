/** 운영자가 회원 목록에서 구분해야 하는 계정 상태입니다. 정지 사유는 감사 로그에 따로 남습니다. */
export type AdminMemberStatus = 'ACTIVE' | 'REPORTED' | 'PROPOSAL_BLOCKED' | 'PENDING'

/** 어드민 회원·기업 목록의 한 행입니다. 기업 하나에 담당자 계정 하나를 전제로 합니다. */
export type AdminMember = {
  id: string
  companyName: string
  managerEmail: string
  isEmailVerified: boolean
  profileCompletionPercent: number
  recruitmentCount: number
  proposalCount: number
  joinedOn: string
  status: AdminMemberStatus
}
