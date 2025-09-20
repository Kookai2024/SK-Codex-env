# HOW_TO_EDIT — Team Todo List System

## 1. 준비 사항
- Node.js 18 이상과 npm이 설치되어 있는지 확인합니다.
- PocketBase 로컬 서버를 `http://127.0.0.1:8090`에서 실행할 수 있어야 합니다.
- Git 커밋 메시지는 Conventional Commits 규칙(`feat:`, `fix:`, `docs:` 등)을 따릅니다.

## 2. 문서 먼저 확인하기
1. [`team-todo-kickoff_v2_250920.md`](team-todo-kickoff_v2_250920.md)에서 요구사항 전체를 숙지합니다.
2. [`docs/progress/2025-09-25_mid-check.md`](docs/progress/2025-09-25_mid-check.md)에서 최신 진행 상황과 블로커를 확인합니다.
3. 작업 범위를 명확히 정한 뒤 관련 기능 폴더(`auth/`, `todos/`, `projects/`, `dashboard/`, `reports/`)를 선택합니다.

## 3. 로컬 개발 환경 세팅
```bash
cd packages/server/scripts
npm install
npm run seed      # PocketBase 서버 실행 후 수행
npm test          # 변경 후에는 항상 테스트를 실행
```
- 프런트엔드 작업을 시작할 때는 Next.js 환경을 추가로 구성하고, 공통 컴포넌트를 재사용하도록 설계합니다.

## 4. 파일 구조 규칙
- 기능 단위 폴더 안에는 항상 `api/`, `ui/`, `types.ts`, `utils.ts`, `tests/`를 유지합니다.
- 모든 코드 파일 상단에는 파일 목적을 설명하는 주석을 작성합니다.
- 함수에는 JSDoc/TSdoc 스타일의 설명과 주요 로직마다 인라인 주석을 추가합니다.
- 매직 넘버 대신 상수/설정 파일을 사용하세요.

## 5. 작업 순서 가이드
1. **이슈 정의**: 해결하려는 문제나 구현할 기능을 문서화합니다.
2. **설계**: 필요한 타입과 API 계약을 `types.ts` / `api/` 폴더에 정의합니다.
3. **구현**: `ui/`와 `utils.ts`에서 실제 로직을 작성합니다. 권한(RBAC)과 편집 잠금 규칙을 항상 고려하세요.
4. **테스트 작성**: `tests/` 폴더에 단위 테스트를 추가하고 `npm test`로 검증합니다.
5. **문서 업데이트**: README, 진행 현황 문서, 관련 가이드를 함께 갱신합니다.
6. **커밋 & PR**: Conventional Commits 메시지를 사용하고, 테스트 결과/스크린샷/위험도를 PR 본문에 포함합니다.

## 6. 품질 체크리스트
- [ ] 테스트가 모두 통과했나요?
- [ ] RBAC(관리자/팀원/게스트) 규칙이 지켜졌나요?
- [ ] 편집 잠금(다음날 09시) 규칙이 반영됐나요?
- [ ] 출퇴근 기록이 서버 타임스탬프를 사용하나요?
- [ ] 보고서 생성이 CSV/XLSX/MD 파일을 모두 지원하나요?
- [ ] 문서(README, HOW_TO_EDIT, API 문서)가 최신 상태인가요?

## 7. 도움이 필요할 때
- 진행 중 막히는 부분은 `docs/progress` 폴더에 회고 노트로 남기고, 다음 작업자가 참고할 수 있도록 합니다.
- PocketBase 컬렉션 구조는 `packages/server/pb/collections.json`에서 확인하며, 변경 시에는 버전 관리를 위해 설명을 추가합니다.
- 테스트가 실패할 경우 `packages/server/scripts/tests` 폴더를 참고해 원인을 분석합니다.

즐거운 협업 되세요! ✨
