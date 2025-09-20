/**
 * 주간 보고서 생성 스크립트
 * 
 * 이 스크립트는 매주 금요일 오후에 실행되어 다음 데이터를 수집합니다:
 * - 사용자별 할 일 현황
 * - 프로젝트별 진행률
 * - 출석 현황
 * - CSV/XLSX 파일로 보고서 생성
 * 
 * 실행 방법:
 * 1. PocketBase 서버가 실행 중인지 확인
 * 2. node weekly-report.js [--week=YYYY-MM-DD] 실행
 * 
 * 예시:
 * - node weekly-report.js                    # 현재 주
 * - node weekly-report.js --week=2024-12-20  # 특정 주
 */

const PocketBase = require('pocketbase');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 주간 보고서 스크립트의 목업 모드 환경 변수 키
const WEEKLY_REPORT_MOCK_FLAG = 'WEEKLY_REPORT_MOCK';

/**
 * PocketBase 클라이언트 생성 함수
 *
 * 실제 PocketBase 서버 대신 목업 클라이언트를 사용해야 하는 경우(예: 테스트)에는
 * WEEKLY_REPORT_MOCK 환경 변수에 'true'를 입력해 네트워크 의존성을 제거한다.
 */
function createPocketBaseClient() {
  // 목업 모드에서는 간단한 스텁 구현을 반환한다.
  if (process.env[WEEKLY_REPORT_MOCK_FLAG] === 'true') {
    console.warn('⚠️  WEEKLY_REPORT_MOCK 모드에서 PocketBase 호출이 목업으로 대체됩니다.');

    return {
      admins: {
        // 관리자 인증을 생략하고 목업 메시지를 출력한다.
        async authWithPassword() {
          console.log('🤖 목업 모드: 관리자 인증이 생략되었습니다.');
        }
      },
      // 사용되는 모든 컬렉션 요청을 빈 데이터 세트로 응답한다.
      collection(collectionName) {
        if (collectionName === 'weekly_reports') {
          return {
            async getFullList() {
              return [];
            },
            async create() {
              console.log('🤖 목업 모드: 주간 보고서 레코드 생성이 생략되었습니다.');
              return { id: 'mock-weekly-report' };
            }
          };
        }

        return {
          async getFullList() {
            console.log(`🤖 목업 모드: '${collectionName}' 데이터는 비어 있는 배열로 반환됩니다.`);
            return [];
          },
          async create() {
            console.log(`🤖 목업 모드: '${collectionName}' 레코드 생성이 생략되었습니다.`);
            return { id: 'mock-created-record' };
          }
        };
      }
    };
  }

  // 기본 동작으로 실제 PocketBase 클라이언트를 생성한다.
  return new PocketBase(POCKETBASE_URL);
}

// PocketBase 서버 URL 설정 (기본값: http://127.0.0.1:8090)
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

// PocketBase 클라이언트 인스턴스 생성
const pb = createPocketBaseClient();

// 보고서 저장 디렉토리
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

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
 * 주간 날짜 범위 계산 함수
 * @param {Date} date - 기준 날짜
 * @returns {Object} 주간 시작일과 종료일
 */
function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
  
  const weekStart = new Date(d.setDate(diff));
  const weekEnd = new Date(d.setDate(diff + 6));
  
  // 시간을 00:00:00으로 설정
  weekStart.setHours(0, 0, 0, 0);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

/**
 * 보고서 디렉토리 생성 함수
 */
function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    console.log(`📁 보고서 디렉토리 생성: ${REPORTS_DIR}`);
  }
}

/**
 * 사용자별 할 일 현황 수집 함수
 */
