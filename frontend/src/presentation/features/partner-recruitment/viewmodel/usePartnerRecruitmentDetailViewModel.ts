import { type FormEvent, useState } from 'react'
import { useSearchParams } from 'react-router'

import { appContainer } from '../../../../app/appContainer'
import {
  partnerProposalStatusLabels,
  proposalMessageMaxLength,
  type MyPartnerProposal,
} from '../../../../domain/entities/PartnerProposal'
import type { PartnerRecruitmentMatch } from '../../../../domain/entities/PartnerRecruitment'
import type { SendPartnerProposalUseCase } from '../../../../domain/usecases/PartnerProposalUseCases'
import { useAuthSession } from '../../../shared/auth/hooks/useAuthSession'
import { usePartnerProposalBox } from '../../../shared/partner-proposal/usePartnerProposalBox'
import { readRecruitmentId, usePartnerRecruitmentDetail } from '../../../shared/partner-recruitment/usePartnerRecruitmentBrowse'
import { appPaths } from '../../../shared/routes/appPaths'

export type LinkCopyState = 'idle' | 'copied' | 'failed'

export const proposalSendMessages = {
  empty: '제안 메시지를 입력해 주세요.',
  companyRequired: '프로필에서 기업을 등록한 뒤 제안할 수 있습니다.',
  recruitmentNotFound: '모집글을 더 이상 찾을 수 없습니다.',
  ownRecruitment: '내 모집글에는 제안할 수 없습니다.',
  recruitmentClosed: '마감된 모집글에는 제안할 수 없습니다.',
  alreadySent: '이미 이 모집글에 제안을 보냈습니다. 제안함에서 확인해 주세요.',
  failed: '제안을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const

/** 실제 비교 API가 생기기 전까지 보여 주는 예시 매칭입니다. */
const exampleMatches: PartnerRecruitmentMatch[] = [
  { label: '지역', isMatched: true },
  { label: '역할', isMatched: true },
  { label: '역량', isMatched: false },
]

type ProposalSendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'failed'; message: string }

/**
 * 모집글 상세와 참여 제안의 대표 ViewModel입니다. 모집 API에서 상세를 읽고, 제안 메시지·프로필 공유 선택과
 * 보내기 결과, 링크 복사 상태를 소유합니다. 내 모집글이면 받은 제안 요약을 붙이고, 남의 글이면 내 제안 상태를 보여 줍니다.
 */
export function usePartnerRecruitmentDetailViewModel(
  sendUseCase: Pick<SendPartnerProposalUseCase, 'execute'> = appContainer.resolve('sendPartnerProposalUseCase'),
) {
  const { hasCompany } = useAuthSession()
  const [searchParams] = useSearchParams()
  const recruitmentId = readRecruitmentId(searchParams.getAll('recruitmentId'))
  const { phase, recruitment } = usePartnerRecruitmentDetail(recruitmentId)
  const [proposalMessage, setProposalMessage] = useState('')
  const [shareProfile, setShareProfile] = useState(true)
  const [sendState, setSendState] = useState<ProposalSendState>({ status: 'idle' })
  const [sentProposal, setSentProposal] = useState<MyPartnerProposal | null>(null)
  const [linkCopyState, setLinkCopyState] = useState<LinkCopyState>('idle')
  // 내 모집글일 때만 받은 제안 상자를 읽어 이 글로 온 제안을 추립니다.
  const receivedBox = usePartnerProposalBox('received')

  const myProposal = sentProposal ?? recruitment?.myProposal ?? null
  const receivedProposals = recruitment?.isMine
    ? (receivedBox.page?.proposals ?? []).filter((proposal) => proposal.recruitment.id === recruitment.id)
    : []

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (recruitment === null || sendState.status === 'sending') return
    if (!hasCompany) {
      setSendState({ status: 'failed', message: proposalSendMessages.companyRequired })
      return
    }
    if (!proposalMessage.trim()) {
      setSendState({ status: 'failed', message: proposalSendMessages.empty })
      return
    }
    setSendState({ status: 'sending' })
    try {
      const result = await sendUseCase.execute(recruitment.id, { message: proposalMessage, shareProfile })
      switch (result.outcome) {
        case 'sent':
          setSentProposal({ id: result.proposal.id, status: result.proposal.status })
          setSendState({ status: 'idle' })
          setProposalMessage('')
          return
        case 'company-required':
          setSendState({ status: 'failed', message: proposalSendMessages.companyRequired })
          return
        case 'recruitment-not-found':
          setSendState({ status: 'failed', message: proposalSendMessages.recruitmentNotFound })
          return
        case 'own-recruitment':
          setSendState({ status: 'failed', message: proposalSendMessages.ownRecruitment })
          return
        case 'recruitment-closed':
          setSendState({ status: 'failed', message: proposalSendMessages.recruitmentClosed })
          return
        case 'already-sent':
          setSendState({ status: 'failed', message: proposalSendMessages.alreadySent })
          return
      }
    } catch {
      setSendState({ status: 'failed', message: proposalSendMessages.failed })
    }
  }

  /** 현재 주소를 클립보드에 복사합니다. 클립보드를 쓸 수 없는 환경에서는 실패로만 알립니다. */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopyState('copied')
    } catch {
      setLinkCopyState('failed')
    }
  }

  return {
    phase,
    recruitment,
    hasCompany,
    profilePath: appPaths.profile,
    proposalsPath: appPaths.proposals,
    matches: exampleMatches,
    proposalMessage,
    proposalMessageMaxLength,
    updateProposalMessage: (value: string) => { setProposalMessage(value); setSendState({ status: 'idle' }) },
    shareProfile,
    toggleShareProfile: () => setShareProfile((current) => !current),
    submitProposal,
    isSendingProposal: sendState.status === 'sending',
    proposalError: sendState.status === 'failed' ? sendState.message : null,
    /** 이미 보낸 제안이 있으면 폼 대신 상태를 보여 줍니다. */
    myProposal,
    myProposalLabel: myProposal === null ? null : partnerProposalStatusLabels[myProposal.status],
    /** 모집이 끝났거나 이미 제안했으면 새 제안을 받지 않습니다. */
    canSendProposal: recruitment !== null && !recruitment.isMine && recruitment.status === 'OPEN' && myProposal === null,
    receivedProposals,
    receivedProposalsPhase: receivedBox.phase,
    linkCopyState,
    copyLink,
    linkCopyLabel: linkCopyMessages[linkCopyState],
    // 이메일 인증이 생기면 제안 조건에 더합니다. 그 전까지는 기업 등록 회원끼리 제안합니다.
    proposalRequirement: '참여 제안은 기업을 등록한 회원끼리 주고받습니다. 담당자 이메일은 상대가 수락한 뒤에만 공개됩니다.',
    // 수락 전에는 담당자 정보를 공개하지 않으므로 흐름을 화면에 함께 보여줍니다.
    proposalFlowSteps: ['대기', '수락 · 연락처 공개', '컨소시엄 확정'],
  }
}

export const linkCopyMessages: Record<LinkCopyState, string> = {
  idle: '링크 복사',
  copied: '링크를 복사했습니다',
  failed: '복사할 수 없습니다. 주소창에서 복사해 주세요',
}
