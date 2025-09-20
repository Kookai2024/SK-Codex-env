/**
 * attendance/tests/attendance-service.test.js
 *
 * AttendanceService가 비즈니스 규칙을 올바르게 적용하는지 검증한다.
 */

require('ts-node/register/transpile-only');
const test = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const { createAttendanceService } = require('../api/attendanceService.ts');
const {
  ATTENDANCE_TYPES,
  ATTENDANCE_ALLOWED_ROLES
} = require('../types.ts');

/**
 * 테스트용 메모리 저장소 구현체
 */
class InMemoryAttendanceRepository {
  constructor(initialRecords = []) {
    this.records = [...initialRecords];
    this.lastQuery = null;
  }

  async listRecordsForDate(userId, dayStartIso, dayEndIso) {
    this.lastQuery = { userId, dayStartIso, dayEndIso };
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
    const record = {
      ...payload,
      id: `rec-${this.records.length + 1}`
    };
    this.records.push(record);
    return { ...record };
  }
}

// ISO 문자열 배열을 순서대로 반환하는 타임 프로바이더를 생성한다.
function createSequentialTimeProvider(isoStrings) {
  const dates = isoStrings.map((iso) => new Date(iso));
  let index = 0;
  return () => {
    const currentIndex = Math.min(index, dates.length - 1);
    const value = dates[currentIndex];
    if (index < dates.length - 1) {
      index += 1;
    }
    return value;
  };
}

// 공통 사용자 객체 상수
const MEMBER_USER = {
  id: 'user-1',
  role: ATTENDANCE_ALLOWED_ROLES.MEMBER
};

// 출근 성공 케이스
test('punchIn stores a record and enables punch out', async () => {
  const repository = new InMemoryAttendanceRepository();
  const timeProvider = createSequentialTimeProvider(['2025-09-25T23:00:00Z']);
  const service = createAttendanceService({ repository, timeProvider });

  const result = await service.punchIn(MEMBER_USER, '127.0.0.1');
  assert.equal(result.ok, true);
  assert.equal(repository.records.length, 1);
  assert.equal(repository.records[0].type, ATTENDANCE_TYPES.PUNCH_IN);

  const status = await service.getTodayStatus(MEMBER_USER);
  assert.equal(status.data?.state.canPunchOut, true);
});

// 출근 중복 방지
test('punchIn prevents duplicate punch in on the same day', async () => {
  const repository = new InMemoryAttendanceRepository();
  const timeProvider = createSequentialTimeProvider(['2025-09-25T23:00:00Z']);
  const service = createAttendanceService({ repository, timeProvider });

  await service.punchIn(MEMBER_USER, '127.0.0.1');
  const result = await service.punchIn(MEMBER_USER, '127.0.0.1');
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /이미 출근/);
});

// 퇴근은 출근 이후에만 가능해야 한다.
test('punchOut requires a prior punch in record', async () => {
  const repository = new InMemoryAttendanceRepository();
  const timeProvider = createSequentialTimeProvider(['2025-09-25T23:00:00Z']);
  const service = createAttendanceService({ repository, timeProvider });

  const result = await service.punchOut(MEMBER_USER, '127.0.0.1');
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /출근 기록이 필요/);
});

// 출근 후 퇴근 성공 케이스
test('punchOut stores a record after punch in', async () => {
  const repository = new InMemoryAttendanceRepository();
  const timeProvider = createSequentialTimeProvider([
    '2025-09-25T23:00:00Z',
    '2025-09-26T10:00:00Z'
  ]);
  const service = createAttendanceService({ repository, timeProvider });

  await service.punchIn(MEMBER_USER, '127.0.0.1');
  const result = await service.punchOut(MEMBER_USER, '127.0.0.1');
  assert.equal(result.ok, true);
  assert.equal(repository.records.length, 2);
  assert.equal(repository.records[1].type, ATTENDANCE_TYPES.PUNCH_OUT);

  const status = await service.getTodayStatus(MEMBER_USER);
  assert.equal(status.data?.state.canPunchIn, false);
  assert.equal(status.data?.state.canPunchOut, false);
});

// 근태 일정이 있는 경우 출퇴근을 막는지 확인한다.
test('punchIn is blocked when leave lookup reports a scheduled leave', async () => {
  const repository = new InMemoryAttendanceRepository();
  const timeProvider = createSequentialTimeProvider(['2025-09-25T23:00:00Z']);
  const service = createAttendanceService({
    repository,
    timeProvider,
    leaveLookup: async () => ({ isOnLeave: true, leaveType: '연차' })
  });

  const result = await service.punchIn(MEMBER_USER, '127.0.0.1');
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /근태 일정/);
});

// 게스트 권한은 출퇴근 API를 사용할 수 없어야 한다.
test('guests cannot access attendance service', async () => {
  const repository = new InMemoryAttendanceRepository();
  const timeProvider = createSequentialTimeProvider(['2025-09-25T23:00:00Z']);
  const service = createAttendanceService({ repository, timeProvider });

  const guest = { id: 'guest-1', role: 'guest' };
  const status = await service.getTodayStatus(guest);
  assert.equal(status.ok, false);
  assert.match(status.error ?? '', /권한/);
});

// 하루 경계 조회가 올바른지 검증한다.
test('service queries repository using seoul day boundaries', async () => {
  const repository = new InMemoryAttendanceRepository();
  const timeProvider = createSequentialTimeProvider(['2025-09-25T15:05:00Z']);
  const service = createAttendanceService({ repository, timeProvider });

  await service.getTodayStatus(MEMBER_USER);
  assert.ok(repository.lastQuery);

  const { dayStartIso, dayEndIso } = repository.lastQuery;
  const start = DateTime.fromISO(dayStartIso, { zone: 'utc' }).toISO();
  const end = DateTime.fromISO(dayEndIso, { zone: 'utc' }).toISO();
  assert.ok(start?.startsWith('2025-09-25T15:00:00'));
  assert.ok(end?.startsWith('2025-09-26T14:59:59'));
});
