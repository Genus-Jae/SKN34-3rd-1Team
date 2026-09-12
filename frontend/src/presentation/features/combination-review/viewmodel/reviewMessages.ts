import { CombinationReviewError } from '../../../../domain/errors/CombinationReviewError'

export function reviewFailureMessage(error: unknown): string {
  if (!(error instanceof CombinationReviewError)) return '요청 결과를 확인하지 못했습니다. 조회는 다시 시도할 수 있습니다. 분석 응답이 유실됐다면 같은 요청 확인을 이용하세요.'
  if (error.code === 'COMBINATION_REVIEW_API_UNAVAILABLE') return '현재 연결된 서버에서 검토 API를 찾을 수 없습니다. Core API 실행 버전과 연결 주소를 확인해야 합니다. 입력은 유지됩니다.'
  if (error.code === 'RUN_QUEUE_UNAVAILABLE') return '분석 작업 접수가 비활성화되어 있습니다. 운영자가 RabbitMQ와 분석 큐 설정을 확인해야 합니다. 새 작업은 접수되지 않았습니다.'
  if (error.status === 401) return '로그인 세션이 만료되었습니다. 개인 화면을 닫고 다시 로그인해 주세요.'
  if (error.status === 403) return '계정 상태 또는 요청 권한을 확인해 주세요.'
  if (error.status === 404) return '검토 또는 실행을 찾을 수 없습니다. 본인에게 저장된 항목인지 확인해 주세요.'
  if (error.status === 409) return error.code === 'COMBINATION_REVIEW_REVISION_CONFLICT'
    ? '다른 화면에서 입력이 변경되었습니다. 작성 중인 입력은 유지됩니다. 최신 저장 입력을 조회한 뒤 직접 선택해 주세요.'
    : '실행 요청이 충돌했습니다. 실행 이력을 확인해 주세요. 요청 키나 내용을 자동으로 변경하지 않습니다.'
  if (error.status === 422) return error.code === 'INPUT_PROGRAM_COUNT_UNSUPPORTED'
    ? '새 분석은 공고를 정확히 2개 선택해야 합니다. 기존 결과는 그대로 조회할 수 있습니다.'
    : '현재 지원하지 않는 원문 형식·제공처 또는 문서 크기입니다. 정상적인 근거 부족 판단이 아닌 수집 실패입니다.'
  if (error.status === 429) return `요청량 또는 동시 실행 한도에 도달했습니다.${error.retryAfter ? ` 재확인 대기: ${error.retryAfter}초.` : ''} 실패 실행이 있으면 이력에서 확인해 주세요.`
  if (error.status === 503) return '원문 수집 또는 분석 서비스의 기술 오류입니다. 근거 부족이나 허용 판단을 의미하지 않습니다.'
  return '서버 응답을 안전하게 해석하지 못했습니다. 저장된 실행 이력을 확인해 주세요.'
}
