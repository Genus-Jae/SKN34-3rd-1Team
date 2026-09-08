/** 상세·질문 왕복 중 검색 화면을 보존하고 임의의 외부 복귀 주소는 허용하지 않습니다. */
export function getSupportProgramSearchReturnTo(state: unknown): '/' | '/chat' {
  return typeof state === 'object' && state !== null
    && 'searchReturnTo' in state && state.searchReturnTo === '/chat'
    ? '/chat'
    : '/'
}
