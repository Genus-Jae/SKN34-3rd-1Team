import { type FormEvent, useState } from 'react'

import { partnerRecruitmentDetail } from './partnerRecruitmentPlaceholders'

const proposalMessageMaxLength = 500

/**
 * 모집글 상세와 참여 제안의 대표 ViewModel입니다. 제안 메시지와 공개 범위 선택 상태를 소유합니다.
 * 제안 전송 API가 생기면 submitProposal에서 UseCase를 호출합니다.
 */
export function usePartnerRecruitmentDetailViewModel() {
  const [proposalMessage, setProposalMessage] = useState('')
  const [proposalOptions, setProposalOptions] = useState({
    shareProfile: true,
    shareQualifications: false,
  })

  function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  function toggleProposalOption(key: keyof typeof proposalOptions) {
    setProposalOptions({ ...proposalOptions, [key]: !proposalOptions[key] })
  }

  return {
    recruitment: partnerRecruitmentDetail,
    proposalMessage,
    proposalMessageMaxLength,
    updateProposalMessage: setProposalMessage,
    proposalOptions,
    toggleProposalOption,
    submitProposal,
    // 수락 전에는 담당자 정보를 공개하지 않으므로 흐름을 화면에 함께 보여줍니다.
    proposalFlowSteps: ['대기', '수락 · 메시지', '컨소시엄 확정'],
  }
}
