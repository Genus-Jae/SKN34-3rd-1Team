# 계정·인증 HTTP 계약

이메일 로그인과 세션 확인·로그아웃, 개발용 시드 로그인의 공개 API를 정리합니다. 회원가입·이메일 인증·기업 등록은
다음 단계에서 추가합니다. 구현 범위는 [구현 현황](implementation-status.md)을 참고하세요.

```text
Browser
  → POST /api/v1/auth/login · /logout, GET /api/v1/auth/me   (세션은 HttpOnly 쿠키 govbiz_session)
      → AccountAuthController → AccountLoginService · AccountSessionService
          → AccountRepository → MySQL (account, account_session)
  → POST /api/v1/auth/dev-login   (app.account.dev-login.enabled=true 일 때만 등록)
      → AccountDevLoginController → AccountDevLoginService
```

| Method·Path | 인증 | 성공 |
|---|---|---|
| `POST /api/v1/auth/login` | 없음 | 200 세션 응답 + `Set-Cookie` |
| `POST /api/v1/auth/dev-login` | 없음 | 200 세션 응답 + `Set-Cookie` (개발 환경 전용) |
| `GET /api/v1/auth/me` | 세션 쿠키 | 200 계정 |
| `POST /api/v1/auth/logout` | 세션 쿠키 | 204 + 쿠키 만료 |

## 권한 단계

화면 권한은 역할 이름이 아니라 계정이 통과한 확인 단계 `tier`로 정합니다. 서버가 계정 상태로 계산해 모든 세션
응답에 내려 주고, 프런트의 `RequireAuth`는 이 값으로만 `/app` 아래 라우트를 나눕니다. `GuestOnly`(로그인·회원가입)와
`PublicOnly`(공개 화면)는 세션 유무만 보고 로그인한 사용자를 각각 복귀 경로와 같은 내용의 `/app` 화면으로 보냅니다.
서버는 프런트 판단을 믿지 않고 쓰기 API마다 같은 단계를 다시 검사합니다.

| `tier` | 조건 | 열리는 화면 |
|---|---|---|
| (익명) | 세션 없음 | 공개 화면: 검색·상세·원문 질문·요금제·파트너 모집 읽기(`/`, `/pricing`, `/partners`), 로그인·회원가입 |
| `MEMBER` | 로그인 | 사이드바 작업 화면(`/app/chat` `/app/pricing` `/app/partners` `/app/profile` …) |
| `COMPANY` | 사업자등록번호 조회(Bizno)로 확인한 기업 등록 | 파트너 모집글 작성. 이메일 인증 조건은 인증 기능이 생길 때 더함 |
| `ADMIN` | `account.role = ADMIN` | 위 전부 + `/app/admin/*` |

## 세션 쿠키

세션 JWT는 응답 본문이 아니라 쿠키로만 전달합니다. 브라우저 스크립트는 토큰을 읽을 수 없고, 브라우저가
같은 호스트로 보내는 요청에 자동으로 붙입니다. 프런트는 `fetch`에 `credentials: 'include'`만 둡니다.

```http
Set-Cookie: govbiz_session=<JWT>; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax
```

| 속성 | 값 |
|---|---|
| `HttpOnly` | 항상. XSS로 토큰을 읽지 못하게 함 |
| `Secure` | `ACCOUNT_COOKIE_SECURE`(기본 `true`). HTTPS가 없는 로컬 개발(Compose)만 `false` |
| `SameSite=Lax` | 다른 사이트에서 시작한 POST에는 붙지 않음. 링크로 들어오는 GET에는 붙어 로그인 상태가 유지됨 |
| `Max-Age` | `rememberMe=true`일 때만 `ACCOUNT_SESSION_TTL`(기본 30일). `false`면 속성이 없어 브라우저를 닫으면 사라짐 |
| `Domain` | 없음. 발급한 호스트에만 묶임 |

JWT는 HS256이며 `sub`=계정 ID, `iat`·`exp`=초 단위 epoch, `jti`=무작위입니다. Core는 토큰 원문을 저장하지
않고 SHA-256 해시와 절대 만료·마지막 사용 시각을 `account_session`에 둡니다.

