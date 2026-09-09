import { type FormEvent, useEffect, useRef, useState } from 'react'

import { appContainer } from '../../../../app/appContainer'
import { useAppDispatch } from '../../../../app/hooks'
import type { Account } from '../../../../domain/entities/Account'
import {
  type BusinessLookup,
  type Company,
  type CompanyProfileInput,
  companyIndustries,
  companyProfileLimits,
  companyRegions,
  formatBusinessNumber,
  isValidBusinessNumber,
} from '../../../../domain/entities/Company'
import type {
  GetMyCompanyUseCase,
  LookupBusinessUseCase,
  RegisterCompanyUseCase,
  UpdateCompanyUseCase,
} from '../../../../domain/usecases/CompanyUseCases'
import { useAuthSession } from '../../../shared/auth/hooks/useAuthSession'
import { signedIn } from '../../../shared/auth/state/authSlice'
import {
  companyProfileDemo,
  selectableInterestAreas,
  selectableRoles,
} from './companyProfilePlaceholders'

export const companyProfileMessages = {
  businessNumberInvalid: '사업자등록번호는 숫자 10자리로 입력해 주세요.',
  businessNotFound: '등록되지 않은 사업자등록번호입니다.',
  businessNotActive: (status: string | null) =>
    status === null ? '휴업·폐업 사업자는 등록할 수 없습니다.' : `${status} 상태의 사업자는 등록할 수 없습니다.`,
  lookupUnavailable: '사업자등록번호 조회가 지금은 되지 않습니다. 잠시 후 다시 시도해 주세요.',
  lookupRequired: '사업자등록번호를 먼저 조회해 주세요.',
  businessNumberTaken: '다른 계정이 이미 등록한 사업자등록번호입니다.',
  alreadyRegistered: '이 계정에는 이미 기업이 등록되어 있습니다. 화면을 새로고침해 주세요.',
  regionRequired: '소재지를 선택해 주세요.',
  industryRequired: '업종을 선택해 주세요.',
  foundedYearInvalid: (maxYear: number) =>
    `설립연도는 ${companyProfileLimits.foundedYearMin}년부터 ${maxYear}년까지 입력할 수 있습니다.`,
  homepageTooLong: `홈페이지 주소는 ${companyProfileLimits.homepageMaxLength}자 이하로 입력해 주세요.`,
  saveFailed: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  saved: '기업 정보를 저장했습니다.',
  registered: '기업을 등록했습니다. 이제 파트너 모집글을 작성할 수 있습니다.',
} as const

/** 프로필을 얼마나 채웠는지 보여주는 항목입니다. 완성도는 이 목록에서 끝난 항목의 비율입니다. */
type ChecklistItem = { label: string; isDone: boolean }

type CompanyState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'unregistered' }
  | { status: 'registered'; company: Company }

type LookupState =
  | { status: 'idle' }
  | { status: 'looking' }
  | { status: 'found'; business: BusinessLookup }
  | { status: 'failed'; message: string }

export type ProfileFormValues = {
  region: string
  industry: string
  foundedYear: string
  homepageUrl: string
}

type FormError = { field: keyof ProfileFormValues | 'businessNumber' | null; message: string }

type CompanyUseCases = {
  getMyCompany: Pick<GetMyCompanyUseCase, 'execute'>
  lookupBusiness: Pick<LookupBusinessUseCase, 'execute'>
  registerCompany: Pick<RegisterCompanyUseCase, 'execute'>
  updateCompany: Pick<UpdateCompanyUseCase, 'execute'>
}

const emptyForm: ProfileFormValues = {
  region: '',
  industry: '',
  foundedYear: '',
  homepageUrl: '',
}

/**
 * 기업 프로필의 대표 ViewModel입니다. 기업 기본정보는 API에서 읽어 등록·수정 폼과 완성도를 계산하고,
 * 아직 API가 없는 공개 범위 토글·역할·관심 분야·알림 설정은 예시 값과 화면 상태로만 유지합니다.
 */
