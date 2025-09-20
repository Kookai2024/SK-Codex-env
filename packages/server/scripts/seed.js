/**
 * PocketBase 시드 스크립트
 * 
 * 이 스크립트는 다음과 같은 데이터를 생성합니다:
 * - 5명의 사용자 (1명의 admin, 4명의 member)
 * - 10개의 프로젝트
 * - 프로젝트 멤버십 관계
 * - 샘플 할 일 항목들
 * - 샘플 출석 기록
 * 
 * 실행 방법:
 * 1. PocketBase 서버가 실행 중인지 확인
 * 2. node seed.js 실행
 */

// PocketBase 모듈 로드 (CommonJS/ESM 호환)
const PocketBaseModule = require('pocketbase');
const PocketBase = PocketBaseModule.default || PocketBaseModule;

// PocketBase 서버 URL 설정 (기본값: http://127.0.0.1:8090)
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

// PocketBase 클라이언트 인스턴스 생성
const pb = new PocketBase(POCKETBASE_URL);

/**
 * 에러 처리 함수
 */
function handleError(error, context) {
  console.error(`❌ ${context} 중 오류 발생:`, error.message);
  if (error.response) {
    console.error('응답 데이터:', error.response.data);
  }
  process.exit(1);
}

/**
 * 사용자 생성 함수
 */
async function createUsers() {
  console.log('👥 사용자 생성 중...');

  const users = [
    {
      name: '김관리자',
      email: 'admin@company.com',
      password: 'admin123!',
      passwordConfirm: 'admin123!',
      role: 'admin',
      department: 'IT팀',
      join_date: '2024-01-01'
    },
    {
      name: '박개발자',
      email: 'dev1@company.com',
      password: 'dev123!',
      passwordConfirm: 'dev123!',
      role: 'member',
      department: '개발팀',
      join_date: '2024-01-15'
    },
    {
      name: '이디자이너',
      email: 'designer@company.com',
      password: 'design123!',
      passwordConfirm: 'design123!',
      role: 'member',
      department: '디자인팀',
      join_date: '2024-02-01'
    },
    {
      name: '최기획자',
      email: 'planner@company.com',
      password: 'plan123!',
      passwordConfirm: 'plan123!',
      role: 'member',
      department: '기획팀',
      join_date: '2024-02-15'
    },
    {
      name: '정테스터',
      email: 'tester@company.com',
      password: 'test123!',
      passwordConfirm: 'test123!',
      role: 'member',
      department: 'QA팀',
      join_date: '2024-03-01'
    }
  ];

  const createdUsers = [];
  const userCredentials = [];

  for (const userData of users) {
    // 로그인 검증을 위해 자격 증명 저장
    userCredentials.push({ email: userData.email, password: userData.password });

    try {
      const user = await pb.collection('users').create(userData);
      createdUsers.push(user);
      console.log(`✅ 사용자 생성: ${user.name} (${user.email})`);
    } catch (error) {
      // 이미 존재하는 사용자는 건너뛰기
      if (error.status === 400 && error.data?.email) {
        console.log(`⚠️  사용자 이미 존재: ${userData.email}`);
        // 기존 사용자 조회
        try {
          const existingUser = await pb.collection('users').getFirstListItem(`email="${userData.email}"`);
          createdUsers.push(existingUser);
        } catch (lookupError) {
          console.error(`❌ 기존 사용자 조회 실패: ${userData.email}`);
        }
      } else {
        handleError(error, `사용자 생성 (${userData.email})`);
      }
    }
  }

  return { records: createdUsers, credentials: userCredentials };
}

/**
 * 프로젝트 생성 함수
 */
