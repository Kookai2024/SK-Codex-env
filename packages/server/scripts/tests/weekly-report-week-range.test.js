/**
 * weekly-report-week-range.test.js
 *
 * 기본 실행(인수 없이) 시 주간 보고서 스크립트가 현재 주차를 사용하는지 검증한다.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

// Promise 기반 execFile 함수 래퍼
const execFileAsync = promisify(execFile);

// 보고서 디렉토리와 스크립트 디렉토리 경로 상수 정의
const REPORTS_DIR = path.join(__dirname, '..', '..', 'reports');
const SCRIPTS_DIR = path.join(__dirname, '..');
const WEEKLY_REPORT_MOCK_FLAG = 'WEEKLY_REPORT_MOCK';

/**
 * 현재 날짜 기준으로 주간 보고서에서 사용되는 ISO 형식의 주간 시작일을 계산한다.
 * @param {Date} date 기준 날짜(테스트 중 고정 값 지정 가능)
 * @returns {string} YYYY-MM-DD 형식의 주간 시작일 ISO 문자열
 */
function calculateExpectedWeekStartISO(date = new Date()) {
  // 기준 날짜 복제(원본 변형 방지)
  const referenceDate = new Date(date);
  const day = referenceDate.getDay();
  const diff = referenceDate.getDate() - day + (day === 0 ? -6 : 1);

  // 스크립트와 동일하게 월요일을 주간 시작일로 지정
  const weekStart = new Date(referenceDate.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);

  return weekStart.toISOString().split('T')[0];
}

// 기본 실행이 현재 주간을 사용하는지 검증하는 테스트
test('weekly-report without arguments uses the current week range', async (t) => {
  // 테스트 종료 후 생성 파일 정리를 예약한다.
  t.after(async () => {
    await fs.promises.rm(REPORTS_DIR, { recursive: true, force: true });
  });

  // 기존 보고서 디렉토리를 정리해 깨끗한 상태에서 테스트한다.
  await fs.promises.rm(REPORTS_DIR, { recursive: true, force: true });

  // 스크립트를 목업 모드로 실행해 외부 PocketBase 의존성을 제거한다.
  await execFileAsync('node', ['weekly-report.js'], {
    cwd: SCRIPTS_DIR,
    env: {
      ...process.env,
      [WEEKLY_REPORT_MOCK_FLAG]: 'true'
    }
  });

  // 스크립트가 생성한 파일명이 예상 주간 시작일을 포함하는지 확인한다.
  const expectedWeekStartIso = calculateExpectedWeekStartISO();
  const expectedCsvFile = path.join(REPORTS_DIR, `weekly-report-${expectedWeekStartIso}.csv`);
  const expectedExcelFile = path.join(REPORTS_DIR, `weekly-report-${expectedWeekStartIso}.xlsx`);

  assert.ok(fs.existsSync(expectedCsvFile), 'CSV 보고서가 현재 주간 시작일 파일명으로 생성되어야 합니다.');
  assert.ok(fs.existsSync(expectedExcelFile), 'XLSX 보고서가 현재 주간 시작일 파일명으로 생성되어야 합니다.');
});
