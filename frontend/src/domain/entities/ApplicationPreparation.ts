export const applicationServiceFields = ['CONSULTING', 'TECHNICAL_SUPPORT', 'MARKETING'] as const
export type ApplicationServiceField = typeof applicationServiceFields[number]

export const applicationServiceFieldLabels: Record<ApplicationServiceField, string> = {
  CONSULTING: '컨설팅',
  TECHNICAL_SUPPORT: '기술지원',
  MARKETING: '마케팅',
}

export type ApplicationFormSection = {
  key: string
  title: string
  locator: string
  description: string
  status: 'NOT_STARTED'
}

export type ApplicationForm = {
  formVersionId: string
  sourceCode: string
  sourceProgramId: string
  programTitle: string
  formTitle: string
  sourceUrl: string
  verificationStatus: 'SOURCE_HASH_AND_LOCATORS_VERIFIED'
  institutionReviewed: false
  supportedServiceFields: ApplicationServiceField[]
  sections: ApplicationFormSection[]
}

export type ApplicationPreparationSummary = {
  id: number
  inputRevision: number
  serviceField: ApplicationServiceField
  programTitle: string
  formTitle: string
  updatedAt: string
}

export type ApplicationPreparation = {
  id: number
  inputRevision: number
  serviceField: ApplicationServiceField
  createdAt: string
  updatedAt: string
  form: ApplicationForm
}

export type ApplicationPreparationPage = {
  items: ApplicationPreparationSummary[]
  nextBeforeId: number | null
}

export type NewApplicationPreparation = {
  sourceCode: string
  sourceProgramId: string
  formVersionId: string
  serviceField: ApplicationServiceField
}

export function validateNewApplicationPreparation(input: NewApplicationPreparation): NewApplicationPreparation {
  if (!input.sourceCode || !input.sourceProgramId || !/^[a-z0-9][a-z0-9-]{0,159}$/.test(input.formVersionId)) {
    throw new Error('지원 공고와 공식 양식을 다시 선택해 주세요.')
  }
  if (!applicationServiceFields.includes(input.serviceField)) throw new Error('작성할 지원 분야를 선택해 주세요.')
  return { ...input }
}
