import type { PartnerRecruitment, PartnerRecruitmentInput, PartnerRecruitmentSummary } from '../entities/PartnerRecruitment'
import type { PartnerRecruitmentPage, PartnerRecruitmentQuery } from '../entities/PartnerRecruitmentQuery'

/** 작성 실패 사유는 화면이 다르게 안내해야 하므로 예외가 아닌 결과로 구분합니다. */
export type CreatePartnerRecruitmentResult =
  | { outcome: 'created'; recruitment: PartnerRecruitment }
  | { outcome: 'company-required' }
  | { outcome: 'program-not-found' }
  | { outcome: 'program-closed' }
  | { outcome: 'deadline-not-allowed'; latestAllowedDeadline: string | null }
  | { outcome: 'already-exists' }

/** 파트너 모집 기능이 Data Layer의 HTTP 세부사항과 분리되도록 하는 Domain 포트입니다. */
export interface PartnerRecruitmentRepository {
  /** 비로그인도 읽을 수 있습니다. 내 글 조건은 세션이 있을 때만 씁니다. */
  browse(query: PartnerRecruitmentQuery, signal?: AbortSignal): Promise<PartnerRecruitmentPage<PartnerRecruitmentSummary>>
  /** 없으면 null입니다. */
  getDetail(id: number, signal?: AbortSignal): Promise<PartnerRecruitment | null>
  create(input: PartnerRecruitmentInput, signal?: AbortSignal): Promise<CreatePartnerRecruitmentResult>
}