async function createProjects(users) {
  console.log('📋 프로젝트 생성 중...');
  
  const projects = [
    {
      code: 'WEB1',
      name: '웹사이트 리뉴얼 프로젝트',
      status: 'active',
      manager: users[0].id, // 김관리자가 관리
      description: '회사 웹사이트 전면 리뉴얼 프로젝트'
    },
    {
      code: 'APP1',
      name: '모바일 앱 개발',
      status: 'active',
      manager: users[1].id, // 박개발자가 관리
      description: 'iOS/Android 하이브리드 앱 개발'
    },
    {
      code: 'SYS1',
      name: '시스템 통합',
      status: 'active',
      manager: users[0].id, // 김관리자가 관리
      description: '기존 시스템들 통합 프로젝트'
    },
    {
      code: 'DB1',
      name: '데이터베이스 마이그레이션',
      status: 'active',
      manager: users[1].id, // 박개발자가 관리
      description: 'MySQL에서 PostgreSQL로 마이그레이션'
    },
    {
      code: 'API1',
      name: 'REST API 개발',
      status: 'active',
      manager: users[1].id, // 박개발자가 관리
      description: '새로운 REST API 서비스 개발'
    },
    {
      code: 'UI1',
      name: 'UI/UX 개선',
      status: 'active',
      manager: users[2].id, // 이디자이너가 관리
      description: '사용자 인터페이스 개선 프로젝트'
    },
    {
      code: 'BIZ1',
      name: '비즈니스 분석',
      status: 'active',
      manager: users[3].id, // 최기획자가 관리
      description: '비즈니스 프로세스 분석 및 개선'
    },
    {
      code: 'QA1',
      name: '품질 관리 시스템',
      status: 'active',
      manager: users[4].id, // 정테스터가 관리
      description: '자동화된 테스트 시스템 구축'
    },
    {
      code: 'SEC1',
      name: '보안 강화',
      status: 'on_hold',
      manager: users[0].id, // 김관리자가 관리
      description: '시스템 보안 강화 프로젝트'
    },
    {
      code: 'PER1',
      name: '성능 최적화',
      status: 'completed',
      manager: users[1].id, // 박개발자가 관리
      description: '시스템 성능 최적화 프로젝트'
    }
  ];

  const createdProjects = [];
  
  for (const projectData of projects) {
    try {
      const project = await pb.collection('projects').create(projectData);
      createdProjects.push(project);
      console.log(`✅ 프로젝트 생성: ${project.code} - ${project.name}`);
    } catch (error) {
      // 이미 존재하는 프로젝트는 건너뛰기
      if (error.status === 400 && error.data?.code) {
        console.log(`⚠️  프로젝트 이미 존재: ${projectData.code}`);
        // 기존 프로젝트 조회
        try {
          const existingProject = await pb.collection('projects').getFirstListItem(`code="${projectData.code}"`);
          createdProjects.push(existingProject);
        } catch (lookupError) {
          console.error(`❌ 기존 프로젝트 조회 실패: ${projectData.code}`);
        }
      } else {
        handleError(error, `프로젝트 생성 (${projectData.code})`);
      }
    }
  }
  
  return createdProjects;
}

/**
 * 프로젝트 멤버십 생성 함수
 */
