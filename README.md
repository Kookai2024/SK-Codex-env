# Team Todo List System (SK-Codex)

## 📌 Overview
- PocketBase + Next.js 기반의 팀 업무/근태/보고서 통합 시스템입니다.
- 기능별 디렉터리(`auth/`, `attendance/`, `todos/`, `projects/`, `dashboard/`, `reports/`) 구조를 유지해 초보자도 빠르게 진입할 수 있습니다.
- 최신 스키마는 `packages/server/pb/collections.json`에 포함되어 있으며, 주간 보고서 자동화 스크립트는 `packages/server/scripts/cron-weekly-report.ts`에 위치합니다.

## 🚀 Quick Start
1. **루트 의존성 설치 및 테스트 확인**
   ```bash
   npm install
   npm test
   ```
   - Jest + ts-jest 기반으로 `attendance/`, `todos/`, `dashboard/` smoke 테스트가 실행됩니다.
2. **PocketBase 스키마 임포트 & 시드 데이터 생성**
   ```bash
   cd packages/server/scripts
   npm install
   npm run seed
   ```
   - `packages/server/pb/README.md`에 임포트 절차와 edit-lock 규칙이 정리되어 있습니다.
3. **Next.js 프런트엔드 실행**
   ```bash
   cd web
   npm install
   npm run dev
   ```
   - 주요 페이지: `/login`, `/attendance`, `/me`, `/dashboard`
4. **주간 보고서 생성**
   ```bash
   cd /workspace/SK-Codex-team_todo
   npm run report:weekly
   ```
   - 결과물은 `reports/YYYY-WW/` 디렉터리에 Markdown/CSV/XLSX 파일로 저장됩니다.

## 🧩 Feature Highlights
- **RBAC & Edit-Lock**: PocketBase 규칙으로 `admin/member/guest` 권한과 다음날 09:00(Asia/Seoul) 이후 잠금 정책을 적용합니다.
- **근태 UI**: 출근/퇴근 버튼을 제공하며 퇴근 시 확인 모달을 띄워 실수 방지.
- **개인 칸반**: 상태 컬럼(prework/design/hold/po_placed/incoming)과 잠금 뱃지를 통해 편집 제한을 시각화.
- **대시보드**: 역할별 타일과 주간 보고서 공유 토글 제공.
- **주간 보고서 자동화**: Mon–Fri 데이터를 집계해 `<금주일정>`/`<차주일정>` 요약을 생성하고 Obsidian Vault 복사 옵션을 지원합니다.

## 🧪 Testing & Quality
- `npm test`: 루트 Jest 테스트 실행
- `npm run test:watch`: 변경 사항 실시간 감지
- `npm run test:coverage`: 커버리지 보고서 출력
- `npm --prefix packages/server/scripts test`: 서버 스크립트 전용 테스트(기존 Node 테스트)

## 📂 Repository Structure (요약)
```
.
├── attendance/               # 근태 API/UI/유틸/테스트
├── todos/                    # 칸반 관련 로직
├── dashboard/                # 역할 기반 대시보드
├── projects/                 # 프로젝트 관련 타입/유틸
├── reports/                  # 자동 보고서 산출물 저장소 (gitignore 처리)
├── packages/server/pb/       # PocketBase 스키마 및 설명
├── packages/server/scripts/  # 시드/주간 보고서 스크립트
├── server/                   # PocketBase 실행 파일
└── web/                      # Next.js 14 기반 프런트엔드 (App Router)
```

## 📚 문서 & 참고 자료
- `HOW_TO_EDIT.md`: 초보자용 수정 가이드
- `team-todo-kickoff_v2_250920.md`: 전체 요구사항 명세 (변경 사항은 하단 히스토리 참조)
- `RUN.md`: PocketBase/Next.js 실행 순서 요약

## ✅ Next Steps
- [ ] PocketBase hook(automation)으로 lock_deadline 자동 계산 추가
- [ ] Next.js UI 테스트(Jest + RTL) 구성
- [ ] GitHub Actions CI 강화 (현재 기본 npm test Workflow 제공)