### 만료

| 종류 | 값 | 설명 |
|---|---|---|
| 절대 만료(로그인 상태 유지) | `ACCOUNT_SESSION_TTL` = 30일 | JWT `exp`·세션 행 `expires_at`·쿠키 `Max-Age`가 같은 시각 |
| 절대 만료(유지 안 함) | `ACCOUNT_SESSION_SHORT_TTL` = 12시간 | 쿠키는 브라우저 세션 쿠키이고 서버 행이 12시간 뒤 만료 |
| 유휴 만료 | `ACCOUNT_SESSION_IDLE_TTL` = 7일 | 마지막 사용 뒤 7일이 지나면 절대 만료 전이라도 401 |

`GET /me`와 `Account` 파라미터를 받는 모든 API는 서명·만료를 먼저 검사한 뒤 해시로 세션 행을 찾고, 절대·유휴
만료를 확인한 다음 계정을 읽습니다. 마지막 사용 시각은 5분에 한 번만 갱신해 UPDATE를 줄입니다. 로그아웃(행 삭제)된
토큰은 JWT가 유효해도 401이고, 정지된 계정은 403입니다. 로그인할 때마다 새 세션을 만들고 같은 계정의 만료
세션을 정리합니다.

### CSRF

세션 쿠키가 붙은 상태 변경 요청(POST·PUT·PATCH·DELETE)은 두 겹으로 막습니다.

1. `SameSite=Lax`라 다른 사이트의 폼·스크립트가 보내는 POST에는 쿠키가 붙지 않습니다.
2. `Origin` 헤더가 `APP_CORS_ALLOWED_ORIGIN`(쉼표로 여러 개 가능) 중 하나여야 합니다. `Origin`이 없으면 `Referer`의
   origin으로 판단하고, 둘 다 없으면 브라우저 요청으로 볼 수 없어 403 `SESSION_ORIGIN_REJECTED`입니다. 허용되지 않은
   origin은 CORS 처리기가 먼저 403으로 거절하고 `/api/**`에 등록된 `SessionOriginInterceptor`가 한 번 더 막습니다.
   curl로 세션 쿠키를 흉내낼 때는 허용 origin을 함께 보냅니다. Compose 기본값은
   `-H "Origin: http://127.0.0.1:5173"`입니다. 세션 쿠키가 없는 요청은 검사하지 않습니다.

## 회원가입

```http
POST /api/v1/auth/signup
Content-Type: application/json

{ "email": "manager@company.co.kr", "password": "password1" }
```

| 필드 | 규칙 |
|---|---|
| `email` | 이메일 형식, 320자 이하. Core가 앞뒤 공백 제거·소문자로 정규화해 저장하며 같은 이메일(탈퇴 계정 포함)은 409 |
| `password` | 8~72자. 길이만 검사하고 문자 종류는 강제하지 않음. BCrypt 해시만 저장 |

성공하면 201과 함께 아래 로그인과 같은 세션 응답을 돌려주고 브라우저 세션 쿠키(`rememberMe=false`와 같음)를
발급합니다. 계정은 `role=USER`, `tier=MEMBER`, `emailVerified=false`로 만들어지고 약관 동의 시각은 요청 시각으로
기록합니다. 이메일 인증은 별도 단계입니다. 가입 시도는 로그인과 같은 접속 주소 한도(분당 20회)를 함께 씁니다.