async function getUserTodosReport(weekStart, weekEnd) {
  console.log('📝 사용자별 할 일 현황 수집 중...');
  
  try {
    // 해당 주간에 생성되거나 수정된 할 일 조회
    const todos = await pb.collection('todos').getFullList({
      filter: `(created >= "${weekStart.toISOString()}" && created <= "${weekEnd.toISOString()}") || (updated >= "${weekStart.toISOString()}" && updated <= "${weekEnd.toISOString()}")`,
      expand: 'user,project'
    });
    
    // 사용자별로 그룹화
    const userTodos = {};
    
    for (const todo of todos) {
      const userId = todo.user;
      const userName = todo.expand?.user?.name || 'Unknown';
      
      if (!userTodos[userId]) {
        userTodos[userId] = {
          userName,
          total: 0,
          byStatus: {},
          todos: []
        };
      }
      
      userTodos[userId].total++;
      userTodos[userId].byStatus[todo.status] = (userTodos[userId].byStatus[todo.status] || 0) + 1;
      userTodos[userId].todos.push({
        title: todo.title,
        project: todo.expand?.project?.code || 'Unknown',
        status: todo.status,
        due_date: todo.due_date,
        created: todo.created,
        updated: todo.updated
      });
    }
    
    return userTodos;
  } catch (error) {
    handleError(error, '사용자별 할 일 현황 수집');
  }
}

/**
 * 프로젝트별 진행률 수집 함수
 */
async function getProjectProgressReport(weekStart, weekEnd) {
  console.log('📊 프로젝트별 진행률 수집 중...');
  
  try {
    // 모든 프로젝트 조회
    const projects = await pb.collection('projects').getFullList({
      expand: 'manager'
    });
    
    const projectProgress = {};
    
    for (const project of projects) {
      // 프로젝트별 할 일 현황 조회
      const todos = await pb.collection('todos').getFullList({
        filter: `project = "${project.id}"`,
        expand: 'user'
      });
      
      const totalTodos = todos.length;
      const completedTodos = todos.filter(todo => todo.status === '발주완료').length;
      const progressPercentage = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
      
      // 해당 주간에 수정된 할 일 수
      const weekTodos = todos.filter(todo => {
        const updated = new Date(todo.updated);
        return updated >= weekStart && updated <= weekEnd;
      }).length;
      
      projectProgress[project.id] = {
        code: project.code,
        name: project.name,
        status: project.status,
        manager: project.expand?.manager?.name || 'Unknown',
        totalTodos,
        completedTodos,
        progressPercentage,
        weekTodos,
        todos: todos.map(todo => ({
          title: todo.title,
          status: todo.status,
          user: todo.expand?.user?.name || 'Unknown',
          due_date: todo.due_date
        }))
      };
    }
    
    return projectProgress;
  } catch (error) {
    handleError(error, '프로젝트별 진행률 수집');
  }
}

/**
 * 출석 현황 수집 함수
 */
async function getAttendanceReport(weekStart, weekEnd) {
  console.log('⏰ 출석 현황 수집 중...');
  
  try {
    // 해당 주간의 출석 기록 조회
    const attendance = await pb.collection('attendance').getFullList({
      filter: `server_time >= "${weekStart.toISOString()}" && server_time <= "${weekEnd.toISOString()}"`,
      expand: 'user'
    });
    
    // 사용자별로 그룹화
    const userAttendance = {};
    
    for (const record of attendance) {
      const userId = record.user;
      const userName = record.expand?.user?.name || 'Unknown';
      
      if (!userAttendance[userId]) {
        userAttendance[userId] = {
          userName,
          records: []
        };
      }
      
      userAttendance[userId].records.push({
        type: record.type,
        server_time: record.server_time,
        ip_address: record.ip_address
      });
    }
    
    // 출석률 계산
    const attendanceSummary = {};
    const totalDays = 5; // 평일 5일
    
    for (const [userId, data] of Object.entries(userAttendance)) {
      // 출근 기록만 필터링
      const punchIns = data.records
        .filter(r => r.type === 'in')
        .map(r => new Date(r.server_time).toDateString());
      
      // 중복 제거 (같은 날 여러 번 출근한 경우)
      const uniqueDays = [...new Set(punchIns)];
      const attendanceRate = Math.round((uniqueDays.length / totalDays) * 100);
      
      attendanceSummary[userId] = {
        userName: data.userName,
        totalDays: totalDays,
        attendedDays: uniqueDays.length,
        attendanceRate,
        records: data.records
      };
    }
    
    return attendanceSummary;
  } catch (error) {
    handleError(error, '출석 현황 수집');
  }
}

/**
 * CSV 파일 생성 함수
 */
