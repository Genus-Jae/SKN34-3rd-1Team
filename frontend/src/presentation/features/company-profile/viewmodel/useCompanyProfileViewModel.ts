import { useState } from 'react'

import {
  companyProfile,
  selectableInterestAreas,
  selectableRoles,
} from './companyProfilePlaceholders'

/** 프로필을 얼마나 채웠는지 보여주는 항목입니다. 완성도는 이 목록에서 끝난 항목의 비율입니다. */
type ChecklistItem = { label: string; isDone: boolean }

/**
 * 기업 프로필의 대표 ViewModel입니다. 공개 범위 토글, 역할·관심 분야 선택, 알림 설정을 소유하고
 * 완성도와 표시할 항목 목록을 계산합니다. 프로필 API가 생기면 이 자리에서 UseCase를 호출합니다.
 */
export function useCompanyProfileViewModel() {
  const [isDiscoverable, setIsDiscoverable] = useState(companyProfile.isDiscoverable)
  const [availableRoles, setAvailableRoles] = useState(companyProfile.availableRoles)
  const [interestAreas, setInterestAreas] = useState(companyProfile.interestAreas)
  const [capabilityNote, setCapabilityNote] = useState(companyProfile.capabilityNote)
  const [notifications, setNotifications] = useState({
    savedProgramDeadline: true,
    partnerProposal: true,
    newMatchingProgram: false,
  })

  const hasUncheckedQualification = companyProfile.qualifications.some(
    (qualification) => qualification.status === 'NEEDS_CHECK',
  )

  const checklist: ChecklistItem[] = [
    { label: '기업 기본정보', isDone: true },
    { label: '이메일 인증', isDone: companyProfile.isEmailVerified },
    {
      label: '참여 역할과 관심 분야',
      isDone: availableRoles.length > 0 && interestAreas.length > 0,
    },
    { label: '우대·인증 자격 상태 확인', isDone: !hasUncheckedQualification },
    {
      label: '홈페이지와 한 줄 소개',
      isDone: companyProfile.homepageUrl !== null && companyProfile.introduction !== null,
    },
  ]
  const completionPercent = Math.round(
    (checklist.filter((item) => item.isDone).length / checklist.length) * 100,
  )

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

  return {
    profile: companyProfile,
    summaryTags: [
      companyProfile.region.split(' ')[0]!,
      companyProfile.industry,
      companyProfile.companyStage,
    ],
    completionPercent,
    checklist,
    basicFields: [
      { label: '기업명', value: companyProfile.companyName },
      {
        label: '사업자등록번호',
        value: companyProfile.businessRegistrationNumber,
        tag: '형식 확인',
      },
      { label: '소재지', value: companyProfile.region },
      { label: '업종', value: companyProfile.industry },
      {
        label: '설립연도 · 기업 단계',
        value: `${companyProfile.foundedYear} · ${companyProfile.companyStage}`,
      },
      {
        label: '직원 수',
        value: companyProfile.employeeCount === null ? null : `${companyProfile.employeeCount}명`,
        isOptional: true,
      },
      { label: '홈페이지', value: companyProfile.homepageUrl, isOptional: true },
      { label: '한 줄 소개', value: companyProfile.introduction, isOptional: true },
    ],
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
        description: '기업명과 사업자번호 형식 확인, 이메일 인증 여부가 모집글에 표시됩니다.',
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
