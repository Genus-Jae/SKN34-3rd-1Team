import type {
  InterpretApplicationPreparation,
  NewApplicationPreparation,
  ReplaceApplicationPreparationInputs,
} from '../../domain/entities/ApplicationPreparation'
import type { ApplicationPreparationRepository } from '../../domain/repositories/ApplicationPreparationRepository'
import { ApplicationPreparationError } from '../../domain/errors/ApplicationPreparationError'
import { applicationPreparationRequest as request } from '../api/applicationPreparationApi'
import {
  applicationPreparationPageSchema,
  applicationPreparationSchema,
  supportedApplicationFormsSchema,
  applicationInterpretationSchema,
  discoveredApplicationFormsSchema,
} from '../models/ApplicationPreparationDto'

const cursor = (beforeId?: number) => `?size=20${beforeId === undefined ? '' : `&beforeId=${beforeId}`}`

export class ApplicationPreparationRepositoryImpl implements ApplicationPreparationRepository {
  async forms(signal?: AbortSignal) {
    return (await request('/forms', supportedApplicationFormsSchema, 'GET', undefined, signal)).items
  }
  discover(sourceCode: string, sourceProgramId: string, signal?: AbortSignal) {
    return request('/forms/discover', discoveredApplicationFormsSchema, 'POST', { sourceCode, sourceProgramId }, signal)
  }
  list(beforeId?: number, signal?: AbortSignal) {
    return request(cursor(beforeId), applicationPreparationPageSchema, 'GET', undefined, signal)
  }
  async get(id: number, signal?: AbortSignal) {
    const result = await request(`/${id}`, applicationPreparationSchema, 'GET', undefined, signal, 'preparation')
    if (result.id !== id) throw new ApplicationPreparationError(502, 'INVALID_RESPONSE')
    return result
  }
  async create(input: NewApplicationPreparation, signal?: AbortSignal) {
    const result = await request('', applicationPreparationSchema, 'POST', input, signal)
    if (
      result.form.sourceCode !== input.sourceCode ||
      result.form.sourceProgramId !== input.sourceProgramId ||
      result.form.formVersionId !== input.formVersionId ||
      result.serviceField !== input.serviceField
    ) {
      throw new ApplicationPreparationError(502, 'INVALID_RESPONSE')
    }
    return result
  }
  async interpret(id: number, sectionKey: string, input: InterpretApplicationPreparation, signal?: AbortSignal) {
    const result = await request(`/${id}/sections/${encodeURIComponent(sectionKey)}/messages`, applicationInterpretationSchema, 'POST', input, signal, 'preparation')
    if (result.inputRevision !== input.expectedRevision || result.sectionKey !== sectionKey) {
      throw new ApplicationPreparationError(502, 'INVALID_RESPONSE')
    }
    return result
  }
  async replaceInputs(id: number, sectionKey: string, input: ReplaceApplicationPreparationInputs, signal?: AbortSignal) {
    const result = await request(`/${id}/sections/${encodeURIComponent(sectionKey)}/inputs`, applicationPreparationSchema, 'PUT', input, signal, 'preparation')
    if (result.id !== id || result.inputRevision !== input.expectedRevision + 1) {
      throw new ApplicationPreparationError(502, 'INVALID_RESPONSE')
    }
    return result
  }
}
