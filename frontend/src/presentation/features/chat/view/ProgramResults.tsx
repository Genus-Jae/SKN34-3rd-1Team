import { memo } from 'react'
import { Link, useLocation } from 'react-router'

import type { SupportProgram, SupportProgramEligibilityAxis } from '../../../../domain/entities/SupportProgram'
import { appPaths, isAppPath, supportProgramDetailPath } from '../../../shared/routes/appPaths'
import { getSupportProgramEligibilityKind } from '../supportProgramEligibility'
import { chatPageStyles } from './ChatPage.styles'

// 초안 입력 중에도 Redux가 보존하는 검색 결과 배열은 카드 전체를 다시 렌더하지 않습니다.
export const ProgramResults = memo(function ProgramResults({ programs }: { programs: SupportProgram[] }) {
  return (
    <section aria-label="지원사업 검색 결과">
      <h2 className={chatPageStyles.resultSectionTitle}>검색 결과 · {programs.length}건</h2>
      <p className={chatPageStyles.conditionsHint}>
        검색 결과의 순서를 유지합니다. 관련도와 신청 자격은 다르며, 각 공고의 조건 확인·확인 필요 표시를 확인하세요.
      </p>
      <div className={chatPageStyles.programList}>
        {programs.map((program) => (
          <ProgramCard key={`${program.sourceCode}:${program.id}`} program={program} />
        ))}
      </div>
    </section>
  )
})

function ProgramCard({ program }: { program: SupportProgram }) {
  const { pathname } = useLocation()
  const inApp = isAppPath(pathname)
  const searchReturnTo = inApp ? appPaths.chat : '/'
  const review = program.eligibilityReview
  const eligibilityKind = getSupportProgramEligibilityKind(program)
  return (
    <article className={chatPageStyles.programCard}>
      <div className={chatPageStyles.programCardHeader}>
        <span className={eligibilityKind === 'matched' ? chatPageStyles.programTag : chatPageStyles.reviewRequiredTag}>
          {eligibilityKind === 'matched' ? '조건 확인 · API 본문 기준'
            : eligibilityKind === 'unevaluated' ? '자격 미평가'
              : review ? '확인 필요' : '자격 판정 없음 · 확인 필요'}
        </span>
        <span className={chatPageStyles.programDeadline}>
          {{ OPEN: '접수 중', UPCOMING: '접수 예정', CLOSED: '접수 마감', UNKNOWN: '상태 확인 필요' }[program.status]} ·{' '}
          {formatApplicationDeadline(program)}
        </span>
      </div>
      <h2 className={chatPageStyles.programTitle}>
        {program.title}
      </h2>
      <p className={chatPageStyles.programOrganization}>{program.organization}</p>
      <p className={chatPageStyles.programSummary}>{program.summary}</p>
      <div className={chatPageStyles.programDetails}>
        <span>{program.targetDescription}</span>
      </div>
      <div className={chatPageStyles.eligibilityReview}>
        {review ? (
          <>
            <EligibilityAxis label="지원 대상" axis={review.target} />
            <EligibilityAxis label="지역" axis={review.region} />
          </>
        ) : <p className={chatPageStyles.conditionsHint}>지원 대상·지역의 자격 판정이 제공되지 않았습니다.</p>}
        <p className={chatPageStyles.conditionsHint}>
          기업마당 등 공식 API 본문 기준 · 첨부파일 미검증<br />
          최종 신청 자격을 보장하지 않습니다. 미입력 조건·이전 의향 등은 원문에서 추가 확인하세요.
        </p>
      </div>
      {program.recommendationScore !== null ? (
        <p className={chatPageStyles.conditionsHint}>관련도 {program.recommendationScore}점 · 자격 충족 확률이 아닙니다.</p>
      ) : null}
      {program.matchedReasons.length ? (
        <div className={chatPageStyles.matchedReasons}>
          <span className={chatPageStyles.matchedReason}>관련 검색 정보 (자격 근거 아님):</span>
          {program.matchedReasons.map((reason) => (
            <span key={reason} className={chatPageStyles.matchedReason}>{reason}</span>
          ))}
        </div>
      ) : null}
      <div className={chatPageStyles.programActions}>
        <Link
          className={chatPageStyles.programDetailsButton}
          to={supportProgramDetailPath({ sourceCode: program.sourceCode, sourceProgramId: program.id }, inApp)}
          state={{ searchReturnTo }}
        >
          상세 조건 보기
        </Link>
        <a
          href={program.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className={chatPageStyles.programSourceLink}
        >
          {program.sourceCode === 'CNTRADE_NOTICE' ? '공식 공지 목록 ↗' : '원문 보기 ↗'}
        </a>
      </div>
      {program.sourceCode === 'CNTRADE_NOTICE' ? (
        <p className={chatPageStyles.conditionsHint}>제목으로 해당 공지를 확인해 주세요.</p>
      ) : null}
    </article>
  )
}

function EligibilityAxis({ label, axis }: { label: string; axis: SupportProgramEligibilityAxis }) {
  return (
    <div>
      <h3 className={chatPageStyles.eligibilityAxisTitle}>
        {label} · {axis.status === 'MATCH' ? '본문 조건 확인' : '확인 필요'}
      </h3>
      <p className={chatPageStyles.conditionsHint}>{axis.explanation}</p>
      {axis.evidence.map((evidence) => (
        <div key={evidence.field}>
          <span className={chatPageStyles.matchedReason}>
            공식 API {evidence.field === 'SUMMARY' ? '사업 요약' : '지원 대상'} 인용
          </span>
          <blockquote className={chatPageStyles.eligibilityQuote}>{evidence.quote}</blockquote>
        </div>
      ))}
      {!axis.evidence.length ? <p className={chatPageStyles.conditionsHint}>확인 가능한 본문 인용 없음</p> : null}
    </div>
  )
}

function formatApplicationDeadline(program: SupportProgram) {
  if (!program.applicationEndDate) return program.applicationPeriod

  const [, month, day] = program.applicationEndDate.split('-')
  return `마감 ${Number(month)}월 ${Number(day)}일`
}
