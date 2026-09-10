import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../../../app/hooks'
import { selectCurrentAccount, signedOut } from '../../../shared/auth/state/authSlice'
import { appPaths, supportProgramDetailPath } from '../../../shared/routes/appPaths'
import { reviewProgramKey, supportsAutomaticReview } from '../../../../domain/entities/CombinationReview'
import { useReviewListViewModel } from '../viewmodel/useReviewListViewModel'
import { useReviewEditorViewModel } from '../viewmodel/useReviewEditorViewModel'
import { ReviewParticipation } from './ReviewParticipation'
import { ReviewRunResult } from './ReviewRunResult'
import { runLabels } from './reviewLabels'
import { reviewStyles as s } from './CombinationReview.styles'
import { workspacePageStyles } from '../../../shared/workspace/WorkspacePage.styles'
import { WorkspacePageHeader } from '../../../shared/workspace/WorkspacePageHeader'

const listTitle = '중복 지원·수혜 검토'

const sessionKeys = new WeakMap<object, number>()
let nextSessionKey = 0
function sessionKey(account: object) {
  if (!sessionKeys.has(account)) sessionKeys.set(account, ++nextSessionKey)
  return sessionKeys.get(account)!
}

function ReviewError({ error }: { error: { message: string; status?: number; runId?: number | null } | null }) {
  const dispatch = useAppDispatch()
  const alertRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (error) alertRef.current?.focus() }, [error])
  if (!error) return null
  return <div ref={alertRef} tabIndex={-1} role="alert" className={s.warning}>{error.message}
    {error.runId && <p>저장된 실패 실행: #{error.runId}</p>}
    {error.status === 401 && <button className={`${s.button} ml-3`} onClick={() => dispatch(signedOut())}>다시 로그인</button>}
  </div>
}

export function CombinationReviewListPage() {
  const account = useAppSelector(selectCurrentAccount)
  return account ? <ReviewList key={sessionKey(account)} /> : null
}
function ReviewList() {
  const vm = useReviewListViewModel()
  const header = <WorkspacePageHeader title={listTitle} actions={<Link className={workspacePageStyles.primaryButton} to={appPaths.combinationReviewNew}>새 검토</Link>} />
  if (vm.error?.status === 401) return <>{header}<main className={workspacePageStyles.content}><ReviewError error={vm.error} /></main></>
  return <>{header}<main className={workspacePageStyles.content}>
    <p className={s.muted}>사업 2~3개의 참여 사실과 공식 원문을 비교합니다. 저장한 검토와 실행 이력은 본인만 조회할 수 있습니다.</p>
    <ReviewError error={vm.error} />
    {vm.busy.length > 0 && <p role="status">검토 목록을 불러오는 중입니다.</p>}
    {vm.page?.items.length === 0 && <div className={s.card}><h2 className="font-semibold">아직 저장한 검토가 없습니다.</h2><p className={s.muted}>새 검토에서 공고를 선택하고 저장해 주세요. 저장만으로 분석은 실행되지 않습니다.</p></div>}
    <ul className="space-y-3">{vm.page?.items.map((item) => <li key={item.id}><Link className={`${s.card} block hover:border-emerald-600`} to={`${appPaths.combinationReviews}/${item.id}`}><strong>{item.title}</strong><p className={s.muted}>입력 버전 {item.inputRevision} · 수정 {item.updatedAt}</p></Link></li>)}</ul>
    {vm.error && <button className={s.button} disabled={vm.busy.length > 0} onClick={() => void vm.load()}>목록 다시 불러오기</button>}
    {vm.page?.nextBeforeId && <button className={s.button} disabled={vm.busy.length > 0} onClick={() => void vm.load(vm.page!.nextBeforeId!)}>이전 검토 더 보기</button>}
  </main></>
}

