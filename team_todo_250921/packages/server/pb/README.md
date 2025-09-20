# Team Todo System - PocketBase 백엔드

## 📋 개요

이 디렉토리는 Team Todo System의 PocketBase 백엔드 설정을 포함합니다.

### 🗂️ 포함된 파일들
- `collections.json` - PocketBase 컬렉션 스키마 정의
- `README.md` - 이 파일 (설정 가이드)

### 🏗️ 데이터베이스 구조

#### 컬렉션 (Collections)
1. **users** - 사용자 정보 및 인증
2. **projects** - 프로젝트 관리
3. **project_members** - 프로젝트 멤버십 (역할 기반 접근)
4. **todos** - 할 일 관리
5. **attendance** - 출석 기록
6. **weekly_reports** - 주간 보고서
7. **audit_logs** - 감사 로그

#### 역할 기반 접근 제어 (RBAC)
- **admin**: 모든 데이터 접근 및 수정 권한
- **member**: 개인 할 일 및 할당된 프로젝트 편집 권한
- **guest**: 읽기 전용 권한

#### 프로젝트 레벨 역할
- **editor**: 프로젝트 내 할 일 생성/수정 권한
- **viewer**: 프로젝트 내 데이터 조회만 가능

#### 편집 잠금 규칙
- 관리자가 아닌 사용자는 다음 날 09:00 (Asia/Seoul 시간) 이후 할 일을 수정할 수 없음
- 서버 시간 기준으로 적용

## 🚀 Windows에서 PocketBase 설정하기

### 1단계: PocketBase 다운로드

1. [PocketBase GitHub 릴리스 페이지](https://github.com/pocketbase/pocketbase/releases) 방문
2. 최신 Windows 버전 다운로드:
   - `pocketbase_x.x.x_windows_amd64.zip` (64비트)
   - `pocketbase_x.x.x_windows_386.zip` (32비트)
3. ZIP 파일을 원하는 위치에 압축 해제
4. `pocketbase.exe` 파일이 있는지 확인

### 2단계: PocketBase 서버 시작

1. **명령 프롬프트 또는 PowerShell 열기**
2. **PocketBase가 있는 디렉토리로 이동**:
   ```cmd
   cd "C:\path\to\pocketbase"
   ```
3. **PocketBase 서버 시작**:
   ```cmd
   .\pocketbase.exe serve
   ```
4. **서버가 성공적으로 시작되면**:
   ```
   > Server started at http://127.0.0.1:8090
   ```

### 3단계: 스키마 가져오기

#### 방법 1: PocketBase Admin UI 사용 (권장)

1. **웹 브라우저에서 PocketBase Admin 열기**:
   ```
   http://127.0.0.1:8090/_/
   ```

2. **관리자 계정 생성**:
   - 이메일: 원하는 관리자 이메일
   - 비밀번호: 안전한 비밀번호 입력

3. **Collections 탭으로 이동**

4. **Import 스키마**:
   - "Import collections" 버튼 클릭
   - `collections.json` 파일 선택
   - Import 실행

#### 방법 2: PocketBase CLI 사용

1. **새 터미널 창 열기**
2. **PocketBase 디렉토리로 이동**
3. **스키마 가져오기**:
   ```cmd
   .\pocketbase.exe admin create admin@company.com admin123!
   .\pocketbase.exe collections import collections.json
   ```

### 4단계: 초기 데이터 생성 (시드 스크립트)

1. **시드 스크립트 디렉토리로 이동**:
   ```cmd
   cd "G:\내 드라이브\GitHub\packages\server\scripts"
   ```

2. **Node.js 의존성 설치**:
   ```cmd
   npm install
   ```

3. **시드 스크립트 실행**:
   ```cmd
   npm run seed
   ```

4. **성공 메시지 확인**:
   ```
   🎉 시드 스크립트 완료!
   
   📊 생성된 데이터:
   - 사용자: 5명
   - 프로젝트: 10개
   - 프로젝트 멤버십: 여러 개
   - 할 일: 5개
   - 출석 기록: 7일간
   
   🔑 기본 계정 정보:
   Admin: admin@company.com / admin123!
   Dev1: dev1@company.com / dev123!
   Designer: designer@company.com / design123!
   Planner: planner@company.com / plan123!
   Tester: tester@company.com / test123!
   ```

## 🔧 PocketBase 관리

### 서버 시작/중지
```cmd
# 서버 시작
.\pocketbase.exe serve

# 서버 중지
Ctrl + C
```

### 관리자 계정 관리
```cmd
# 관리자 계정 생성
.\pocketbase.exe admin create email@example.com password

# 관리자 계정 삭제
.\pocketbase.exe admin delete email@example.com
```

### 데이터베이스 백업/복원
```cmd
# 백업
.\pocketbase.exe backup backup.db

# 복원
.\pocketbase.exe restore backup.db
```

## 📊 주간 보고서 생성

매주 금요일 오후에 주간 보고서를 생성하려면:

```cmd
# 현재 주 보고서 생성
npm run weekly-report

# 특정 주 보고서 생성
node weekly-report.js --week=2024-12-20
```

보고서는 `packages/server/reports/` 디렉토리에 CSV와 Excel 파일로 저장됩니다.

## 🔍 API 엔드포인트

PocketBase는 자동으로 REST API를 생성합니다:

### 기본 URL
```
http://127.0.0.1:8090/api/collections/{collection_name}/records
```

### 주요 엔드포인트 예시
```
# 사용자 목록 조회
GET http://127.0.0.1:8090/api/collections/users/records

# 할 일 생성
POST http://127.0.0.1:8090/api/collections/todos/records

# 프로젝트별 할 일 조회
GET http://127.0.0.1:8090/api/collections/todos/records?filter=project="PROJECT_ID"

# 출석 기록 생성
POST http://127.0.0.1:8090/api/collections/attendance/records
```

## 🛠️ 문제 해결

### 포트 충돌 문제
PocketBase가 기본 포트 8090을 사용할 수 없는 경우:
```cmd
.\pocketbase.exe serve --http="127.0.0.1:8091"
```

### 권한 문제
Windows에서 실행 권한이 없는 경우:
1. PowerShell을 관리자 권한으로 실행
2. 실행 정책 변경:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### 데이터베이스 파일 위치
PocketBase 데이터는 `./pb_data/` 디렉토리에 저장됩니다.

## 📝 개발자 노트

### 스키마 수정 시
1. `collections.json` 파일 수정
2. PocketBase Admin UI에서 "Import collections" 실행
3. 기존 데이터가 있는 경우 백업 후 진행

### 새로운 컬렉션 추가 시
1. `collections.json`에 새 컬렉션 정의 추가
2. 시드 스크립트에 해당 데이터 생성 로직 추가
3. RBAC 규칙 검토 및 적용

### 환경 변수
- `POCKETBASE_URL`: PocketBase 서버 URL (기본값: http://127.0.0.1:8090)

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. PocketBase 서버가 실행 중인지 확인
2. 포트 8090이 사용 가능한지 확인
3. Node.js 버전이 16.0.0 이상인지 확인
4. 네트워크 방화벽 설정 확인
