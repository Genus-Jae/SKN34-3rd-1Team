import { validateNewApplicationPreparation, type InterpretApplicationPreparation, type NewApplicationPreparation, type ReplaceApplicationPreparationInputs } from '../entities/ApplicationPreparation'
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
  interpret(id: number, sectionKey: string, input: InterpretApplicationPreparation, signal?: AbortSignal) {
    if (!Number.isSafeInteger(id) || id <= 0 || !/^[a-z][a-z0-9-]{0,63}$/.test(sectionKey)) throw new Error('올바른 작성 항목이 아닙니다.')
    if (!input.message.trim() || input.message.trim().length > 4000) throw new Error('답변을 1~4000자로 입력해 주세요.')
    return this.repository.interpret(id, sectionKey, { ...input, message: input.message.trim() }, signal)
  }
  replaceInputs(id: number, sectionKey: string, input: ReplaceApplicationPreparationInputs, signal?: AbortSignal) {
    if (!Number.isSafeInteger(id) || id <= 0 || !/^[a-z][a-z0-9-]{0,63}$/.test(sectionKey)) throw new Error('올바른 작성 항목이 아닙니다.')
    if (new Set(input.facts.map(({ fieldKey }) => fieldKey)).size !== input.facts.length) throw new Error('같은 입력 항목이 중복되었습니다.')
    return this.repository.replaceInputs(id, sectionKey, input, signal)
  }
}
