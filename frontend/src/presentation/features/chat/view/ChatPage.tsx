import { Link } from 'react-router'

import type { SupportProgram } from '../../../../domain/entities/SupportProgram'
import type {
  SupportProgramSearchReadiness,
  SupportProgramSourceSearchState,
} from '../../../../domain/entities/SupportProgramSearchReadiness'
import { useChatPageViewModel } from '../viewmodel/useChatPageViewModel'
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
    isSearching,
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
              disabled={!canSearch}
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
              이번 대화 검색
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
                  {message.id === messages[0]?.id ? (
                    <div className={chatPageStyles.suggestedQuestions}>
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={chatPageStyles.suggestedQuestionButton}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          disabled={!canSearch}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {message.programs?.length ? (
                    <div className={chatPageStyles.programList}>
                      {message.programs.map((program) => (
                        <ProgramCard key={`${program.sourceCode}:${program.id}`} program={program} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })}
          {isSearching ? (
            <div className={chatPageStyles.messageRow}>
              <span className={chatPageStyles.assistantAvatar}>
                G
              </span>
              <div className={chatPageStyles.searchingBubble}>
                공고를 찾아보고 있어요…
              </div>
            </div>
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
              disabled={!canSearch}
              onChange={handleDraftChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleInputKeyDown}
              placeholder="예: 서울에서 AI 창업지원 사업을 찾아줘"
              rows={1}
            />
            {isSearching ? (
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
            Enter로 전송 · Shift+Enter로 줄바꿈
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

function ProgramCard({ program }: { program: SupportProgram }) {
  return (
    <article className={chatPageStyles.programCard}>
      <div className={chatPageStyles.programCardHeader}>
        <span className={chatPageStyles.programTag}>
          {program.recommendationScore === null
            ? '최신 공고'
            : `AI 추천 ${program.recommendationScore}점`}
        </span>
        <span className={chatPageStyles.programDeadline}>
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
      <div className={chatPageStyles.matchedReasons}>
        {program.matchedReasons.map((reason) => (
          <span key={reason} className={chatPageStyles.matchedReason}>
            ✓ {reason}
          </span>
        ))}
      </div>
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