export function CombinationReviewEditorPage({ create = false }: { create?: boolean }) {
  const account = useAppSelector(selectCurrentAccount)
  const { reviewId } = useParams()
  const id = create ? null : Number(reviewId)
  if (!account) return null
  if (!create && (!Number.isSafeInteger(id) || id! <= 0)) return <><WorkspacePageHeader parent={{ to: appPaths.combinationReviews, label: listTitle }} title="검토" /><main className={workspacePageStyles.content}><p role="alert">올바른 검토 주소가 아닙니다.</p><Link className={workspacePageStyles.quietLink} to={appPaths.combinationReviews}>목록으로</Link></main></>
  return <ReviewEditor key={`${sessionKey(account)}:${id ?? 'new'}`} id={id} account={account.email} />
}
function ReviewEditor({ id, account }: { id: number | null; account: string }) {
  const vm = useReviewEditorViewModel(id, account)
  const inputBusy = vm.busy.includes('save') || vm.busy.includes('load')
  const analysisBusy = vm.busy.includes('analysis')
  const unsupported = vm.draft.programs.some((p) => !supportsAutomaticReview(p))
  const running = vm.runs?.items.some((run) => run.status === 'RUNNING')
  // 상위 화면 이름(중복 지원·수혜 검토)을 누르면 검토 목록으로 돌아갑니다.
  const header = <WorkspacePageHeader parent={{ to: appPaths.combinationReviews, label: listTitle }} title={id ? '검토 입력과 실행 이력' : '새 검토'} />
  if (vm.error?.status === 401) return <>{header}<main className={workspacePageStyles.content}><ReviewError error={vm.error} /></main></>
  return <>{header}<main className={workspacePageStyles.content}>
    {vm.review && <p className={s.muted}>검토 #{id} · 저장 입력 버전 {vm.review.inputRevision}</p>}
    <ReviewError error={vm.error} />
    {vm.error?.runId && <button className={s.button} disabled={vm.busy.includes('run')} onClick={() => vm.selectRun(vm.error!.runId!)}>실패 실행 #{vm.error.runId} 확인</button>}
    {vm.rejectedRevision && vm.pending && <button className={s.button} onClick={vm.clearRejectedRequest}>버전 충돌로 거절된 실행 요청 정리</button>}
    {vm.notice && <p role="status" className={s.muted}>{vm.notice}</p>}
    {id && !vm.review ? <div className={s.card}>{vm.busy.includes('load') ? <p role="status">저장 입력과 실행 이력을 불러오는 중입니다.</p> : <button className={s.button} onClick={vm.load}>검토 다시 불러오기</button>}</div> : <>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); vm.save() }}>
        <fieldset disabled={inputBusy} className="space-y-4">
          <div className={s.card}><label className="font-semibold">검토 제목<input className={s.input} value={vm.draft.title} onChange={(e) => vm.setDraft({ ...vm.draft, title: e.target.value })} required placeholder="예: 창업 지원사업 참여 검토" /></label><p className={s.muted}>제목은 200자 이내입니다. 참여 상태는 제목과 별도로 입력합니다.</p></div>
          <section className={s.card} aria-label="공고 선택">
            <h2 className="font-bold">공고 선택 · {vm.draft.programs.length}/3</h2><p className={s.muted}>기존 카탈로그에서 2~3개를 선택하세요. 접수 종료 공고도 참여 이력 검토를 위해 검색합니다.</p>
            <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-sm">공고명·기관명<input className={s.input} maxLength={100} value={vm.keyword} onChange={(e) => vm.setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void vm.search() } }} /></label><button type="button" className={s.button} disabled={vm.busy.includes('catalog')} onClick={() => void vm.search()}>공고 검색</button></div>
            {vm.busy.includes('catalog') && <p className="mt-3" role="status">공고를 불러오는 중입니다.</p>}
            {vm.catalog?.programs.length === 0 && <p className="mt-3">검색 결과가 없습니다.</p>}
            <ul className="mt-4 divide-y divide-slate-200">{vm.catalog?.programs.map((program) => {
              const identity = { sourceCode: program.sourceCode, sourceProgramId: program.id, subProgramId: null }
              const selected = vm.draft.programs.some((p) => reviewProgramKey(p) === reviewProgramKey(identity))
              return <li className="py-3" key={reviewProgramKey(identity)}><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0 flex-1"><strong>{program.title}</strong><p className={s.muted}>{program.organization} · {({ OPEN: '접수 중', CLOSED: '접수 종료', UPCOMING: '접수 예정', UNKNOWN: '접수 상태 미확인' })[program.status]}</p><p className={s.muted}>{program.applicationPeriod}</p><p className="break-all text-xs">{reviewProgramKey(identity)}</p></div><button type="button" className={s.button} disabled={selected || vm.draft.programs.length >= 3} onClick={() => vm.add(program)}>{selected ? '선택됨' : '선택'}</button></div>
                {!supportsAutomaticReview(identity) && <p className="text-sm text-amber-800">저장 가능 · 현재 자동 분석 미지원</p>}
                <Link className="text-sm text-emerald-800 underline" to={supportProgramDetailPath({ sourceCode: identity.sourceCode, sourceProgramId: identity.sourceProgramId }, true)} target="_blank">공고 상세 확인</Link>
              </li>
            })}</ul>
            {vm.catalog && <div className="mt-3 flex items-center gap-3"><button type="button" className={s.button} disabled={vm.catalog.page <= 1 || vm.busy.includes('catalog')} onClick={() => void vm.search(vm.catalog!.page - 1, vm.appliedKeyword)}>이전 공고</button><span className="text-sm">{vm.catalog.page} / {Math.max(1, vm.catalog.totalPages)}</span><button type="button" className={s.button} disabled={vm.catalog.page >= vm.catalog.totalPages || vm.busy.includes('catalog')} onClick={() => void vm.search(vm.catalog!.page + 1, vm.appliedKeyword)}>다음 공고</button></div>}
          </section>
          <p className={s.muted}>신청·선정·확약·협약·수행·교부는 독립된 사실입니다. 모르는 항목은 ‘모름’을 유지하세요.</p>
          {vm.draft.programs.map((program, index) => <ReviewParticipation key={reviewProgramKey(program)} program={program} index={index} name={vm.names[reviewProgramKey(program)]} onRemove={() => vm.setDraft({ ...vm.draft, programs: vm.draft.programs.filter((_, i) => i !== index) })} onChange={(participation) => vm.setDraft({ ...vm.draft, programs: vm.draft.programs.map((p, i) => i === index ? { ...p, participation } : p) })} />)}
          {unsupported && <p className={s.warning}>선택 입력은 저장할 수 있지만 자동 분석은 지원하지 않습니다. 현재 BIZINFO의 숫자형 PBLN_ 공고와 세부사업 미지정 입력만 지원합니다.</p>}
          <button className={s.primary} type="submit" disabled={vm.draft.programs.length < 2}>{inputBusy ? '저장 중…' : id ? '입력 저장' : '검토 저장'}</button>
        </fieldset>
      </form>
      {id && <>
        <section className={s.card}><h2 className="font-bold">최신 저장 입력 확인</h2><p className={s.muted}>충돌이 발생해도 작성 중인 입력은 유지됩니다. 조회만으로 폼을 덮어쓰지 않습니다.</p><button className={`${s.button} mt-3`} disabled={inputBusy || vm.busy.includes('latest')} onClick={vm.reloadLatest}>최신 입력 조회</button>
          {vm.latest && <div className="mt-4 space-y-3"><p className="font-semibold">최신 버전 {vm.latest.inputRevision} · {vm.latest.title}</p>{vm.latest.programs.map((p, i) => <ReviewParticipation key={i} program={p} index={i} />)}<button className={s.button} onClick={vm.adoptLatest} disabled={inputBusy}>내 편집 내용을 버리고 최신 입력 사용</button></div>}
        </section>
        <section className={`${s.card} space-y-3`} aria-label="분석 실행"><h2 className="text-lg font-bold">공식 근거 분석</h2>
          <p className={s.muted}>PDF·HWPX 공식 첨부를 자동 수집하여 OpenAI로 분석합니다. 유료 API 호출이 발생할 수 있습니다. 원문 미확보·미지원 형식은 오류로 표시합니다.</p>
          <label className="block text-sm font-semibold">이번 실행의 추가 설명<textarea className={s.input} rows={4} maxLength={8000} value={vm.facts} disabled={analysisBusy || !!vm.pending} onChange={(e) => vm.setFacts(e.target.value)} /></label>
          <p className={s.muted}>{vm.facts.length}/8000 · 추가 설명은 실행에만 저장됩니다.</p>
          {vm.dirty && <p className={s.warning}>저장하지 않은 입력이 있습니다. 저장한 뒤 분석해 주세요.</p>}
          {analysisBusy && <p role="status" className={s.warning}>분석 요청의 응답을 기다리고 있습니다. 창을 닫아도 서버 실행이 취소되지는 않습니다.</p>}
          {running && <p className={s.warning}>저장된 실행 중 항목이 있습니다. 실행 상태를 조회하세요.</p>}
          {vm.pending ? <div className={s.warning}><p>미확인 요청을 보관하고 있습니다. 같은 키·버전·추가 설명으로만 다시 확인합니다.</p><p>요청 입력 버전 {vm.pending.expectedRevision}</p><p className="whitespace-pre-wrap">추가 설명: {vm.pending.additionalFacts || '없음'}</p><button className={`${s.button} mt-2`} disabled={analysisBusy} onClick={() => vm.start(true)}>같은 요청 확인</button></div>
            : <button className={s.primary} disabled={analysisBusy || inputBusy || vm.dirty || !!running || unsupported} onClick={() => vm.start(false)}>새 분석 실행</button>}
        </section>
        <section className={`${s.card} space-y-3`}><h2 className="text-lg font-bold">실행 이력</h2><button className={s.button} disabled={vm.busy.includes('history')} onClick={() => vm.history()}>실행 이력 새로고침</button>
          {vm.runs?.items.length === 0 && <p className={s.muted}>아직 분석을 실행하지 않았습니다.</p>}
          <ul className="space-y-2">{vm.runs?.items.map((run) => <li key={run.id}><button className={`${s.button} w-full justify-start text-left`} disabled={vm.busy.includes('run')} onClick={() => vm.selectRun(run.id)}>#{run.id} · 입력 버전 {run.inputRevision} · {runLabels[run.status]} · {run.startedAt}</button></li>)}</ul>
          {vm.runs?.nextBeforeId && <button className={s.button} disabled={vm.busy.includes('history')} onClick={() => vm.history(vm.runs!.nextBeforeId!)}>이전 실행 더 보기</button>}
          {vm.busy.includes('run') && <p role="status">실행 상세를 불러오는 중입니다.</p>}
        </section>
        {vm.run && <><button className={s.button} disabled={vm.busy.includes('run')} onClick={() => vm.selectRun(vm.run!.id)}>선택한 실행 상태 조회</button><ReviewRunResult run={vm.run} currentRevision={vm.review!.inputRevision} download={vm.download} downloading={vm.busy.includes('download')} /></>}
      </>}
    </>}
  </main></>
}
