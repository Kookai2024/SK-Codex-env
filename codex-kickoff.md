# Team Todo List System - Codex Kickoff Guide

## 🎯 Project Goal
- Build a LAN-first Team Todo List system for 5 team members + 1 admin.
- Track attendance (punch in/out), daily todos, project progress, weekly reports.
- Enforce role-based access (admin / member / guest).
- Apply edit-lock rule: non-admin cannot modify todos after next-day 09:00 (Asia/Seoul server time).

---

## 🗂️ Core Features

### 1. User & Auth
- Login with ID/PW
- Roles: 
  - **admin**: full dashboard + modify any data
  - **member**: personal todo + assigned project edit
  - **guest**: read-only
- Admin grants roles during registration.

### 2. Attendance
- Punch in/out buttons.
- Server stores: userId, punch type (in/out), server timestamp, IP.
- Attendance data used for reports.

### 3. Todo Management
- Fields: 
  - Date (created_at, due_date, locked_at)
  - ProjectCode (4-digit, tooltip full name)
  - Title, Description
  - Issue & Solution
  - Decision
  - Status: 업무전 / 설계중 / 보류중 / 발주완료 / 입고예정
  - Notes
- Non-admin cannot edit todo after **next day 09:00**.

### 4. Dashboard
- **Admin dashboard**: team overview, progress %, attendance table, overdue items.
- **Member dashboard**: personal Kanban board.
- **Project dashboard**: project-specific Kanban.

### 5. Reports
- Every Friday afternoon, auto-generate weekly CSV/XLSX per project & user.
- Admin receives compiled file.

---

## 📊 Data Model

### users
- id, name, email, password_hash, role, department, joinDate

### projects
- id, code (4-char), name, status, manager

### project_members
- project_id, user_id, role

### todos
- id, user_id, project_id, title, description, issue, decision
- status, created_at, due_date, locked_at, updated_at

### attendance
- id, user_id, type (in/out), server_time, ip

### weekly_reports
- id, week, generated_at, file_url

---

## 🔒 Rules
- **RBAC**: admin/member/guest with project-level roles.
- **Edit-lock**: server time, Asia/Seoul, next-day 09:00 cutoff.
- **Server timestamps only**, no client-side trust.
- **Audit log**: log every mutation with userId, action, entity.

---

## 🖥️ Tech Stack
- Frontend: Next.js + Tailwind + shadcn/ui (or plain HTML/CSS/JS if simplified)
- Backend: PocketBase (preferred) OR Express + SQLite
- API: REST, JSON `{ ok, data, error }`
- Tests: auth, RBAC, edit-lock, attendance punch, weekly report generation.

---

## 📝 Deliverables
- Database schema & seed script (5 sample users, 10 projects).
- Pages: 
  - `/login`
  - `/dashboard` (admin overview)
  - `/me` (personal todo/kanban)
  - `/projects/[code]`
  - `/attendance`
- Components: Kanban board, tooltip, status dropdown, checkboxes.
- Reports: weekly CSV/XLSX export script.
- Documentation: 
  - `README.md` (setup, run, admin guide)
  - `HOW_TO_EDIT.md` (beginner-friendly editing guide with file pointers)

---

## ✅ Definition of Done
- `pnpm dev` runs web + backend together.
- Seed script works.
- Unit tests pass, especially for edit-lock rule.
- Admin dashboard shows realtime progress.
- Weekly report generates CSV/XLSX correctly.
