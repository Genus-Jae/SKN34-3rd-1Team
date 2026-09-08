import type { Account, AccountRole } from '../entities/Account'
import type { AuthSession } from '../entities/AuthSession'

export type AccountLogIn = {
  email: string
  password: string
  /** "로그인 상태 유지". 켜면 브라우저를 닫아도 세션 쿠키가 남습니다. */
  rememberMe: boolean
}

/** 로그인 실패 사유는 화면이 다른 안내를 보여야 하므로 예외가 아닌 결과로 구분합니다. */
export type LogInResult =
  | { outcome: 'session'; session: AuthSession }
  | { outcome: 'invalid-credentials' }
  | { outcome: 'suspended' }
  | { outcome: 'rate-limited'; retryAfterSeconds: number | null }

/** 계정 기능이 Data Layer의 HTTP·저장소 세부사항과 분리되도록 하는 Domain 포트입니다. */
export interface AccountRepository {
  logIn(command: AccountLogIn, signal?: AbortSignal): Promise<LogInResult>
  /** 개발 환경 전용. Core API가 개발용 로그인을 켰을 때만 성공하며, 역할별 시드 계정으로 들어갑니다. */
  logInAsDeveloper(role: AccountRole, signal?: AbortSignal): Promise<AuthSession>
  logOut(signal?: AbortSignal): Promise<void>
  /** 저장된 세션이 없거나 만료됐으면 null입니다. */
  getCurrentAccount(signal?: AbortSignal): Promise<Account | null>
}
