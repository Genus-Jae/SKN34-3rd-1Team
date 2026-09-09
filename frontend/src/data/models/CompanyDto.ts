import { z } from 'zod'

import type { BusinessLookup, Company } from '../../domain/entities/Company'

const optionalText = z.string().nullable().optional().transform((value) => value ?? null)

export const businessLookupDtoSchema = z.object({
  businessNumber: z.string().regex(/^\d{10}$/),
  companyName: z.string().trim().min(1),
  businessStatus: z.string(),
  isActive: z.boolean(),
})

export const companyDtoSchema = z.object({
  businessNumber: z.string().regex(/^\d{10}$/),
  companyName: z.string().trim().min(1),
  businessStatus: z.string(),
  region: z.string().min(1),
  industry: z.string().min(1),
  foundedYear: z.number().int(),
  homepageUrl: optionalText,
  businessVerifiedAt: z.string(),
  updatedAt: z.string(),
})

export type BusinessLookupDto = z.infer<typeof businessLookupDtoSchema>
export type CompanyDto = z.infer<typeof companyDtoSchema>

/** DTO를 복사해 View가 외부 HTTP 응답 객체를 직접 보유하지 않게 합니다. */
export function toBusinessLookup(dto: BusinessLookupDto): BusinessLookup {
  return {
    businessNumber: dto.businessNumber,
    companyName: dto.companyName,
    businessStatus: dto.businessStatus,
    isActive: dto.isActive,
  }
}

export function toCompany(dto: CompanyDto): Company {
  return {
    businessNumber: dto.businessNumber,
    companyName: dto.companyName,
    businessStatus: dto.businessStatus,
    region: dto.region,
    industry: dto.industry,
    foundedYear: dto.foundedYear,
    homepageUrl: dto.homepageUrl,
    businessVerifiedAt: dto.businessVerifiedAt,
    updatedAt: dto.updatedAt,
  }
}
