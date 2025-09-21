# Team Todo List System — Kickoff & Working Guide (v2)

> 초보자도 그대로 따라 할 수 있도록 **세부 주석**과 **체크리스트**를 포함합니다.
> 이 문서는 **이 프로젝트(team-todo)** 의 “요구사항 원본(spec)”이며, Codex/Cursor가 참조할 기준입니다.


## ✨ 2024-05-31 업데이트 요약

- PocketBase 스키마를 재정비하여 `users`, `projects`, `todos`, `attendance`, `reports` 컬렉션을 정식 지원합니다.
- `todos.updateRule`에 편집 잠금 규칙(다음날 09:00 KST 이후 관리자만 수정)을 반영했습니다.
- Next.js 14 기반 프런트엔드에 `/login`, `/attendance`, `/me`, `/dashboard` 페이지와 역할별 UI를 추가했습니다.
- `cron-weekly-report.ts` 스크립트가 Mon–Fri 데이터를 집계해 Markdown/CSV/XLSX를 생성하고 Obsidian 복사를 지원합니다.
- README/HOW_TO_EDIT/RUN.md 문서를 갱신해 설치 및 운영 절차를 명확히 했습니다.


## 0. 목표 (What & Why)

- 팀원 5명, 동시 10개 프로젝트 관리.
    
- 기능:
    
    - 출퇴근 기록(서버 타임스탬프 기반) + 연차/반차/출장/훈련/병가 관리
        
    - 개인/팀 Todo 칸반
        
    - 역할별 화면 분리(`admin`, `member`, `guest`)
        
    - **편집잠금(다음날 오전 9시)**
        
    - 주간 업무보고서 자동화 (AI 요약 → CSV/XLSX/MD 저장)
        
    - 옵시디언(Obsidian) 지식 관리 체계와 연동
        
- 아키텍처: **LAN 우선**(PocketBase 백엔드) → 추후 외부 공개 확장.
    

---

## 🔑 1. 권한 및 인증

- 역할: **`admin`, `member`, `guest`**
    
- ID/PW 기반 로그인
    
- 가입 시: **비밀번호는 암호화된 텍스트 파일 등으로 저장**  
    → `admin`만 열람 가능 (직원은 자신의 비밀번호 확인 불가)
    
- 권한별 기능:
    
    - `admin`: 모든 권한 (데이터 수정/관리, 보고서, 일정 관리)
        
    - `member`: 자신의 todo/출퇴근 관리, 프로젝트별 권한 부여
        
    - `guest`: 읽기 전용, 관리자 지정 화면만 열람
        

---

## 🕒 2. 출퇴근 관리

- **Punch In/Out (출근/퇴근 버튼)**
    
    - 출근 버튼 클릭 → **비활성화**, 퇴근 버튼만 활성화
        
    - 퇴근 버튼 클릭 → 팝업 확인창:
        
        - ⚠️ "금일 업무를 종료하고 저장 하시겠습니까?  
            (금일 업무는 명일 오전 9시까지 수정 가능합니다.)"
            
        - 버튼: [네] [아니오]
            
- **서버 타임스탬프** 저장 (Asia/Seoul 기준)
    
- **근태유형 사전등록 (캘린더 연동)**
    
    - 연차/반차/출장/훈련/병가 → **해당 일자 음영 처리 + 상태 표시**
        
    - 개인 페이지에서 캘린더 등록 가능
        
    - 관리자 대시보드에서 전체 직원 일정 확인 가능
        

---

## 📋 3. Todo 관리

- 필드: `프로젝트코드(4자리)` `제목` `내용` `상태` `마감일` `이슈` `해결` `결정사항`
    
- 상태값: `prework` / `design` / `hold` / `po_placed` / `incoming`
    
- **편집 잠금 규칙**
    
    - 다음날 오전 9시 이후: `admin`만 수정 가능
        
    - `member`/`guest`는 수정 불가 (읽기 전용)
        
- 칸반 스타일 보드 제공 (drag & drop 가능)
    

---

## 📊 4. 대시보드

- 로그인 권한에 따라 다른 화면 제공:
    
    - `admin`: 팀 전체 진행률, 직원 출퇴근 현황, 프로젝트별 진행도
        
    - `member`: 자신의 todo/출퇴근 + 일부 공유된 현황
        
    - `guest`: 관리자 허용한 화면만 뷰잉 가능
        
- **관리자 설정**:
    
    - “게스트/팀원에게 보여줄 항목”을 체크박스로 선택해 **뷰잉 제어** 가능
        

---

## 📑 5. 보고서 자동화

- 매주 금요일 자동 실행
    
- 범위: 월~금요일 데이터 기반
    
- 형식: CSV / XLSX / MD (선택형)
    