function generateCSVReport(weekStart, weekEnd, userTodos, projectProgress, attendanceSummary) {
  console.log('📄 CSV 보고서 생성 중...');
  
  const weekStr = weekStart.toISOString().split('T')[0];
  const csvFile = path.join(REPORTS_DIR, `weekly-report-${weekStr}.csv`);
  
  let csvContent = `주간 보고서 (${weekStart.toLocaleDateString('ko-KR')} ~ ${weekEnd.toLocaleDateString('ko-KR')})\n\n`;
  
  // 사용자별 할 일 현황
  csvContent += `=== 사용자별 할 일 현황 ===\n`;
  csvContent += `사용자,총 할 일,업무전,설계중,보류중,발주완료,입고예정\n`;
  
  for (const [userId, data] of Object.entries(userTodos)) {
    csvContent += `${data.userName},${data.total},${data.byStatus['업무전'] || 0},${data.byStatus['설계중'] || 0},${data.byStatus['보류중'] || 0},${data.byStatus['발주완료'] || 0},${data.byStatus['입고예정'] || 0}\n`;
  }
  
  csvContent += `\n=== 프로젝트별 진행률 ===\n`;
  csvContent += `프로젝트 코드,프로젝트명,상태,담당자,총 할 일,완료된 할 일,진행률(%),주간 수정된 할 일\n`;
  
  for (const [projectId, data] of Object.entries(projectProgress)) {
    csvContent += `${data.code},${data.name},${data.status},${data.manager},${data.totalTodos},${data.completedTodos},${data.progressPercentage},${data.weekTodos}\n`;
  }
  
  csvContent += `\n=== 출석 현황 ===\n`;
  csvContent += `사용자,출근 일수,총 근무일,출석률(%)\n`;
  
  for (const [userId, data] of Object.entries(attendanceSummary)) {
    csvContent += `${data.userName},${data.attendedDays},${data.totalDays},${data.attendanceRate}\n`;
  }
  
  fs.writeFileSync(csvFile, csvContent, 'utf8');
  console.log(`✅ CSV 보고서 생성 완료: ${csvFile}`);
  
  return csvFile;
}

/**
 * Excel 파일 생성 함수
 */
function generateExcelReport(weekStart, weekEnd, userTodos, projectProgress, attendanceSummary) {
  console.log('📊 Excel 보고서 생성 중...');
  
  const weekStr = weekStart.toISOString().split('T')[0];
  const excelFile = path.join(REPORTS_DIR, `weekly-report-${weekStr}.xlsx`);
  
  // 새로운 워크북 생성
  const wb = XLSX.utils.book_new();
  
  // 사용자별 할 일 현황 시트
  const userTodosData = [
    ['사용자', '총 할 일', '업무전', '설계중', '보류중', '발주완료', '입고예정']
  ];
  
  for (const [userId, data] of Object.entries(userTodos)) {
    userTodosData.push([
      data.userName,
      data.total,
      data.byStatus['업무전'] || 0,
      data.byStatus['설계중'] || 0,
      data.byStatus['보류중'] || 0,
      data.byStatus['발주완료'] || 0,
      data.byStatus['입고예정'] || 0
    ]);
  }
  
  const userTodosSheet = XLSX.utils.aoa_to_sheet(userTodosData);
  XLSX.utils.book_append_sheet(wb, userTodosSheet, '사용자별 할 일 현황');
  
  // 프로젝트별 진행률 시트
  const projectProgressData = [
    ['프로젝트 코드', '프로젝트명', '상태', '담당자', '총 할 일', '완료된 할 일', '진행률(%)', '주간 수정된 할 일']
  ];
  
  for (const [projectId, data] of Object.entries(projectProgress)) {
    projectProgressData.push([
      data.code,
      data.name,
      data.status,
      data.manager,
      data.totalTodos,
      data.completedTodos,
      data.progressPercentage,
      data.weekTodos
    ]);
  }
  
  const projectProgressSheet = XLSX.utils.aoa_to_sheet(projectProgressData);
  XLSX.utils.book_append_sheet(wb, projectProgressSheet, '프로젝트별 진행률');
  
  // 출석 현황 시트
  const attendanceData = [
    ['사용자', '출근 일수', '총 근무일', '출석률(%)']
  ];
  
  for (const [userId, data] of Object.entries(attendanceSummary)) {
    attendanceData.push([
      data.userName,
      data.attendedDays,
      data.totalDays,
      data.attendanceRate
    ]);
  }
  
  const attendanceSheet = XLSX.utils.aoa_to_sheet(attendanceData);
  XLSX.utils.book_append_sheet(wb, attendanceSheet, '출석 현황');
  
  // Excel 파일 저장
  XLSX.writeFile(wb, excelFile);
  console.log(`✅ Excel 보고서 생성 완료: ${excelFile}`);
  
  return excelFile;
}

