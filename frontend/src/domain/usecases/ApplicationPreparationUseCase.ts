import { validateNewApplicationPreparation, type NewApplicationPreparation } from '../entities/ApplicationPreparation'
import type { ApplicationPreparationRepository } from '../repositories/ApplicationPreparationRepository'

/** 지원 양식 조회와 신청 준비 건 생성·목록·상세는 AI 실행 없이 동작합니다. */
export class ApplicationPreparationUseCase {
  private readonly repository: ApplicationPreparationRepository

  constructor(repository: ApplicationPreparationRepository) {
    this.repository = repository
  }

  forms(signal?: AbortSignal) { return this.repository.forms(signal) }
  list(beforeId?: number, signal?: AbortSignal) { return this.repository.list(beforeId, signal) }
  get(id: number, signal?: AbortSignal) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('올바른 신청 준비 주소가 아닙니다.')
    return this.repository.get(id, signal)
  }
  create(input: NewApplicationPreparation, signal?: AbortSignal) {
    return this.repository.create(validateNewApplicationPreparation(input), signal)
  }
}
