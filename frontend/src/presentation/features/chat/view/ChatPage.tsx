import { Link, useLocation } from 'react-router'

import type { SupportProgram, SupportProgramEligibilityAxis } from '../../../../domain/entities/SupportProgram'
import type { SupportProgramConversationContext, SupportProgramInterpretation } from '../../../../domain/entities/SupportProgramConversation'
import type { SupportProgramSearchReadiness } from '../../../../domain/entities/SupportProgramSearchReadiness'
import { useChatPageViewModel } from '../viewmodel/useChatPageViewModel'
import type { ChatSearchOptions } from '../state/chatSlice'
import {
  chatMessageBubbleClassName,
  chatMessageRowClassName,
  chatPageStyles,
} from './ChatPage.styles'

const companyConditionFields = [
  { key: 'region', label: '현재 소재지' },
  { key: 'industry', label: '업종' },
  { key: 'establishedOn', label: '설립일' },
  { key: 'supportPurpose', label: '지원 목적' },
] as const

/** `landing`은 첫 진입 화면(입력창 상단), `workspace`는 로그인 뒤 원래 채팅 배치(입력창 하단)입니다. */
export type ChatPageLayout = 'landing' | 'workspace'

export function ChatPage({ layout = 'landing' }: { layout?: ChatPageLayout }) {
  const {
    confirmedContext,
    interpretation,
    pendingClarification,
    isInterpreting,
    isBusy,
    cancelInterpretation,
    handleConfirmInterpretation,
    handleRetryInterpretation,
    canSearch,
    canRetrySearch,
    cancelSearch,
    composerInputRef,
    conversationCount,
    draft,
    handleCompositionEnd,
    handleCompositionStart,
    handleDraftChange,
    handleInputKeyDown,
    handleRetrySearch,
    handleSelectSuggestion,
    handleStartNewConversation,
    handleSubmit,
    isReadyToSubmit,
    messages,
    readiness,
    refetchReadiness,
    searchError,
    searchOptions,
    searchStatusAnnouncement,
    suggestions,
    timelineRef,
  } = useChatPageViewModel()

  const hasReadinessNotice = readiness.isInitialLoading || readiness.isError
    || readiness.data?.searchState !== 'SEARCHABLE'
  const hasConfirmedSearch = confirmedContext.query !== null
  const hasSearchToReset = hasConfirmedSearch || conversationCount > 0 || draft.length > 0

  const searchContextControls = hasSearchToReset ? (
    <div className={chatPageStyles.searchContextControls}>
      {hasConfirmedSearch ? (
        <p id="support-program-current-conditions" className={chatPageStyles.currentConditions}>
          적용 중인 조건: {formatSearchOptions(searchOptions)}
        </p>
      ) : null}
      <button type="button" className={chatPageStyles.newSearchButton}
        title="대화와 적용 조건을 초기화합니다"
        onClick={handleStartNewConversation}>새 검색</button>
    </div>
  ) : null

  const introBlock = (
    <div className={chatPageStyles.intro}>
      <h1 className={chatPageStyles.introTitle}>GovBiz에게 물어보세요</h1>
      <p className={chatPageStyles.introDescription}>
        지역·업종·설립일 같은 조건을 자연어로 말하면 현재 접수 중인 정부지원사업을 찾아 드립니다.
        검색 결과는 기업마당 공식 공고와 원문 링크를 기반으로 합니다.
      </p>
    </div>
  )

  const composerInputGroup = (
      <div className={chatPageStyles.composerInputGroup}>
        <textarea
          ref={composerInputRef}
          className={chatPageStyles.composerInput}
          aria-label="지원사업 검색어"
          aria-describedby={[
            hasReadinessNotice ? 'support-program-search-readiness' : null,
            hasConfirmedSearch ? 'support-program-current-conditions' : null,
          ].filter(Boolean).join(' ') || undefined}
          value={draft}
          disabled={isInterpreting}
          onChange={handleDraftChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleInputKeyDown}
          placeholder="예: 서울에서 AI 창업지원 사업을 찾아줘"
          rows={1}
        />
        {isBusy ? (
          <button
            type="button"
            className={chatPageStyles.cancelSearchButton}
            onClick={cancelSearch}
          >
            취소
          </button>
        ) : (
          <button
            type="submit"
            className={chatPageStyles.submitButton}
            aria-label="검색 전송"
            disabled={!isReadyToSubmit}
          >
            ↑
          </button>
        )}
      </div>
  )

  const composerErrors = (
    <>
          {interpretation.error ? (
            <div className={chatPageStyles.searchError} role="alert">
              <span>{interpretation.error}</span>
              {interpretation.request ? <button type="button" className={chatPageStyles.searchRetryButton}
                onClick={handleRetryInterpretation}>다시 해석</button> : null}
            </div>
          ) : null}
          {searchError ? (
            <div className={chatPageStyles.searchError} role="alert">
              <span>{searchError}</span>
              {canRetrySearch ? (
                <button
                  type="button"
                  className={chatPageStyles.searchRetryButton}
                  onClick={handleRetrySearch}
                >
                  다시 검색
                </button>
              ) : null}
            </div>
          ) : null}
    </>
  )

  const composerHint = (
      <small className={chatPageStyles.composerHint}>
        Enter로 전송 · Shift+Enter로 줄바꿈 · 검색 전 조건을 확인해요.
        <span className="block">개인정보·비밀정보는 입력하지 마세요.</span>
      </small>
  )

  const suggestionChips = (
    <div className={chatPageStyles.suggestions} aria-label="예시 질문">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className={chatPageStyles.suggestedQuestionButton}
          onClick={() => handleSelectSuggestion(suggestion)}
          disabled={isBusy}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )

  const timeline = (
    <div
      className={
        layout === 'workspace' ? chatPageStyles.workspaceTimeline : chatPageStyles.timeline
      }
      ref={timelineRef}
      role="region"
      aria-label="대화 내역"
      tabIndex={0}
    >
      <p
        className={chatPageStyles.searchStatus}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {searchStatusAnnouncement}
      </p>
      {messages.map((message) => {
        const isUser = message.role === 'user'

        return (
          <article
            key={message.id}
            className={chatMessageRowClassName(isUser)}
          >
            {!isUser ? (
              <span className={chatPageStyles.assistantAvatar}>
                G
              </span>
            ) : null}
            <div className={chatPageStyles.messageContent}>
              <div className={chatMessageBubbleClassName(isUser)}>
                {message.text}
              </div>
              {message.searchOptions && isUser ? (
                <div>
                  <p className={chatPageStyles.searchSnapshot}>검색 당시 조건: {formatSearchOptions(message.searchOptions)}</p>
                  {message.searchQuery ? <p className={chatPageStyles.searchSnapshot}>확인한 검색 의도: {message.searchQuery}</p> : null}
                </div>
              ) : null}
              {layout === 'workspace' && message.id === messages[0]?.id ? (
                <div className={chatPageStyles.suggestedQuestions}>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={chatPageStyles.suggestedQuestionButton}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      disabled={isBusy}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
              {message.programs?.length ? (
                <ProgramResults programs={message.programs} />
              ) : null}
            </div>
          </article>
        )
      })}
      {isBusy ? (
        <div className={chatPageStyles.messageRow}>
          <span className={chatPageStyles.assistantAvatar}>
            G
          </span>
          <div className={chatPageStyles.searchingBubble}>
            {isInterpreting ? '조건 변경안을 해석하고 있어요. 아직 검색하지 않았습니다…' : '공고를 찾아보고 있어요…'}
          </div>
        </div>
      ) : null}
      {interpretation.result && !isBusy ? (
        <ConversationProposal current={interpretation.request?.context ?? confirmedContext}
          proposal={interpretation.result} canConfirm={canSearch}
          onConfirm={handleConfirmInterpretation} onCancel={cancelInterpretation} />
      ) : pendingClarification && !isBusy ? (
        <ConversationProposal current={confirmedContext} canConfirm={false}
          proposal={{ status: 'CLARIFICATION_REQUIRED', proposedContext: pendingClarification.draftContext,
            clarificationQuestion: pendingClarification.question, changedFields: [] }}
          onConfirm={handleConfirmInterpretation} onCancel={cancelInterpretation} />
      ) : null}
    </div>
  )

  const readinessNotice = (
    <SupportProgramSearchReadinessNotice
      readiness={readiness.data}
      isError={readiness.isError}
      isInitialLoading={readiness.isInitialLoading}
      isRefreshing={readiness.isRefreshing}
      onRetry={refetchReadiness}
    />
  )

  if (layout === 'workspace') {
    // 로그인 뒤의 작업 화면은 대화와 하단 입력창으로 구성합니다.
    return (
      <main className={chatPageStyles.workspacePage}>
        <h1 className="sr-only">지원사업 채팅</h1>
        <section className={chatPageStyles.workspaceShell}>
          {timeline}
          <form className={chatPageStyles.composerWorkspace} onSubmit={handleSubmit}>
            {readinessNotice}
            {searchContextControls}
            {composerErrors}
            {composerInputGroup}
            {composerHint}
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className={chatPageStyles.page}>
      <section className={chatPageStyles.workspace}>
        {introBlock}
        <form className={chatPageStyles.composer} onSubmit={handleSubmit}>
          {searchContextControls}
          {composerInputGroup}
          {composerErrors}
          {composerHint}
        </form>
        {suggestionChips}
        {timeline}
        {readinessNotice}
      </section>
    </main>
  )
}

type SupportProgramSearchReadinessNoticeProps = {
  readiness: SupportProgramSearchReadiness | undefined
  isError: boolean
  isInitialLoading: boolean
  isRefreshing: boolean
  onRetry: () => void
}

function ConversationProposal({ current, proposal, canConfirm, onConfirm, onCancel }: {
  current: SupportProgramConversationContext
  proposal: SupportProgramInterpretation
  canConfirm: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ready = proposal.status === 'READY'
  const proposed = proposal.proposedContext
  const rows = [
    ...companyConditionFields.map((field) => ({ label: field.label,
      before: current.companyConditions[field.key], after: proposed.companyConditions[field.key] })),
    { label: '접수 상태', before: current.acceptingOnly ? '접수 중만' : '전체', after: proposed.acceptingOnly ? '접수 중만' : '전체' },
  ].filter((row) => row.before !== row.after)
  const hasRetainedConditions = companyConditionFields.some((field) => (
    current.companyConditions[field.key] !== null
    && current.companyConditions[field.key] === proposed.companyConditions[field.key]
  )) || (!proposed.acceptingOnly && current.acceptingOnly === proposed.acceptingOnly)
  return (
    <section className={chatPageStyles.proposalPanel} aria-label={ready ? '조건 변경 제안' : '조건 추가 확인'}>
      <h2 className={chatPageStyles.proposalTitle}>{ready ? proposed.query : proposal.clarificationQuestion}</h2>
      {ready && rows.length > 0 ? (
        <ul className={chatPageStyles.proposalChanges} aria-label="변경할 조건">
          {rows.map((row) => <li key={row.label} className={chatPageStyles.proposalChange}>
            {row.after === null ? `${row.label} 해제` : `${row.label}: ${row.after}`}
          </li>)}
        </ul>
      ) : null}
      {ready && hasRetainedConditions ? <p className={chatPageStyles.proposalHint}>나머지 조건은 유지됩니다.</p> : null}
      {!ready ? <p className={chatPageStyles.proposalHint}>답변을 입력해 주세요. 아직 검색하지 않았어요.</p> : null}
      <div className={chatPageStyles.conditionsActions}>
        {ready ? <button type="button" className={chatPageStyles.conditionsButton} disabled={!canConfirm}
          onClick={onConfirm}>이 조건으로 검색</button> : null}
        <button type="button" className={chatPageStyles.conditionsButton} onClick={onCancel}>제안 취소</button>
      </div>
      {ready && !canConfirm ? <p className={chatPageStyles.conditionsHint}>공고 검색 준비가 완료되면 확인한 조건으로 검색할 수 있습니다.</p> : null}
    </section>
  )
}

function SupportProgramSearchReadinessNotice({
  readiness,
  isError,
  isInitialLoading,
  isRefreshing,
  onRetry,
}: SupportProgramSearchReadinessNoticeProps) {
  if (isInitialLoading) {
    return (
      <section
        id="support-program-search-readiness"
        className={chatPageStyles.readinessNotice}
        aria-live="polite"
        aria-atomic="true"
      >
        공고 데이터 상태를 확인하고 있습니다.
      </section>
    )
  }

  if (isError || !readiness) {
    return (
      <section
        id="support-program-search-readiness"
        className={chatPageStyles.readinessErrorNotice}
        role="alert"
      >
        <span>공고 데이터 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.</span>
        <button
          type="button"
          className={chatPageStyles.readinessRetryButton}
          onClick={onRetry}
          disabled={isRefreshing}
        >
          {isRefreshing ? '확인 중…' : '상태 다시 확인'}
        </button>
      </section>
    )
  }

  const message = getReadinessNoticeMessage(readiness)
  if (message === null) return null
  const isUnavailable = readiness.searchState === 'UNAVAILABLE'

  return (
    <section
      id="support-program-search-readiness"
      className={isUnavailable
        ? chatPageStyles.readinessErrorNotice
        : chatPageStyles.readinessNotice}
      role={isUnavailable ? 'alert' : undefined}
      aria-live={isUnavailable ? undefined : 'polite'}
    >
      <span>{message}</span>
      {isUnavailable || readiness.searchState === 'SEARCHABLE_WITH_PARTIAL_SOURCES' ? (
        <button
          type="button"
          className={chatPageStyles.readinessRetryButton}
          onClick={onRetry}
          disabled={isRefreshing}
        >
          {isRefreshing ? '확인 중…' : '상태 다시 확인'}
        </button>
      ) : null}
    </section>
  )
}

function getReadinessNoticeMessage(readiness: SupportProgramSearchReadiness) {
  switch (readiness.searchState) {
    case 'PREPARING':
      return '공고를 준비하고 있습니다. 잠시만 기다려 주세요.'
    case 'SEARCHABLE':
      return null
    case 'SEARCHABLE_WITH_SYNC_FAILURE':
      return '최신 공고를 불러오지 못해 이전에 저장한 공고에서 검색합니다.'
    case 'SEARCHABLE_WITH_PARTIAL_SOURCES':
      return '일부 제공처의 공고만 검색할 수 있습니다.'
    case 'UNAVAILABLE':
      return '현재 공고 데이터를 검색할 수 없습니다. 잠시 후 다시 확인해 주세요.'
  }
}

function ProgramResults({ programs }: { programs: SupportProgram[] }) {
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
}

function ProgramCard({ program }: { program: SupportProgram }) {
  const { pathname } = useLocation()
  const searchReturnTo = pathname.replace(/\/+$/, '') === '/chat' ? '/chat' : '/'
  const review = program.eligibilityReview
  return (
    <article className={chatPageStyles.programCard}>
      <div className={chatPageStyles.programCardHeader}>
        <span className={review?.status === 'MATCH' ? chatPageStyles.programTag : chatPageStyles.reviewRequiredTag}>
          {review?.status === 'MATCH' ? '조건 확인 · API 본문 기준'
            : review ? '확인 필요'
              : program.recommendationScore === null ? '자격 미평가' : '자격 판정 없음 · 확인 필요'}
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
          to={createSupportProgramDetailPath(program)}
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
          원문 보기 ↗
        </a>
      </div>
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

function formatSearchOptions(options: ChatSearchOptions) {
  const conditions = companyConditionFields.flatMap((field) => {
    const value = options.companyConditions?.[field.key]
    return value ? [`${field.label} ${value}`] : []
  })
  return [options.acceptingOnly ? '접수 중만' : '접수 상태 전체', ...conditions,
    ...(conditions.length ? [] : ['기업 조건 미입력'])].join(' · ')
}

function createSupportProgramDetailPath(program: SupportProgram) {
  const searchParams = new URLSearchParams({
    sourceCode: program.sourceCode,
    sourceProgramId: program.id,
  })
  return `/support-programs/detail?${searchParams.toString()}`
}

function formatApplicationDeadline(program: SupportProgram) {
  if (!program.applicationEndDate) return program.applicationPeriod

  const [, month, day] = program.applicationEndDate.split('-')
  return `마감 ${Number(month)}월 ${Number(day)}일`
}
