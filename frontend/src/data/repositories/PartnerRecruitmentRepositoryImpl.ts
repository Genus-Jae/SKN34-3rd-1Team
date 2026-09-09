import type { PartnerRecruitment, PartnerRecruitmentInput, PartnerRecruitmentSummary } from '../../domain/entities/PartnerRecruitment'
import type { PartnerRecruitmentPage, PartnerRecruitmentQuery } from '../../domain/entities/PartnerRecruitmentQuery'
import type {
  CreatePartnerRecruitmentResult,
  PartnerRecruitmentRepository,
} from '../../domain/repositories/PartnerRecruitmentRepository'
import { AccountApiError } from '../api/accountApi'
import {
  browsePartnerRecruitmentsApi,
  createPartnerRecruitmentApi,
  getPartnerRecruitmentApi,
  PartnerRecruitmentApiError,
} from '../api/partnerRecruitmentApi'
import { toPartnerRecruitment, toPartnerRecruitmentPage } from '../models/PartnerRecruitmentDto'

/** Core API 모집글 DTO를 Domain 값으로 바꾸고, 화면이 구분해 안내할 실패는 결과로 돌려주는 adapter입니다. */
export class PartnerRecruitmentRepositoryImpl implements PartnerRecruitmentRepository {
  async browse(query: PartnerRecruitmentQuery, signal?: AbortSignal): Promise<PartnerRecruitmentPage<PartnerRecruitmentSummary>> {
    return toPartnerRecruitmentPage(await browsePartnerRecruitmentsApi(query, signal))
  }

  /** 없는 글(404)은 null입니다. */
  async getDetail(id: number, signal?: AbortSignal): Promise<PartnerRecruitment | null> {
    try {
      return toPartnerRecruitment(await getPartnerRecruitmentApi(id, signal))
    } catch (error) {
      if (error instanceof AccountApiError && error.status === 404 && error.code === 'RECRUITMENT_NOT_FOUND') return null
      throw error
    }
  }

  async create(input: PartnerRecruitmentInput, signal?: AbortSignal): Promise<CreatePartnerRecruitmentResult> {
    try {
      return { outcome: 'created', recruitment: toPartnerRecruitment(await createPartnerRecruitmentApi(input, signal)) }
    } catch (error) {
      if (error instanceof AccountApiError) {
        if (error.code === 'COMPANY_REQUIRED') return { outcome: 'company-required' }
        if (error.code === 'RECRUITMENT_PROGRAM_NOT_FOUND') return { outcome: 'program-not-found' }
        if (error.code === 'RECRUITMENT_PROGRAM_CLOSED') return { outcome: 'program-closed' }
        if (error.code === 'RECRUITMENT_DEADLINE_NOT_ALLOWED') {
          return {
            outcome: 'deadline-not-allowed',
            latestAllowedDeadline: error instanceof PartnerRecruitmentApiError ? error.latestAllowedDeadline : null,
          }
        }
        if (error.code === 'RECRUITMENT_ALREADY_EXISTS') return { outcome: 'already-exists' }
      }
      throw error
    }
  }
}