## 로그인

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "manager@company.co.kr", "password": "password1", "rememberMe": true }
```

| 필드 | 규칙 |
|---|---|
| `email` | 이메일 형식, 320자 이하. Core가 앞뒤 공백 제거·소문자로 정규화해 조회 |
| `password` | 1~72자. 규칙 검사는 가입 시에만 하며 로그인은 일치 여부만 확인 |
| `rememberMe` | 선택, 기본 `false`. `true`면 30일 영구 쿠키, `false`면 브라우저 세션 쿠키 + 12시간 |

세션 응답은 로그인과 개발용 로그인이 같습니다.

```json
{
  "expiresAt": "2026-10-06T12:00:00+09:00",
  "account": { "email": "manager@company.co.kr", "role": "USER", "tier": "MEMBER", "emailVerified": false }
}
```

| 필드 | 설명 |
|---|---|
| `expiresAt` | 세션 절대 만료 시각(서울 offset). `rememberMe=true`면 쿠키의 Max-Age와 같음 |
| `account.role` | `USER` 또는 `ADMIN`. 가입 시에는 항상 `USER` |
| `account.tier` | 권한 단계 `MEMBER`·`COMPANY`·`ADMIN` |
| `account.emailVerified` | 이메일 인증 완료 여부. 가입 직후에는 `false`이고 시드 계정만 `true` |

### 로그인 시도 제한

한 Core 프로세스의 메모리에서 계정과 접속 주소 기준으로 제한합니다. 넘으면 429 `LOGIN_RATE_LIMITED`이며
`Retry-After` 헤더와 본문 `retryAfterSeconds`에 다시 시도할 수 있는 초를 담습니다.

| 기준 | 규칙 |
|---|---|
| 계정(정규화한 이메일) | 연속 실패 5회부터 잠금. 30초에서 시작해 실패가 이어질 때마다 두 배, 최대 15분. 성공하면 초기화 |
| 접속 주소 | 최근 60초 20회 |

## 개발용 시드 로그인

`ACCOUNT_DEV_LOGIN_ENABLED=true`(Compose 기본값)일 때만 `POST /api/v1/auth/dev-login`이 등록됩니다.
본문 없이 부르면 `ACCOUNT_DEV_LOGIN_EMAIL`(기본 `admin@govbiz.local`)의 관리자 계정, `{ "role": "USER" }`를
보내면 `ACCOUNT_DEV_LOGIN_MEMBER_EMAIL`(기본 `member@govbiz.local`)의 회원 계정으로 30일 세션 쿠키를 발급합니다.
계정이 없으면 이메일 인증이 끝난 상태로 만들고 `ACCOUNT_DEV_LOGIN_PASSWORD`(기본 `govbiz-admin1`)를 비밀번호로
저장하므로 일반 로그인 화면에서도 같은 값으로 로그인됩니다. 회원가입 API가 붙기 전까지 로그인 흐름을 확인하는
용도이며, 운영 환경에서는 반드시 `false`로 두고 꺼져 있으면 404입니다. 프런트의 `개발 로그인 · 관리자`·`개발 로그인 · 회원`
버튼은 개발 빌드(`import.meta.env.DEV`)에서만 렌더링됩니다.

## 사업자등록번호 확인

기업 등록 전에 회원이 입력한 사업자등록번호를 국세청 조회(Bizno API)로 확인합니다. 조회 결과에서는 상호와 사업자 상태만
쓰고 법인번호·과세유형은 쓰지 않습니다. 세션 쿠키가 필요하며 국세청 조회 자체는 서버만 호출합니다.

```http
GET /api/v1/me/company/lookup?businessNumber=124-81-00998
Cookie: govbiz_session=<JWT>
```

```json
{ "businessNumber": "1248100998", "companyName": "삼성전자(주)", "businessStatus": "계속사업자", "isActive": true }
```

| 필드 | 설명 |
|---|---|
| `businessNumber` | 요청은 하이픈 선택, 응답은 숫자 10자리 |
| `companyName` `businessStatus` | 국세청 원문. 상태는 계속사업자·휴업자·폐업자 |
| `isActive` | 계속사업자(상태 코드 `01`)만 `true`. 기업 등록은 이 값이 `true`일 때만 허용할 예정 |

등록되지 않은 번호는 404 `BUSINESS_NOT_FOUND`이고, 국세청 조회가 안 되는 경우는 `BIZNO_*` 코드로 구분합니다.
## 기업 등록·프로필

기업은 계정당 하나이며 사업자등록번호는 Bizno 조회 API로 확인합니다. 조회 결과에서는 상호와 사업자 상태만 쓰고
소재지·업종·설립연도와 홈페이지(선택)는 담당자가 입력합니다. 모든 요청은 세션 쿠키가 필요합니다.

| 메서드·경로 | 용도 | 성공 |
|---|---|---|
| `GET /api/v1/me/company/lookup?businessNumber=` | 등록 전 미리보기. 하이픈 선택 | 200 `businessNumber`(10자리) `companyName` `businessStatus` `isActive` |
| `GET /api/v1/me/company` | 내 기업 | 200 기업 응답, 없으면 404 `COMPANY_NOT_REGISTERED` |
| `POST /api/v1/me/company` | 등록. 서버가 다시 조회해 계속사업자만 허용 | 201 기업 응답. 이후 `/auth/me`의 `tier`가 `COMPANY` |
| `PUT /api/v1/me/company` | 담당자 입력 항목 수정 | 200 기업 응답 |

```http
POST /api/v1/me/company
Content-Type: application/json
Cookie: govbiz_session=<JWT>

