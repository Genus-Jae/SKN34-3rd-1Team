import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { appContainer } from '../../../../app/appContainer'
import { appPaths } from '../../../shared/routes/appPaths'
import { reviewProgramKey, supportsAutomaticReview, unknownParticipation, validateReviewDraft, type CombinationReview, type ReviewDraft, type ReviewPage, type ReviewRun, type RunRequest, type RunSummary } from '../../../../domain/entities/CombinationReview'
import type { SupportProgram } from '../../../../domain/entities/SupportProgram'
import type { SupportProgramCatalog } from '../../../../domain/entities/SupportProgramCatalog'
import { useReviewScope } from './useReviewScope'
import { useSavedSupportProgramChoices } from '../../../shared/support-program/useSavedSupportProgramChoices'

// 자동 조회보다 늦게 도착한 과거 응답이 완료 상태를 대기/분석 중으로 되돌리지 않게 한다.
function isEarlierState(current: RunSummary, next: RunSummary) {
  return current.id === next.id && (
    (current.status === 'RUNNING' && next.status === 'QUEUED') ||
    (!['QUEUED', 'RUNNING'].includes(current.status) && ['QUEUED', 'RUNNING'].includes(next.status))
  )
}

export function useReviewEditorViewModel(id: number | null, account: string) {
  const useCase = appContainer.resolve('combinationReviewUseCase')
  const catalogUseCase = appContainer.resolve('browseSupportProgramsUseCase')
  const detailUseCase = appContainer.resolve('getSupportProgramDetailUseCase')
  const journal = appContainer.resolve('reviewRequestJournal')
  const navigate = useNavigate()
  const savedProgramChoices = useSavedSupportProgramChoices()
  const { perform, ...scope } = useReviewScope()
  const [review, setReview] = useState<CombinationReview | null>(null)
  const [latest, setLatest] = useState<CombinationReview | null>(null)
  const [draft, setDraft] = useState<ReviewDraft>({ title: '', programs: [] })
  const [catalog, setCatalog] = useState<SupportProgramCatalog | null>(null)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [names, setNames] = useState<Record<string, string>>({})
  const [runs, setRuns] = useState<ReviewPage<RunSummary> | null>(null)
  const [run, setRun] = useState<ReviewRun | null>(null)
  const [facts, setFacts] = useState('')
  const [pending, setPending] = useState<RunRequest | null>(null)
  const [journalReady, setJournalReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [pollingPaused, setPollingPaused] = useState(false)
  const { setError } = scope

  const load = useCallback(() => {
    if (!id) return
    void perform('load', async (signal) => {
      const saved = journal.read(account, id)
      const [detail, history] = await Promise.all([useCase.get(id, signal), useCase.runs(id, undefined, signal)])
      const labels = Object.fromEntries(await Promise.all(detail.programs.map(async (program) => {
        const key = reviewProgramKey(program)
        try {
          const found = await detailUseCase.execute(program, signal)
          return [key, found ? `${found.title} · ${found.organization}` : '공고 정보를 찾을 수 없음']
        } catch {
          return [key, '공고 정보를 불러오지 못함']
        }
      })))
      return { saved, detail, history, labels }
    }, ({ saved, detail, history, labels }) => { setReview(detail); setDraft({ title: detail.title, programs: detail.programs }); setNames(labels); setRuns(history); setPending(saved); setJournalReady(true) })
  }, [id, account, journal, useCase, detailUseCase, perform])
  useEffect(() => { load() }, [load])
  const search = (page = 1, term = keyword) => perform('catalog', (signal) => catalogUseCase.execute({ keyword: term, region: '', category: '', sourceCode: '', startupStage: '', applicantType: '', founderAge: '', status: 'ALL', sort: 'RECENT', page, pageSize: 10 }, signal), (result) => { setCatalog(result); setAppliedKeyword(term) })
  const add = (program: SupportProgram) => {
    const selected = { sourceCode: program.sourceCode, sourceProgramId: program.id, subProgramId: null, participation: unknownParticipation() }
    if (draft.programs.length >= 3 || draft.programs.some((p) => reviewProgramKey(p) === reviewProgramKey(selected))) return
    setDraft({ ...draft, programs: [...draft.programs, selected] }); setNames({ ...names, [reviewProgramKey(selected)]: `${program.title} · ${program.organization}` })
  }
  const save = (afterSave?: () => void) => {
    let input: ReviewDraft
    try { input = validateReviewDraft(draft) } catch (e) { setError({ message: (e as Error).message }); return }
    if (id && review) {
      const saved = review
      if (JSON.stringify(input) === JSON.stringify({ title: saved.title, programs: saved.programs })) {
        setNotice('저장된 입력으로 공고 분석 단계로 이동했습니다.')
        afterSave?.()
        return
      }
      void perform('save', (signal) => useCase.replace(id, saved.inputRevision, input, signal), () => {
        // PUT 204는 요청한 입력이 다음 버전으로 저장됐음을 뜻한다. 자동 GET으로 다른 편집을 섞지 않는다.
        setReview({ ...saved, ...input, inputRevision: saved.inputRevision + 1 })
        setDraft(input); setLatest(null); setNotice('입력을 저장했습니다. 분석은 시작하지 않았습니다.'); afterSave?.()
      })
    } else {
      void perform('save', (signal) => useCase.create(input, signal), (value) => {
        navigate(`${appPaths.combinationReviews}/${value.id}?step=analysis`, { replace: true })
      })
    }
  }
  const reloadLatest = () => { if (id) void perform('latest', (signal) => useCase.get(id, signal), setLatest) }
  const adoptLatest = () => { if (latest) { setReview(latest); setDraft({ title: latest.title, programs: latest.programs }); setLatest(null); setNotice('최신 저장 입력으로 바꿨습니다.') } }
  const history = useCallback((before?: number) => {
    if (id) void perform('history', (signal) => useCase.runs(id, before, signal), (value) => setRuns((old) => ({ ...value, items: before ? [...(old?.items ?? []), ...value.items] : value.items })))
  }, [id, perform, useCase])
  const acceptRun = useCallback((value: ReviewRun, select = true) => {
    setRun((old) => old && isEarlierState(old, value) ? old : select || !old || old.id === value.id ? value : old)
    setRuns((old) => {
      const current = old?.items.find((item) => item.id === value.id)
      return { items: [current && isEarlierState(current, value) ? current : value, ...(old?.items ?? []).filter((item) => item.id !== value.id)].sort((a, b) => b.id - a.id), nextBeforeId: old?.nextBeforeId ?? null }
    })
    if (pending?.requestKey === value.requestKey && id) { journal.remove(account, id); setPending(null) }
  }, [pending, id, account, journal])
  const selectRun = (runId: number) => {
    if (id) void perform('run', (signal) => useCase.run(id, runId, signal), (value) => { acceptRun(value); setPollingPaused(false) })
  }
  const activeRunId = runs?.items.find((item) => item.status === 'QUEUED' || item.status === 'RUNNING')?.id
  useEffect(() => {
    if (!id || !activeRunId || pollingPaused) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      const accepted = await perform('poll', (signal) => useCase.run(id, activeRunId, signal), (value) => {
        if (!stopped) acceptRun(value, false)
      })
      if (stopped) return
      if (accepted) timer = setTimeout(() => void poll(), 3000)
      else setPollingPaused(true)
    }
    timer = setTimeout(() => void poll(), 3000)
    return () => { stopped = true; clearTimeout(timer) }
  }, [id, activeRunId, pollingPaused, perform, useCase, acceptRun])
  const dirty = review !== null && JSON.stringify(draft) !== JSON.stringify({ title: review.title, programs: review.programs })
  const rejectedRevision = scope.error?.status === 409 && scope.error.code === 'COMBINATION_REVIEW_REVISION_CONFLICT' && !scope.error.runId
  const clearRejectedRequest = () => {
    if (!id || !pending || !rejectedRevision) return
    try { journal.remove(account, id); setPending(null); setNotice('버전 충돌로 생성되지 않은 요청을 정리했습니다. 최신 입력을 확인한 뒤 직접 새 분석을 시작하세요.') }
    catch { setError({ message: '보관한 요청을 지우지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.' }) }
  }
  const start = (retry: boolean) => {
    if (!id || !review || !journalReady || scope.busy.includes('analysis')) return
    if (!retry && (pending || dirty || runs?.items.some((item) => ['QUEUED', 'RUNNING', 'UNKNOWN'].includes(item.status)) || !review.programs.every(supportsAutomaticReview))) return
    if (retry && !pending) return
    const request = retry ? pending! : { expectedRevision: review.inputRevision, requestKey: crypto.randomUUID(), additionalFacts: facts }
    try {
      if (!retry && journal.read(account, id)) return
      journal.write(account, id, request)
    } catch { setError({ message: '요청 키를 안전하게 보관할 수 없어 분석을 시작하지 않았습니다. 브라우저 저장소 설정을 확인해 주세요.' }); return }
    setPending(request)
    void perform('analysis', (signal) => useCase.start(id, request, signal), (value) => {
      acceptRun(value)
      journal.remove(account, id); setPending(null); setPollingPaused(false)
      setNotice(['QUEUED', 'RUNNING'].includes(value.status) ? '분석 요청이 접수되었습니다. 상태는 자동으로 갱신되며, 다른 화면으로 이동해도 작업은 유지됩니다.' : '저장된 실행을 확인했습니다. 새 분석은 자동으로 시작하지 않습니다.')
    })
  }
  const download = (documentIndex: number) => {
    if (!id || !run) return
    const selectedRun = run
    void perform('download', (signal) => useCase.source(id, selectedRun.id, documentIndex, signal), (blob) => {
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a')
      anchor.href = url; anchor.download = selectedRun.evidence?.documents[documentIndex]?.fileName ?? 'source'
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  }
  return { ...scope, review, latest, draft, setDraft, catalog, savedProgramChoices, keyword, setKeyword, appliedKeyword, names, runs, run, facts, setFacts,
    pending, notice, dirty, pollingPaused, rejectedRevision, clearRejectedRequest, load, search, add, save, reloadLatest, adoptLatest, history, selectRun, start, download }
}
