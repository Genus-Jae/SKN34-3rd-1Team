# GovBiz Web

지원사업 검색 결과를 채팅 형태로 보여 주고 공고의 상세 조건과 원문을 연결하는 웹 화면입니다.
React·TypeScript·Vite·Tailwind CSS를 사용합니다. 전체 기술 구성은
[프로젝트 기술 문서](../docs/technology.md), 기능별 완료·미구현 범위는
[구현 현황](../docs/implementation-status.md)을 참고하세요. 계층·DI·MVVM·Redux의 역할은
[아키텍처 README](../docs/architecture/README.md#frontend-화면과-데이터-처리-분리)에 정리했습니다.

## 실행

### Docker Compose

저장소 루트의 `.env`와 API 키를 먼저 준비합니다. 상세 설정은
[Compose 실행 안내](../infrastructure/README.md#실행)에 있습니다.

```bash
docker compose --env-file .env --file infrastructure/compose.yaml up --build
```

브라우저에서 `http://127.0.0.1:5173`에 접속합니다. React는 `/api` 상대 주소로 요청하고,
Vite 개발 서버가 `http://core-api:8080`으로 중계합니다.

### 네이티브 개발

Node.js `24.x`, pnpm `11.22.x`가 필요합니다. Core API와 검색에 필요한 MySQL·AI Service·Qdrant는
[Core API 실행 안내](../backend/core-api/README.md)에 따라 먼저 실행합니다.

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

기본 API 주소는 `http://localhost:8080`입니다. 다른 주소를 사용하려면 `frontend/.env.example`을
`frontend/.env.local`로 복사하고 `VITE_CORE_API_BASE_URL`을 변경합니다. `VITE_` 값은 브라우저에
노출되므로 비밀값을 넣지 않습니다. API를 다른 origin으로 직접 호출할 때는 Core API의 CORS 설정도
프론트엔드 접속 주소와 맞춰야 합니다.

`VITE_CORE_API_BASE_URL=/`이면 Vite의 `/api` 프록시를 사용합니다. 프록시 목적지는
`VITE_DEV_PROXY_TARGET`이며 기본값은 `http://localhost:8080`입니다. 이 프록시는 개발 서버 설정으로,
정적 빌드 배포 시에는 별도의 `/api` 라우팅과 SPA 경로 처리가 필요합니다.
배포용 빌드에서는 `VITE_CORE_API_BASE_URL`을 반드시 지정합니다. 같은 origin에서 API를 제공한다면
`/`, 별도 서버라면 브라우저가 접근할 수 있는 공개 API 주소를 사용합니다.

## 화면과 현재 동작

| 경로 | 기능 |
|---|---|
| `/` | 익명 기업 조건 입력·적용, 접수 상태 선택, 자연어 검색, 결과 카드, 새 대화 시작 |
| `/support-programs/detail?sourceCode=...&sourceProgramId=...` | 식별자로 상세 API를 조회해 공고 조건·출처 표시 |
| `/support-programs/detail/question?sourceCode=...&sourceProgramId=...` | 공고별 원문 질문 입력·답변·근거 인용·취소, 상세 화면으로 돌아가기 |
| `/examples/sample-item/hook` | React Hook Form·로컬 요청 상태 예제 |
| `/examples/sample-item/redux` | Redux 상태 유지 예제 |

채팅 화면의 접수 상태는 기본 `acceptingOnly=true`이며 사용자가 전체(예정·마감·상태 미확인 포함)로
변경할 수 있습니다. 빈 검색어 최신 목록 조회는 별도 UI로 연결하지 않았습니다. 검색 제안은 입력창을
채우고, 사용자가 제출하면 조건 해석을 요청합니다. **첫 메시지와 후속 메시지 모두 제안 확인 후에만 실제 검색합니다.**

**기업 조건 입력·수정**에서 현재 소재지(50자), 업종(100자), 설립일, 지원 목적(100자)을 입력하고
**조건 적용**을 눌러 다음 검색에 반영합니다. 텍스트 앞뒤 공백은 제거하고 빈 항목은 요청에서 생략합니다.
제어문자는 거부하며 설립일은 공백 없는 실제 `YYYY-MM-DD`, 1900-01-01부터 서울 기준 오늘까지 허용합니다.
서버는 검색 시 날짜와 입력 계약을 다시 검증합니다. 현재 소재지를 이전 예정 지역으로 추정하지 않습니다.

적용 조건은 칩으로 확인·개별 해제할 수 있고, **조건 전체 초기화**는 기업 조건과 접수 상태를 기본값으로
되돌립니다. 편집 중인 값은 적용 전까지 검색에 사용하지 않습니다. 조건 적용이나 해제 자체는 API를 호출하지
않으며 사용자가 검색 제안을 확인해야 합니다. 해석·검색 중에는 조건 편집·적용·해제·접수 상태 변경을 차단합니다.
각 검색 메시지에 당시 조건을 복사해 표시하므로 조건 변경 후에도 지난 결과를 새 조건의 결과로 오해하지 않게 합니다.

채팅의 조건 변경 해석은 `POST /api/v1/support-programs/conversation/interpret`에
`{ message, context: { query, acceptingOnly, companyConditions }, pendingClarification }`를 보냅니다.
확정 `context`와 조건의 모든 필드는 필수이고 미입력은 `null`입니다. 검색 의도 `query`는 초기 `null`이며,
전체 대화나 공고 본문을 이어 붙이지 않습니다. `CLARIFICATION_REQUIRED`는 마지막 질문 하나와 미확정 초안만
유지해 다음 답변과 전송합니다. 상대 업력을 정확한 설립일로 계산하지 않으며 초안을 적용하거나 검색하지 않습니다.
`READY`는 변경 전·후, 검색 의도·접수 상태를 표시하고 **이 조건으로 검색** 또는 **제안 취소**를 제공합니다.
READY 수신 후에는 이전 추가 질문 문맥을 종료합니다. 입력을 바꾸면 READY 제안을 폐기하고, 수동 폼 편집·적용·해제·
접수 상태 변경은 제안과 미확정 초안을 모두 무효화합니다. 해석은 공고 준비 상태와 독립적으로 허용하고 실제 확인 검색만
readiness로 차단합니다. 준비 장애·추가 질문·해석 실패·공고 0건을 서로 구분하며 단문 검색 fallback은 없습니다.
해석 응답은 필수 필드, READY/질문 일관성, 실제 날짜, UTF-16 길이, 문자 규칙, 변경 필드 순서·중복을 Zod로 검증합니다.
검색 이력에는 확인한 검색 의도와 당시 조건을 복사하며, 채팅 헤더의 **보낸 메시지**는 검색 건수가 아니라 사용자 메시지 수입니다.
해석과 확인 검색은 요청 제한에서 각각 한 건으로 계산됩니다. [전체 C02 계약](../docs/conversation-condition-update.md)을 참고하세요.

확인한 제안의 실제 검색은 기존 `POST /api/v1/support-programs/search`에
`{ query, acceptingOnly, companyConditions?: { region?, industry?, establishedOn?, supportPurpose? } }`를 보냅니다.
조건은 검색어 500자에 이어 붙이지 않고 별도 JSON 필드로 전달합니다. 검색어와 충돌하면 사용자가 적용한
기업 조건을 우선하며, 미입력은 자격 충족을 뜻하지 않습니다. AI 판단은 공고 원문 확인이 필요합니다.
기업 조건은 로그인 없이 Redux 메모리에만 유지하고 새 대화·새로고침 시 초기화합니다.
검색에 적용한 조건은 AI 추천에 사용되므로 개인정보·비밀정보를 입력하지 말라는 안내를 입력 폼에 표시합니다.
Core가 제공하는 기존 GET 검색 계약도 유지되지만 이 화면은 POST를 사용합니다.

검색 준비 상태 API의 필수 `sources` 배열로 제공처별 상태·저장 공고 수·검색 준비 여부·동기화
성공 및 실패 시각을 표시합니다. 전체 `programCount`는 검색 가능한 제공처의 공고 수입니다.
일부 제공처만 준비된 `SEARCHABLE_WITH_PARTIAL_SOURCES` 상태에서도 검색할 수 있으며, 화면에서
현재 검색 범위를 안내합니다. 제공처 중 초기 준비 상태가 있으면 5초마다 상태를 확인하고,
검색 불가 또는 일부 제공처만 준비된 상태에서는 사용자가 상태를 다시 확인할 수도 있습니다.
최신 동기화가 실패했지만 저장 공고로 검색 가능한 상태는 별도로 안내합니다.
상태 조회가 10초 동안 응답하지 않으면 요청을 취소하고 오류·재확인 버튼을 표시합니다.
취소된 요청의 늦은 응답은 검색 가능 상태를 덮어쓰지 않습니다.

검색 결과는 `eligibilityReview`의 지원 대상·지역 판정이 모두 `MATCH`인 **조건 확인 공고**와
`UNKNOWN`이 있는 **확인 필요 공고**를 별도 섹션에 표시합니다. 판정 없는 기존 점수 공고도
확인 필요에 포함하며, 점수·판정이 모두 없는 최신 공고는 자격 미평가 목록으로 분리합니다.
카드는 자격 상태를 관련도 점수보다 먼저 표시하고, 두 축의 설명과 공식 API 본문 인용을
HTML 해석 없이 텍스트로 보여 줍니다. 점수·기존 관련 검색 정보·지역/분야 태그는 자격 근거가 아닙니다.
채팅 응답과 스크린 리더 안내도 조건 확인·확인 필요·최신 목록 건수를 구분합니다.
`eligibilityReview` 미제공/null은 판정 없음으로 받아들이되, MATCH 축 인용 누락, 전체·축 판정 모순,
공식 본문 외 근거 필드 및 길이 위반은 응답 검증에서 거부합니다. 설명 160자·인용 240자는
원시 Unicode 코드 포인트 기준이며, 공백은 보존하고 제어·형식문자 등 Unicode C 범주는 거부합니다.
근거 범위는 **기업마당 등 공식 API 본문 기준 · 첨부파일 미검증**이며 최종 신청 자격을 보장하지 않습니다.
검색 당시 조건 스냅샷은 현재 조건 수정이나 상세 이동으로 덮어쓰지 않습니다.

검색 결과에는 신청 기간·원문 링크도 표시됩니다. 상세 화면은 검색 결과의
메모리 상태에 의존하지 않고 URL의 `sourceCode`·`sourceProgramId`로 다시 조회하므로 새로고침과
직접 접속을 지원합니다. 상세 API는 검색별 점수·추천 이유·자격 판정을 제공하지 않으며,
**자격 미평가** 안내와 함께 공고 정보·현재 접수 상태를 보여 줍니다. 상세 조회를 기업 조건에 대한
재평가로 표시하지 않으며 검색 화면으로 돌아오면 기존 판정을 유지합니다.
잘못된 주소, 없는 공고, 조회 실패, 로딩 상태를 구분합니다.
원문 링크는 제공처 코드별 공식 도메인 allowlist와 `http(s)` 스킴을 함께 검증합니다. 현재
`BIZINFO`의 기업마당 도메인과 `KSTARTUP`의 `k-startup.go.kr` 도메인 및 하위 도메인을 허용합니다.
그 외 제공처를 추가할 때는 해당 제공처의 공식 도메인을
allowlist에 명시적으로 추가합니다. 테스트용 제공처는 production 허용 목록에 포함하지 않습니다.
공고 원문 근거 질문은 현재 `BIZINFO`만 지원합니다. 기업마당 상세의 **이 공고에 질문하기** 링크로
별도 질문 페이지에 이동합니다. 질문 페이지도 URL 식별자를 검증해 직접 접속·새로고침을 지원하며,
진입만으로 상세 API나 질문 API를 호출하지 않습니다. 사용자가 질문을 제출할 때만 기존 답변 API를
호출하고, 질문·답변은 새로고침 시 초기화됩니다. 다른 제공처 상세에는 미지원 안내와 기존 원문 링크를
표시합니다. 미지원 제공처의 질문 페이지로 직접 접속해도 입력을 표시하지 않고 ViewModel에서 전송을 차단합니다.
K-Startup API 연동은 아직 추가하지 않았으며 URL 허용 목록만 준비했습니다. 알 수 없는 제공처나
위조 URL이 응답에 포함되면 전체 응답을 거부합니다.

검색 요청에는 사용자가 확인한 검색 의도와 기업 조건을 전달합니다. C02는 현재 확정 상태·새 메시지와
필요한 경우 마지막 질문·미확정 초안만 해석하며, 전체 대화 이력을 분석하거나 확인 없이 조건을 자동 적용하지 않습니다.
로그인, 북마크, 알림, 대화 이력의 서버 저장은 아직 구현하지 않았습니다.

## 구조와 상태 책임

```text
src/
├── app/                         # Redux Store, typed hook, Awilix 조립·등록
├── presentation/features/chat/ # 채팅 검색 View, 페이지 ViewModel, 내부 hooks, chat slice
├── presentation/features/support-program-detail/ # 상세·질문 페이지와 각 페이지 ViewModel
├── presentation/features/sample-item/ # 상태관리 비교 예제
├── presentation/shared/        # 앱 공용 헤더, Core API 상태 표시, 지원사업 공통 오류 안내
├── domain/                      # Entity, Repository 계약, UseCase
└── data/                        # Fetch, Zod DTO 검증, Repository 구현, 테스트 fixture
```

검색은 `View → 페이지 ViewModel → 내부 Hook → UseCase → Repository → Fetch → Core API` 순서입니다.
채팅 Hook은 전역 `appContainer`에서 UseCase를 조회하고, 내부 Thunk가 Redux의 요청·성공·실패 상태를
변경합니다. Awilix 등록은 `app/di`에 있으며 Domain은 컨테이너를 알지 못합니다. 상세 조회는 같은
UseCase·Repository 경계를 거치되 로딩·결과 상태를 ViewModel의 로컬 state에 둡니다.

상세 조회와 원문 근거 질문은 `support-program-detail` feature 안의 별도 페이지입니다.
`SupportProgramDetailPage`는 `useSupportProgramDetailViewModel`, `SupportProgramEvidenceQuestionPage`는
`useSupportProgramEvidenceQuestionViewModel`을 대표 ViewModel로 사용하며 View·스타일·테스트를 함께 둡니다.
두 페이지는 URL의 `sourceCode`·`sourceProgramId`로 연결합니다. 채팅 feature와도 `/support-programs/detail`의 식별자로
연결하며 서로의 View·ViewModel을 import하지 않습니다. 두 기능이 사용하는 안전한 오류 문구는
`presentation/shared/support-program`에 둡니다. Domain·UseCase·Repository·DI는 기존 공용 계층을 유지합니다.

`ChatPage`는 `useChatPageViewModel`이 반환하는 상태를 렌더링하고 이벤트를 연결합니다.
페이지 ViewModel은 `hooks/useSupportProgramChat`과 `hooks/useSupportProgramSearchReadiness`를
조합해 확인 검색·검색 재시도의 준비 상태를 검사합니다. 해석 제출·다시 해석은 준비 상태와 독립적입니다. 채팅 Hook은 Redux 상태와 해석·검색·취소·
시간 제한을 관리하고, 준비 상태 Hook은 상태 조회와 준비 중 polling을 담당합니다.
IME 조합, 스크롤 effect와 검색 결과 안내도 페이지 ViewModel이 소유합니다. 사이드바는 없으며 브랜드·화면 이동은
`presentation/shared/app-header`의 공용 헤더가 모든 화면 위에서 맡고, 새 대화 시작·공고 데이터 요약은 채팅 화면 헤더에 둡니다.
화면 전용 상태와 DOM ref는 Redux에 넣지 않고 Hook 로컬로 유지합니다.
View에는 JSX·스타일·ARIA 구조와 날짜·상태 문구 등의 순수 표시용 포맷을 둡니다.

| 소유자 | 현재 담당 상태 | 화면 이동·새로고침 동작 |
|---|---|---|
| React 로컬 상태 | 상세 조회, Health, Hook SampleItem | 해당 화면이 unmount되면 초기화 |
| Redux 메모리 | 채팅 메시지·검색별 조건 스냅샷·확정 검색 의도·기업 조건·접수 상태·편집 초안·해석 제안·마지막 추가 질문과 미확정 초안, Redux SampleItem | 앱 내 이동 시 유지, 새로고침 시 초기화 |
| 서버 | MySQL 공고 카탈로그 | 브라우저 상태와 별개로 유지 |

Redux에는 직렬화 가능한 데이터만 저장하며 채팅 요청의 `AbortController`는
`useSupportProgramChat`의 `useRef`가 관리합니다.
새 대화 시작·화면 이탈 시 요청을 취소하고, `requestId`가 다른 과거 응답은 무시합니다. 새 대화
시작은 메시지·확정 검색 의도·기업 조건·편집 초안·접수 상태·제안·추가 질문을 초기화하며 이전 대화 목록을 보관하지 않습니다.

입력과 요청에는 다음 처리가 적용됩니다.

- 해석·검색 중 중복 제출 차단, 빈 입력 전송 차단
- 메시지의 원시 UTF-16 길이 500자 초과 시 API를 호출하지 않고 입력값을 유지하며 안내
- 한글 IME 조합 중 Enter와 Safari `keyCode 229` Enter 제출 차단
- Enter 조건 해석 전송, Shift+Enter 줄바꿈. READY라도 확인 클릭 전 검색 없음
- 검색 실패 시 내부 예외 대신 안전한 오류 문구 표시
- 검색·원문 근거 질문의 요청량 제한과 동시 처리 혼잡을 일반 장애와 구별하여 안내
- 해석이 40초를 넘으면 취소와 **다시 해석**, 검색이 90초를 넘으면 취소·검색어 복원과 **다시 검색** 제공
- 검색 서버의 유효한 `504 AI_SERVICE_TIMEOUT` Problem 응답은 별도 시간 초과 안내 제공. 알 수 없거나 잘못된 504 응답은 일반 오류로 유지하며 자동 재시도하지 않음
- 검색 재시도는 이미 확인한 command만 사용하며 해석 API를 반복 호출하지 않음. 수동 조건 변경은 이전 검색 재시도를 무효화
- 상세 조회가 10초를 넘으면 요청 취소와 오류 안내. 검색 결과로 돌아가 재진입하여 다시 조회
- 원문 질문이 70초를 넘으면 요청 취소와 시간 초과 안내, 질문 입력 보존과 수동 재전송 허용

검색·취소 버튼은 준비 상태나 오류 안내 높이와 무관하게 검색 입력창 안에 배치합니다.

요청량 제한은 HTTP `429`와 `SUPPORT_PROGRAM_RATE_LIMITED`, 동시 처리 혼잡은 HTTP `503`과
`SUPPORT_PROGRAM_BUSY`가 일치하는 `application/problem+json` 응답에만 적용합니다. Data Layer가
계약을 검증하고 Repository가 HTTP 코드 없는 Domain `SupportProgramRequestError`로 변환합니다.
ViewModel은 서버의 `detail` 대신 고정된 한국어 문구를 표시합니다. 알 수 없거나 잘못된 `503`
응답은 기존 장애 처리로 유지합니다.

본문 `retryAfterSeconds`가 정수 `1~60`이고 읽을 수 있는 `Retry-After` 헤더와 일치할 때만
권장 대기 시간을 표시합니다. 헤더가 없거나 두 값이 잘못되면 초 단위 안내를 생략합니다.
별도 origin의 Core API는 `Retry-After`를 CORS 노출 헤더에 포함해야 합니다. 자동 재시도나
카운트다운은 없으며, 검색 대화·검색어·근거 질문을 유지한 채 사용자가 직접 재시도합니다.
화면에서 취소해도 이미 시작된 서버의 AI 실행이 즉시 중단된다는 뜻은 아닙니다.

검색 제한 90초는 Core의 순차적인 의미 검색 읽기 제한 30초와 검색 전용 점수화 읽기 제한 55초에 여유 5초를 둔 값입니다.
서버 제한시간을 변경할 때도 이 순차 호출 시간을 고려해야 하며, 90초는 응답시간 목표가 아닙니다.
상세·원문 질문도 요청 완료·화면 이탈 때 타이머를 정리하고, 취소된 요청의 늦은 응답은 무시합니다.
원문 질문 70초 역시 화면 고착 방지를 위한 상한이며 서버의 모델 실행 중단이나 비용 취소를 보장하지 않습니다.

스타일은 `src/index.css`의 Tailwind `@theme` 토큰과 View 옆 `*.styles.ts`를 사용합니다.
계층·DI의 상세 규칙은 [아키텍처 문서](../docs/architecture.md#frontend와-내부-계약), 예제 API는
[SampleItem 계약](../docs/sample-item-contract.md)을 참고하세요.

## 검증

```bash
pnpm test
pnpm lint
pnpm build
```

Vitest·Testing Library로 화면과 ViewModel, 입력 검증, 응답 변환, 요청 취소·늦은 응답 처리를
검증합니다. 개발 화면의 공고는 Core API에서 받으며 `data/fixtures`는 테스트용입니다.
전체 서비스 연결과 장애 복구 검증은 저장소 루트의 `./infrastructure/scripts/verify-compose.sh`를
사용합니다. 실행 조건과 검증 범위는 [통합 smoke 안내](../infrastructure/README.md#통합-smoke)를
참고하세요.
