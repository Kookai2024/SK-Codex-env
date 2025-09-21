# RUN.md — Quickstart Checklist

1. **전체 스택 동시 실행 (PocketBase + Next.js)**
   ```bash
   npm run dev
   ```
   - PocketBase: <http://127.0.0.1:8090>
   - 웹앱: <http://127.0.0.1:3000>
   - 종료는 `Ctrl + C`

2. **PocketBase 서버만 실행 (선택 사항)**
   ```bash
   cd server
   ./pocketbase.exe serve
   ```
   - Admin UI: <http://127.0.0.1:8090/_/>
   - 스키마 임포트: `packages/server/pb/collections.json`

3. **Next.js 프런트엔드만 실행 (선택 사항)**
   ```bash
   cd web
   npm install
   npm run dev
   ```
   - 접근 주소: <http://localhost:3000>

4. **루트 테스트 & 보고서**
   ```bash
   cd /workspace/SK-Codex-team_todo
   npm install
   npm test
   npm run report:weekly
   ```
   - 보고서 산출물: `reports/YYYY-WW/weekly-*.{md,csv,xlsx}`
   - Obsidian 복사 경로: `packages/server/scripts/weekly-report.config.json` 수정

5. **주요 페이지 안내**
   - `/login`: PocketBase 이메일/비밀번호 로그인
   - `/attendance`: 출근/퇴근 기록(퇴근 시 확인 모달)
   - `/me`: 개인 칸반 + 편집 잠금 뱃지
   - `/dashboard`: 역할별 타일 및 보고서 공유 토글

6. **유용한 명령어**
   - `npm run test:watch`: Jest 워치 모드
   - `npm run test:coverage`: 커버리지 리포트
   - `npm --prefix packages/server/scripts cron-weekly-report -- --week=2024-05-27`: 특정 주차 보고서 생성
