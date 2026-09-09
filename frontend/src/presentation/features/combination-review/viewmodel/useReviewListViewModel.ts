import { useCallback, useEffect, useState } from 'react'
import { appContainer } from '../../../../app/appContainer'
import type { ReviewPage, ReviewSummary } from '../../../../domain/entities/CombinationReview'
import { useReviewScope } from './useReviewScope'

export function useReviewListViewModel() {
  const useCase = appContainer.resolve('combinationReviewUseCase')
  const { perform, ...scope } = useReviewScope()
  const [page, setPage] = useState<ReviewPage<ReviewSummary> | null>(null)
  const load = useCallback((before?: number) => perform('list', (signal) => useCase.list(before, signal), (value) => setPage((old) => ({ ...value, items: before ? [...(old?.items ?? []), ...value.items] : value.items }))), [perform, useCase])
  useEffect(() => { void load() }, [load])
  return { ...scope, page, load }
}