async function createProjectMembers(users, projects) {
  console.log('👥 프로젝트 멤버십 생성 중...');
  
  // 각 프로젝트에 멤버 할당
  const memberships = [
    // WEB1 프로젝트
    { project: projects[0].id, user: users[1].id, role: 'editor' }, // 박개발자
    { project: projects[0].id, user: users[2].id, role: 'editor' }, // 이디자이너
    { project: projects[0].id, user: users[3].id, role: 'viewer' }, // 최기획자
    
    // APP1 프로젝트
    { project: projects[1].id, user: users[2].id, role: 'editor' }, // 이디자이너
    { project: projects[1].id, user: users[4].id, role: 'editor' }, // 정테스터
    
    // SYS1 프로젝트
    { project: projects[2].id, user: users[1].id, role: 'editor' }, // 박개발자
    { project: projects[2].id, user: users[3].id, role: 'viewer' }, // 최기획자
    
    // DB1 프로젝트
    { project: projects[3].id, user: users[3].id, role: 'viewer' }, // 최기획자
    
    // API1 프로젝트
    { project: projects[4].id, user: users[2].id, role: 'viewer' }, // 이디자이너
    { project: projects[4].id, user: users[4].id, role: 'editor' }, // 정테스터
    
    // UI1 프로젝트
    { project: projects[5].id, user: users[1].id, role: 'viewer' }, // 박개발자
    { project: projects[5].id, user: users[3].id, role: 'editor' }, // 최기획자
    
    // BIZ1 프로젝트
    { project: projects[6].id, user: users[1].id, role: 'viewer' }, // 박개발자
    { project: projects[6].id, user: users[2].id, role: 'viewer' }, // 이디자이너
    
    // QA1 프로젝트
    { project: projects[7].id, user: users[1].id, role: 'editor' }, // 박개발자
    
    // SEC1 프로젝트
    { project: projects[8].id, user: users[1].id, role: 'editor' }, // 박개발자
    { project: projects[8].id, user: users[4].id, role: 'editor' }, // 정테스터
    
    // PER1 프로젝트
    { project: projects[9].id, user: users[2].id, role: 'viewer' }, // 이디자이너
    { project: projects[9].id, user: users[3].id, role: 'viewer' }, // 최기획자
  ];
  
  for (const membership of memberships) {
    try {
      const member = await pb.collection('project_members').create(membership);
      console.log(`✅ 멤버십 생성: 사용자 ${membership.user} → 프로젝트 ${membership.project} (${membership.role})`);
    } catch (error) {
      // 이미 존재하는 멤버십은 건너뛰기
      if (error.status === 400) {
        console.log(`⚠️  멤버십 이미 존재: 사용자 ${membership.user} → 프로젝트 ${membership.project}`);
      } else {
        handleError(error, `멤버십 생성`);
      }
    }
  }
}

/**
 * 샘플 할 일 생성 함수
 */
async function createSampleTodos(users, projects) {
  console.log('📝 샘플 할 일 생성 중...');
  
  const todos = [
    {
      user: users[1].id, // 박개발자
      project: projects[0].id, // WEB1
      title: '로그인 페이지 구현',
      description: '사용자 로그인/로그아웃 기능 구현',
      issue: '기존 인증 시스템과의 호환성 문제',
      solution: 'JWT 토큰 기반 인증으로 전환',
      decision: '기존 시스템 유지하면서 점진적 전환',
      status: '설계중',
      due_date: '2024-12-31',
      notes: '우선순위 높음'
    },
    {
      user: users[2].id, // 이디자이너
      project: projects[0].id, // WEB1
      title: '메인 페이지 디자인',
      description: '홈페이지 메인 화면 디자인 작업',
      issue: '브랜드 가이드라인 업데이트 필요',
      solution: '새로운 브랜드 가이드라인 적용',
      decision: '디자인 시스템 통일성 확보',
      status: '업무전',
      due_date: '2024-12-25',
      notes: '클라이언트 검토 대기'
    },
    {
      user: users[1].id, // 박개발자
      project: projects[1].id, // APP1
      title: '앱 기본 구조 설계',
      description: 'React Native 기반 앱 구조 설계',
      issue: '크로스 플랫폼 호환성',
      solution: 'React Native 최신 버전 사용',
      decision: '하이브리드 앱으로 개발',
      status: '설계중',
      due_date: '2024-12-20',
      notes: '프로토타입 먼저 제작'
    },
    {
      user: users[4].id, // 정테스터
      project: projects[1].id, // APP1
      title: '테스트 케이스 작성',
      description: '앱 기능별 테스트 케이스 작성',
      issue: '자동화 테스트 도구 선정 필요',
      solution: 'Detox 사용',
      decision: '자동화 테스트 비율 80% 목표',
      status: '업무전',
      due_date: '2024-12-22',
      notes: '개발팀과 협의 필요'
    },
    {
      user: users[0].id, // 김관리자
      project: projects[2].id, // SYS1
      title: '시스템 통합 계획 수립',
      description: '기존 시스템들의 통합 방안 수립',
      issue: '다양한 레거시 시스템 존재',
      solution: '마이크로서비스 아키텍처 적용',
      decision: '단계적 통합 진행',
      status: '보류중',
      due_date: '2025-01-15',
      notes: '예산 검토 필요'
    }
  ];
  
  for (const todo of todos) {
    try {
      const createdTodo = await pb.collection('todos').create(todo);
      console.log(`✅ 할 일 생성: ${createdTodo.title}`);
    } catch (error) {
      handleError(error, `할 일 생성 (${todo.title})`);
    }
  }
}

