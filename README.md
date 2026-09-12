# GovBiz

자연어로 정부지원사업을 찾고, 공식 공고를 근거로 질문할 수 있는 채팅형 웹앱입니다.
기업마당·K-Startup과 선택 활성화하는 과기정통부·충청남도 수출입공지 수집기를 제공하며, MySQL·Qdrant 기반 검색과 AI 점수화로 관련 공고를 최대 5개 추천합니다.

## 주요 기능

- 자연어 지원사업 검색과 추천 이유·점수 표시
- 공고 상세 조회와 신청 기간·접수 상태 확인
- 기업마당 공식 원문 기반 질문·답변과 근거 인용
- 공고 자동 동기화, 벡터 색인 복구, 검색 준비 상태 안내
- 검색 취소·재시도·새 검색 초기화, 현재 적용 조건 표시, 요청량·동시 실행 제한
- 비회원 검색 결과·조건의 30분 임시 보관과 로그인 후 전체 결과 복원

검색 관련도와 신청 자격 확인은 구분해 표시합니다. 최근 개선과 검증 범위는
[검색 품질 개선 기록](docs/search-relevance-v5-fix.md)을 참고하세요.

기술 구성: React · TypeScript · Kotlin · Spring Boot · MyBatis · FastAPI · OpenAI · MySQL · Qdrant · Redis

Redis는 비회원 검색 후 로그인할 때 복원할 전체 추천 결과·검색 조건을 30분 보관합니다.
같은 Redis를 사용하는 Core는 재시작하거나 여러 인스턴스로 실행해도 만료 전 결과와 최초 복원 계정을 공유합니다.
첫 AI 검색을 빠르게 하는 캐시는 아니며, 대화 기록·회원 세션·공고 데이터는 MySQL에 유지합니다.
저장 구조·장애 처리·운영 한계는 [Redis 적용 상세](docs/redis-search-result-restoration.md)를 참고하세요.

## 빠른 시작

Docker·Docker Compose와 공공데이터포털·OpenAI API 키가 필요합니다.
저장소 루트에서 실행하며, 기존 `.env`가 있으면 유지합니다.

```bash
test -f .env || cp .env.example .env
# .env에 DATA_GO_KR_SERVICE_KEY와 OPENAI_API_KEY 입력
docker compose --env-file .env --file infrastructure/compose.yaml up --build
```

[http://127.0.0.1:5173](http://127.0.0.1:5173)에서 접속합니다.
첫 실행은 공고 수집·색인 완료까지 기다려야 하며, 임베딩·AI 답변에는 OpenAI 사용 비용이 발생합니다.
이 구성은 로컬 개발용입니다. 환경변수·중지·키 없는 통합 검증은 [실행 안내](infrastructure/README.md)를 참고하세요.
실행 중인 개발 스택에서 코드를 갱신한 뒤에는 [백엔드 이미지 갱신 절차](infrastructure/README.md#백엔드-변경-반영과-화면api-버전-불일치)로
Core·AI만 교체해야 Frontend와 API 버전이 어긋나지 않습니다.

## 상세 문서

| 문서 | 내용 |
|---|---|
| [아키텍처 README](docs/architecture/README.md) | 서비스 구성, 계층·DI·MVVM·Flux·Facade·Agent 설계 |
| [호출·데이터 흐름](docs/architecture.md) | 검색·동기화·RAG·장애 처리의 실행 순서 |
| [기술 구성](docs/technology.md) | 기술 스택·버전과 MySQL·Qdrant·Redis의 역할 |
| [Redis 적용 상세](docs/redis-search-result-restoration.md) | 로그인 후 검색 결과 복원, 저장 구조·TTL·계정 소유권·장애·검증 |
| [구현 현황](docs/implementation-status.md) | 완료 단계·검증 결과·현재 한계·다음 작업 |
| [검색 평가 결과](evaluation/support-program-search/runs/support-program-catalog-20260906-v1/README.md) | 고정 실데이터·AI-only 판정·전후 비교·재현 방법 |
| [실행·검증](infrastructure/README.md) | Compose·환경변수·통합 검증 |
| [전체 문서 목록](docs/README.md) | API 계약·요청 제한·서비스별 개발·확장 안내 |

서비스별 개발: [Frontend](frontend/README.md) · [Core API](backend/core-api/README.md) · [AI Service](backend/ai-service/README.md)

추천과 AI-only 평가 결과는 실제 신청 자격이나 전체 검색 정확도를 보장하지 않습니다.
현재 지원 범위와 배포 제약은 [구현 현황](docs/implementation-status.md)에서 확인하세요.
