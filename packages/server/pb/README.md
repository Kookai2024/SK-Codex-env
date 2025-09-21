# PocketBase Schema & Import Guide

> 이 디렉터리는 PocketBase 컬렉션 스키마와 관련 자료를 보관합니다. 초보자는 아래 절차를 따라 스키마를 임포트하세요.

## 준비물
- PocketBase 0.21 이상 (루트 `server/` 디렉터리에 `pocketbase.exe`가 포함되어 있습니다.)
- Node.js 18 이상 (시드 및 유틸리티 스크립트 실행용)

## 1. PocketBase 서버 시작
```bash
cd server
./pocketbase.exe serve
```
- 기본 URL: <http://127.0.0.1:8090>
- Admin 콘솔: <http://127.0.0.1:8090/_/>

## 2. 스키마 임포트 절차
1. Admin 콘솔 접속 → 첫 관리자 계정 생성
2. 좌측 `Collections` 메뉴 → `Import collections` 클릭
3. 이 디렉터리의 `collections.json` 선택 후 업로드
4. 임포트 완료 후 아래 컬렉션이 생성됐는지 확인합니다.
   - `users` (auth, role 필드: admin/member/guest)
   - `projects`
   - `todos` (lock_deadline 필드를 활용한 편집 잠금 규칙 포함)
   - `attendance`
   - `reports`

> **Edit-lock 규칙**: `todos.updateRule`은 관리자가 아니면 `lock_deadline` 또는 `created` 기준으로 다음 날 09:00(Asia/Seoul) 이후 수정할 수 없도록 제한합니다.

## 3. 권한 요약 (RBAC)
- **admin**: 모든 컬렉션에 대한 CRUD 권한 보유
- **member**: 본인이 담당(`assignee`)인 todo 생성/조회/제한적 수정, 출근 기록 작성
- **guest**: 읽기 전용 (로그인 필요)

## 4. 시드 데이터 & 더미 CSV
시드 스크립트는 `packages/server/scripts/seed.js`에서 제공합니다.
```bash
cd packages/server/scripts
npm install
npm run seed
```
- 5명의 사용자(역할 포함), 10개 프로젝트, 15개 todo, 최근 5일 근태 기록을 생성합니다.
- `packages/server/scripts/dummy-data/` 폴더에 사용자/프로젝트용 CSV 예시를 추가했습니다. Admin UI → `Import` 기능으로 업로드할 수 있습니다.

## 5. 문제 해결
- **403 오류 발생 시**: 역할 또는 edit-lock 규칙을 확인하고, 필요한 경우 관리자 계정으로 로그인해 수정합니다.
- **스키마 재설치**: 기존 컬렉션을 백업 후 삭제하고 다시 `collections.json`을 임포트하세요.

## 6. 추가 자료
- `../scripts/cron-weekly-report.ts`: 주간 보고서 자동화를 위한 Node 스크립트 (Mon–Fri 집계)
- `../../RUN.md`: PocketBase 및 Next.js 프런트엔드 실행 요약
