import type {
  ApplicationForm,
  ApplicationPreparation,
  ApplicationPreparationPage,
  NewApplicationPreparation,
  InterpretApplicationPreparation,
  ReplaceApplicationPreparationInputs,
  ApplicationInterpretation,
  DiscoveredApplicationForms,
} from '../entities/ApplicationPreparation'

export interface ApplicationPreparationRepository {
  forms(signal?: AbortSignal): Promise<ApplicationForm[]>
  discover(sourceCode: string, sourceProgramId: string, signal?: AbortSignal): Promise<DiscoveredApplicationForms>
  list(beforeId?: number, signal?: AbortSignal): Promise<ApplicationPreparationPage>
  delete(id: number, signal?: AbortSignal): Promise<void>
  get(id: number, signal?: AbortSignal): Promise<ApplicationPreparation>
  create(input: NewApplicationPreparation, signal?: AbortSignal): Promise<ApplicationPreparation>
  interpret(id: number, sectionKey: string, input: InterpretApplicationPreparation, signal?: AbortSignal): Promise<ApplicationInterpretation>
  replaceInputs(id: number, sectionKey: string, input: ReplaceApplicationPreparationInputs, signal?: AbortSignal): Promise<ApplicationPreparation>
}
