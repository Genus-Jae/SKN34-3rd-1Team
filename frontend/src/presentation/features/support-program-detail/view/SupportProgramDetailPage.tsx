import type { ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'

import { isAppPath, supportProgramQuestionPath } from '../../../shared/routes/appPaths'

import type { SupportProgram, SupportProgramStatus } from '../../../../domain/entities/SupportProgram'
import type { SupportProgramIdentity } from '../../../../domain/repositories/SupportProgramRepository'
import { useSupportProgramDetailViewModel } from '../viewmodel/useSupportProgramDetailViewModel'
import { supportProgramDetailStyles } from './SupportProgramDetailPage.styles'
import { getSupportProgramSearchReturnTo, type SupportProgramSearchReturnTo } from './supportProgramNavigation'

/** URL의 제공처·원본 공고 ID로 최신 상세 정보를 조회하는 화면입니다. */
export function SupportProgramDetailPage() {
  const searchReturnTo = getSupportProgramSearchReturnTo(useLocation().state)
  const [searchParams] = useSearchParams()
  const identity = getSupportProgramIdentity(
    searchParams.get('sourceCode') ?? undefined,
    searchParams.get('sourceProgramId') ?? undefined,
  )

  if (!identity) {
    return (
      <UnavailableSupportProgramDetail
        searchReturnTo={searchReturnTo}
        description="공고 주소가 올바르지 않습니다. 검색 결과에서 공고를 다시 선택해 주세요."
        title="공고 정보를 찾을 수 없습니다"
      />
    )
  }

  return (
    <SupportProgramDetailContent
      key={JSON.stringify([identity.sourceCode, identity.sourceProgramId])}
      identity={identity}
      searchReturnTo={searchReturnTo}
    />
  )
}

function SupportProgramDetailContent({ identity, searchReturnTo }: {
  identity: SupportProgramIdentity
  searchReturnTo: SupportProgramSearchReturnTo
}) {
  const detail = useSupportProgramDetailViewModel(identity)

  if (detail.status === 'loading') {
    return <LoadingSupportProgramDetail searchReturnTo={searchReturnTo} />
  }

  if (detail.status === 'not-found') {
    return (
      <UnavailableSupportProgramDetail
        searchReturnTo={searchReturnTo}
        description="존재하지 않거나 더 이상 제공되지 않는 공고입니다. 검색 결과에서 다른 공고를 확인해 주세요."
        title="공고 정보를 찾을 수 없습니다"
      />
    )
  }

  if (detail.status === 'failed') {
    return <UnavailableSupportProgramDetail
      searchReturnTo={searchReturnTo}
      retry={detail.retry}
      description="공고 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
      title="공고 정보를 불러오지 못했습니다"
    />
  }

  return <SupportProgramDetail program={detail.program} searchReturnTo={searchReturnTo} />
}

function LoadingSupportProgramDetail({ searchReturnTo }: { searchReturnTo: SupportProgramSearchReturnTo }) {
  return (
    <main className={supportProgramDetailStyles.unavailablePage} aria-live="polite">
      <Link className={supportProgramDetailStyles.backLink} to={searchReturnTo}>
        ← 검색 결과로 돌아가기
      </Link>
      <section className={supportProgramDetailStyles.unavailableCard}>
        <p className={supportProgramDetailStyles.eyebrow}>지원사업 상세</p>
        <h1 className={supportProgramDetailStyles.title}>공고 정보를 불러오는 중입니다</h1>
        <p className={supportProgramDetailStyles.unavailableDescription}>
          최신 공고 조건을 확인하고 있습니다.
        </p>
      </section>
    </main>
  )
}

function SupportProgramDetail({ program, searchReturnTo }: {
  program: SupportProgram
  searchReturnTo: SupportProgramSearchReturnTo
}) {
  // 작업 채팅에서 연 상세는 질문 화면도 사이드바 안(/app)에서 열리도록 현재 경로로 판단합니다.
  const inApp = isAppPath(useLocation().pathname)
  return (
    <main className={supportProgramDetailStyles.page}>
      <header className={supportProgramDetailStyles.header}>
        <Link className={supportProgramDetailStyles.backLink} to={searchReturnTo}>
          ← 검색 결과로 돌아가기
        </Link>
        <span className={supportProgramDetailStyles.sourceBadge}>{program.sourceName}</span>
      </header>

      <section className={supportProgramDetailStyles.hero} aria-labelledby="support-program-title">
        <div>
          <p className={supportProgramDetailStyles.eyebrow}>지원사업 상세</p>
          <h1 id="support-program-title" className={supportProgramDetailStyles.title}>
            {program.title}
          </h1>
          <p className={supportProgramDetailStyles.organization}>{program.organization}</p>
          <p className={supportProgramDetailStyles.summary}>{program.summary}</p>
        </div>
        <div className={supportProgramDetailStyles.statusCard}>
          <span className={supportProgramDetailStyles.statusLabel}>접수 상태</span>
          <strong className={supportProgramDetailStyles.statusValue}>
            {formatStatus(program.status)}
          </strong>
          <span className={supportProgramDetailStyles.score}>
            자격 미평가 · 공고 상세 정보
          </span>
        </div>
      </section>

      <p className={supportProgramDetailStyles.qualificationNotice}>
        상세 조회는 검색 당시 기업 조건으로 자격을 다시 평가하지 않습니다.
        검색 결과의 조건 확인 상태와 인용은 검색 화면에서 확인하세요.
        지역·분야 태그만으로 신청 자격을 판단하지 마세요.
      </p>

      <section className={supportProgramDetailStyles.details} aria-label="공고 조건">
        <DetailItem label="신청 기간">
          {program.applicationPeriod}
        </DetailItem>
        <DetailItem label="접수 시작일">
          {program.applicationStartDate ?? '별도 안내'}
        </DetailItem>
        <DetailItem label="접수 마감일">
          {program.applicationEndDate ?? '별도 안내'}
        </DetailItem>
        <DetailItem label="지원 대상">
          {program.targetDescription}
        </DetailItem>
        <DetailItem label="분야">
          <TagList values={program.categories} emptyLabel="분야 정보 없음" />
        </DetailItem>
        <DetailItem label="지역">
          <TagList values={program.regions} emptyLabel="지역 정보 없음" />
        </DetailItem>
      </section>

      {program.matchedReasons.length > 0 ? (
        <section className={supportProgramDetailStyles.reasonSection} aria-labelledby="recommendation-reasons">
          <p className={supportProgramDetailStyles.sectionEyebrow}>검색 결과</p>
          <h2 id="recommendation-reasons" className={supportProgramDetailStyles.sectionTitle}>
            관련 검색 정보 (자격 근거 아님)
          </h2>
          <ul className={supportProgramDetailStyles.reasonList}>
            {program.matchedReasons.map((reason) => (
              <li key={reason} className={supportProgramDetailStyles.reason}>
                {reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={supportProgramDetailStyles.questionSection} aria-labelledby="evidence-question-title">
        <h2 id="evidence-question-title" className={supportProgramDetailStyles.sectionTitle}>
          공고 원문 기반 질문
        </h2>
        {program.sourceCode === 'BIZINFO' ? (
          <>
            <p className={supportProgramDetailStyles.questionDescription}>
              궁금한 신청 조건을 질문하고 공고 원문에서 답변 근거를 확인하세요.
            </p>
            <Link
              className={supportProgramDetailStyles.questionLink}
              state={{ searchReturnTo }}
              to={supportProgramQuestionPath(
                { sourceCode: program.sourceCode, sourceProgramId: program.id },
                inApp,
              )}
            >
              이 공고에 질문하기
            </Link>
          </>
        ) : (
          <p className={supportProgramDetailStyles.questionDescription}>
            이 제공처 공고는 아직 원문 근거 답변을 지원하지 않습니다. 원문 공고에서 확인해 주세요.
          </p>
        )}
      </section>

      <section className={supportProgramDetailStyles.sourceSection} aria-labelledby="source-information">
        <div>
          <p className={supportProgramDetailStyles.sourceEyebrow}>신청 전 확인</p>
          <h2 id="source-information" className={supportProgramDetailStyles.sourceTitle}>
            원문 공고에서 최종 조건을 확인하세요
          </h2>
          <p className={supportProgramDetailStyles.sourceDescription}>
            지원 자격, 제출 서류, 신청 방법은 공고 원문을 기준으로 합니다.
          </p>
        </div>
        <a
          className={supportProgramDetailStyles.sourceLink}
          href={program.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {program.sourceName} 원문 보기 ↗
        </a>
      </section>
    </main>
  )
}

function UnavailableSupportProgramDetail({
  description,
  retry,
  searchReturnTo,
  title,
}: {
  description: string
  retry?: () => void
  searchReturnTo: SupportProgramSearchReturnTo
  title: string
}) {
  return (
    <main className={supportProgramDetailStyles.unavailablePage}>
      <Link className={supportProgramDetailStyles.backLink} to={searchReturnTo}>
        ← 검색 결과로 돌아가기
      </Link>
      <section className={supportProgramDetailStyles.unavailableCard}>
        <p className={supportProgramDetailStyles.eyebrow}>지원사업 상세</p>
        <h1 className={supportProgramDetailStyles.title}>{title}</h1>
        <p className={supportProgramDetailStyles.unavailableDescription}>{description}</p>
        {retry ? (
          <button type="button" className={supportProgramDetailStyles.retryButton} onClick={retry}>
            상세 정보 다시 불러오기
          </button>
        ) : null}
      </section>
    </main>
  )
}

function DetailItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <article className={supportProgramDetailStyles.detailItem}>
      <h2 className={supportProgramDetailStyles.detailLabel}>{label}</h2>
      <div className={supportProgramDetailStyles.detailValue}>{children}</div>
    </article>
  )
}

function TagList({ emptyLabel, values }: { emptyLabel: string; values: string[] }) {
  if (values.length === 0) {
    return <span className={supportProgramDetailStyles.emptyValue}>{emptyLabel}</span>
  }

  return (
    <ul className={supportProgramDetailStyles.tagList}>
      {values.map((value) => (
        <li key={value} className={supportProgramDetailStyles.tag}>
          {value}
        </li>
      ))}
    </ul>
  )
}

function formatStatus(status: SupportProgramStatus) {
  const labels: Record<SupportProgramStatus, string> = {
    OPEN: '접수 중',
    UPCOMING: '접수 예정',
    CLOSED: '접수 마감',
    UNKNOWN: '상태 확인 필요',
  }
  return labels[status]
}

function getSupportProgramIdentity(
  sourceCode: string | undefined,
  sourceProgramId: string | undefined,
): SupportProgramIdentity | null {
  if (!sourceCode?.trim() || !sourceProgramId?.trim()) return null

  return { sourceCode, sourceProgramId }
}
