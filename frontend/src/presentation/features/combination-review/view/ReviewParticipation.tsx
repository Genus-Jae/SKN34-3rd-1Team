import type { Participation, ReviewProgram } from '../../../../domain/entities/CombinationReview'
import { reviewProgramKey } from '../../../../domain/entities/CombinationReview'
import { reviewStyles as s } from './CombinationReview.styles'

const fields = [
  ['applicationSubmitted', '신청'], ['selected', '선정'], ['commitmentSubmitted', '확약'],
  ['agreementSigned', '협약'], ['executionStatus', '수행'], ['fundingReceived', '교부'],
] as const
const answerLabels = { UNKNOWN: '모름', YES: '예', NO: '아니오' }
const executionLabels = { UNKNOWN: '모름', NOT_STARTED: '시작 전', IN_PROGRESS: '수행 중', COMPLETED: '완료', STOPPED: '중단' }
export function ReviewParticipation({ program, index, name, onChange, onRemove }: {
  program: ReviewProgram; index: number; name?: string; onChange?: (value: Participation) => void; onRemove?: () => void
}) {
  return <fieldset className={s.card}>
    <legend className="px-2 font-semibold">사업 {index + 1} · {name ?? '공고 정보 확인 중'}</legend>
    <p className="break-all text-sm text-slate-600">{reviewProgramKey(program)}{program.subProgramId ? ` / 세부사업 ${program.subProgramId}` : ''}</p>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fields.map(([key, label]) => {
        const options = key === 'executionStatus' ? executionLabels : answerLabels
        return <label className="text-sm" key={key}>{label}
          {onChange ? <select aria-label={`사업 ${index + 1} ${label}`} className={s.input} value={program.participation[key]} onChange={(e) => onChange({ ...program.participation, [key]: e.target.value })}>
            {Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select> : <strong className="mt-1 block">{Object.entries(options).find(([value]) => value === program.participation[key])?.[1]}</strong>}
        </label>
      })}
    </div>
    {onRemove && <button type="button" className={`${s.button} mt-4`} onClick={onRemove}>사업 {index + 1} 선택 해제</button>}
  </fieldset>
}