- 구조 예시:
    

`[업체명 - 프로젝트명]  <금주일정> - XXXXXX (09/20 발주완료) - ...  <차주일정> - XXXXXX (09/30 미팅예정, 천안아산) - ...`

- AI(경량 LLM)로 요약 후 저장
    
- **옵시디언 연동**:
    
    - 프로젝트별 MD 파일 자동 업로드 → 프로젝트별 누적 히스토리 관리 가능
        
- (선택) 이메일/메신저 전송 기능
    

---

## 🗃️ 6. 데이터 모델 (추가 반영)

### Users

`{   "id": "user001",   "name": "김직원",   "role": "member", // "admin", "member", "guest"   "department": "개발팀",   "password": "hashed_pw",   "joinDate": "2024-01-01" }`

### Attendance

`{   "id": "att_001",   "userId": "user001",   "type": "in", // "in" | "out"   "timestamp": "2025-09-20T08:55:00+09:00",   "status": "연차", // "정상근무", "연차", "반차", "출장", "훈련", "병가"   "ip": "192.168.0.101" }`

### Reports

`{   "id": "rep_001",   "week": "2025-W38",   "format": "md", // md | csv | xlsx   "fileUrl": "/reports/2025-W38/report.md",   "generatedAt": "2025-09-19T18:00:00+09:00" }`

---

## ⚙️ 7. 개발 단계별 순서

1. PocketBase DB 설계 + Seed 데이터 생성 (Users/Projects/Todos/Attendance/Reports)
    
2. 출퇴근 로직 + 팝업 UI 구현
    
3. 캘린더 연동(근태 유형) + 음영 처리
    
4. Todo 칸반 + 편집잠금 규칙 구현
    
5. 대시보드 권한별 뷰잉 제어
    
6. 금요일 보고서 생성 → CSV/XLSX/MD + 옵시디언 업로드

7. (선택) 이메일/메신저 알림 연동

8. 문서화 (`README`, `HOW_TO_EDIT`, `API`)

## 🧭 Progress Tracker (2025-09-25)

| 단계 | 설명 | 상태 | 비고 |
| --- | --- | --- | --- |
| 1 | PocketBase DB 설계 + Seed | 진행 중 | 컬렉션 정의 및 시드 스크립트 존재, 실제 서버 반영/검증 필요 |
| 2 | 출퇴근 로직 + 팝업 UI | 미착수 | UI/REST API 미구현 |
| 3 | 캘린더 연동(근태 유형) + 음영 처리 | 미착수 | 캘린더/근태 UI 미구현 |
| 4 | Todo 칸반 + 편집잠금 | 미착수 | 칸반 UI 및 편집 잠금 로직 미구현 |
| 5 | 대시보드 권한별 뷰잉 제어 | 미착수 | 역할 기반 화면/컴포넌트 미구현 |
| 6 | 금요일 보고서 생성 + 옵시디언 업로드 | 진행 중 | 보고서 스크립트와 테스트 초안 존재, 연동/요약 로직 미완 |
| 7 | 이메일/메신저 알림 연동 | 미착수 | 알림 채널 연동 미구현 |
| 8 | 문서화 (README, HOW_TO_EDIT, API) | 진행 중 | README/HOW_TO_EDIT 업데이트, API 문서 미작성 |

> 세부 중간점검 리포트는 [`docs/progress/2025-09-25_mid-check.md`](docs/progress/2025-09-25_mid-check.md)에서 확인하세요.


---

## 🔒 8. 보안 고려사항

- ID/PW → 암호화 저장 (텍스트 파일/DB)
    
- 관리자만 원본 비밀번호 확인 가능
    
- 클라이언트 시간 무시, 서버 타임스탬프만 사용
    
- 데이터 접근 제어: `admin` 외에는 수정 제한
    

---

## 🚀 9. 배포 전략

- 초기: LAN 기반 (PocketBase + Next.js)
    
- 확장: Nginx + HTTPS + 도메인 연결
    
- 옵시디언 연동: `/reports/` 생성 시 자동 `.md` push/export
    

---

## 🛠️ 10. Codex/Cursor 프롬프트 예시

**출퇴근 로직 생성**

`Implement attendance punch flow: - Punch In disables itself, enables Punch Out - Punch Out shows confirm modal ("금일 업무를 종료..."), with Yes/No - Save server timestamp/IP/status - Pre-registered leave days auto-marked in calendar with shading`

**보고서 생성**

`` Create weekly report script: - Summarize by project with <금주일정>/<차주일정> - Save as CSV/XLSX/MD in /reports/YYYY-WW/ - Optionally push MD to Obsidian folder - Add CLI `pnpm report:weekly` ``