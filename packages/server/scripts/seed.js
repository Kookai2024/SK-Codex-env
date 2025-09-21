/**
 * @file packages/server/scripts/seed.js
 * @description PocketBase에 초기 사용자/프로젝트/할 일/근태 데이터를 삽입하는 시드 스크립트입니다.
 */

const PocketBaseModule = require('pocketbase');
const PocketBase = PocketBaseModule.default || PocketBaseModule;

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(POCKETBASE_URL);

const ASIA_SEOUL_TZ = 'Asia/Seoul';

function buildSeoulDateKey(date) {
  // en-CA 로케일을 사용하면 YYYY-MM-DD 포맷 문자열을 얻을 수 있다.
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: ASIA_SEOUL_TZ });
  return formatter.format(date);
}

function computeLockDeadline(baseIso) {
  // 기준 ISO 문자열이 없으면 null을 반환한다.
  if (!baseIso) {
    return null;
  }

  const referenceDate = new Date(baseIso);
  const [year, month, day] = buildSeoulDateKey(referenceDate).split('-').map((part) => Number(part));
  const utcDeadline = Date.UTC(year, month - 1, day + 1, 0, 0, 0); // 다음 날 00:00 UTC == 09:00 KST
  return new Date(utcDeadline).toISOString();
}

async function createUsers() {
  const users = [
    {
      name: '김관리자',
      email: 'admin@company.com',
      password: 'admin123!',
      passwordConfirm: 'admin123!',
      role: 'admin',
      department: '경영지원',
      join_date: '2024-01-02'
    },
    {
      name: '박개발자',
      email: 'dev1@company.com',
      password: 'dev123!',
      passwordConfirm: 'dev123!',
      role: 'member',
      department: '개발1팀',
      join_date: '2024-02-01'
    },
    {
      name: '이디자이너',
      email: 'design@company.com',
      password: 'design123!',
      passwordConfirm: 'design123!',
      role: 'member',
      department: '디자인팀',
      join_date: '2024-02-10'
    },
    {
      name: '최기획자',
      email: 'plan@company.com',
      password: 'plan123!',
      passwordConfirm: 'plan123!',
      role: 'member',
      department: '기획팀',
      join_date: '2024-03-05'
    },
    {
      name: '정테스터',
      email: 'test@company.com',
      password: 'test123!',
      passwordConfirm: 'test123!',
      role: 'guest',
      department: 'QA팀',
      join_date: '2024-03-11'
    }
  ];

  const created = [];

  for (const payload of users) {
    try {
      const record = await pb.collection('users').create(payload);
      created.push(record);
    } catch (error) {
      console.warn(`⚠️  사용자 ${payload.email} 생성 실패(이미 존재 가능):`, error?.message);
      const existing = await pb.collection('users').getFirstListItem(`email="${payload.email}"`);
      created.push(existing);
    }
  }

  return created;
}

async function createProjects() {
  const projects = [
    { name: '도입 준비', code: 'PRJ-ONBOARD', status: 'planning', description: '신규 시스템 도입 준비 단계' },
    { name: '근태 개선', code: 'PRJ-ATTEND', status: 'in_progress', description: 'PocketBase 근태 모듈 고도화' },
    { name: '칸반 클린업', code: 'PRJ-KANBAN', status: 'delayed', description: '칸반 컬럼 정리 및 가이드 배포' },
    { name: '보고서 자동화', code: 'PRJ-REPORT', status: 'planning', description: '주간/월간 보고서 자동화' },
    { name: '보안 강화', code: 'PRJ-SECURE', status: 'in_progress', description: '권한 검증 및 로그 강화' },
    { name: '데이터 품질', code: 'PRJ-DATA', status: 'planning', description: 'PocketBase 데이터 품질 보강' },
    { name: 'UI 개편', code: 'PRJ-UI', status: 'in_progress', description: '프런트엔드 레이아웃 정비' },
    { name: 'API 안정화', code: 'PRJ-API', status: 'planning', description: 'REST API 안정화 및 문서화' },
    { name: '보고 체계', code: 'PRJ-REPORT2', status: 'planning', description: '주간 보고 템플릿 정비' },
    { name: '교육 자료', code: 'PRJ-EDU', status: 'completed', description: '신규 입사자 교육 자료 제작' }
  ];

  const created = [];

  for (const payload of projects) {
    try {
      const record = await pb.collection('projects').create(payload);
      created.push(record);
    } catch (error) {
      console.warn(`⚠️  프로젝트 ${payload.code} 생성 실패(이미 존재 가능):`, error?.message);
      const existing = await pb.collection('projects').getFirstListItem(`code="${payload.code}"`);
      created.push(existing);
    }
  }

  return created;
}

