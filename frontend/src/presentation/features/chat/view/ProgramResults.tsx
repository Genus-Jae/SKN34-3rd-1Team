import { memo } from 'react'
import { Link, useLocation } from 'react-router'

import type { SupportProgram, SupportProgramEligibilityAxis } from '../../../../domain/entities/SupportProgram'
import { loginPathFor, signupPathFor } from '../../../shared/auth/returnPath'
import { appPaths, isAppPath, supportProgramDetailPath } from '../../../shared/routes/appPaths'
import { getSupportProgramEligibilityKind } from '../supportProgramEligibility'
import { chatPageStyles } from './ChatPage.styles'

// 초안 입력 중에도 Redux가 보존하는 검색 결과 배열은 카드 전체를 다시 렌더하지 않습니다.
export const ProgramResults = memo(function ProgramResults({ programs, totalCount = programs.length, resultToken = null }: {
  programs: SupportProgram[]
  totalCount?: number
  resultToken?: string | null
}) {
  const lockedCount = resultToken ? Math.max(0, totalCount - programs.length) : 0
  const returnTo = `${appPaths.chat}?searchResult=${encodeURIComponent(resultToken ?? '')}`
  return (
    <section aria-label="지원사업 검색 결과" data-search-results>
      <h2 className={chatPageStyles.resultSectionTitle}>검색 결과 · {lockedCount ? `${totalCount}건 중 ${programs.length}건 공개` : `${programs.length}건`}</h2>
      <p className={chatPageStyles.conditionsHint}>
        검색 결과의 순서를 유지합니다. 관련도와 신청 자격은 다르며, 각 공고의 조건 확인·확인 필요 표시를 확인하세요.
      </p>
      <div className={chatPageStyles.programList}>
        {programs.map((program) => (
          <ProgramCard key={`${program.sourceCode}:${program.id}`} program={program} />
        ))}
      </div>
      {lockedCount > 0 ? (
        <section aria-label="추가 검색 결과" className="mt-4 space-y-3">
          <div className="rounded-2xl border border-brand-primary/20 bg-brand-accent/40 p-5">
            <h3 className="text-base font-bold text-app-ink">추가 지원사업 {lockedCount}건이 있어요</h3>
            <p className="mt-2 text-sm leading-6 text-sample-muted">
              회원가입 또는 로그인하면 이번 검색 결과를 최대 5건까지 확인할 수 있어요.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={signupPathFor(returnTo)} className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
                회원가입하고 전체 보기
              </Link>
              <Link to={loginPathFor(returnTo)} className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-primary bg-white px-5 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
                로그인하고 전체 보기
              </Link>
            </div>
          </div>
          <div role="list" aria-label="로그인 후 공개되는 지원사업" className="space-y-3">
            {Array.from({ length: lockedCount }, (_, index) => (
              <div key={index} role="listitem" aria-label={`잠긴 지원사업 ${index + 1}`}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
                <div aria-hidden="true" className="pointer-events-none select-none space-y-4 opacity-60 blur-[4px]">
                  <div className="h-5 w-24 rounded-full bg-slate-200" />
                  <div className="h-6 w-4/5 rounded bg-slate-200" />
                  <div className="space-y-2"><div className="h-3 w-full rounded bg-slate-200" /><div className="h-3 w-3/4 rounded bg-slate-200" /></div>
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/35 px-4 text-center text-sm font-semibold text-slate-600">
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" />
                  </svg>
                  로그인 후 확인할 수 있는 지원사업
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
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
