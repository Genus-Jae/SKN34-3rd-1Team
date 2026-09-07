import { Link } from 'react-router'

import type { SupportProgram, SupportProgramEligibilityAxis } from '../../../../domain/entities/SupportProgram'
import type { SupportProgramConversationContext, SupportProgramInterpretation } from '../../../../domain/entities/SupportProgramConversation'
import type {
  SupportProgramSearchReadiness,
  SupportProgramSourceSearchState,
} from '../../../../domain/entities/SupportProgramSearchReadiness'
import { useChatPageViewModel } from '../viewmodel/useChatPageViewModel'
import type { ChatSearchOptions } from '../state/chatSlice'
import { companyConditionFields, seoulToday } from '../validation/companyConditionsForm'
import { groupSupportProgramsByEligibility } from '../supportProgramEligibility'
import {
  chatBackdropClassName,
  chatMessageBubbleClassName,
  chatMessageRowClassName,
  chatPageStyles,
  chatSidebarClassName,
} from './ChatPage.styles'

const syncTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Seoul',
})

export function ChatPage() {
  const {
    confirmedContext,
    interpretation,
    pendingClarification,
    isInterpreting,
    isBusy,
    cancelInterpretation,
    handleConfirmInterpretation,
    handleRetryInterpretation,
    searchOptions,
    companyConditionsDraft,
    conditionsError,
    updateCompanyCondition,
    applyCompanyConditions,
    removeCompanyCondition,
    clearCompanyConditions,
    updateAcceptingOnly,
    canSearch,
    canRetrySearch,
    conversationCount,
    cancelSearch,
    closeSidebar,
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
    isSidebarOpen,
    menuButtonRef,
    messages,
    openSidebar,
    readiness,
    refetchReadiness,
    searchError,
    searchStatusAnnouncement,
    sidebarPrimaryActionRef,
    sidebarRef,
    suggestions,
    timelineRef,
  } = useChatPageViewModel()

  return (
    <main className={chatPageStyles.page}>
      <div
        className={chatBackdropClassName(isSidebarOpen)}
        aria-hidden="true"
        onClick={closeSidebar}
      />

      <aside
        ref={sidebarRef}
        id="chat-sidebar"
        className={chatSidebarClassName(isSidebarOpen)}
        aria-label="지원사업 검색 메뉴"
        aria-modal={isSidebarOpen || undefined}
        role={isSidebarOpen ? 'dialog' : undefined}
        tabIndex={-1}
      >
        <button
          type="button"
          className={chatPageStyles.sidebarCloseButton}
          aria-label="메뉴 닫기"
          onClick={closeSidebar}
        >
          ×
        </button>
        <div className={chatPageStyles.brand}>
          <span className={chatPageStyles.brandMark}>
            G
          </span>
          <div>
            <strong className={chatPageStyles.brandTitle}>GovBiz</strong>
            <span className={chatPageStyles.brandSubtitle}>
              지원사업 탐색 도우미
            </span>
          </div>
        </div>

        <div className={chatPageStyles.sidebarActions}>
          <button
            ref={sidebarPrimaryActionRef}
            className={chatPageStyles.newConversationButton}
            type="button"
            onClick={handleStartNewConversation}
          >
            <span className={chatPageStyles.newConversationIcon}>＋</span>
            새 대화 시작
          </button>
          <Link
            className={chatPageStyles.sampleButton}
            to="/examples/sample-item/hook"
          >
            <span className={chatPageStyles.sampleButtonIcon}>▦</span>
            상태관리 비교 예제
          </Link>
        </div>

        <div className={chatPageStyles.popularQuestions}>
          <p className={chatPageStyles.sidebarSectionTitle}>
            추천 질문
          </p>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={chatPageStyles.popularQuestionButton}
              onClick={() => handleSelectSuggestion(suggestion)}
              disabled={isBusy}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className={chatPageStyles.dataSummary}>
          <p className={chatPageStyles.dataSummaryTitle}>
            공고 데이터
          </p>
          <div className={chatPageStyles.dataSummaryCard}>
            <strong className={chatPageStyles.dataSummaryValue}>
              {readiness.data ? `${readiness.data.programCount}건` : '확인 중'}
            </strong>
            <span className={chatPageStyles.dataSummaryLabel}>검색 가능한 공고</span>
          </div>
          <div className={chatPageStyles.dataSummaryCard}>
            <strong className={chatPageStyles.dataSummaryValue}>{conversationCount}</strong>
            <span className={chatPageStyles.dataSummaryLabel}>
              보낸 메시지
            </span>
          </div>
        </div>

        <p className={chatPageStyles.sidebarFooter}>
          검색 결과는 기업마당 공식 공고와 원문 링크를 기반으로 합니다.
        </p>
      </aside>

      <section className={chatPageStyles.workspace} inert={isSidebarOpen}>
        <header className={chatPageStyles.header}>
          <button
            ref={menuButtonRef}
            type="button"
            className={chatPageStyles.menuButton}
            aria-controls="chat-sidebar"
            aria-expanded={isSidebarOpen}
            aria-label="메뉴 열기"
            onClick={openSidebar}
          >
            ☰
          </button>
          <div>
            <p className={chatPageStyles.headerEyebrow}>
              지원사업 검색
            </p>
            <h1 className={chatPageStyles.headerTitle}>
              GovBiz에게 물어보세요
            </h1>
          </div>
          <span className={chatPageStyles.sourceBadge}>
            기업마당 공식 데이터
          </span>
        </header>

        <section className={chatPageStyles.conditionsPanel} aria-label="기업 검색 조건">
          <details>
            <summary className={chatPageStyles.conditionsSummary}>기업 조건 입력·수정 (선택)</summary>
            <form onSubmit={(event) => { event.preventDefault(); applyCompanyConditions() }} noValidate>
              <fieldset className={chatPageStyles.conditionsFields} disabled={isBusy}>
                <legend className="sr-only">기업 조건 입력</legend>
                {companyConditionFields.map((field) => (
                  <label key={field.key} className={chatPageStyles.conditionsLabel}>
                    {field.label}
                    <input
                      className={chatPageStyles.conditionsInput}
                      type={field.key === 'establishedOn' ? 'date' : 'text'}
                      value={companyConditionsDraft[field.key]}
                      onChange={(event) => updateCompanyCondition(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      min={field.key === 'establishedOn' ? '1900-01-01' : undefined}
                      max={field.key === 'establishedOn' ? seoulToday() : undefined}
                      aria-describedby="company-conditions-hint"
                    />
                  </label>
                ))}
                <div className={chatPageStyles.conditionsActions}>
                  <button className={chatPageStyles.conditionsButton} type="submit">조건 적용</button>
                  <button className={chatPageStyles.conditionsButton} type="button" onClick={clearCompanyConditions}>
                    조건 전체 초기화
                  </button>
                </div>
              </fieldset>
            </form>
            <p id="company-conditions-hint" className={chatPageStyles.conditionsHint}>
              현재 소재지를 입력해 주세요. 이전 예정 지역은 추정하지 않습니다. 편집한 값은 ‘조건 적용’ 후 다음 검색부터 사용합니다.
              조건은 이번 대화에서만 유지되며 새 대화·새로고침 시 초기화됩니다.
              입력한 조건은 AI 추천에 사용되므로 개인정보·비밀정보는 입력하지 마세요.
            </p>
          </details>
          {conditionsError ? <p className={chatPageStyles.searchError} role="alert">{conditionsError}</p> : null}
          <div className={chatPageStyles.conditionsActions}>
            <label className={chatPageStyles.conditionsLabel}>
              접수 상태
              <select
                className={chatPageStyles.conditionsInput}
                value={searchOptions.acceptingOnly ? 'accepting' : 'all'}
                disabled={isBusy}
                onChange={(event) => updateAcceptingOnly(event.target.value === 'accepting')}
              >
                <option value="accepting">접수 중만</option>
                <option value="all">전체 (예정·마감·상태 미확인 포함)</option>
              </select>
            </label>
            <ul className={chatPageStyles.conditionsChips} aria-label="적용된 기업 조건">
              {companyConditionFields.map((field) => {
                const value = searchOptions.companyConditions?.[field.key]
                return value ? (
                  <li key={field.key} className={chatPageStyles.conditionsChip}>
                    {field.label}: {value}{' '}
                    <button type="button" disabled={isBusy} aria-label={`${field.label} 조건 해제`} onClick={() => removeCompanyCondition(field.key)}>×</button>
                  </li>
                ) : null
              })}
            </ul>
          </div>
          <p className={chatPageStyles.conditionsHint}>
            미입력은 자격 충족을 뜻하지 않습니다. AI 판단은 원문 확인이 필요합니다. 검색어와 충돌하면 적용한 기업 조건을 우선합니다.
            새 메시지의 변경안은 확인 후 적용됩니다. 수동 폼을 수정하면 기존 제안과 미확정 초안은 취소됩니다.
          </p>
          <p className={chatPageStyles.conditionsHint}>
            조건을 바꾸면 다시 검색해 주세요. 아래 각 검색에는 당시 조건을 표시합니다.
          </p>
        </section>

        <div
          className={chatPageStyles.timeline}
          ref={timelineRef}
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
                  {message.id === messages[0]?.id ? (
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

        <form
          className={chatPageStyles.composer}
          onSubmit={handleSubmit}
        >
          <SupportProgramSearchReadinessNotice
            readiness={readiness.data}
            isError={readiness.isError}
            isInitialLoading={readiness.isInitialLoading}
            isRefreshing={readiness.isRefreshing}
            onRetry={refetchReadiness}
          />
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
          <div className={chatPageStyles.composerInputGroup}>
            <textarea
              className={chatPageStyles.composerInput}
              aria-label="지원사업 검색어"
              aria-describedby="support-program-search-readiness"
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
          <small className={chatPageStyles.composerHint}>
            Enter로 조건 해석 · 확인 버튼을 눌러야 검색 · Shift+Enter로 줄바꿈
          </small>
        </form>
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
    { label: '검색 의도', before: current.query, after: proposed.query },
    ...companyConditionFields.map((field) => ({ label: field.label,
      before: current.companyConditions[field.key], after: proposed.companyConditions[field.key] })),
    { label: '접수 상태', before: current.acceptingOnly ? '접수 중만' : '전체', after: proposed.acceptingOnly ? '접수 중만' : '전체' },
  ]
  return (
    <section className={chatPageStyles.proposalPanel} aria-label={ready ? '조건 변경 제안' : '조건 추가 확인'}>
      <h2 className={chatPageStyles.resultSectionTitle}>{ready ? '이 조건으로 검색할까요?' : '추가 확인이 필요합니다'}</h2>
      <p className={chatPageStyles.conditionsHint}>
        {ready ? '아직 적용하거나 검색하지 않았습니다. 변경 전·후와 검색 의도를 확인해 주세요.'
          : '아래는 미확정 초안입니다. 현재 적용 조건은 바뀌지 않았으며 공고를 검색하지 않았습니다.'}
      </p>
      {proposal.clarificationQuestion ? <p className={chatPageStyles.proposalQuestion}>{proposal.clarificationQuestion}</p> : null}
      <dl className={chatPageStyles.proposalRows}>
        {rows.map((row) => <div key={row.label} className={chatPageStyles.proposalRow}>
          <dt className={chatPageStyles.conditionsLabel}>{row.label} · {row.before === row.after ? '유지' : row.after === null ? '해제' : '변경'}</dt>
          <dd className={chatPageStyles.proposalValue}>
            <span>현재: {row.before ?? '미입력'}</span>
            <span>{ready ? '제안' : '미확정'}: {row.after ?? '미입력'}</span>
          </dd>
        </div>)}
      </dl>
      <p className={chatPageStyles.conditionsHint}>
        미입력은 자격 충족이 아닙니다. AI 해석의 정확성을 직접 확인해 주세요. 해석과 검색은 각각 한 번의 요청입니다.
      </p>
      <div className={chatPageStyles.conditionsActions}>
        {ready ? <button type="button" className={chatPageStyles.conditionsButton} disabled={!canConfirm}
          onClick={onConfirm}>이 조건으로 검색</button> : null}
        <button type="button" className={chatPageStyles.conditionsButton} onClick={onCancel}>제안 취소</button>
      </div>
      {ready && !canConfirm ? <p className={chatPageStyles.conditionsHint}>공고 검색 준비가 완료되면 확인한 조건으로 검색할 수 있습니다.</p> : null}
      {!ready ? <p className={chatPageStyles.conditionsHint}>아래 입력창에 답해 주세요. 마지막 질문과 이 미확정 초안만 이어서 해석합니다.</p> : null}
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
        >
          상태 다시 확인
        </button>
      </section>
    )
  }

  const content = getReadinessNoticeContent(readiness)
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
      <div>
        <strong className={chatPageStyles.readinessTitle}>{content.title}</strong>
        <p className={chatPageStyles.readinessDescription}>{content.description}</p>
        <dl className={chatPageStyles.readinessDetails}>
          <div>
            <dt>검색 가능한 공고</dt>
            <dd>{readiness.programCount}건</dd>
          </div>
          <div>
            <dt>검색 인덱스</dt>
            <dd>{readiness.indexReady ? '준비됨' : '준비 중'}</dd>
          </div>
          <div>
            <dt>마지막 성공 동기화</dt>
            <dd>{formatSyncTime(readiness.lastSuccessfulSyncAt)}</dd>
          </div>
          <div>
            <dt>마지막 실패 동기화</dt>
            <dd>{formatSyncTime(readiness.lastFailedSyncAt)}</dd>
          </div>
        </dl>
        <ul className={chatPageStyles.readinessSources} aria-label="제공처별 공고 준비 상태">
          {readiness.sources.map((source) => (
            <li key={source.sourceCode} className={chatPageStyles.readinessSource}>
              <strong>{source.sourceName}</strong>
              <span className={chatPageStyles.readinessSourceState}>
                {formatSourceSearchState(source.searchState)}
              </span>
              <dl className={chatPageStyles.readinessDetails}>
                <div>
                  <dt>저장된 공고</dt>
                  <dd>{source.programCount}건</dd>
                </div>
                <div>
                  <dt>검색 준비</dt>
                  <dd>{source.indexReady ? '준비됨' : source.searchState === 'PREPARING' ? '준비 중' : '준비 확인 불가'}</dd>
                </div>
                <div>
                  <dt>성공 동기화</dt>
                  <dd>{formatSyncTime(source.lastSuccessfulSyncAt)}</dd>
                </div>
                <div>
                  <dt>실패 동기화</dt>
                  <dd>{formatSyncTime(source.lastFailedSyncAt)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
      {isUnavailable || readiness.searchState === 'SEARCHABLE_WITH_PARTIAL_SOURCES' ? (
        <button
          type="button"
          className={chatPageStyles.readinessRetryButton}
          onClick={onRetry}
        >
          상태 다시 확인
        </button>
      ) : null}
      {isRefreshing ? (
        <span className={chatPageStyles.readinessRefreshing}>상태를 다시 확인하고 있습니다.</span>
      ) : null}
    </section>
  )
}

function getReadinessNoticeContent(readiness: SupportProgramSearchReadiness) {
  switch (readiness.searchState) {
    case 'PREPARING':
      return {
        title: '초기 공고 데이터를 준비하고 있습니다.',
        description: '준비가 완료되면 자동으로 검색할 수 있습니다.',
      }
    case 'SEARCHABLE':
      if (readiness.programCount === 0) {
        return {
          title: '현재 제공 중인 공고가 없습니다.',
          description: '새 공고가 동기화되면 검색 결과에 표시됩니다.',
        }
      }
      return {
        title: '공고 검색이 가능합니다.',
        description: '현재 저장된 공고를 바로 검색할 수 있습니다.',
      }
    case 'SEARCHABLE_WITH_SYNC_FAILURE':
      return {
        title: '이전 공고 데이터로 검색할 수 있습니다.',
        description: '최신 공고 동기화에 실패했지만, 이전에 저장된 공고는 계속 검색할 수 있습니다.',
      }
    case 'SEARCHABLE_WITH_PARTIAL_SOURCES': {
      const searchableSources = readiness.sources
        .filter((source) => source.searchState === 'SEARCHABLE'
          || source.searchState === 'SEARCHABLE_WITH_SYNC_FAILURE')
        .map((source) => source.sourceName)
      return {
        title: '일부 제공처의 공고를 검색할 수 있습니다.',
        description: `현재 검색 범위: ${searchableSources.join(', ')}. 나머지 제공처는 준비가 완료되면 검색에 포함됩니다.`,
      }
    }
    case 'UNAVAILABLE':
      return {
        title: '현재 공고 데이터를 검색할 수 없습니다.',
        description: '잠시 후 상태를 다시 확인해 주세요.',
      }
  }
}

function formatSourceSearchState(state: SupportProgramSourceSearchState) {
  const labels: Record<SupportProgramSourceSearchState, string> = {
    PREPARING: '초기 준비 중',
    SEARCHABLE: '검색 가능',
    SEARCHABLE_WITH_SYNC_FAILURE: '이전 공고 검색 가능 · 최신 동기화 실패',
    UNAVAILABLE: '검색 불가',
  }
  return labels[state]
}

function formatSyncTime(value: string | null) {
  if (!value) return '기록 없음'

  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value

  return syncTimeFormatter.format(date)
}

function ProgramResults({ programs }: { programs: SupportProgram[] }) {
  const groups = groupSupportProgramsByEligibility(programs)
  return (
    <div className={chatPageStyles.programList}>
      <ProgramResultSection title="조건 확인 공고" programs={groups.matched}
        description="지원 대상과 지역을 공식 API 본문에서 확인했습니다. 최종 신청 자격 확정은 아닙니다." />
      <ProgramResultSection title="확인 필요 공고" programs={groups.reviewRequired}
        description="지원 대상·지역이 불명확하거나 자격 판정이 제공되지 않았습니다. 조건 확인 공고와 구분해 확인하세요." />
      <ProgramResultSection title="최신 공고" programs={groups.latest}
        description="자격을 평가하지 않은 최신 목록입니다. 입력한 기업 조건에 맞는다는 뜻이 아닙니다." />
    </div>
  )
}

function ProgramResultSection({ title, description, programs }: {
  title: string
  description: string
  programs: SupportProgram[]
}) {
  if (!programs.length) return null
  return (
    <section aria-label={title}>
      <h2 className={chatPageStyles.resultSectionTitle}>{title} · {programs.length}건</h2>
      <p className={chatPageStyles.conditionsHint}>{description}</p>
      <div className={chatPageStyles.programList}>
        {programs.map((program) => (
          <ProgramCard key={`${program.sourceCode}:${program.id}`} program={program} />
        ))}
      </div>
    </section>
  )
}

function ProgramCard({ program }: { program: SupportProgram }) {
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
