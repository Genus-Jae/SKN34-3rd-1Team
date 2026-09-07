/** 모집글을 올린 기업입니다. 담당자 이름과 연락처는 제안을 수락한 뒤에만 공개하므로 여기에 두지 않습니다. */
export type PartnerRecruitmentCompany = {
  initial: string
  name: string
  profileSummary: string
  isEmailVerified: boolean
  /** 사업자등록번호가 형식 검사를 통과했는지입니다. 실제 사업자 여부를 보증하지는 않습니다. */
  isBusinessNumberChecked: boolean
}

/** 모집 조건과 내 프로필을 항목별로 비교한 결과입니다. GovBiz는 자격을 판정하지 않고 확인 필요로만 표시합니다. */
export type PartnerRecruitmentMatch = {
  label: string
  isMatched: boolean
}

/** 목록 카드가 필요로 하는 모집글 요약입니다. */
export type PartnerRecruitment = {
  id: string
  title: string
  recruitmentDeadline: string
  programTitle: string
  programOrganization: string
  programDeadline: string
  company: PartnerRecruitmentCompany
  conditionTags: string[]
  matchedConditionCount: number
  proposalCount: number
  /** 내 모집글에서 아직 열어 보지 않은 제안 수입니다. 남의 모집글이면 0입니다. */
  unreadProposalCount: number
  isMine: boolean
}

/** 상세 화면이 추가로 필요로 하는 값입니다. 공고 원문은 그대로 보여주고 해석을 덧붙이지 않습니다. */
export type PartnerRecruitmentDetail = PartnerRecruitment & {
  recruitmentStatusLabel: string
  recruitmentDeadlineDate: string
  programStatusLabel: string
  programDeadlineBadge: string
  /** 상세에서만 보여주는 작성 기업의 긴 소개입니다. 목록의 `company.profileSummary`보다 자세합니다. */
  companyDetailSummary: string
  conditions: Array<{ label: string; value: string }>
  programSummary: string
  programApplicationPeriodRaw: string
  programTargetRaw: string
  programSourceUrl: string
  introductionParagraphs: string[]
  preparationItems: string[]
  matches: PartnerRecruitmentMatch[]
}
