import { type FormEvent, type KeyboardEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { appContainer } from '../../../../app/appContainer'
import {
  companyAgeYearsRange,
  ownPartnerRoles,
  partnerRoleLabels,
  recruitmentBodyMaxLength,
  recruitmentCapabilityMaxCount,
  recruitmentCapabilityMaxLength,
  recruitmentTitleMaxLength,
  seekingCountRange,
  seekingPartnerRoles,
  type PartnerRole,
} from '../../../../domain/entities/PartnerRecruitment'
import { nationwideRegion, regionNamesNationwideFirst } from '../../../../domain/entities/Region'
import type { SupportProgram } from '../../../../domain/entities/SupportProgram'
import type { BrowseSupportProgramsUseCase } from '../../../../domain/usecases/BrowseSupportProgramsUseCase'
import { validatePartnerRecruitmentInput, type CreatePartnerRecruitmentUseCase } from '../../../../domain/usecases/PartnerRecruitmentUseCases'
import { useAuthSession } from '../../../shared/auth/hooks/useAuthSession'
import { companyInitial } from '../../../shared/partner-recruitment/partnerRecruitmentLabels'
import { appPaths } from '../../../shared/routes/appPaths'

const DAY_MS = 86_400_000
const PROGRAM_SEARCH_PAGE_SIZE = 8

export const recruitmentCreateMessages = {
  program: '모집글을 묶을 공고를 먼저 골라 주세요.',
  title: `제목을 1~${recruitmentTitleMaxLength}자로 입력해 주세요.`,
  body: `모집 소개 본문을 1~${recruitmentBodyMaxLength}자로 입력해 주세요.`,
  recruitmentDeadline: '모집 마감일을 오늘 이후로 골라 주세요.',
  deadlineBefore: (latest: string) => `모집 마감일은 ${latest}까지 선택해 주세요.`,
  capabilities: `필요 역량은 ${recruitmentCapabilityMaxLength}자 이내로 ${recruitmentCapabilityMaxCount}개까지 넣을 수 있습니다.`,
  seekingCount: `찾는 기업 수는 ${seekingCountRange.min}~${seekingCountRange.max}곳 사이로 입력해 주세요.`,
  minimumCompanyAgeYears: `희망 업력은 ${companyAgeYearsRange.min}~${companyAgeYearsRange.max}년 사이로 입력하거나 비워 두세요.`,
  companyRequired: '프로필에서 기업을 등록한 뒤 모집글을 쓸 수 있습니다.',
  programNotFound: '고른 공고를 더 이상 찾을 수 없습니다. 공고를 다시 검색해 주세요.',
  programClosed: '접수가 끝난 공고에는 모집글을 쓸 수 없습니다. 다른 공고를 골라 주세요.',
  alreadyExists: '이 공고에는 이미 내 모집글이 있습니다. 공고당 모집글은 하나입니다.',
  programClosingToday: '오늘 접수가 끝나는 공고에는 모집글을 쓸 수 없습니다. 다른 공고를 골라 주세요.',
  failed: '모집글을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  searchFailed: '공고를 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const

type FormField = 'program' | 'title' | 'body' | 'recruitmentDeadline' | 'capabilities' | 'seekingCount' | 'minimumCompanyAgeYears'
type ProgramSearchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'found'; programs: SupportProgram[] }
  | { status: 'failed' }

type ViewModelUseCases = {
  browsePrograms: Pick<BrowseSupportProgramsUseCase, 'execute'>
  createRecruitment: Pick<CreatePartnerRecruitmentUseCase, 'execute'>
}

/** 날짜 입력에는 시간이 없으므로 접수 마감 전날이 고를 수 있는 마지막 모집 마감일입니다. 접수 마감일이 없으면 제한하지 않습니다. */
export function latestRecruitmentDeadlineFor(program: Pick<SupportProgram, 'applicationEndDate'> | null): string | null {
  if (program?.applicationEndDate == null) return null
  return new Date(Date.parse(`${program.applicationEndDate}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)
}

function todayInSeoul(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** 접수 마감 전날이 오늘보다 앞서면(오늘 마감) 모집 마감일을 고를 수 없으므로 묶을 수 없습니다. */
export function canAttachRecruitment(program: Pick<SupportProgram, 'applicationEndDate'>, today: string = todayInSeoul()): boolean {
  const latest = latestRecruitmentDeadlineFor(program)
  return latest === null || latest >= today
}

/**
 * 모집글 작성의 대표 ViewModel입니다. 공고 검색·선택, 역할과 조건, 필요 역량, 본문을 소유하고
 * 등록 UseCase를 호출해 성공하면 새 모집글 상세로 이동합니다. 작성은 프로필에서 기업을 등록한 회원만 할 수 있고,
 * 제안 조건(이메일 인증)은 서비스 정책이라 작성자가 고르지 않습니다.
 */
export function usePartnerRecruitmentCreateViewModel(useCases?: Partial<ViewModelUseCases>) {
  const resolved: ViewModelUseCases = {
    browsePrograms: useCases?.browsePrograms ?? appContainer.resolve('browseSupportProgramsUseCase'),
    createRecruitment: useCases?.createRecruitment ?? appContainer.resolve('createPartnerRecruitmentUseCase'),
  }
  const navigate = useNavigate()
  const { account, hasCompany } = useAuthSession()
  const [programKeyword, setProgramKeyword] = useState('')
  const [programSearch, setProgramSearch] = useState<ProgramSearchState>({ status: 'idle' })
  const [selectedProgram, setSelectedProgram] = useState<SupportProgram | null>(null)
  const [ownRole, setOwnRole] = useState<PartnerRole>('PARTICIPANT')
  const [seekingRole, setSeekingRole] = useState<PartnerRole>('LEAD')
  const [seekingCount, setSeekingCount] = useState(1)
  // 희망 지역은 공고 분류와 같은 시·도 목록에서 고릅니다. 기본은 지역 제한 없음입니다.
  const [seekingRegion, setSeekingRegion] = useState<string>(nationwideRegion)
  // 빈 값은 업력 무관입니다.
  const [minimumCompanyAgeYears, setMinimumCompanyAgeYears] = useState<number | null>(null)
  const [recruitmentDeadline, setRecruitmentDeadline] = useState('')
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [capabilityDraft, setCapabilityDraft] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<{ field: FormField | null; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trimmedKeyword = programKeyword.trim()
  useEffect(() => {
    if (trimmedKeyword.length < 2) {
      setProgramSearch({ status: 'idle' })
      return
    }
    const controller = new AbortController()
    let current = true
    setProgramSearch({ status: 'searching' })
    const timer = setTimeout(() => {
      void Promise.resolve()
        .then(() => resolved.browsePrograms.execute(
          {
            keyword: trimmedKeyword, region: '', category: '', sourceCode: '', startupStage: '', applicantType: '', founderAge: '',
            status: 'OPEN', sort: 'DEADLINE', page: 1, pageSize: PROGRAM_SEARCH_PAGE_SIZE,
          },
          controller.signal,
        ))
        .then((catalog) => { if (current && !controller.signal.aborted) setProgramSearch({ status: 'found', programs: catalog.programs }) })
        .catch(() => { if (current && !controller.signal.aborted) setProgramSearch({ status: 'failed' }) })
    }, 300)
    return () => { current = false; clearTimeout(timer); controller.abort() }
    // 검색어가 바뀔 때만 다시 조회합니다. UseCase는 앱 수명 동안 같습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedKeyword])

  const maximumRecruitmentDeadline = latestRecruitmentDeadlineFor(selectedProgram)

  function selectProgram(program: SupportProgram) {
    if (!canAttachRecruitment(program)) {
      setError({ field: 'program', message: recruitmentCreateMessages.programClosingToday })
      return
    }
    setSelectedProgram(program)
    setError(null)
    const latest = latestRecruitmentDeadlineFor(program)
    if (latest !== null && recruitmentDeadline > latest) setRecruitmentDeadline('')
  }

  function clearProgram() {
    setSelectedProgram(null)
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    if (selectedProgram === null) {
      setError({ field: 'program', message: recruitmentCreateMessages.program })
      return
    }
    if (!recruitmentDeadline || recruitmentDeadline < todayInSeoul()) {
      setError({ field: 'recruitmentDeadline', message: recruitmentCreateMessages.recruitmentDeadline })
      return
    }
    if (maximumRecruitmentDeadline !== null && recruitmentDeadline > maximumRecruitmentDeadline) {
      setError({ field: 'recruitmentDeadline', message: recruitmentCreateMessages.deadlineBefore(maximumRecruitmentDeadline) })
      return
    }
    const input = {
      sourceCode: selectedProgram.sourceCode,
      sourceProgramId: selectedProgram.id,
      title,
      body,
      ownRole,
      seekingRole,
      seekingCount,
      region: seekingRegion,
      minimumCompanyAgeYears,
      capabilities,
      recruitmentDeadline,
    }
    const problem = validatePartnerRecruitmentInput({ ...input, title: title.trim(), body: body.trim() })
    if (problem !== null) {
      const field = (['program', 'title', 'body', 'recruitmentDeadline', 'capabilities', 'seekingCount', 'minimumCompanyAgeYears'] as const).find((item) => item === problem) ?? null
      setError({ field, message: fieldMessage(problem, maximumRecruitmentDeadline) })
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await resolved.createRecruitment.execute(input)
      switch (result.outcome) {
        case 'created':
          navigate(`${appPaths.partnerDetail}?${new URLSearchParams({ recruitmentId: String(result.recruitment.id) })}`)
          return
        case 'company-required':
          setError({ field: null, message: recruitmentCreateMessages.companyRequired })
          return
        case 'program-not-found':
          setSelectedProgram(null)
          setError({ field: 'program', message: recruitmentCreateMessages.programNotFound })
          return
        case 'program-closed':
          setSelectedProgram(null)
          setError({ field: 'program', message: recruitmentCreateMessages.programClosed })
          return
        case 'deadline-not-allowed':
          setError({
            field: 'recruitmentDeadline',
            message: result.latestAllowedDeadline === null
              ? recruitmentCreateMessages.recruitmentDeadline
              : recruitmentCreateMessages.deadlineBefore(result.latestAllowedDeadline),
          })
          return
        case 'already-exists':
          setError({ field: 'program', message: recruitmentCreateMessages.alreadyExists })
          return
      }
    } catch {
      setError({ field: null, message: recruitmentCreateMessages.failed })
    } finally {
      setIsSubmitting(false)
    }
  }

  /** 같은 역량을 두 번 넣지 않고, 빈 값은 무시합니다. */
  function addCapabilityOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
    const capability = capabilityDraft.trim()
    if (!capability || capabilities.includes(capability)) return
    if (capabilities.length >= recruitmentCapabilityMaxCount || capability.length > recruitmentCapabilityMaxLength) {
      setError({ field: 'capabilities', message: recruitmentCreateMessages.capabilities })
      return
    }
    setCapabilities([...capabilities, capability])
    setCapabilityDraft('')
    setError(null)
  }

  function removeCapability(capability: string) {
    setCapabilities(capabilities.filter((item) => item !== capability))
  }

  return {
    ownRoles: ownPartnerRoles.map((role) => ({ value: role, label: partnerRoleLabels[role] })),
    seekingRoles: seekingPartnerRoles.map((role) => ({ value: role, label: partnerRoleLabels[role] })),
    ownRole,
    seekingRole,
    selectOwnRole: setOwnRole,
    selectSeekingRole: setSeekingRole,
    seekingCountRange,
    seekingCount,
    updateSeekingCount: (value: string) => { setError(null); setSeekingCount(Number.parseInt(value, 10)) },
    regionOptions: regionNamesNationwideFirst,
    seekingRegion,
    updateSeekingRegion: setSeekingRegion,
    companyAgeYearsRange,
    minimumCompanyAgeYears,
    /** 빈 입력은 무관(null)으로, 숫자는 정수로 둡니다. 범위 검사는 제출 때 합니다. */
    updateMinimumCompanyAgeYears: (value: string) => {
      setError(null)
      setMinimumCompanyAgeYears(value.trim() === '' ? null : Number.parseInt(value, 10))
    },
    recruitmentDeadline,
    maximumRecruitmentDeadline,
    minimumRecruitmentDeadline: todayInSeoul(),
    updateRecruitmentDeadline: (value: string) => { setRecruitmentDeadline(value); setError(null) },
    capabilities,
    capabilityDraft,
    updateCapabilityDraft: setCapabilityDraft,
    addCapabilityOnEnter,
    removeCapability,
    title,
    titleMaxLength: recruitmentTitleMaxLength,
    updateTitle: (value: string) => { setTitle(value); setError(null) },
    body,
    bodyMaxLength: recruitmentBodyMaxLength,
    updateBody: (value: string) => { setBody(value); setError(null) },
    error,
    isSubmitting,
    submit,
    /** 기업 등록 전에는 폼 대신 등록 안내를 보여 줍니다. */
    canCreate: hasCompany,
    profilePath: appPaths.profile,
    /** 모집글에 표시되는 우리 기업입니다. 세션의 등록 기업 요약을 쓰고 상세 값은 프로필 API가 맡습니다. */
    ownCompany: account?.company
      ? { initial: companyInitial(account.company.companyName), name: account.company.companyName, isEmailVerified: account.emailVerified }
      : null,
    programKeyword,
    updateProgramKeyword: setProgramKeyword,
    programSearch,
    canAttachRecruitment,
    selectedProgram,
    selectProgram,
    clearProgram,
    writingTips: [
      '우리가 맡을 일과 상대에게 바라는 일을 나눠 적으면 제안 품질이 올라갑니다.',
      '일정을 적어 두면 준비 기간이 맞지 않는 기업이 미리 걸러집니다.',
      '예산 비율은 확정이 아니라 협의 범위로 적으세요.',
    ],
  }
}

function fieldMessage(problem: string, latestDeadline: string | null): string {
  switch (problem) {
    case 'program': return recruitmentCreateMessages.program
    case 'title': return recruitmentCreateMessages.title
    case 'body': return recruitmentCreateMessages.body
    case 'capabilities': return recruitmentCreateMessages.capabilities
    case 'seekingCount': return recruitmentCreateMessages.seekingCount
    case 'minimumCompanyAgeYears': return recruitmentCreateMessages.minimumCompanyAgeYears
    case 'recruitmentDeadline':
      return latestDeadline === null ? recruitmentCreateMessages.recruitmentDeadline : recruitmentCreateMessages.deadlineBefore(latestDeadline)
    default: return recruitmentCreateMessages.failed
  }
}
