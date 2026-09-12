# GovBiz

자연어로 정부지원사업을 찾고, 공식 공고를 근거로 질문할 수 있는 채팅형 웹앱입니다.
기업마당·K-Startup과 선택 활성화하는 과기정통부·충청남도 수출입공지 수집기를 제공하며, MySQL 원본과 Elasticsearch·Qdrant 후보 검색 및 AI 점수화로 관련 공고를 최대 5개 추천합니다.

## 주요 기능

- 자연어 지원사업 검색과 추천 이유·점수 표시
- 공고 상세 조회와 신청 기간·접수 상태 확인
- 기업마당 공식 원문 기반 질문·답변과 근거 인용
- 공고 자동 동기화, 벡터 색인 복구, 검색 준비 상태 안내
- 검색 취소·재시도·새 검색 초기화, 현재 적용 조건 표시, 요청량·동시 실행 제한
- 비회원 검색 결과·조건의 30분 임시 보관과 로그인 후 전체 결과 복원
- 기업 맞춤 일일 리포트와 RabbitMQ 기반 정기 생성 작업 처리

검색 관련도와 신청 자격 확인은 구분해 표시합니다. 최근 개선과 검증 범위는
[검색 품질 개선 기록](docs/search-relevance-v5-fix.md)을 참고하세요.

기술 구성: React · TypeScript · Kotlin · Spring Boot · MyBatis · FastAPI · OpenAI · MySQL · Elasticsearch/Nori · Qdrant · Redis · RabbitMQ

Redis는 비회원 검색 후 로그인할 때 복원할 전체 추천 결과·검색 조건을 30분 보관합니다.
같은 Redis를 사용하는 Core는 재시작하거나 여러 인스턴스로 실행해도 만료 전 결과와 최초 복원 계정을 공유합니다.
첫 AI 검색을 빠르게 하는 캐시는 아니며, 대화 기록·회원 세션·공고 데이터는 MySQL에 유지합니다.
저장 구조·장애 처리·운영 한계는 [Redis 적용 상세](docs/redis-search-result-restoration.md)를 참고하세요.

한국어 키워드 후보는 **Elasticsearch 9.5.3 + Nori·BM25**로 조회하고 Qdrant 의미 검색 순위와 RRF로 결합합니다.
공개 전 두 색인을 준비하며, 기존 DB 업그레이드 시 `V24` 적용 후 색인 복구가 필요합니다.
[적용 구조·실행 설정·업그레이드 주의사항](docs/elasticsearch-lexical-search.md)을 참고하세요.
[독립 비교 실험](evaluation/support-program-search/elasticsearch/README.md)은 그대로 재실행할 수 있으며
실험 점수를 실제 AI 최종 추천 정확도로 간주하지 않습니다.

## RabbitMQ 적용 범위

정기 일일 리포트를 만들 때, 스케줄러는 작업을 MySQL에 먼저 저장하고 RabbitMQ를 통해 Core 내부 소비자 1개에
전달합니다. 오래 걸리는 AI 생성을 기다리지 않고 다음 계정의 작업을 예약할 수 있습니다.

- 작업·일일 예산·발행 대기 기록(Outbox)을 함께 저장하고, 중복 메시지의 재실행을 DB 상태로 차단합니다.
- 브로커 장애 시 아직 실행하지 않은 작업만 재발행합니다. 시작 후 결과를 잃은 작업은 운영자 확인이 필요합니다.
- 웹 수동 미리보기·실시간 검색·SMTP는 기존 경로입니다. AI 응답 속도·토큰 절감이나 별도 Worker 서버를 구현한 것은 아닙니다.

Compose는 큐 처리를 기본 활성화하지만 새 정기 예약·메일은 기본 비활성입니다. **이미 예약된 작업은 큐만 켜도
실행될 수 있습니다.** 실행 전 설정과 기존 작업을 확인하세요.
2026-09-12 기준 코드·격리 검증은 완료했으며 기존 개발 Docker와 실제 DB에는 아직 반영하지 않았습니다.

[처리 흐름·코드 위치·설정·장애 대응](docs/rabbitmq-daily-report-generation.md) ·
[개발 Docker 반영 절차](infrastructure/README.md)

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
실행 중인 개발 스택에서 코드를 갱신한 뒤에는 [백엔드 이미지 갱신 절차](infrastructure/README.md)로
Core·AI만 교체해야 Frontend와 API 버전이 어긋나지 않습니다.

## 상세 문서

| 문서 | 내용 |
|---|---|
| [아키텍처 README](docs/architecture/README.md) | 서비스 구성, 계층·DI·MVVM·Flux·Facade·Agent 설계 |
| [호출·데이터 흐름](docs/architecture.md) | 검색·동기화·RAG·장애 처리의 실행 순서 |
| [기술 구성](docs/technology.md) | 기술 스택·버전과 MySQL·Qdrant·Redis의 역할 |
| [Redis 적용 상세](docs/redis-search-result-restoration.md) | 로그인 후 검색 결과 복원, 저장 구조·TTL·계정 소유권·장애·검증 |
| [RabbitMQ 적용 상세](docs/rabbitmq-daily-report-generation.md) | 정기 리포트 생성, Outbox·중복·재시도·실행 불명·운영·검증 |
| [구현 현황](docs/implementation-status.md) | 완료 단계·검증 결과·현재 한계·다음 작업 |
| [검색 평가 결과](evaluation/support-program-search/runs/support-program-catalog-20260906-v1/README.md) | 고정 실데이터·AI-only 판정·전후 비교·재현 방법 |
| [실행·검증](infrastructure/README.md) | Compose·환경변수·통합 검증 |
| [전체 문서 목록](docs/README.md) | API 계약·요청 제한·서비스별 개발·확장 안내 |

서비스별 개발: [Frontend](frontend/README.md) · [Core API](backend/core-api/README.md) · [AI Service](backend/ai-service/README.md)

추천과 AI-only 평가 결과는 실제 신청 자격이나 전체 검색 정확도를 보장하지 않습니다.
현재 지원 범위와 배포 제약은 [구현 현황](docs/implementation-status.md)에서 확인하세요.