/**
 * 샘플 출석 기록 생성 함수
 */
async function createSampleAttendance(users) {
  console.log('⏰ 샘플 출석 기록 생성 중...');

  const today = new Date();
  const attendanceRecords = [];

  // 최근 7일간의 출석 기록 생성
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // 각 사용자별로 출퇴근 기록 생성
    for (const user of users) {
      // 출근 기록 (09:00)
      const punchInTime = new Date(date);
      punchInTime.setHours(9, 0, 0, 0);

      attendanceRecords.push({
        user: user.id,
        type: 'in',
        server_time: punchInTime.toISOString(),
        ip_address: '192.168.1.100'
      });

      // 퇴근 기록 (18:00)
      const punchOutTime = new Date(date);
      punchOutTime.setHours(18, 0, 0, 0);

      attendanceRecords.push({
        user: user.id,
        type: 'out',
        server_time: punchOutTime.toISOString(),
        ip_address: '192.168.1.100'
      });
    }
  }

  for (const record of attendanceRecords) {
    try {
      await pb.collection('attendance').create(record);
    } catch (error) {
      // 이미 존재하는 기록은 건너뛰기
      if (error.status === 400) {
        continue;
      } else {
        handleError(error, `출석 기록 생성`);
      }
    }
  }

  console.log(`✅ ${attendanceRecords.length}개의 출석 기록 생성 완료`);
}

/**
 * 사용자 로그인 검증 함수
 */
async function verifyUserLogins(userCredentials) {
  console.log('🔐 사용자 로그인 검증 중...');

  for (const credentials of userCredentials) {
    try {
      const authResult = await pb.collection('users').authWithPassword(credentials.email, credentials.password);
      console.log(`✅ 로그인 검증 성공: ${authResult.record.name} (${credentials.email})`);
    } catch (error) {
      handleError(error, `로그인 검증 (${credentials.email})`);
    } finally {
      // 다음 검증을 위해 인증 스토어 초기화
      pb.authStore.clear();
    }
  }
}

/**
 * 메인 시드 함수
 */
async function seed() {
  try {
    console.log('🌱 PocketBase 시드 스크립트 시작...');
    console.log(`📍 PocketBase 서버: ${POCKETBASE_URL}`);
    
    // 관리자로 인증 (admin 사용자 생성 후)
    console.log('🔐 관리자 인증 중...');
    
    try {
      await pb.admins.authWithPassword('admin@company.com', 'admin123!');
      console.log('✅ 관리자 인증 성공');
    } catch (error) {
      console.log('⚠️  관리자 인증 실패, 계속 진행...');
    }
    
    // 데이터 생성
    const { records: userRecords, credentials: userCredentials } = await createUsers();
    const projects = await createProjects(userRecords);
    await createProjectMembers(userRecords, projects);
    await createSampleTodos(userRecords, projects);
    await createSampleAttendance(userRecords);
    await verifyUserLogins(userCredentials);

    console.log('\n🎉 시드 스크립트 완료!');
    console.log('\n📊 생성된 데이터:');
    console.log(`- 사용자: ${userRecords.length}명`);
    console.log(`- 프로젝트: ${projects.length}개`);
    console.log('- 프로젝트 멤버십: 여러 개');
    console.log('- 할 일: 5개');
    console.log('- 출석 기록: 7일간');
    
    console.log('\n🔑 기본 계정 정보:');
    console.log('Admin: admin@company.com / admin123!');
    console.log('Dev1: dev1@company.com / dev123!');
    console.log('Designer: designer@company.com / design123!');
    console.log('Planner: planner@company.com / plan123!');
    console.log('Tester: tester@company.com / test123!');
    
  } catch (error) {
    handleError(error, '시드 스크립트 실행');
  }
}

// 스크립트 실행
if (require.main === module) {
  seed();
}

module.exports = {
  seed,
  createUsers,
  createProjects,
  createProjectMembers,
  createSampleTodos,
  createSampleAttendance,
  verifyUserLogins
};
