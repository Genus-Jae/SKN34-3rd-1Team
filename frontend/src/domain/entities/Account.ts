/** 관리자는 서버에서 SQL이나 개발용 로그인으로만 지정됩니다. */
export type AccountRole = 'USER' | 'ADMIN'

/**
 * 화면 권한을 정하는 확인 단계입니다. 서버가 계정 상태로 계산해 내려 주며 앱은 이 값을 믿고 라우트를 지킵니다.
 * `COMPANY`는 기업 등록이 붙는 다음 단계부터 내려옵니다.
 */
export type AccountTier = 'MEMBER' | 'COMPANY' | 'ADMIN'

/** 로그인한 계정입니다. 비밀번호·토큰은 포함하지 않습니다. */
export type Account = {
  email: string
  role: AccountRole
  tier: AccountTier
  emailVerified: boolean
}

const tierRank: Record<AccountTier, number> = { MEMBER: 1, COMPANY: 2, ADMIN: 3 }

/** 계정이 요구 단계 이상인지 확인합니다. 관리자는 모든 단계를 포함합니다. */
export function meetsTier(account: Account, minimum: AccountTier): boolean {
  return tierRank[account.tier] >= tierRank[minimum]
}
