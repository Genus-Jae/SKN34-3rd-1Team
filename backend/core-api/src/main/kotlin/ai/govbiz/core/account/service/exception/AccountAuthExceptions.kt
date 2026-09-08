package ai.govbiz.core.account.service.exception

/** 이메일 또는 비밀번호가 맞지 않을 때 발생합니다. 두 경우를 구분하지 않습니다. */
class InvalidCredentialsException : RuntimeException()

/** 세션 쿠키가 없거나 만료·삭제됐을 때 발생합니다. */
class AuthenticationRequiredException : RuntimeException()

/** 관리자가 정지한 계정으로 로그인하거나 세션을 쓰려 할 때 발생합니다. */
class AccountSuspendedException : RuntimeException()

/** 같은 계정 또는 같은 접속 주소의 로그인 시도가 한도를 넘었을 때 발생합니다. */
class LoginRateLimitedException(val retryAfterSeconds: Int) : RuntimeException() {
    init {
        require(retryAfterSeconds >= 1) { "retryAfterSeconds must be positive" }
    }
}

/** 세션 쿠키가 붙은 상태 변경 요청의 Origin이 허용 목록에 없을 때 발생합니다. */
class SessionOriginRejectedException : RuntimeException()
