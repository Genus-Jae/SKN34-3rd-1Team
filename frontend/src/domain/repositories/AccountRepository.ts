import type { Account, AccountRole } from '../entities/Account'
import type { AccountDeletionPreview } from '../entities/AccountDeletionPreview'
import type { AuthSession } from '../entities/AuthSession'

export type AccountLogIn = {
  email: string
  password: string
  /** "로그인 상태 유지". 켜면 브라우저를 닫아도 세션 쿠키가 남습니다. */
  rememberMe: boolean
}

export type AccountSignUp = {
  email: string
  password: string
}

/** 가입 실패 사유도 화면이 다른 안내를 보여야 하므로 결과로 구분합니다. 성공하면 서버가 바로 세션을 발급합니다. */
export type SignUpResult =
  | { outcome: 'session'; session: AuthSession }
  | { outcome: 'email-taken' }
  | { outcome: 'rate-limited'; retryAfterSeconds: number | null }

/** 로그인 실패 사유는 화면이 다른 안내를 보여야 하므로 예외가 아닌 결과로 구분합니다. */
export type LogInResult =
  | { outcome: 'session'; session: AuthSession }
  | { outcome: 'invalid-credentials' }
  | { outcome: 'suspended' }
  | { outcome: 'rate-limited'; retryAfterSeconds: number | null }

/** 현재 비밀번호 불일치는 화면이 칸 아래에 안내하는 업무 결과입니다. */
export type ChangePasswordResult =
  | { outcome: 'changed' }
  | { outcome: 'current-password-mismatch' }
  | { outcome: 'rate-limited'; retryAfterSeconds: number | null }

export type DeleteAccountResult =
  | { outcome: 'deleted' }
  | { outcome: 'current-password-mismatch' }
  | { outcome: 'rate-limited'; retryAfterSeconds: number | null }

/** 재설정 링크 요청은 가입 여부와 관계없이 `requested`입니다. 메일을 보낼 수 없는 서버 상태만 따로 안내합니다. */
export type RequestPasswordResetResult =
  | { outcome: 'requested' }
  | { outcome: 'mail-unavailable' }
  | { outcome: 'rate-limited'; retryAfterSeconds: number | null }

/** 없거나 만료·사용된 토큰은 화면이 다시 요청하도록 안내하는 업무 결과입니다. */
export type ResetPasswordResult =
  | { outcome: 'reset' }
  | { outcome: 'token-invalid' }
  | { outcome: 'rate-limited'; retryAfterSeconds: number | null }

/** 계정 기능이 Data Layer의 HTTP·저장소 세부사항과 분리되도록 하는 Domain 포트입니다. */
export interface AccountRepository {
  signUp(command: AccountSignUp, signal?: AbortSignal): Promise<SignUpResult>
  logIn(command: AccountLogIn, signal?: AbortSignal): Promise<LogInResult>
  /** 개발 환경 전용. Core API가 개발용 로그인을 켰을 때만 성공하며, 역할별 시드 계정으로 들어갑니다. */
  logInAsDeveloper(role: AccountRole, signal?: AbortSignal): Promise<AuthSession>
  logOut(signal?: AbortSignal): Promise<void>
  /** 저장된 세션이 없거나 만료됐으면 null입니다. */
  getCurrentAccount(signal?: AbortSignal): Promise<Account | null>
  /** 현재 비밀번호를 확인하고 바꿉니다. 성공하면 서버가 다른 기기의 세션을 끝냅니다. */
  changePassword(currentPassword: string, newPassword: string, signal?: AbortSignal): Promise<ChangePasswordResult>
  /** 삭제 확인 모달에 보여 줄, 함께 사라지는 것들의 수입니다. */
  getDeletionPreview(signal?: AbortSignal): Promise<AccountDeletionPreview>
  /** 현재 비밀번호를 확인하고 계정을 삭제합니다. 성공하면 세션 힌트를 지웁니다. */
  deleteAccount(password: string, signal?: AbortSignal): Promise<DeleteAccountResult>
  /** 가입 이메일로 비밀번호 재설정 링크를 요청합니다. 로그인 없이 부릅니다. */
  requestPasswordReset(email: string, signal?: AbortSignal): Promise<RequestPasswordResetResult>
  /** 메일 링크의 토큰으로 새 비밀번호를 저장합니다. 성공하면 서버가 모든 세션을 끝냅니다. */
  resetPassword(token: string, newPassword: string, signal?: AbortSignal): Promise<ResetPasswordResult>
}
