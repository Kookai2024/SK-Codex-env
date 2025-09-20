# Team Todo List System (SK-Codex)

## 📌 Overview
- 팀 todo/근태/보고서 관리를 위한 LAN-first 시스템입니다.
- PocketBase 기반 백엔드 + (추후) Next.js 기반 프런트엔드 구조를 목표로 합니다.
- `team-todo-kickoff_v2_250920.md` 문서를 요구사항 원본으로 유지하며, 개발 단계별 진행 상황은 진행 현황 문서에서 확인합니다.

## 🚦 Current Status (2025-09-25)
- DB 스키마와 시드 스크립트 초안이 존재하지만 PocketBase 연동 및 자동 검증은 아직 미완입니다.
- 주간 보고서 스크립트 초안과 `node --test` 기반 테스트가 존재합니다. 보고서 파일 생성 경로 정리 및 통합 자동화가 필요합니다.
- 프런트엔드(출퇴근 UI, 칸반, 대시보드)는 아직 착수하지 않았습니다.
- 상세 현황과 다음 단계는 [`docs/progress/2025-09-25_mid-check.md`](docs/progress/2025-09-25_mid-check.md)에서 중간점검 리포트로 제공합니다.

## 🗂️ Repository Structure
```
.
├── auth/                     # 인증 모듈 기본 뼈대 (api/ui/types/utils/tests)
├── todos/                    # Todo/칸반 모듈 기본 뼈대
├── projects/                 # 프로젝트 관리 모듈 기본 뼈대
├── dashboard/                # 역할 기반 대시보드 뼈대
├── reports/                  # 보고서 생성/연동 모듈 뼈대
├── packages/
│   └── server/
│       ├── pb/               # PocketBase 컬렉션 정의 및 리소스
│       └── scripts/          # 시드/보고서 Node 스크립트 + 테스트
├── docs/
│   └── progress/             # 중간점검 및 회고 문서
├── team-todo-kickoff_v2_250920.md  # 공식 요구사항 스펙
├── codex-kickoff.md          # Codex 작업 가이드 요약본
└── HOW_TO_EDIT.md            # 초보자용 수정 가이드 (이 문서 참조)
```

## ⚙️ Getting Started
1. **루트 의존성 설치**
   ```bash
   npm install
   ```
   - 출퇴근 REST API 테스트에 필요한 Express/Luxon/zod 패키지를 설치합니다.
2. **PocketBase 리소스 확인**
   - `packages/server/pb/collections.json`을 PocketBase Admin UI로 임포트합니다.
   - 필요 시 `pocketbase.zip`을 이용해 로컬 PocketBase 바이너리를 구성합니다.
3. **스크립트 의존성 설치**
   ```bash
   cd packages/server/scripts
   npm install
   ```
4. **시드 데이터 생성**
   ```bash
   npm run seed
   ```
   - 실행 전 PocketBase 서버가 `http://127.0.0.1:8090`에서 동작 중인지 확인하세요.
5. **테스트 실행**
   ```bash
   npm test
   ```
   - 루트 명령은 출퇴근 서비스 테스트와 주간 보고서 스크립트 테스트를 모두 실행합니다.
   - 보고서 스크립트만 실행하려면 `npm --prefix packages/server/scripts test`를 사용하세요.
6. **문서 참고**
   - 요구사항: `team-todo-kickoff_v2_250920.md`
   - 진행 상황: `docs/progress/2025-09-25_mid-check.md`
   - 수정 가이드: `HOW_TO_EDIT.md`

## 🛠️ Next Steps
- [ ] PocketBase 시드 및 테스트 자동화 파이프라인 확정.
- [x] 출퇴근 UI/로직 설계 (Step 2 기본 API/컴포넌트 초안 추가).
- [ ] 캘린더 근태 유형 연동을 위한 데이터 모델 검증.
- [ ] 프런트엔드 레이아웃(공통 컴포넌트) 설계 초안 작성.

> 개발 시 모든 신규 파일/함수에 주석을 추가하고, 주요 로직마다 인라인 주석을 작성하는 규칙을 유지하세요.
