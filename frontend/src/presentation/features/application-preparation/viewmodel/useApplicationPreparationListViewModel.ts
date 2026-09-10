import { useCallback, useEffect, useRef, useState } from 'react'
import { appContainer } from '../../../../app/appContainer'
import type { ApplicationPreparationPage } from '../../../../domain/entities/ApplicationPreparation'

type ListRequest = { beforeId?: number }
type ListBusyState = 'initial' | 'more' | null

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error('신청 준비 목록을 불러오지 못했습니다.')
}

export function useApplicationPreparationListViewModel() {
  const useCase = appContainer.resolve('applicationPreparationUseCase')
  const [page, setPage] = useState<ApplicationPreparationPage | null>(null)
  const [busy, setBusy] = useState<ListBusyState>(null)
  const [error, setError] = useState<Error | null>(null)
  const [failedRequest, setFailedRequest] = useState<ListRequest | null>(null)
  const activeController = useRef<AbortController | null>(null)
  const requestSequence = useRef(0)

  const load = useCallback((beforeId?: number) => {
    activeController.current?.abort()
    const controller = new AbortController()
    const sequence = ++requestSequence.current
    const append = beforeId !== undefined
    activeController.current = controller
    setBusy(append ? 'more' : 'initial')
    setError(null)
    setFailedRequest(null)
    if (!append) setPage(null)

    void useCase.list(beforeId, controller.signal).then((result) => {
      if (controller.signal.aborted || sequence !== requestSequence.current) return
      setPage((previous) => append && previous
        ? {
            ...result,
            items: [...previous.items, ...result.items.filter(
              (item) => !previous.items.some(({ id }) => id === item.id),
            )],
          }
        : result)
    }).catch((caught: unknown) => {
      if (controller.signal.aborted || sequence !== requestSequence.current) return
      setError(asError(caught))
      setFailedRequest({ beforeId })
    }).finally(() => {
      if (controller.signal.aborted || sequence !== requestSequence.current) return
      activeController.current = null
      setBusy(null)
    })

    return controller
  }, [useCase])

  useEffect(() => {
    const controller = load()
    return () => {
      controller.abort()
      if (activeController.current === controller) activeController.current = null
      requestSequence.current += 1
    }
  }, [load])

  const retry = useCallback(() => {
    if (failedRequest) load(failedRequest.beforeId)
  }, [failedRequest, load])

  return {
    page,
    error,
    retry,
    loadMore: () => page?.nextBeforeId ? load(page.nextBeforeId) : undefined,
    isInitialLoading: busy === 'initial',
    isLoadingMore: busy === 'more',
  }
}
