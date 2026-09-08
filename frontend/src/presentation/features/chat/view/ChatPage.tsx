import { Fragment, memo } from 'react'
import { Link, useLocation } from 'react-router'

import { appPaths, isAppPath, publicPaths } from '../../../shared/routes/appPaths'

import type { SupportProgram, SupportProgramEligibilityAxis } from '../../../../domain/entities/SupportProgram'
import type { SupportProgramConversationContext, SupportProgramInterpretation } from '../../../../domain/entities/SupportProgramConversation'
import type { SupportProgramSearchReadiness } from '../../../../domain/entities/SupportProgramSearchReadiness'
import { useChatPageViewModel } from '../viewmodel/useChatPageViewModel'
import { SearchIntroTitle } from './SearchIntroTitle'
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

/** 공개 검색은 첫 전송 후 중앙 소개에서 하단 입력 배치로 전환하며, 작업 채팅은 하단 배치를 유지합니다. */
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
  const hasSearchToReset = hasConfirmedSearch || conversationCount > 0
  const isLandingIntro = layout === 'landing' && conversationCount === 0
  const isDockedLanding = layout === 'landing' && !isLandingIntro

  const searchContextControls = hasConfirmedSearch ? (
    <div className={chatPageStyles.searchContextControls}>
      <p id="support-program-current-conditions" className={chatPageStyles.currentConditions}>
        적용 중인 조건: {formatSearchOptions(searchOptions)}
      </p>
    </div>
  ) : null

  const introBlock = (
    <div className={chatPageStyles.intro}>
      <SearchIntroTitle />
      <p className={chatPageStyles.introDescription}>
        회사의 지역과 업종, 필요한 지원을 알려주세요.
        <br className="max-chat:hidden" /> 관련 공고와 확인할 신청 조건을 함께 안내합니다.
      </p>
    </div>
  )

  const composerFooter = (
    <div className={`${chatPageStyles.composerFooter} ${isDockedLanding ? chatPageStyles.dockedComposerFooter : ''}`}>
      <small className={`${chatPageStyles.composerHint} ${isDockedLanding ? chatPageStyles.dockedComposerHint : ''}`}>
        Enter로 전송 · Shift+Enter로 줄바꿈
        <span className="block text-[0.68rem]">검색 전 조건을 확인해요.</span>
      </small>
      {hasSearchToReset ? (
        <button type="button" className={chatPageStyles.newSearchButton}
          title="대화와 적용 조건을 초기화합니다"
          onClick={handleStartNewConversation}>새 검색</button>
      ) : null}
    </div>
  )

  const composerInputGroup = (
      <div className={chatPageStyles.composerInputGroup}>
        <textarea
          ref={composerInputRef}
          className={`${chatPageStyles.composerInput} ${isLandingIntro ? chatPageStyles.landingComposerInput : chatPageStyles.workspaceComposerInput} ${isDockedLanding ? chatPageStyles.dockedComposerInput : ''}`}
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
          placeholder={isLandingIntro
            ? '예: 서울에서 AI 서비스를 만드는 창업기업입니다. 사업화 지원을 받을 수 있을까요?'
            : isDockedLanding ? '지원사업·조건을 입력해 주세요.'
              : '찾고 싶은 지원사업이나 변경할 조건을 알려주세요.'}
          rows={isLandingIntro ? 3 : 1}
        />
        {composerFooter}
        {isBusy ? (
          <button
            key="cancel"
            type="button"
            className={chatPageStyles.cancelSearchButton}
            onClick={(event) => {
              // 취소 후 전송 버튼으로 바뀌어도 이 클릭이 폼을 다시 제출하지 않게 합니다.
              event.preventDefault()
              cancelSearch()
            }}
          >
            취소
          </button>
        ) : (
          <button
            key="submit"
            type="submit"
            className={chatPageStyles.submitButton}
            aria-label="검색 전송"
            disabled={!isReadyToSubmit}
          >
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5m-7 7 7-7 7 7" />
            </svg>
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
        layout === 'workspace' ? chatPageStyles.workspaceTimeline
          : isLandingIntro ? chatPageStyles.emptyTimeline : chatPageStyles.timeline
      }
      ref={timelineRef}
      role="region"
      aria-label="대화 내역"
      tabIndex={isLandingIntro ? -1 : 0}
    >
      <p
        className={chatPageStyles.searchStatus}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {searchStatusAnnouncement}
      </p>
      {messages.map((message, index) => {
        // 공개 첫 화면은 소개 영역이 환영 안내를 대신합니다. 대화 상태 자체는 유지합니다.
        if (layout === 'landing' && index === 0) return null
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
          <div className={chatPageStyles.searchingBubble} role="group"
            aria-label={isInterpreting ? '조건 해석 진행 중' : '지원사업 검색 진행 중'}>
            <div className={chatPageStyles.loadingHeader}>
              <strong className={chatPageStyles.loadingLabel}>{isInterpreting ? '조건 해석 중' : '지원사업 검색 중'}</strong>
              <span className={chatPageStyles.loadingDots} aria-hidden="true">
                {[0, 160, 320].map((delay) => (
                  <span key={delay} className={chatPageStyles.loadingDot} style={{ animationDelay: `${delay}ms` }} />
                ))}
              </span>
            </div>
            <p className={chatPageStyles.loadingDescription}>
              {isInterpreting ? '조건 변경안을 해석하고 있어요. 아직 검색하지 않았습니다…' : '공고를 찾아보고 있어요…'}
            </p>
            <div className={chatPageStyles.loadingTrack} aria-hidden="true">
              <span className={chatPageStyles.loadingSweep} />
            </div>
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
            {composerInputGroup}
            {composerErrors}
            <small className={chatPageStyles.privacyHint}>개인정보·비밀정보는 입력하지 마세요.</small>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className={chatPageStyles.page}>
      <section className={`${chatPageStyles.workspace} ${isLandingIntro ? chatPageStyles.introWorkspace : chatPageStyles.conversationWorkspace}`}>
        {isLandingIntro ? introBlock : <h1 className="sr-only">지원사업 채팅</h1>}
        {timeline}
        {/* 같은 폼·입력 노드를 유지하여 전환 중 요청 수명과 한글 입력 상태를 보존합니다. */}
        <form className={isLandingIntro ? chatPageStyles.composer : chatPageStyles.composerDock} onSubmit={handleSubmit}>
          {!isLandingIntro ? readinessNotice : null}
          {searchContextControls}
          {composerInputGroup}
          {composerErrors}
          {!isLandingIntro ? <small className={`${chatPageStyles.privacyHint} ${chatPageStyles.dockedComposerHint}`}>개인정보·비밀정보는 입력하지 마세요.</small> : null}
        </form>
        {isLandingIntro ? suggestionChips : null}
        {isLandingIntro ? <p className={chatPageStyles.sourceHint}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z" /><path d="m8 12 3 3 5-6" />
          </svg>
          기업마당 공식 공고 기반 · 최종 신청 조건은 원문에서 확인하세요.
        </p> : null}
        {isLandingIntro ? <small className={chatPageStyles.privacyHint}>개인정보·비밀정보는 입력하지 마세요.</small> : null}
        {isLandingIntro ? readinessNotice : null}
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
  const appliedConditions = companyConditionFields.flatMap((field) => {
    const value = proposed.companyConditions[field.key]
    return value === null ? [] : [{ label: field.label, value }]
  })
  return (
    <section className={chatPageStyles.proposalPanel} aria-label={ready ? '조건 변경 제안' : '조건 추가 확인'}>
      <div className={chatPageStyles.proposalHeader}>
        <span className={chatPageStyles.proposalEyebrow}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
          </svg>
          {ready ? '이렇게 찾아볼게요' : '조금만 더 알려주세요'}
        </span>
        {ready ? <span className={chatPageStyles.proposalScope}>{proposed.acceptingOnly ? '접수 중만' : '전체 접수 상태'}</span> : null}
      </div>
      <h2 className={`${chatPageStyles.proposalTitle} ${ready ? chatPageStyles.proposalQueryTitle : ''}`}>
        {ready ? proposed.query : proposal.clarificationQuestion}
      </h2>
      {ready ? <p className={chatPageStyles.proposalDescription}>
        {proposed.acceptingOnly ? '접수 중인 공고에서 관련 지원사업을 찾아볼게요.' : '예정·마감·상태 미확인 공고까지 함께 찾아볼게요.'}
      </p> : null}
      {ready && rows.length > 0 ? (
        <ul className={chatPageStyles.proposalChanges} aria-label="변경할 조건">
          {rows.map((row) => <li key={row.label} className={chatPageStyles.proposalChange}
            title={row.after === null ? `${row.label} 해제` : `${row.label}: ${row.after}`}>
            {row.after === null ? `${row.label} 해제` : `${row.label}: ${row.after}`}
          </li>)}
        </ul>
      ) : null}
      {ready && hasRetainedConditions ? <p className={chatPageStyles.proposalHint}>나머지 조건은 유지됩니다.</p> : null}
      {!ready ? <p className={chatPageStyles.proposalHint}>답변을 입력해 주세요. 아직 검색하지 않았어요.</p> : null}
      {ready ? <details className={chatPageStyles.proposalDetails}>
        <summary className={chatPageStyles.proposalDetailsSummary}>검색 조건 자세히</summary>
        <dl className={chatPageStyles.proposalDetailsList}>
          <dt className={chatPageStyles.proposalDetailsLabel}>검색어</dt>
          <dd className={chatPageStyles.proposalDetailsValue}>{proposed.query}</dd>
          <dt className={chatPageStyles.proposalDetailsLabel}>접수 상태</dt>
          <dd className={chatPageStyles.proposalDetailsValue}>
            {proposed.acceptingOnly ? '접수 중만' : '전체 (접수 중·예정·마감·상태 미확인)'}
          </dd>
          {appliedConditions.map((condition) => <Fragment key={condition.label}>
            <dt className={chatPageStyles.proposalDetailsLabel}>{condition.label}</dt>
            <dd className={chatPageStyles.proposalDetailsValue}>{condition.value}</dd>
          </Fragment>)}
        </dl>
        <p className={chatPageStyles.proposalHint}>아직 검색하지 않았어요. 바꾸고 싶은 조건은 새 메시지로 알려주세요.</p>
      </details> : null}
      <div className={chatPageStyles.conditionsActions}>
        {ready ? <button type="button" className={chatPageStyles.conditionsButton} disabled={!canConfirm}
          onClick={onConfirm}>이 조건으로 검색 <span aria-hidden="true">→</span></button> : null}
        <button type="button" className={chatPageStyles.proposalCancelButton} onClick={onCancel}>제안 취소</button>
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

// 초안 입력 중에도 Redux가 보존하는 검색 결과 배열은 카드 전체를 다시 렌더하지 않습니다.
const ProgramResults = memo(function ProgramResults({ programs }: { programs: SupportProgram[] }) {
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
          to={createSupportProgramDetailPath(program, inApp)}
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

function createSupportProgramDetailPath(program: SupportProgram, inApp: boolean) {
  const searchParams = new URLSearchParams({
    sourceCode: program.sourceCode,
    sourceProgramId: program.id,
  })
  return `${inApp ? appPaths.supportProgramDetail : publicPaths.supportProgramDetail}?${searchParams.toString()}`
}

function formatApplicationDeadline(program: SupportProgram) {
  if (!program.applicationEndDate) return program.applicationPeriod

  const [, month, day] = program.applicationEndDate.split('-')
  return `마감 ${Number(month)}월 ${Number(day)}일`
}
