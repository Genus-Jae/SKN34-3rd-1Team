const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'

export const savedCalendarStyles = {
  page: 'flex min-h-0 flex-1 flex-col bg-white text-app-ink max-chat:min-h-[740px]',
  content: 'flex min-h-0 flex-1 flex-col px-6 pt-4 pb-6 max-chat:px-4',
  toolbar: 'flex shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-sample-border py-4',
  navigation: 'flex min-w-0 flex-wrap items-center gap-3',
  monthSelect: `cursor-pointer rounded-md border border-transparent bg-white py-2 pr-1 text-base font-semibold text-app-ink hover:border-sample-border ${focus}`,
  arrowGroup: 'inline-flex shrink-0 overflow-hidden rounded-md border border-sample-border',
  arrow: `grid size-9 cursor-pointer place-items-center border-r border-sample-border bg-white text-sample-muted last:border-r-0 hover:bg-brand-accent hover:text-brand-primary disabled:cursor-not-allowed disabled:bg-app-canvas disabled:text-[#b0b5b9] ${focus} focus-visible:-outline-offset-2`,
  note: 'flex shrink-0 flex-wrap items-center justify-between gap-2 py-3 text-xs leading-relaxed text-sample-muted',
  scroll: `relative min-h-[200px] flex-1 overflow-auto overscroll-contain border-t border-b border-sample-border [scrollbar-gutter:stable] ${focus} max-chat:h-[520px] max-chat:flex-none`,
  table: 'w-full min-w-[630px] table-fixed border-separate border-spacing-0',
  weekday: 'sticky top-0 z-10 border-b border-sample-border bg-white px-3 py-3 text-left text-xs font-medium',
  cell: 'h-[120px] border-r border-b border-sample-border px-1 py-2 align-top last:border-r-0',
  date: 'mb-2 ml-2 inline-flex size-6 items-center justify-center rounded-full text-xs',
  events: 'm-0 flex list-none flex-col gap-1.5 p-0',
  event: 'border-l-2 border-brand-primary bg-brand-accent px-2 py-1.5 text-xs leading-[1.55] break-words text-[#175d3a]',
  eventTitle: 'block font-medium',
  eventOrg: 'mt-1 block text-[10px] text-[#426650]',
  footer: 'm-0 shrink-0 pt-3 text-xs leading-relaxed text-sample-muted',
} as const
