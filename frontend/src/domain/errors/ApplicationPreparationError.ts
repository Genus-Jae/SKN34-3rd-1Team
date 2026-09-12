export class ApplicationPreparationError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(messageFor(code, status))
    this.name = 'ApplicationPreparationError'
    this.status = status
    this.code = code
  }
}

function messageFor(code: string, status: number): string {
  if (status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  if (code === 'APPLICATION_PREPARATION_API_UNAVAILABLE') return '현재 연결된 서버가 신청 문서 작성 기능을 지원하지 않습니다. Core·AI Service 이미지를 갱신한 뒤 다시 시도해 주세요.'
  if (code === 'APPLICATION_PREPARATION_NOT_FOUND') return '신청 준비 건을 찾을 수 없습니다.'
  if (code === 'APPLICATION_FORM_NOT_SUPPORTED') return '현재 지원하지 않는 공고·양식·지원 분야입니다.'
  if (code === 'APPLICATION_FORM_NO_FORM') return '공식 첨부에서 자동 작성할 신청 문서를 찾지 못했습니다. 원문 첨부를 직접 확인해 주세요.'
  if (code === 'APPLICATION_FORM_SOURCE_UNSUPPORTED') return '공식 PDF/HWP/HWPX 첨부를 확보하고 읽을 수 있는 공고만 분석할 수 있습니다.'
  if (code === 'APPLICATION_FORM_SOURCE_NOT_FOUND') return '공식 공고나 첨부를 찾지 못했습니다. 공고 ID를 확인해 주세요.'
  if (code === 'APPLICATION_FORM_SOURCE_TOO_LARGE') return '공식 첨부가 자동 분석 가능한 크기나 페이지 수를 초과했습니다.'
  if (code === 'APPLICATION_FORM_SOURCE_INVALID') return '공식 첨부의 형식이나 출처를 안전하게 확인하지 못했습니다.'
  if (code === 'APPLICATION_FORM_SOURCE_UNAVAILABLE') return '공식 공고나 첨부를 지금 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (code === 'APPLICATION_FORM_AI_INVALID_RESPONSE') return 'AI가 공식 첨부의 문항 근거를 안전하게 확인하지 못했습니다. 입력은 저장되지 않았으니 다시 시도해 주세요.'
  if (code === 'APPLICATION_PREPARATION_SECTION_NOT_FOUND') return '현재 지원하지 않는 작성 항목입니다.'
  if (code === 'APPLICATION_PREPARATION_REVISION_CONFLICT') return '다른 변경이 먼저 저장되었습니다. 최신 입력을 다시 불러와 주세요.'
  if (code === 'APPLICATION_PREPARATION_RUN_CONFLICT') return '같은 AI 요청을 다시 사용할 수 없습니다. 답변을 확인한 뒤 다시 시도해 주세요.'
  if (code === 'AI_SERVICE_TIMEOUT') return 'AI 답변 확인 시간이 초과되었습니다. 입력은 저장되지 않았으니 다시 시도해 주세요.'
  if (code === 'AI_SERVICE_UNAVAILABLE' || code === 'AI_SERVICE_INVALID_RESPONSE') return 'AI가 답변을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  if (code === 'REQUEST_VALIDATION_FAILED' || status === 400) return '선택한 공식 양식과 지원 분야를 다시 확인해 주세요.'
  if (code === 'INVALID_RESPONSE') return '신청 준비 응답 형식을 확인하지 못했습니다.'
  if (code === 'REQUEST_TIMEOUT') return '신청 준비 요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
  if (code === 'REQUEST_FAILED' || status === 0) return 'Core API에 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.'
  return '신청 준비 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
