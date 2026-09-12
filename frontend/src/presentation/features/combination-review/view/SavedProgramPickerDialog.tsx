import { useEffect, useRef } from 'react'

import type { ReviewProgram } from '../../../../domain/entities/CombinationReview'
import { reviewProgramKey } from '../../../../domain/entities/CombinationReview'
import type { SupportProgram } from '../../../../domain/entities/SupportProgram'
import { reviewStyles as s } from './CombinationReview.styles'

type Props = {
  open: boolean
  phase: 'idle' | 'loading' | 'ready' | 'failed'
  programs: SupportProgram[]
  selectedPrograms: ReviewProgram[]
  onToggle: (program: SupportProgram) => void
  onRetry: () => void
  onClose: () => void
}

export function SavedProgramPickerDialog({ open, phase, programs, selectedPrograms, onToggle, onRetry, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (open) closeRef.current?.focus() }, [open])
  if (!open) return null

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="saved-program-picker-title" onClick={(event) => { if (event.target === event.currentTarget) onClose() }} onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
    <section className="flex max-h-[min(80vh,44rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div><h3 className="text-lg font-bold" id="saved-program-picker-title">관심 공고함에서 선택</h3><p className={s.muted}>비교할 공고를 최대 2개까지 선택할 수 있습니다.</p></div>
        <button ref={closeRef} type="button" className="grid size-10 shrink-0 place-items-center rounded-full text-xl hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-700" aria-label="관심 공고함 닫기" onClick={onClose}>×</button>
      </header>
      <div className="min-h-36 flex-1 overflow-y-auto p-5">
        {(phase === 'idle' || phase === 'loading') && <p role="status">관심 공고를 불러오는 중입니다.</p>}
        {phase === 'failed' && <div className={s.warning} role="alert"><p>관심 공고를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p><button type="button" className={`${s.button} mt-3`} onClick={onRetry}>다시 불러오기</button></div>}
        {phase === 'ready' && programs.length === 0 && <p className={s.muted}>관심 공고함에 담은 공고가 없습니다.</p>}
        {programs.length > 0 && <ul className="space-y-3" aria-label="중복 지원 검토 관심 공고 목록">{programs.map((program) => {
          const identity = { sourceCode: program.sourceCode, sourceProgramId: program.id }
          const selected = selectedPrograms.some((candidate) => reviewProgramKey(candidate) === reviewProgramKey(identity))
          return <li className={`rounded-xl border p-4 transition-colors ${selected ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' : 'border-slate-200 bg-white'}`} key={reviewProgramKey(identity)}><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><strong>{program.title}</strong><p className={s.muted}>{program.organization} · {({ OPEN: '접수 중', CLOSED: '접수 종료', UPCOMING: '접수 예정', UNKNOWN: '접수 상태 미확인' })[program.status]}</p><p className={s.muted}>{program.applicationPeriod}</p></div><button type="button" className={selected ? s.primary : s.button} aria-label={`${program.title} 관심 공고 ${selected ? '선택 해제' : '선택'}`} aria-pressed={selected} disabled={!selected && selectedPrograms.length >= 2} onClick={() => onToggle(program)}>{selected ? '선택 해제' : '선택'}</button></div></li>
        })}</ul>}
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4"><span className="text-sm font-semibold text-emerald-900">{selectedPrograms.length}/2 선택</span><button type="button" className={s.primary} onClick={onClose}>선택 완료</button></footer>
    </section>
  </div>
}
