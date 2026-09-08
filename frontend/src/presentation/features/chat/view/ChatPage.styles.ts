function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 ChatPage에서 맡는 UI 역할을 이름으로 사용합니다.
// open/closed, user/assistant처럼 화면 상태가 달라지는 경우에는 base 스타일과 variant를 분리합니다.
export const chatPageStyles = {
  proposalPanel: 'ml-11 grid w-fit max-w-[calc(100%_-_2.75rem)] gap-3 rounded-xl border border-[#bfc8eb] bg-white p-3 max-chat:ml-0 max-chat:max-w-full',
  proposalTitle: 'm-0 text-sm font-bold leading-relaxed text-[#293454] [overflow-wrap:anywhere]',
  proposalChanges: 'm-0 flex list-none flex-wrap gap-2 p-0',
  proposalChange: 'rounded-md bg-[#f0f2ff] px-2 py-1 text-xs leading-relaxed text-[#43527a] [overflow-wrap:anywhere]',
  proposalHint: 'm-0 text-xs leading-relaxed text-[#6471a0]',
  conditionsActions: 'col-span-full flex flex-wrap items-center gap-2',
  conditionsButton: 'rounded-lg border border-[#d8e0f3] bg-[#f0f2ff] px-3 py-2 text-xs font-bold text-[#43527a] disabled:opacity-50',
  conditionsHint: 'my-2 text-xs leading-relaxed text-[#6471a0]',
  searchSnapshot: 'mt-2 text-xs leading-relaxed text-[#6471a0]',
  page: 'min-h-screen bg-app-canvas text-app-ink',
  workspace:
    'flex min-h-[calc(100vh-3.75rem)] min-w-0 flex-col max-chat:min-h-[calc(100svh-3.75rem)]',
  // 로그인 뒤 작업 화면은 사이드바 껍데기가 정한 높이를 그대로 채웁니다.
  // 대화만 안에서 스크롤되고 입력창은 화면 아래에 붙어 있게 하려면 높이가 늘어나면 안 됩니다.
  workspacePage: 'flex min-h-0 flex-1 flex-col bg-app-canvas text-app-ink max-chat:min-h-svh',
  workspaceShell: 'flex min-h-0 min-w-0 flex-1 flex-col',
  timeline: classes(
    'mx-auto min-h-0 w-[min(860px,calc(100%_-_2rem))] flex-1 overflow-y-auto pt-2 pb-6',
    'max-chat:w-[calc(100%_-_1.2rem)] max-chat:pt-4',
  ),
  // 작업 화면에는 머리말이 없으므로 첫 메시지가 화면 맨 위에 붙지 않도록 위쪽 여백을 넉넉히 둡니다.
  workspaceTimeline: classes(
    'mx-auto min-h-0 w-[min(860px,calc(100%_-_2rem))] flex-1 overflow-y-auto pt-16 pb-6',
    'max-chat:w-[calc(100%_-_1.2rem)] max-chat:pt-10',
  ),
  messageRow: 'mb-[1.8rem] flex gap-3',
  userMessageRow: 'justify-end',
  assistantAvatar:
    'grid size-8 shrink-0 place-items-center self-start rounded-[0.7rem] bg-brand-accent font-black text-app-ink',
  messageContent: 'min-w-0 max-w-[min(700px,90%)] [overflow-wrap:anywhere] max-chat:max-w-[88%]',
  messageBubble:
    'whitespace-pre-wrap px-[1.1rem] py-4 leading-[1.65] shadow-[0_10px_30px_rgb(47_67_129_/_7%)]',
  userMessageBubble: 'rounded-[1rem_1rem_0.25rem_1rem] bg-brand-primary text-white',
  assistantMessageBubble: 'rounded-[1rem_1rem_1rem_0.25rem] bg-white text-[#293454]',
  suggestedQuestions: 'mt-[0.85rem] flex flex-wrap gap-2',
  suggestedQuestionButton: classes(
    'cursor-pointer rounded-full border bg-white px-[0.78rem] py-[0.6rem] text-left text-[0.78rem]',
    'border-[#dfe4f2] text-[#536087] hover:border-[#7774d7] hover:text-[#504ebd]',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ),
  programList: 'mt-[0.9rem] grid gap-[0.8rem]',
  resultSectionTitle: 'mt-3 mb-1 text-sm font-bold text-[#293454]',
  eligibilityReview: 'mt-3 grid gap-2 rounded-lg border border-[#dfe4f2] bg-[#f7f8fc] p-3',
  eligibilityAxisTitle: 'm-0 text-xs font-bold text-[#43527a]',
  eligibilityQuote: 'mx-0 my-2 break-words border-l-2 border-[#9aa7cb] pl-3 text-xs leading-relaxed text-[#4d597c]',
  reviewRequiredTag: 'rounded-[0.35rem] bg-[#fff4df] px-[0.48rem] py-1 text-[0.68rem] font-extrabold text-[#805a20]',
  searchingBubble: classes(
    'rounded-[1rem_1rem_1rem_0.25rem] bg-white px-[1.1rem] py-4 leading-[1.65]',
    'text-sample-muted shadow-[0_10px_30px_rgb(47_67_129_/_7%)]',
  ),
  intro: 'mx-auto w-[min(860px,calc(100%_-_2rem))] pt-9 max-chat:w-[calc(100%_-_1.2rem)] max-chat:pt-6',
  introTitle: 'm-0 text-[1.45rem] font-bold tracking-[-0.04em] text-[#151d3a] max-chat:text-[1.2rem]',
  introDescription: 'mt-2 mb-0 text-[0.86rem] leading-[1.6] text-sample-muted',
  composer:
    'mx-auto w-[min(860px,calc(100%_-_2rem))] pt-6 pb-7 max-chat:w-[calc(100%_-_1.2rem)] max-chat:pt-4 max-chat:pb-5',
  suggestions: 'mx-auto mb-4 flex w-[min(860px,calc(100%_-_2rem))] flex-wrap gap-2 max-chat:w-[calc(100%_-_1.2rem)]',
  composerWorkspace:
    'mx-auto mt-auto w-[min(860px,calc(100%_-_2rem))] pt-2 pb-6 max-chat:w-[calc(100%_-_1.2rem)]',
  composerInputGroup: 'relative',
  searchContextControls: 'mb-2 flex flex-wrap items-center justify-end gap-2',
  currentConditions: 'm-0 min-w-0 flex-1 text-xs leading-relaxed text-[#536087] [overflow-wrap:anywhere]',
  newSearchButton: 'shrink-0 cursor-pointer rounded-lg border border-[#d8e0f3] bg-white px-3 py-2 text-xs font-bold text-[#43527a] hover:border-[#7774d7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7774d7]',
  searchStatus: 'sr-only',
  searchError: classes(
    'mt-0 mb-[0.55rem] flex items-center justify-between gap-3 rounded-[0.7rem] border px-[0.8rem] py-[0.65rem] text-[0.76rem]',
    'border-[#f0cfd4] bg-[#fff5f6] text-[#9a3947]',
  ),
  readinessNotice: classes(
    'mx-auto mb-3 flex w-[min(860px,calc(100%_-_2rem))] flex-wrap items-center gap-2 text-xs leading-relaxed max-chat:w-[calc(100%_-_1.2rem)]',
    'text-[#536087]',
  ),
  readinessErrorNotice: classes(
    'mx-auto mb-3 flex w-[min(860px,calc(100%_-_2rem))] flex-wrap items-center gap-2 text-xs leading-relaxed max-chat:w-[calc(100%_-_1.2rem)]',
    'text-[#9a3947]',
  ),
  readinessRetryButton:
    'shrink-0 cursor-pointer rounded-[0.45rem] border border-[#dcaab2] bg-white px-2 py-[0.3rem] text-[0.72rem] font-bold text-[#8f3340] disabled:cursor-wait disabled:opacity-50',
  searchRetryButton:
    'shrink-0 cursor-pointer rounded-[0.45rem] border border-[#dcaab2] bg-white px-2 py-[0.3rem] text-[0.72rem] font-bold text-[#8f3340]',
  composerInput: classes(
    'min-h-[4.25rem] w-full resize-none rounded-2xl border bg-white',
    'pt-[1.35rem] pr-[3.4rem] pb-[1.75rem] pl-5 text-[#1b2544] placeholder:text-sample-muted',
    'border-[#d7dcef] shadow-[0_10px_28px_rgb(47_67_129_/_7%)] outline-0',
    'focus:border-[#7774d7] focus:shadow-[0_0_0_3px_rgb(119_116_215_/_15%)]',
  ),
  submitButton: classes(
    'absolute top-[0.65rem] right-[0.65rem] grid size-[2.15rem] place-items-center',
    'cursor-pointer rounded-[0.7rem] border-0 bg-brand-primary text-[1.2rem] text-white',
    'disabled:cursor-not-allowed disabled:opacity-[0.35]',
  ),
  cancelSearchButton: classes(
    'absolute top-[0.65rem] right-[0.65rem] rounded-[0.7rem] border-0 px-3 py-[0.58rem]',
    'cursor-pointer bg-[#eef0fb] text-[0.75rem] font-bold text-[#49557a]',
  ),
  composerHint: 'mt-[0.45rem] ml-[0.35rem] block text-[0.68rem] text-[#626d89]',
  programCard:
    'rounded-2xl border border-[#e4e8f5] bg-white p-[1.1rem] shadow-[0_12px_30px_rgb(47_67_129_/_7%)]',
  programCardHeader: 'flex flex-wrap items-center justify-between gap-3',
  programTag:
    'rounded-[0.35rem] bg-[#f0f9e9] px-[0.48rem] py-1 text-[0.68rem] font-extrabold text-[#536d37]',
  programDeadline: 'text-[0.74rem] font-extrabold text-[#b75561]',
  programTitle:
    'mt-3 mb-[0.18rem] text-[1.02rem] font-bold tracking-[-0.025em] text-app-ink',
  programOrganization: 'm-0 text-[0.75rem] text-sample-muted',
  programSummary: 'my-3 text-[0.82rem] leading-[1.55] text-[#5c6785]',
  programDetails: classes(
    'flex flex-col items-start justify-between gap-1 rounded-[0.65rem] p-[0.7rem]',
    'bg-[#f7f8fc] text-[0.75rem] text-[#4d597c]',
  ),
  matchedReasons: 'mt-[0.7rem] flex flex-wrap gap-[0.35rem]',
  matchedReason: 'text-[0.7rem] text-[#5c6785]',
  programActions: 'mt-[0.85rem] flex items-center justify-start gap-3',
  programDetailsButton: classes(
    'cursor-pointer rounded-[0.55rem] border-0 px-[0.7rem] py-[0.55rem]',
    'bg-[#5e5fc8] text-[0.74rem] font-extrabold text-white',
  ),
  programSourceLink:
    'rounded-[0.55rem] bg-[#f1f2ff] px-[0.7rem] py-[0.55rem] text-[0.74rem] font-extrabold text-[#5e5fc8] no-underline',
} as const

export function chatMessageRowClassName(isUser: boolean) {
  return isUser
    ? `${chatPageStyles.messageRow} ${chatPageStyles.userMessageRow}`
    : chatPageStyles.messageRow
}

export function chatMessageBubbleClassName(isUser: boolean) {
  const variant = isUser
    ? chatPageStyles.userMessageBubble
    : chatPageStyles.assistantMessageBubble
  return `${chatPageStyles.messageBubble} ${variant}`
}
