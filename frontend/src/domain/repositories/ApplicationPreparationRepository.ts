import type {
  ApplicationForm,
  ApplicationPreparation,
  ApplicationPreparationPage,
  NewApplicationPreparation,
} from '../entities/ApplicationPreparation'

export interface ApplicationPreparationRepository {
  forms(signal?: AbortSignal): Promise<ApplicationForm[]>
  list(beforeId?: number, signal?: AbortSignal): Promise<ApplicationPreparationPage>
  get(id: number, signal?: AbortSignal): Promise<ApplicationPreparation>
  create(input: NewApplicationPreparation, signal?: AbortSignal): Promise<ApplicationPreparation>
}