/**
 * 주간 보고서 레코드 생성 함수
 */
async function createWeeklyReportRecord(weekStart, weekEnd, csvFile, excelFile) {
  console.log('💾 주간 보고서 레코드 생성 중...');
  
  try {
    const reportData = {
      week_start: weekStart.toISOString().split('T')[0],
      week_end: weekEnd.toISOString().split('T')[0],
      file_url: excelFile,
      generated_at: new Date().toISOString()
    };
    
    const report = await pb.collection('weekly_reports').create(reportData);
    console.log(`✅ 주간 보고서 레코드 생성 완료: ID ${report.id}`);
    
    return report;
  } catch (error) {
    handleError(error, '주간 보고서 레코드 생성');
  }
}

/**
 * 메인 보고서 생성 함수
 */
async function generateWeeklyReport(weekDate = null) {
  try {
    console.log('📊 주간 보고서 생성 시작...');
    console.log(`📍 PocketBase 서버: ${POCKETBASE_URL}`);

    // 보고서 디렉토리 확인/생성
    ensureReportsDir();

    // 주간 날짜 범위 계산 (주어진 날짜가 없으면 현재 날짜 사용)
    const { weekStart, weekEnd } = weekDate ? getWeekRange(weekDate) : getWeekRange();
    console.log(`📅 보고서 기간: ${weekStart.toLocaleDateString('ko-KR')} ~ ${weekEnd.toLocaleDateString('ko-KR')}`);
    
    // 관리자로 인증
    console.log('🔐 관리자 인증 중...');
    try {
      await pb.admins.authWithPassword('admin@company.com', 'admin123!');
      console.log('✅ 관리자 인증 성공');
    } catch (error) {
      handleError(error, '관리자 인증');
    }
    
    // 데이터 수집
    const userTodos = await getUserTodosReport(weekStart, weekEnd);
    const projectProgress = await getProjectProgressReport(weekStart, weekEnd);
    const attendanceSummary = await getAttendanceReport(weekStart, weekEnd);
    
    // 보고서 파일 생성
    const csvFile = generateCSVReport(weekStart, weekEnd, userTodos, projectProgress, attendanceSummary);
    const excelFile = generateExcelReport(weekStart, weekEnd, userTodos, projectProgress, attendanceSummary);
    
    // 주간 보고서 레코드 생성
    await createWeeklyReportRecord(weekStart, weekEnd, csvFile, excelFile);
    
    console.log('\n🎉 주간 보고서 생성 완료!');
    console.log('\n📊 보고서 요약:');
    console.log(`- 사용자 수: ${Object.keys(userTodos).length}명`);
    console.log(`- 프로젝트 수: ${Object.keys(projectProgress).length}개`);
    console.log(`- 출석 대상자: ${Object.keys(attendanceSummary).length}명`);
    console.log(`- CSV 파일: ${csvFile}`);
    console.log(`- Excel 파일: ${excelFile}`);
    
  } catch (error) {
    handleError(error, '주간 보고서 생성');
  }
}

// 명령행 인수 파싱
function parseArguments() {
  const args = process.argv.slice(2);
  let weekDate;
  
  for (const arg of args) {
    if (arg.startsWith('--week=')) {
      const dateStr = arg.split('=')[1];
      weekDate = new Date(dateStr);
      
      if (isNaN(weekDate.getTime())) {
        console.error('❌ 잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.');
        process.exit(1);
      }
    }
  }
  
  return weekDate;
}

// 스크립트 실행
if (require.main === module) {
  const weekDate = parseArguments();
  generateWeeklyReport(weekDate);
}

module.exports = { 
  generateWeeklyReport, 
  getUserTodosReport, 
  getProjectProgressReport, 
  getAttendanceReport 
};
