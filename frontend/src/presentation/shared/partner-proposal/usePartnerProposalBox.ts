import { useEffect, useState } from 'react'

import { appContainer } from '../../../app/appContainer'
import type { PartnerProposalBox, PartnerProposalBoxPage } from '../../../domain/entities/PartnerProposal'
import type { BrowsePartnerProposalsUseCase } from '../../../domain/usecases/PartnerProposalUseCases'
import { useAuthSession } from '../auth/hooks/useAuthSession'

export type ProposalBoxLoadState =
  | { phase: 'loading'; page: PartnerProposalBoxPage | null }
  | { phase: 'ready'; page: PartnerProposalBoxPage }
  | { phase: 'failed'; page: PartnerProposalBoxPage | null }

/**
 * 제안함·모집글 상세·사이드바 배지가 함께 쓰는 조회 훅입니다. 기업을 등록한 회원만 제안을 주고받으므로
 * 등록 전에는 요청하지 않고 빈 상자로 둡니다. 특정 페이지의 ViewModel이 아니므로 shared에 둡니다.
 */
export function usePartnerProposalBox(
  box: PartnerProposalBox,
  useCase: Pick<BrowsePartnerProposalsUseCase, 'execute'> = appContainer.resolve('browsePartnerProposalsUseCase'),
) {
  const { hasCompany } = useAuthSession()
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<ProposalBoxLoadState & { box: PartnerProposalBox }>({ box, phase: 'loading', page: null })

  useEffect(() => {
    if (!hasCompany) {
      setState({ box, phase: 'ready', page: { box, proposals: [], pendingCount: 0 } })
      return
    }
    const controller = new AbortController()
    let current = true
    setState((previous) => ({ box, phase: 'loading', page: previous.box === box ? previous.page : null }))
    void Promise.resolve().then(() => useCase.execute(box, controller.signal))
      .then((page) => { if (current && !controller.signal.aborted) setState({ box, phase: 'ready', page }) })
      .catch(() => { if (current && !controller.signal.aborted) setState((previous) => ({ ...previous, box, phase: 'failed' })) })
    return () => { current = false; controller.abort() }
  }, [box, hasCompany, version, useCase])

  const phase = state.box === box ? state.phase : 'loading'
  return {
    phase,
    page: state.box === box ? state.page : null,
    reload: () => setVersion((value) => value + 1),
  }
}

/** 사이드바 배지용 받은 제안 대기 건수입니다. 0이면 null을 돌려줘 배지를 그리지 않습니다. */
export function usePendingReceivedProposalCount(): number | null {
  const { page } = usePartnerProposalBox('received')
  return page !== null && page.pendingCount > 0 ? page.pendingCount : null
}
