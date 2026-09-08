import { type FormEvent, type KeyboardEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { ownCompany, selectedProgram } from './partnerRecruitmentPlaceholders'

const titleMaxLength = 80
// 날짜 입력에는 시간이 없으므로 '마감일 이전'의 마지막 허용일은 전날입니다.
const maximumRecruitmentDeadline = new Date(
  Date.parse(`${selectedProgram.deadlineDate}T00:00:00Z`) - 86_400_000,
).toISOString().slice(0, 10)

/**
 * 모집글 작성의 대표 ViewModel입니다. 역할 선택, 조건 입력, 필요 역량 목록, 본문과 제안 설정을 소유합니다.
 * 모집글 등록 API가 생기면 submit에서 UseCase를 호출합니다.
 */
export function usePartnerRecruitmentCreateViewModel() {
  const navigate = useNavigate()
  const [ownRole, setOwnRole] = useState('참여기관')
  const [seekingRole, setSeekingRole] = useState('주관기관')
  const [seekingCount, setSeekingCount] = useState('1곳')
  const [seekingRegion, setSeekingRegion] = useState('서울특별시')
  const [seekingCompanyAge, setSeekingCompanyAge] = useState('')
  // 공고 마감일 이전만 허용하므로 기본값도 공고 마감일보다 앞선 날짜로 둡니다.
  const [recruitmentDeadline, setRecruitmentDeadline] = useState('2026-09-24')
  const [capabilities, setCapabilities] = useState(['공공기관 레퍼런스', '사업 총괄 경험'])
  const [capabilityDraft, setCapabilityDraft] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<{ field: 'title' | 'body' | 'recruitmentDeadline'; message: string } | null>(null)
  const [proposalSettings, setProposalSettings] = useState({
    verifiedOnly: true,
    emailNotice: true,
    showQualifications: false,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!recruitmentDeadline || recruitmentDeadline > maximumRecruitmentDeadline) {
      setError({ field: 'recruitmentDeadline', message: `모집 마감일은 ${maximumRecruitmentDeadline}까지 선택해 주세요.` })
      return
    }
    if (!title.trim() || title.length > titleMaxLength) {
      setError({ field: 'title', message: `제목을 1~${titleMaxLength}자로 입력해 주세요.` })
      return
    }
    if (!body.trim()) {
      setError({ field: 'body', message: '모집 소개 본문을 입력해 주세요.' })
      return
    }
    navigate('/partners')
  }

  /** 같은 역량을 두 번 넣지 않고, 빈 값은 무시합니다. */
  function addCapabilityOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
    const capability = capabilityDraft.trim()
    if (!capability || capabilities.includes(capability)) return
    setCapabilities([...capabilities, capability])
    setCapabilityDraft('')
  }

  function removeCapability(capability: string) {
    setCapabilities(capabilities.filter((item) => item !== capability))
  }

  function toggleProposalSetting(key: keyof typeof proposalSettings) {
    setProposalSettings({ ...proposalSettings, [key]: !proposalSettings[key] })
  }

  return {
    ownRoles: ['주관기관', '참여기관'],
    seekingRoles: ['주관기관', '참여기관', '수요처'],
    ownRole,
    seekingRole,
    selectOwnRole: setOwnRole,
    selectSeekingRole: setSeekingRole,
    seekingCount,
    updateSeekingCount: setSeekingCount,
    seekingRegion,
    updateSeekingRegion: setSeekingRegion,
    seekingCompanyAge,
    updateSeekingCompanyAge: setSeekingCompanyAge,
    recruitmentDeadline,
    maximumRecruitmentDeadline,
    updateRecruitmentDeadline: (value: string) => { setRecruitmentDeadline(value); setError(null) },
    capabilities,
    capabilityDraft,
    updateCapabilityDraft: setCapabilityDraft,
    addCapabilityOnEnter,
    removeCapability,
    title,
    titleMaxLength,
    updateTitle: (value: string) => { setTitle(value); setError(null) },
    body,
    updateBody: (value: string) => { setBody(value); setError(null) },
    error,
    proposalSettings,
    toggleProposalSetting,
    submit,
    draftStatus: '데모 입력 · 저장되지 않음',
    ownCompany,
    selectedProgram,
    // 공고 원문에서 발췌한 문장만 씁니다. 원문에 없는 조건은 확인 필요로 남깁니다.
    programRequirements: [
      { source: '원문', text: '주관기관 1곳 + 참여기관 1곳 이상', needsCheck: false },
      { source: '원문', text: '주관기관은 서울 소재 창업 7년 이내 AI 기업', needsCheck: false },
      { source: '확인', text: '참여기관 지역 제한은 원문에 명시되지 않음', needsCheck: true },
    ],
    writingTips: [
      '우리가 맡을 일과 상대에게 바라는 일을 나눠 적으면 제안 품질이 올라갑니다.',
      '일정을 적어 두면 준비 기간이 맞지 않는 기업이 미리 걸러집니다.',
      '예산 비율은 확정이 아니라 협의 범위로 적으세요.',
    ],
  }
}