async function createTodos(users, projects) {
  const todoSeeds = [
    { title: 'PocketBase 스키마 검토', status: 'prework', projectCode: 'PRJ-ONBOARD', assignee: 'admin@company.com' },
    { title: '근태 API 연결 테스트', status: 'design', projectCode: 'PRJ-ATTEND', assignee: 'dev1@company.com' },
    { title: '칸반 UX 개선안 초안', status: 'design', projectCode: 'PRJ-KANBAN', assignee: 'design@company.com' },
    { title: '보고서 포맷 정리', status: 'hold', projectCode: 'PRJ-REPORT', assignee: 'plan@company.com' },
    { title: '보안 정책 점검', status: 'po_placed', projectCode: 'PRJ-SECURE', assignee: 'admin@company.com' },
    { title: '데이터 백업 자동화', status: 'prework', projectCode: 'PRJ-DATA', assignee: 'dev1@company.com' },
    { title: 'UI 컬러 시스템 정리', status: 'incoming', projectCode: 'PRJ-UI', assignee: 'design@company.com' },
    { title: 'API 에러 처리 통합', status: 'hold', projectCode: 'PRJ-API', assignee: 'dev1@company.com' },
    { title: '주간 보고 샘플 작성', status: 'prework', projectCode: 'PRJ-REPORT2', assignee: 'plan@company.com' },
    { title: '교육 자료 초안 검수', status: 'incoming', projectCode: 'PRJ-EDU', assignee: 'test@company.com' },
    { title: 'RBAC 테스트 케이스 작성', status: 'design', projectCode: 'PRJ-SECURE', assignee: 'test@company.com' },
    { title: '근태 UI 마이크로카피', status: 'prework', projectCode: 'PRJ-ATTEND', assignee: 'design@company.com' },
    { title: '칸반 잠금 QA', status: 'hold', projectCode: 'PRJ-KANBAN', assignee: 'test@company.com' },
    { title: '보고서 자동화 일정 수립', status: 'prework', projectCode: 'PRJ-REPORT', assignee: 'plan@company.com' },
    { title: '데이터 품질 지표 정의', status: 'design', projectCode: 'PRJ-DATA', assignee: 'admin@company.com' }
  ];

  const userByEmail = Object.fromEntries(users.map((user) => [user.email, user]));
  const projectByCode = Object.fromEntries(projects.map((project) => [project.code, project]));

  for (const payload of todoSeeds) {
    const userRecord = userByEmail[payload.assignee];
    const projectRecord = projectByCode[payload.projectCode];

    if (!userRecord || !projectRecord) {
      console.warn('⚠️  todo 생성용 참조를 찾지 못했습니다:', payload);
      continue;
    }

    try {
      const createdTodo = await pb.collection('todos').create({
        title: payload.title,
        status: payload.status,
        assignee: userRecord.id,
        project: projectRecord.id,
        notes: '',
        due_date: null
      });

      const lockDeadline = computeLockDeadline(createdTodo.created);
      await pb.collection('todos').update(createdTodo.id, {
        lock_deadline: lockDeadline
      });
    } catch (error) {
      console.error('❌ todo 생성 실패:', error?.message);
    }
  }
}

async function createAttendance(users) {
  const now = new Date();
  const records = [];

  for (const user of users) {
    if (user.role === 'guest') {
      continue; // 게스트는 근태를 기록하지 않는다.
    }

    for (let dayOffset = 0; dayOffset < 5; dayOffset += 1) {
      const workDay = new Date(now);
      workDay.setDate(now.getDate() - dayOffset);
      const workDateKey = buildSeoulDateKey(workDay);

      const [year, month, day] = workDateKey.split('-').map((value) => Number(value));
      const checkIn = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)); // 09:00 KST
      const checkOut = new Date(Date.UTC(year, month - 1, day, 9, 0, 0)); // 18:00 KST

      records.push({
        user: user.id,
        work_date: workDateKey,
        check_in_at: checkIn.toISOString(),
        check_out_at: checkOut.toISOString(),
        status: 'completed',
        note: `${user.name} 자동 생성 근태`
      });
    }
  }

  for (const payload of records) {
    try {
      await pb.collection('attendance').create(payload);
    } catch (error) {
      console.error('❌ 근태 기록 생성 실패:', error?.message);
    }
  }
}

async function runSeed() {
  console.log('🚀 PocketBase 시드 실행 시작');
  const users = await createUsers();
  const projects = await createProjects();
  await createTodos(users, projects);
  await createAttendance(users);
  console.log('✅ PocketBase 시드 완료');
}

runSeed().catch((error) => {
  console.error('❌ 시드 실행 중 오류:', error);
  process.exit(1);
});
