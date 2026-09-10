import { z } from 'zod'
import { applicationServiceFields } from '../../domain/entities/ApplicationPreparation'

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const time = z.string().datetime({ offset: true })
const serviceField = z.enum(applicationServiceFields)
const section = z.object({
  key: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
  title: z.string().min(1).max(100),
  locator: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  status: z.literal('NOT_STARTED'),
})

export const applicationFormSchema = z.object({
  formVersionId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,159}$/),
  sourceCode: z.string().min(1).max(64),
  sourceProgramId: z.string().min(1).max(255),
  programTitle: z.string().min(1).max(300),
  formTitle: z.string().min(1).max(300),
  sourceUrl: z.string().url().refine((value) => value.startsWith('https://')),
  verificationStatus: z.literal('SOURCE_HASH_AND_LOCATORS_VERIFIED'),
  institutionReviewed: z.literal(false),
  supportedServiceFields: z.array(serviceField).min(1).max(3).refine((fields) => new Set(fields).size === fields.length),
  sections: z.array(section).min(1),
}).refine((form) => new Set(form.sections.map(({ key }) => key)).size === form.sections.length, {
  message: '작성 항목 식별자가 중복되었습니다.',
})

export const supportedApplicationFormsSchema = z.object({
  items: z.array(applicationFormSchema).min(1).refine(
    (forms) => new Set(forms.map(({ formVersionId }) => formVersionId)).size === forms.length,
    { message: '양식 버전 식별자가 중복되었습니다.' },
  ),
})
export const applicationPreparationSummarySchema = z.object({
  id,
  inputRevision: id,
  serviceField,
  programTitle: z.string().min(1),
  formTitle: z.string().min(1),
  updatedAt: time,
})
export const applicationPreparationPageSchema = z.object({
  items: z.array(applicationPreparationSummarySchema).max(50).refine(
    (items) => new Set(items.map(({ id: itemId }) => itemId)).size === items.length,
    { message: '신청 준비 식별자가 중복되었습니다.' },
  ),
  nextBeforeId: id.nullable(),
})
export const applicationPreparationSchema = z.object({
  id,
  inputRevision: id,
  serviceField,
  createdAt: time,
  updatedAt: time,
  form: applicationFormSchema,
}).superRefine((value, context) => {
  if (!value.form.supportedServiceFields.includes(value.serviceField)) {
    context.addIssue({ code: 'custom', message: '지원 분야와 양식 계약이 일치하지 않습니다.' })
  }
})
export const applicationPreparationProblemSchema = z.object({ code: z.string() })