{ "businessNumber": "124-81-00998", "region": "서울특별시", "industry": "정보통신업", "foundedYear": 2020,
  "homepageUrl": "https://example.co.kr" }
```

| 필드 | 규칙 |
|---|---|
| `businessNumber` | 등록 때만. 숫자 10자리, 하이픈 선택. 상호·상태는 서버가 조회 결과로 채우므로 받지 않음 |
| `region` `industry` | 1~40자 / 1~80자. 프런트는 17개 시·도와 표준산업분류 대분류 목록에서 고름 |
| `foundedYear` | 1900~올해 |
| `homepageUrl` | 선택. 500자 이하. 빈 문자열은 비운 것으로 저장 |

기업 응답은 요청 필드(`businessNumber`·`region`·`industry`·`foundedYear`·`homepageUrl`)에 `companyName` `businessStatus`
`businessVerifiedAt` `updatedAt`을 더한 것입니다. 세션·내 계정 응답의 `account.company`에는 `companyName`·`businessNumber` 요약이 실리고 기업이 없으면 `null`입니다.

## 내 계정·로그아웃

```http
GET /api/v1/auth/me
Cookie: govbiz_session=<JWT>
```

```json
{ "account": { "email": "manager@company.co.kr", "role": "USER", "tier": "MEMBER", "emailVerified": false } }
```

`POST /api/v1/auth/logout`은 세션 행을 삭제하고 `Max-Age=0` 쿠키로 브라우저의 쿠키를 지운 뒤 204를
돌려줍니다. 이미 없거나 만료된 세션도 204입니다. 쿠키가 없으면 401입니다.

Controller는 `Account` 파라미터를 선언하면 `AuthenticatedAccountArgumentResolver`가 세션 쿠키로 채웁니다.
non-null 파라미터는 세션이 없을 때 401이고, `Account?`는 쿠키가 없으면 null을 넣어 비로그인 조회를 허용합니다.

프런트는 토큰을 다루지 않으므로 앱 시작 시 `/me`를 부를지만 localStorage의 힌트(`govbiz.hasSession`)로
정합니다. 힌트가 틀려도 서버의 401·403이 바로잡고 힌트를 지웁니다. 세션 복원이 끝나기 전에는 `RequireAuth`가
리다이렉트하지 않으며, 로그인 화면은 `?next=`의 앱 안 경로로 돌아갑니다.

## 오류

모든 오류는 `application/problem+json`이며 `code` 속성으로 구분합니다. 비밀번호와 토큰 원문은 응답·로그에
포함하지 않습니다.

| 상황 | HTTP | `code` |
|---|---:|---|
| 이메일 형식·비밀번호 누락 등 요청 검증 실패 | 400 | `REQUEST_VALIDATION_FAILED` (`errors[].field`) |
| 이메일 없음 또는 비밀번호 불일치 | 401 | `INVALID_CREDENTIALS` |
| 이미 가입된(또는 탈퇴한) 이메일로 회원가입 | 409 | `EMAIL_ALREADY_REGISTERED` |
| 기업을 등록하지 않은 계정의 기업 조회·수정 | 404 | `COMPANY_NOT_REGISTERED` |
| 등록되지 않은 사업자등록번호 | 404 | `BUSINESS_NOT_FOUND` |
| 휴업·폐업 사업자 등록 시도 | 422 | `BUSINESS_NOT_ACTIVE` (`businessStatus`) |
| 이미 기업을 등록한 계정의 재등록 | 409 | `COMPANY_ALREADY_REGISTERED` |
| 다른 계정이 등록한 사업자등록번호 | 409 | `BUSINESS_NUMBER_ALREADY_REGISTERED` |
| Bizno 조회 키 미설정 / 연결 실패 / 시간 초과 / 응답 오류 | 503 / 503 / 504 / 502 | `BIZNO_NOT_CONFIGURED` `BIZNO_UNAVAILABLE` `BIZNO_TIMEOUT` `BIZNO_UPSTREAM_ERROR`·`BIZNO_INVALID_RESPONSE` |
| 세션 쿠키 없음·서명 오류·절대/유휴 만료·로그아웃된 세션·삭제된 계정 | 401 | `AUTHENTICATION_REQUIRED` (`WWW-Authenticate: Bearer`) |
| 정지된 계정의 로그인 또는 세션 사용 | 403 | `ACCOUNT_SUSPENDED` |
| 세션 쿠키가 붙은 상태 변경 요청의 Origin이 없거나 허용 목록에 없음 | 403 | `SESSION_ORIGIN_REJECTED` |
| 로그인·회원가입 시도 한도 초과 | 429 | `LOGIN_RATE_LIMITED` (`Retry-After`, `retryAfterSeconds`) |

```json
{
  "type": "urn:govbiz:problem:invalid-credentials",
  "title": "Invalid Credentials",
  "status": 401,
  "detail": "The email or password is incorrect.",
  "instance": "/api/v1/auth/login",
  "code": "INVALID_CREDENTIALS"
}
```

계정 없음과 비밀번호 불일치는 같은 응답이며, 계정이 없을 때도 해시 비교를 한 번 수행해 응답 시간으로
가입 여부가 드러나지 않게 합니다. 정지 여부는 비밀번호가 맞은 뒤에만 알립니다.

## 설정

| 환경변수 | 기본값 | 용도 |
|---|---|---|
| `ACCOUNT_SESSION_TTL` | `P30D` | "로그인 상태 유지" 세션의 절대 만료(ISO-8601). 쿠키 Max-Age와 같음 |
| `ACCOUNT_SESSION_SHORT_TTL` | `PT12H` | "로그인 상태 유지"를 끈 세션의 절대 만료. 쿠키는 브라우저 세션 쿠키 |
| `ACCOUNT_SESSION_IDLE_TTL` | `P7D` | 마지막 사용 뒤 세션을 끝내는 유휴 기간 |
| `ACCOUNT_JWT_SECRET` | 없음(필수. Compose·`.env.example`은 로컬 개발용 값) | HS256 서명 비밀키(32자 이상). 비어 있으면 기동 실패 |
| `ACCOUNT_COOKIE_SECURE` | `true` (Compose는 `false`) | 세션 쿠키의 `Secure` 속성. HTTPS 운영에서는 `true` |
| `ACCOUNT_DEV_LOGIN_ENABLED` | `false` (Compose는 `true`) | 개발용 시드 로그인 endpoint 등록 여부 |
| `ACCOUNT_DEV_LOGIN_EMAIL` | `admin@govbiz.local` | 관리자 시드 계정 이메일 |
| `ACCOUNT_DEV_LOGIN_MEMBER_EMAIL` | `member@govbiz.local` | 회원 시드 계정 이메일 |
| `ACCOUNT_DEV_LOGIN_PASSWORD` | `govbiz-admin1` | 시드 계정을 만들 때 저장하는 비밀번호(8~72자) |
| `BIZNO_API_KEY` | 빈 값 | 사업자등록번호 조회용 Bizno(bizno.net) API 키. 비어 있으면 기업 조회·등록이 503 |
| `BIZNO_URL` | `https://bizno.net/api/fapi` | Bizno 조회 endpoint. 경로는 `/api/fapi` 고정 |
