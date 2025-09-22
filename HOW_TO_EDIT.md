# HOW_TO_EDIT — Team Todo List System

## 1. 준비 사항
- Node.js 18 이상과 npm, pnpm 중 하나를 설치하세요(기본은 npm).
- PocketBase 로컬 서버가 `http://127.0.0.1:8090`에서 실행 중인지 확인합니다.
- Git 커밋 메시지는 Conventional Commits 규칙(`feat:`, `fix:`, `docs:` 등)을 따릅니다.

## 2. 먼저 읽어야 할 문서
1. [`team-todo-kickoff_v2_250920.md`](team-todo-kickoff_v2_250920.md): 요구사항 전문과 최근 변경 이력 확인
2. [`README.md`](README.md): 설치/실행 방법과 최신 기능 요약
3. [`packages/server/pb/README.md`](packages/server/pb/README.md): PocketBase 스키마 임포트 및 edit-lock 규칙 설명

## 3. 개발 환경 세팅 순서
```bash
npm install                     # 루트 의존성 (ts-jest, lint 등)
npm test                        # Jest smoke 테스트 확인
cd packages/server/scripts
npm install                     # PocketBase 시드 & 보고서 스크립트 의존성
npm run seed                    # PocketBase 서버 실행 후 시드 데이터 생성
cd ../../web
npm install                     # Next.js 프런트엔드 의존성
npm run dev                     # http://localhost:3000 에서 UI 확인
```
- PocketBase 서버 시작: `server/pocketbase.exe serve`
- 주간 보고서 생성: 루트에서 `npm run report:weekly`

## 4. 코드 작성 규칙
- 기능 단위 폴더에는 `api/`, `ui/`, `types.ts`, `utils.ts`, `tests/`를 유지합니다.
- 모든 파일/함수 상단에 주석을 추가하고, 주요 로직마다 인라인 설명을 남깁니다.
- 매직 넘버는 상수나 설정 파일(`*.config.*`, `constants.ts`)로 분리합니다.
- API 응답은 `{ ok, data, error }` 형태를 지키고, 서버 타임스탬프를 신뢰합니다.
- RBAC(`admin/member/guest`)과 편집 잠금(다음날 09:00 KST 이후 차단)을 항상 고려합니다.
- Threads 스타일 컴포넌트는 `web/features/design-system/`에 정리되어 있으니 레이아웃·카드·폼 등 원하는 모듈에서 수정하세요.

## 5. 작업 체크리스트
- [ ] Jest 루트 테스트(`npm test`) 통과
- [ ] PocketBase 스키마 변경 시 `packages/server/pb/collections.json` 업데이트
- [ ] UI 페이지(`/login`, `/attendance`, `/me`, `/dashboard`) 수정 시 상단 “Where to edit” 주석 유지
- [ ] 근태/칸반 편집 시 403 응답 처리 및 친절한 메시지 제공
- [ ] 문서(README, HOW_TO_EDIT, RUN.md, kickoff 문서) 갱신

## 6. 트러블슈팅
- **로그인 실패**: PocketBase Admin UI에서 사용자가 생성됐는지 확인하고, 시드 스크립트를 다시 실행합니다.
- **edit-lock 문제**: `todos.lock_deadline` 필드를 확인하고, 필요하면 관리자 계정으로 잠금 해제 후 수정합니다.
- **보고서 경로**: `packages/server/scripts/weekly-report.config.json`에 Obsidian Vault 경로를 입력하면 Markdown이 자동 복사됩니다.

## 7. 협업 팁
- 변경 사항은 항상 PR 설명에 테스트 결과와 위험도를 포함합니다.
- 프런트엔드 UI 변경 시 가능하면 스크린샷을 캡처해 공유하세요.
- 장기 작업/이슈는 `docs/progress` 폴더에 회고 노트로 남겨 다음 작업자가 이어받을 수 있게 합니다.

즐거운 협업 되세요! ✨
