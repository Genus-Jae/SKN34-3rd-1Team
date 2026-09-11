import type {
  ApplicationForm,
  ApplicationPreparation,
  ApplicationPreparationPage,
  NewApplicationPreparation,
  InterpretApplicationPreparation,
  ReplaceApplicationPreparationInputs,
  ApplicationInterpretation,
} from '../entities/ApplicationPreparation'

export interface ApplicationPreparationRepository {
  forms(signal?: AbortSignal): Promise<ApplicationForm[]>
  list(beforeId?: number, signal?: AbortSignal): Promise<ApplicationPreparationPage>
  get(id: number, signal?: AbortSignal): Promise<ApplicationPreparation>
  create(input: NewApplicationPreparation, signal?: AbortSignal): Promise<ApplicationPreparation>
  interpret(id: number, sectionKey: string, input: InterpretApplicationPreparation, signal?: AbortSignal): Promise<ApplicationInterpretation>
  replaceInputs(id: number, sectionKey: string, input: ReplaceApplicationPreparationInputs, signal?: AbortSignal): Promise<ApplicationPreparation>
}
