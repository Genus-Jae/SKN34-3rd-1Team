import { reviewProgramKey, reviewStages, type ReviewRun } from '../../../../domain/entities/CombinationReview'
import { ReviewParticipation } from './ReviewParticipation'
import { reviewStyles as s } from './CombinationReview.styles'

import { runLabels } from './reviewLabels'
const stages = { APPLICATION: '신청', SELECTION: '선정', COMMITMENT: '확약', AGREEMENT: '협약', EXECUTION: '수행', FUNDING: '교부' }
const judgments = { RESTRICTION_APPLIES: '제한 적용', PERMISSION_IN_SCOPE: '명시된 범위 내 허용', NEEDS_FACTS: '사용자 정보 부족', INSUFFICIENT_EVIDENCE: '공식 근거 부족', CONFLICTING_EVIDENCE: '규정 충돌' }
export function ReviewRunResult({ run, currentRevision, download, downloading }: { run: ReviewRun; currentRevision: number; download: (index: number) => void; downloading: boolean }) {
  return <section className="space-y-4" aria-label={`실행 ${run.id} 결과`}>
    <div className={s.card}>
      <h2 className="text-xl font-bold">실행 #{run.id} · {runLabels[run.status]}</h2>
      <p className={s.muted}>입력 버전 {run.inputRevision} · 기준일 {run.input.asOfDate} · 시작 {run.startedAt}</p>
      <p className="mt-2 font-semibold">당시 제목: {run.input.title}</p>
      {run.inputRevision !== currentRevision && <p className={`${s.warning} mt-3`}>과거 입력 버전의 결과입니다. 현재 저장 입력(버전 {currentRevision})에 대한 결과가 아닙니다.</p>}
      <p className="mt-3 whitespace-pre-wrap text-sm">실행별 추가 설명: {run.input.additionalFacts || '없음'}</p>
      {run.status === 'RUNNING' && <p className={`${s.warning} mt-3`}>서버에 실행 중으로 저장되어 있습니다. 오래 걸려도 자동 재실행하지 않습니다. 실행 상태를 다시 조회하세요. 실행 주체가 종료된 경우 운영자의 확인과 복구가 필요합니다.</p>}
      {(run.status === 'FAILED' || run.status === 'INTERRUPTED') && <p className={`${s.warning} mt-3`}>분석이 정상 완료되지 않았습니다. 근거 부족 판단이나 허용 결과가 아닙니다. 오류 코드: {run.failureCode ?? '확인 필요'}</p>}
      <details className="mt-4"><summary className="cursor-pointer font-semibold">실행 당시 사업 순서·참여 상태</summary>
        <div className="mt-4 space-y-4">{run.input.programs.map((p, i) => <ReviewParticipation key={i} program={p} index={i} />)}</div>
      </details>
      {run.configuration && <p className={`${s.muted} mt-3`}>모델 {run.configuration.model} · 프롬프트 {run.configuration.promptVersion} · 계약 {run.configuration.contractVersion}</p>}
    </div>
    <p className={s.warning}>공식 원문 기준의 AI 분석이며 사람이 검수한 정답이 아닙니다. 제한을 찾지 못한 것은 허용을 뜻하지 않습니다. 범위 내 허용도 전체 신청 자격이나 동시 수혜를 보장하지 않습니다.</p>
    {run.analysis && <>
      <p className={`${s.card} whitespace-pre-wrap`}>{run.analysis.summary}</p>
      {run.analysis.pairs.map((pair) => <section className="space-y-3" key={`${pair.firstProgramIndex}:${pair.secondProgramIndex}`}>
        <h3 className="break-all font-bold">사업 {pair.firstProgramIndex + 1} ↔ 사업 {pair.secondProgramIndex + 1}</h3>
        <p className={s.muted}>{reviewProgramKey(run.input.programs[pair.firstProgramIndex])} ↔ {reviewProgramKey(run.input.programs[pair.secondProgramIndex])}</p>
        {reviewStages.map((stageName) => {
          const stage = pair.stages.find((value) => value.stage === stageName)!
          return <article className={s.card} key={stageName}>
            <h4 className="font-bold">{stages[stage.stage]} · {judgments[stage.judgment]}</h4>
            {stage.requiresInstitutionConfirmation && <p className="mt-2 font-semibold text-amber-800">기관 확인 필요 · 기관 해석 미확인 사항은 판단 보류</p>}
            <p className="mt-3 whitespace-pre-wrap text-sm"><strong>판단 범위:</strong> {stage.scope}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{stage.explanation}</p>
            {stage.questions.length > 0 && <div className="mt-3 text-sm"><strong>확인 질문</strong><ul className="list-disc space-y-1 pl-5">{stage.questions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
            {stage.citations.map((citation, i) => {
              const block = run.evidence?.blocks.find((b) => b.id === citation.evidenceId)
              const documentIndex = run.evidence?.documents.findIndex((d) => d.rawHash === block?.documentHash && d.programIndex === block?.programIndex) ?? -1
              return <blockquote className="mt-4 border-l-4 border-emerald-700 bg-emerald-50 p-3 text-sm" key={i}>
                <p className="whitespace-pre-wrap">{citation.quote}</p>
                <p className="mt-2 break-all text-xs">{citation.evidenceId} · 사업 {(block?.programIndex ?? 0) + 1} · {block?.locator}</p>
                {documentIndex >= 0 && <button type="button" className={`${s.button} mt-2`} disabled={downloading} onClick={() => download(documentIndex)}>인용 원본 다운로드</button>}
              </blockquote>
            })}
          </article>
        })}
      </section>)}
      <section className={s.warning}><h3 className="font-bold">분석 한계</h3><ul className="list-disc pl-5">{run.analysis.limitations.map((text, i) => <li key={i}>{text}</li>)}</ul></section>
    </>}
    {run.evidence && <section className={s.card}>
      <h3 className="font-bold">공식 원문과 수집 범위</h3><p className={s.muted}>자동 수집 · 사람 미검수 (AUTOMATIC_UNREVIEWED)</p>
      <ul className="mt-3 space-y-3">{run.evidence.documents.map((doc, i) => <li className="break-all text-sm" key={i}>
        <strong>사업 {doc.programIndex + 1} · {doc.fileName}</strong> ({doc.format})<br />
        <a href={doc.sourceUrl} target="_blank" rel="noreferrer" className="text-emerald-800 underline">공식 출처 열기</a>{' · '}
        <button className={s.button} type="button" disabled={downloading} onClick={() => download(i)}>원본 {i + 1} 다운로드</button>
        <p className="mt-1 text-xs">수집 {doc.fetchedAt} · 파서 {doc.parserVersion} · SHA-256 {doc.rawHash}</p>
      </li>)}</ul>
      <ul className="mt-4 list-disc pl-5 text-sm">{run.evidence.coverageWarnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
    </section>}
  </section>
}
