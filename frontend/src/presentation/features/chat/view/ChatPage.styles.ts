function classes(...groups: string[]) {
  return groups.join(' ')
}

// 색상이나 CSS 속성이 아니라 ChatPage에서 맡는 UI 역할을 이름으로 사용합니다.
// open/closed, user/assistant처럼 화면 상태가 달라지는 경우에는 base 스타일과 variant를 분리합니다.
export const chatPageStyles = {
  proposalPanel: 'ml-11 grid w-fit max-w-[calc(100%_-_2.75rem)] scroll-mt-36 gap-3 rounded-2xl border border-[#b6dac7] bg-white p-4 max-chat:ml-0 max-chat:max-w-full',
  proposalTitle: 'm-0 text-sm font-bold leading-relaxed text-[#203d2c] [overflow-wrap:anywhere]',
  proposalChanges: 'm-0 flex list-none flex-wrap gap-2 p-0',
  proposalChange: 'rounded-md bg-[#edf7f1] px-2 py-1 text-xs leading-relaxed text-[#345745] [overflow-wrap:anywhere]',
  proposalHint: 'm-0 text-xs leading-relaxed text-[#52685c]',
  conditionsActions: 'col-span-full flex flex-wrap items-center gap-2',
  conditionsButton: 'cursor-pointer rounded-full border border-[#a5d4bc] bg-[#edf7f1] px-4 py-2 text-xs font-bold text-[#286044] hover:bg-[#d8eee1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58] disabled:cursor-not-allowed disabled:opacity-50',
  conditionsHint: 'my-2 text-xs leading-relaxed text-[#52685c]',
  searchSnapshot: 'mt-2 text-xs leading-relaxed text-[#52685c]',
  page: 'min-h-screen bg-[linear-gradient(180deg,#f0f9f3_0%,#f9fdfb_65%,#fff_100%)] text-app-ink',
  workspace:
    'flex min-h-[calc(100svh-7rem)] min-w-0 flex-col pb-12',
  // 로그인 뒤 작업 화면은 사이드바 껍데기가 정한 높이를 그대로 채웁니다.
  // 대화만 안에서 스크롤되고 입력창은 화면 아래에 붙어 있게 하려면 높이가 늘어나면 안 됩니다.
  workspacePage: 'relative flex min-h-0 flex-1 flex-col bg-[#f4faf6] text-app-ink max-chat:min-h-svh',
  workspaceShell: 'flex min-h-0 min-w-0 flex-1 flex-col',
  timeline: classes(
    'relative mx-auto min-h-0 w-[min(1040px,calc(100%_-_3rem))] overflow-y-auto pt-6 pb-6',
    'max-chat:w-[calc(100%_-_2rem)] max-chat:pt-4',
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
    'whitespace-pre-wrap px-[1.1rem] py-4 leading-[1.65] shadow-[0_10px_30px_rgb(23_68_45_/_7%)]',
  userMessageBubble: 'rounded-[1rem_1rem_0.25rem_1rem] bg-brand-primary text-white',
  assistantMessageBubble: 'rounded-[1rem_1rem_1rem_0.25rem] bg-white text-[#203d2c]',
  suggestedQuestions: 'mt-[0.85rem] flex flex-wrap gap-2',
  suggestedQuestionButton: classes(
    'cursor-pointer rounded-full border bg-white px-[0.78rem] py-[0.6rem] text-left text-[0.78rem]',
    'border-[#b4ddc7] text-[#425e4e] hover:border-[#147d58] hover:bg-[#eef8f2] hover:text-[#115b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58]',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ),
  programList: 'mt-[0.9rem] grid gap-[0.8rem]',
  resultSectionTitle: 'mt-3 mb-1 text-sm font-bold text-[#203d2c]',
  eligibilityReview: 'mt-3 grid gap-2 rounded-lg border border-[#dbe9e0] bg-[#f5faf7] p-3',
  eligibilityAxisTitle: 'm-0 text-xs font-bold text-[#365947]',
  eligibilityQuote: 'mx-0 my-2 break-words border-l-2 border-[#a5c9b6] pl-3 text-xs leading-relaxed text-[#52685c]',
  reviewRequiredTag: 'rounded-[0.35rem] bg-[#fff4df] px-[0.48rem] py-1 text-[0.68rem] font-extrabold text-[#805a20]',
  searchingBubble: classes(
    'rounded-[1rem_1rem_1rem_0.25rem] bg-white px-[1.1rem] py-4 leading-[1.65]',
    'text-sample-muted shadow-[0_10px_30px_rgb(23_68_45_/_7%)]',
  ),
  intro: 'mx-auto w-[min(1180px,calc(100%_-_2rem))] pt-[clamp(2.5rem,5vw,4.5rem)] text-center',
  introBadge: 'inline-flex items-center gap-2 rounded-full bg-[#d7efe2] px-4 py-2 text-[0.85rem] font-bold text-[#126742]',
  introTitle: 'mt-7 mb-0 break-keep text-[clamp(1.85rem,4vw,3.5rem)] font-extrabold leading-[1.38] tracking-[-0.065em] text-[#111e17] [text-wrap:balance] max-chat:mt-6',
  introDescription: 'mt-6 mb-0 break-keep text-[clamp(0.9rem,1.45vw,1.15rem)] leading-[1.85] tracking-[-0.025em] text-[#52685c] [text-wrap:pretty] max-chat:mt-4',
  composer:
    'mx-auto w-[min(1040px,calc(100%_-_3rem))] pt-10 pb-5 max-chat:w-[calc(100%_-_2rem)] max-chat:pt-7',
  suggestions: 'mx-auto flex w-[min(1040px,calc(100%_-_3rem))] flex-wrap justify-center gap-2.5 max-chat:w-[calc(100%_-_2rem)]',
  composerWorkspace:
    'mx-auto mt-auto w-[min(860px,calc(100%_-_2rem))] pt-2 pb-6 max-chat:w-[calc(100%_-_1.2rem)]',
  composerInputGroup: 'relative overflow-hidden rounded-[1.65rem] border border-[#b8dfc9] bg-white shadow-[0_3px_5px_rgb(23_68_45_/_5%),0_16px_48px_rgb(23_68_45_/_3%)] focus-within:border-[#23805a] focus-within:ring-2 focus-within:ring-[#23805a]/10',
  searchContextControls: 'mb-2',
  currentConditions: 'm-0 min-w-0 flex-1 text-xs leading-relaxed text-[#52685c] [overflow-wrap:anywhere]',
  newSearchButton: 'shrink-0 cursor-pointer rounded-full border border-[#cce1d4] bg-white px-3 py-2 text-xs font-bold text-[#365947] hover:border-[#147d58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58]',
  searchStatus: 'sr-only',
  searchError: classes(
    'mt-0 mb-[0.55rem] flex items-center justify-between gap-3 rounded-[0.7rem] border px-[0.8rem] py-[0.65rem] text-[0.76rem]',
    'border-[#f0cfd4] bg-[#fff5f6] text-[#9a3947]',
  ),
  readinessNotice: classes(
    'mx-auto mb-3 flex w-[min(860px,calc(100%_-_2rem))] flex-wrap items-center gap-2 text-xs leading-relaxed max-chat:w-[calc(100%_-_1.2rem)]',
    'text-[#52685c]',
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
    'block w-full resize-none border-0 bg-transparent px-7 pt-6 pb-3 text-[#203d2c] placeholder:text-sample-muted outline-0',
    'leading-[1.7] max-chat:px-5 max-chat:pt-5',
  ),
  landingComposerInput: 'min-h-[8.5rem] text-[1.1rem] max-chat:min-h-[8rem] max-chat:text-base',
  workspaceComposerInput: 'min-h-[4.25rem] text-[0.95rem]',
  submitButton: classes(
    'absolute right-5 bottom-4 grid size-12 place-items-center max-chat:right-4 max-chat:bottom-4',
    'cursor-pointer rounded-full border-0 bg-brand-primary text-white hover:bg-[#106b48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147d58]',
    'disabled:cursor-not-allowed disabled:bg-[#aecfbc]',
  ),
  cancelSearchButton: classes(
    'absolute right-5 bottom-4 min-h-12 rounded-full border-0 px-3 max-chat:right-4',
    'cursor-pointer bg-[#e8f5ed] text-[0.75rem] font-bold text-[#286044] hover:bg-[#d6ecdf]',
  ),
  composerFooter: 'flex min-h-[4.25rem] flex-wrap items-center gap-x-4 gap-y-2 pt-1 pr-[5.5rem] pb-5 pl-7 max-chat:pl-5',
  composerHint: 'block text-[0.75rem] leading-relaxed text-[#52685c] max-chat:text-[0.68rem]',
  privacyHint: 'mx-4 mt-3 block text-center text-[0.7rem] leading-relaxed text-[#52685c]',
  sourceHint: 'mx-4 mt-7 mb-0 flex flex-wrap items-center justify-center gap-2 text-center text-xs leading-relaxed text-[#52685c]',
  programCard:
    'rounded-2xl border border-[#dbe9e0] bg-white p-5 shadow-[0_8px_24px_rgb(28_66_45_/_4%)]',
  programCardHeader: 'flex flex-wrap items-center justify-between gap-3',
  programTag:
    'rounded-[0.35rem] bg-[#f0f9e9] px-[0.48rem] py-1 text-[0.68rem] font-extrabold text-[#536d37]',
  programDeadline: 'text-[0.74rem] font-extrabold text-[#b75561]',
  programTitle:
    'mt-3 mb-[0.18rem] text-[1.02rem] font-bold tracking-[-0.025em] text-app-ink',
  programOrganization: 'm-0 text-[0.75rem] text-sample-muted',
  programSummary: 'my-3 text-[0.82rem] leading-[1.55] text-[#52685c]',
  programDetails: classes(
    'flex flex-col items-start justify-between gap-1 rounded-[0.65rem] p-[0.7rem]',
    'bg-[#f1f7f3] text-[0.75rem] text-[#52685c]',
  ),
  matchedReasons: 'mt-[0.7rem] flex flex-wrap gap-[0.35rem]',
  matchedReason: 'text-[0.7rem] text-[#52685c]',
  programActions: 'mt-[0.85rem] flex items-center justify-start gap-3',
  programDetailsButton: classes(
    'cursor-pointer rounded-full border-0 px-[0.7rem] py-[0.55rem]',
    'bg-brand-primary text-[0.74rem] font-extrabold text-white',
  ),
  programSourceLink:
    'rounded-full bg-[#edf7f1] px-[0.7rem] py-[0.55rem] text-[0.74rem] font-extrabold text-[#286044] no-underline',
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
