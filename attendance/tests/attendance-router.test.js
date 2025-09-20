/**
 * attendance/tests/attendance-router.test.js
 *
 * Express 라우터가 REST 규칙과 권한 체크를 준수하는지 검증한다.
 */

require('ts-node/register/transpile-only');
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createAttendanceRouter } = require('../api/attendanceRouter.ts');
const {
  ATTENDANCE_TYPES,
  ATTENDANCE_ALLOWED_ROLES,
  ATTENDANCE_LEAVE_TYPES
} = require('../types.ts');

/**
 * 테스트용 메모리 저장소 구현
 */
class InMemoryAttendanceRepository {
  constructor() {
    this.records = [];
  }

  async listRecordsForDate(userId, dayStartIso, dayEndIso) {
    return this.records
      .filter(
        (record) =>
          record.userId === userId &&
          record.serverTime >= dayStartIso &&
          record.serverTime <= dayEndIso
      )
      .map((record) => ({ ...record }));
  }

  async createRecord(payload) {
    const record = { ...payload, id: `rec-${this.records.length + 1}` };
    this.records.push(record);
    return { ...record };
  }
}

/**
 * 테스트용 휴무 일정 저장소 구현
 */
class InMemoryLeaveScheduleRepository {
  constructor(initialEntries = []) {
    this.entries = [...initialEntries];
  }

  async listForRange(userId, startDateIso, endDateIso) {
    return this.entries
      .filter(
        (entry) =>
          entry.userId === userId &&
          entry.date >= startDateIso &&
          entry.date <= endDateIso
      )
      .map((entry) => ({ ...entry }));
  }
}

// 공통 헤더 빌더
function buildMemberHeaders() {
  return {
    'x-user-id': 'user-1',
    'x-user-role': ATTENDANCE_ALLOWED_ROLES.MEMBER
  };
}

// 라우터를 포함한 Express 앱을 생성한다.
function createTestApp(options = {}) {
  const repository = options.repository ?? new InMemoryAttendanceRepository();
  const timeProvider = options.timeProvider ?? (() => new Date('2025-09-25T23:00:00Z'));
  const leaveScheduleRepository = options.disableCalendar
    ? null
    : options.leaveScheduleRepository ??
      new InMemoryLeaveScheduleRepository(options.leaveEntries ?? []);
  const router = createAttendanceRouter({
    repository,
    timeProvider,
    leaveLookup: options.leaveLookup ?? null,
    leaveScheduleRepository
  });
  const app = express();
  app.set('trust proxy', true);
  app.use(router);
  return { app, repository };
}

// 인증 헤더가 없으면 401이어야 한다.
test('attendance router rejects missing auth headers', async () => {
  const { app } = createTestApp();
  const response = await request(app).get('/attendance/today');
  assert.equal(response.status, 401);
  assert.equal(response.body.ok, false);
});

// 기본 상태 조회 성공 케이스
test('attendance router returns initial state for member', async () => {
  const { app } = createTestApp();
  const response = await request(app)
    .get('/attendance/today')
    .set(buildMemberHeaders());

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.state.canPunchIn, true);
});

// 출근 성공 후 상태 확인
test('punch-in endpoint creates a record and returns ok', async () => {
  const { app, repository } = createTestApp();
  const response = await request(app)
    .post('/attendance/punch-in')
    .set(buildMemberHeaders())
    .send({ note: '출근합니다' });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(repository.records.length, 1);
  assert.equal(repository.records[0].type, ATTENDANCE_TYPES.PUNCH_IN);
});

// 출근 없이 퇴근 시도는 실패해야 한다.
test('punch-out endpoint rejects request without prior punch-in', async () => {
  const { app } = createTestApp();
  const response = await request(app)
    .post('/attendance/punch-out')
    .set(buildMemberHeaders())
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error ?? '', /출근 기록이 필요/);
});

// 근태 일정일 경우 버튼이 막혀야 한다.
test('router blocks punch when leave lookup reports leave', async () => {
  const { app } = createTestApp({
    leaveLookup: async () => ({ isOnLeave: true, leaveType: '연차' })
  });

  const response = await request(app)
    .post('/attendance/punch-in')
    .set(buildMemberHeaders())
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error ?? '', /근태 일정/);
});

// 캘린더 엔드포인트가 휴무 일정을 반환하는지 확인한다.
test('calendar endpoint returns monthly matrix for member', async () => {
  const leaveEntries = [
    {
      id: 'leave-1',
      userId: 'user-1',
      date: '2025-09-10',
      leaveType: ATTENDANCE_LEAVE_TYPES.ANNUAL_LEAVE,
      isFullDay: true,
      note: '추석 연차'
    }
  ];

  const { app } = createTestApp({ leaveEntries });
  const response = await request(app)
    .get('/attendance/calendar')
    .set(buildMemberHeaders())
    .query({ year: 2025, month: 9 });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);

  const flattened = response.body.data.calendar.flat();
  const matchedCell = flattened.find((cell) => cell.date === '2025-09-10');
  assert.equal(matchedCell.leaveType, ATTENDANCE_LEAVE_TYPES.ANNUAL_LEAVE);
  assert.equal(matchedCell.shading, 'full');
});

// 잘못된 월이 전달되면 400 오류를 반환해야 한다.
test('calendar endpoint rejects invalid month', async () => {
  const { app } = createTestApp();
  const response = await request(app)
    .get('/attendance/calendar')
    .set(buildMemberHeaders())
    .query({ year: 2025, month: 13 });

  assert.equal(response.status, 400);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error ?? '', /연도 또는 월 정보/);
});

// 휴무 저장소가 없으면 기능 미구현 상태로 응답해야 한다.
test('calendar endpoint returns 503 when repository missing', async () => {
  const { app } = createTestApp({ disableCalendar: true });
  const response = await request(app)
    .get('/attendance/calendar')
    .set(buildMemberHeaders())
    .query({ year: 2025, month: 9 });

  assert.equal(response.status, 503);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error ?? '', /캘린더 기능이 아직 구성/);
});
