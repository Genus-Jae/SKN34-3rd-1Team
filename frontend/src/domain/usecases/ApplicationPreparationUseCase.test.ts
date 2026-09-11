import { describe, expect, it, vi } from 'vitest'
import { ApplicationPreparationUseCase } from './ApplicationPreparationUseCase'

const repository = { forms: vi.fn(), discover: vi.fn(), list: vi.fn(), get: vi.fn(), create: vi.fn(), interpret: vi.fn(), replaceInputs: vi.fn() }
const useCase = new ApplicationPreparationUseCase(repository)
const valid = {
  sourceCode: 'BIZINFO',
  sourceProgramId: 'PBLN_000000000118979',
  formVersionId: 'verified-form-v1',
  serviceField: 'TECHNICAL_SUPPORT' as const,
}

describe('ApplicationPreparationUseCase', () => {
  it('passes a valid immutable creation selection to the repository', () => {
    useCase.create(valid)
    expect(repository.create).toHaveBeenCalledWith(valid, undefined)
  })

  it('rejects invalid ids and form selections before the repository', () => {
    expect(() => useCase.get(0)).toThrow('주소')
    expect(() => useCase.create({ ...valid, formVersionId: '잘못된 버전' })).toThrow('양식')
  })

  it('accepts a BizInfo id or official URL and rejects untrusted discovery input', () => {
    useCase.discover('PBLN_123')
    useCase.discover('https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_456')
    expect(repository.discover).toHaveBeenNthCalledWith(1, 'BIZINFO', 'PBLN_123', undefined)
    expect(repository.discover).toHaveBeenNthCalledWith(2, 'BIZINFO', 'PBLN_456', undefined)
    expect(() => useCase.discover('https://evil.example/?pblancId=PBLN_123')).toThrow('기업마당')
  })

  it('trims answers and rejects invalid section input before the repository', () => {
    useCase.interpret(1, 'company-overview', { expectedRevision: 1, requestKey: crypto.randomUUID(), message: '  우리 회사  ' })
    expect(repository.interpret).toHaveBeenCalledWith(
      1,
      'company-overview',
      expect.objectContaining({ message: '우리 회사' }),
      undefined,
    )
    expect(() => useCase.interpret(1, 'bad section', { expectedRevision: 1, requestKey: crypto.randomUUID(), message: '답변' })).toThrow('작성 항목')
  })
})