export function useCompanyProfileViewModel(useCases: Partial<CompanyUseCases> = {}) {
  const resolved: CompanyUseCases = {
    getMyCompany: useCases.getMyCompany ?? appContainer.resolve('getMyCompanyUseCase'),
    lookupBusiness: useCases.lookupBusiness ?? appContainer.resolve('lookupBusinessUseCase'),
    registerCompany: useCases.registerCompany ?? appContainer.resolve('registerCompanyUseCase'),
    updateCompany: useCases.updateCompany ?? appContainer.resolve('updateCompanyUseCase'),
  }
  const { account } = useAuthSession()
  const dispatchToStore = useAppDispatch()
  const isMounted = useRef(true)
  const currentYear = new Date().getFullYear()

  const [companyState, setCompanyState] = useState<CompanyState>({ status: 'loading' })
  const [businessNumber, setBusinessNumber] = useState('')
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' })
  const [form, setForm] = useState<ProfileFormValues>(emptyForm)
  const [formError, setFormError] = useState<FormError | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [isDiscoverable, setIsDiscoverable] = useState(companyProfileDemo.isDiscoverable)
  const [availableRoles, setAvailableRoles] = useState(companyProfileDemo.availableRoles)
  const [interestAreas, setInterestAreas] = useState(companyProfileDemo.interestAreas)
  const [capabilityNote, setCapabilityNote] = useState(companyProfileDemo.capabilityNote)
  const [notifications, setNotifications] = useState({
    savedProgramDeadline: true,
    partnerProposal: true,
    newMatchingProgram: false,
  })

  useEffect(() => {
    isMounted.current = true
    const controller = new AbortController()
    resolved.getMyCompany.execute(controller.signal)
      .then((company) => {
        if (!isMounted.current) return
        if (company === null) {
          setCompanyState({ status: 'unregistered' })
        } else {
          setCompanyState({ status: 'registered', company })
          setForm(toFormValues(company))
        }
      })
      .catch(() => {
        if (isMounted.current) setCompanyState({ status: 'error' })
      })
    return () => {
      isMounted.current = false
      controller.abort()
    }
    // 화면에 들어올 때 한 번만 불러오고, 이후 변경은 저장 응답으로 반영합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function lookupBusiness() {
    if (lookup.status === 'looking') return
    if (!isValidBusinessNumber(businessNumber)) {
      setFormError({ field: 'businessNumber', message: companyProfileMessages.businessNumberInvalid })
      return
    }
    setFormError(null)
    setLookup({ status: 'looking' })
    try {
      const result = await resolved.lookupBusiness.execute(businessNumber)
      if (!isMounted.current) return
      if (result.outcome === 'found') {
        setLookup({ status: 'found', business: result.business })
        return
      }
      setLookup({
        status: 'failed',
        message: result.outcome === 'not-found'
          ? companyProfileMessages.businessNotFound
          : companyProfileMessages.lookupUnavailable,
      })
    } catch {
      if (isMounted.current) setLookup({ status: 'failed', message: companyProfileMessages.lookupUnavailable })
    }
  }

  function validateForm(): CompanyProfileInput | null {
    if (!form.region) {
      setFormError({ field: 'region', message: companyProfileMessages.regionRequired })
      return null
    }
    if (!form.industry) {
      setFormError({ field: 'industry', message: companyProfileMessages.industryRequired })
      return null
    }
    const foundedYear = Number(form.foundedYear)
    if (!/^\d{4}$/.test(form.foundedYear) || foundedYear < companyProfileLimits.foundedYearMin || foundedYear > currentYear) {
      setFormError({ field: 'foundedYear', message: companyProfileMessages.foundedYearInvalid(currentYear) })
      return null
    }
    const homepageUrl = form.homepageUrl.trim()
    if (homepageUrl.length > companyProfileLimits.homepageMaxLength) {
      setFormError({ field: 'homepageUrl', message: companyProfileMessages.homepageTooLong })
      return null
    }
    setFormError(null)
    return {
      region: form.region,
      industry: form.industry,
      foundedYear,
      homepageUrl: homepageUrl === '' ? null : homepageUrl,
    }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving || account === null) return
    if (lookup.status !== 'found') {
      setFormError({ field: 'businessNumber', message: companyProfileMessages.lookupRequired })
      return
    }
    const input = validateForm()
    if (input === null) return

    setIsSaving(true)
    setNotice(null)
    try {
      const result = await resolved.registerCompany.execute(lookup.business.businessNumber, input)
      if (!isMounted.current) return
      if (result.outcome === 'registered') {
        setCompanyState({ status: 'registered', company: result.company })
        setForm(toFormValues(result.company))
        setNotice(companyProfileMessages.registered)
        dispatchToStore(signedIn(withCompany(account, result.company)))
        return
      }
      const isBusinessProblem = result.outcome === 'business-not-found' || result.outcome === 'business-not-active'
      setFormError({ field: isBusinessProblem ? 'businessNumber' : null, message: registerFailureMessage(result) })
    } catch {
      if (isMounted.current) setFormError({ field: null, message: companyProfileMessages.saveFailed })
    } finally {
      if (isMounted.current) setIsSaving(false)
    }
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    const input = validateForm()
    if (input === null) return

    setIsSaving(true)
    setNotice(null)
    try {
      const company = await resolved.updateCompany.execute(input)
      if (!isMounted.current) return
      setCompanyState({ status: 'registered', company })
      setForm(toFormValues(company))
      setIsEditing(false)
      setNotice(companyProfileMessages.saved)
    } catch {
      if (isMounted.current) setFormError({ field: null, message: companyProfileMessages.saveFailed })
    } finally {
      if (isMounted.current) setIsSaving(false)
    }
  }

  function startEditing() {
    if (companyState.status === 'registered') setForm(toFormValues(companyState.company))
    setFormError(null)
    setNotice(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    if (companyState.status === 'registered') setForm(toFormValues(companyState.company))
    setFormError(null)
    setIsEditing(false)
  }

  function toggleRole(role: string) {
    setAvailableRoles(
      availableRoles.includes(role)
        ? availableRoles.filter((item) => item !== role)
        : [...availableRoles, role],
    )
  }

  function toggleInterestArea(area: string) {
    setInterestAreas(
      interestAreas.includes(area)
        ? interestAreas.filter((item) => item !== area)
        : [...interestAreas, area],
    )
  }

  function toggleNotification(key: keyof typeof notifications) {
    setNotifications({ ...notifications, [key]: !notifications[key] })
  }

  const company = companyState.status === 'registered' ? companyState.company : null
  const hasUncheckedQualification = companyProfileDemo.qualifications.some(
    (qualification) => qualification.status === 'NEEDS_CHECK',
  )
  const checklist: ChecklistItem[] = [
    { label: '사업자등록번호 확인과 기업 기본정보', isDone: company !== null },
    { label: '이메일 인증', isDone: account?.emailVerified ?? false },
    { label: '참여 역할과 관심 분야', isDone: availableRoles.length > 0 && interestAreas.length > 0 },
    { label: '우대·인증 자격 상태 확인', isDone: !hasUncheckedQualification },
    { label: '홈페이지', isDone: company?.homepageUrl != null },
  ]
  const completionPercent = Math.round(
    (checklist.filter((item) => item.isDone).length / checklist.length) * 100,
  )

  return {
    account,
    companyState,
    company,
    demo: companyProfileDemo,
    notice,
    summaryTags: company === null ? [] : [company.region, company.industry, company.businessStatus],
    completionPercent,
    checklist,
    basicFields: company === null ? [] : [
      { label: '기업명', value: company.companyName, tag: '사업자 확인' },
      { label: '사업자등록번호', value: formatBusinessNumber(company.businessNumber) },
      { label: '사업자 상태', value: company.businessStatus },
      { label: '소재지', value: company.region },
      { label: '업종', value: company.industry },
      { label: '설립연도', value: String(company.foundedYear) },
      { label: '홈페이지', value: company.homepageUrl, isOptional: true },
    ],
    regions: companyRegions,
    industries: companyIndustries,
    currentYear,
    businessNumber,
    updateBusinessNumber: (value: string) => {
      setBusinessNumber(value)
      setLookup({ status: 'idle' })
      setFormError(null)
    },
    lookup,
    lookupBusiness,
    form,
    updateForm: (field: keyof ProfileFormValues, value: string) => {
      setForm((current) => ({ ...current, [field]: value }))
      setFormError(null)
    },
    formError,
    isEditing,
    isSaving,
    startEditing,
    cancelEditing,
    submitRegistration,
    submitUpdate,
    isDiscoverable,
    toggleDiscoverable: () => setIsDiscoverable(!isDiscoverable),
    selectableRoles,
    availableRoles,
    toggleRole,
    selectableInterestAreas,
    interestAreas,
    toggleInterestArea,
    capabilityNote,
    updateCapabilityNote: setCapabilityNote,
    notifications,
    toggleNotification,
    // 이 정보가 어디에 쓰이는지 화면에서 밝혀 두면 무엇을 채울지 판단하기 쉬워집니다.
    usageNotes: [
      {
        icon: 'target' as const,
        title: '맞춤 추천',
        description: '지역·업종·업력이 추천 점수의 대상 적합도와 지역 적합도 근거가 됩니다.',
      },
      {
        icon: 'users' as const,
        title: '파트너 매칭',
        description:
          '역할·관심 분야·보유 역량을 모집 조건과 비교해 일치와 확인 필요를 나눠 보여줍니다.',
      },
      {
        icon: 'shield' as const,
        title: '신뢰 표시',
        description: '사업자등록번호 조회로 확인한 기업명과 사업자 상태, 이메일 인증 여부가 모집글에 표시됩니다.',
      },
    ],
    // 담당자 정보와 서류 상태는 제안을 수락한 뒤에만 상대에게 보입니다.
    publicityRows: [
      { label: '기업명·지역·업종', beforeAccept: true, afterAccept: true },
      { label: '보유 역량·관심 분야', beforeAccept: true, afterAccept: true },
      { label: '우대·인증 상태', beforeAccept: false, afterAccept: true },
      { label: '담당자 이름·이메일', beforeAccept: false, afterAccept: true },
    ],
  }
}

function toFormValues(company: Company): ProfileFormValues {
  return {
    region: company.region,
    industry: company.industry,
    foundedYear: String(company.foundedYear),
    homepageUrl: company.homepageUrl ?? '',
  }
}

function withCompany(account: Account, company: Company): Account {
  return {
    ...account,
    tier: account.tier === 'ADMIN' ? 'ADMIN' : 'COMPANY',
    company: { companyName: company.companyName, businessNumber: company.businessNumber },
  }
}

function registerFailureMessage(
  result: Exclude<Awaited<ReturnType<RegisterCompanyUseCase['execute']>>, { outcome: 'registered' }>,
): string {
  switch (result.outcome) {
    case 'business-not-found':
      return companyProfileMessages.businessNotFound
    case 'business-not-active':
      return companyProfileMessages.businessNotActive(result.businessStatus)
    case 'business-number-taken':
      return companyProfileMessages.businessNumberTaken
    case 'already-registered':
      return companyProfileMessages.alreadyRegistered
    case 'lookup-unavailable':
      return companyProfileMessages.lookupUnavailable
  }
}
