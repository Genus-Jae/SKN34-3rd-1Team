import { afterEach, describe, expect, it, vi } from 'vitest'

import { CompanyRepositoryImpl } from '../../repositories/CompanyRepositoryImpl'
import { getMyCompanyApi, lookupBusinessApi, registerCompanyApi, updateCompanyApi } from '../companyApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

const lookup = {
  businessNumber: '1248100998',
  companyName: '삼성전자(주)',
  businessStatus: '계속사업자',
  isActive: true,
}
const company = {
  businessNumber: '1248100998',
  companyName: '삼성전자(주)',
  businessStatus: '계속사업자',
  region: '서울특별시',
  industry: '정보통신업',
  foundedYear: 2020,
  homepageUrl: null,
  businessVerifiedAt: '2026-09-08T10:00:00',
  updatedAt: '2026-09-08T10:00:00',
}
const profile = { region: '서울특별시', industry: '정보통신업', foundedYear: 2020, homepageUrl: null }

describe('companyApi', () => {
  it('sends the lookup as a query parameter with cookies and validates the preview', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(lookup))
    vi.stubGlobal('fetch', fetchMock)

    await expect(lookupBusinessApi('1248100998')).resolves.toEqual(lookup)

    const [requestUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const url = new URL(requestUrl)
    expect(url.pathname).toBe('/api/v1/me/company/lookup')
    expect(url.searchParams.get('businessNumber')).toBe('1248100998')
    expect(init.credentials).toBe('include')
  })

  it('registers with the number and profile, updates with the profile only, and tolerates omitted optional fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(company, 201))
      .mockResolvedValueOnce(jsonResponse({ ...company, homepageUrl: undefined }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(registerCompanyApi('1248100998', profile)).resolves.toEqual(company)
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({ businessNumber: '1248100998', ...profile })

    await expect(updateCompanyApi(profile)).resolves.toMatchObject({ homepageUrl: null })
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(init.method).toBe('PUT')
    expect(JSON.parse(String(init.body))).toEqual(profile)
  })

  it('rejects a company response without the tax service fields', async () => {
    const { companyName: _name, ...withoutName } = company
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(withoutName)))

    await expect(getMyCompanyApi()).rejects.toThrow()
  })
})

describe('CompanyRepositoryImpl', () => {
  it('maps not-registered to null and business problems to outcomes, rethrowing the rest', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(problemResponse(404, 'COMPANY_NOT_REGISTERED'))
      .mockResolvedValueOnce(problemResponse(404, 'BUSINESS_NOT_FOUND'))
      .mockResolvedValueOnce(problemResponse(503, 'BIZNO_NOT_CONFIGURED'))
      .mockResolvedValueOnce(problemResponse(422, 'BUSINESS_NOT_ACTIVE', { businessStatus: '폐업자' }))
      .mockResolvedValueOnce(problemResponse(409, 'BUSINESS_NUMBER_ALREADY_REGISTERED'))
      .mockResolvedValueOnce(problemResponse(409, 'COMPANY_ALREADY_REGISTERED'))
      .mockResolvedValueOnce(problemResponse(401, 'AUTHENTICATION_REQUIRED')))
    const repository = new CompanyRepositoryImpl()

    await expect(repository.getMyCompany()).resolves.toBeNull()
    await expect(repository.lookupBusiness('1234567890')).resolves.toEqual({ outcome: 'not-found' })
    await expect(repository.lookupBusiness('1234567890')).resolves.toEqual({ outcome: 'lookup-unavailable' })
    await expect(repository.registerCompany('1112233334', profile)).resolves.toEqual({ outcome: 'business-not-active', businessStatus: '폐업자' })
    await expect(repository.registerCompany('1248100998', profile)).resolves.toEqual({ outcome: 'business-number-taken' })
    await expect(repository.registerCompany('1248100998', profile)).resolves.toEqual({ outcome: 'already-registered' })
    await expect(repository.registerCompany('1248100998', profile)).rejects.toMatchObject({ status: 401 })
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function problemResponse(status: number, code: string | null, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ status, code, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}
