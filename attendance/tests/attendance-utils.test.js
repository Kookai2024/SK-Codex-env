/**
 * attendance/tests/attendance-utils.test.js
 *
 * 출퇴근 유틸리티 함수들의 기본 동작을 검증한다.
 */

require('ts-node/register/transpile-only');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  determinePunchState,
  getSeoulDayBoundaries,
  validatePunchTransition
} = require('../utils.ts');
const { ATTENDANCE_TYPES } = require('../types.ts');

// 테스트에서 사용할 고정 ISO 타임스탬프를 상수로 정의한다.
const SAMPLE_TIMESTAMP_IN = '2025-09-26T00:00:00.000Z';
const SAMPLE_TIMESTAMP_OUT = '2025-09-26T09:30:00.000Z';

// 출퇴근 상태 계산 테스트
test('determinePunchState enables punch in when no records exist', () => {
  const state = determinePunchState([]);
  assert.equal(state.canPunchIn, true);
  assert.equal(state.canPunchOut, false);
  assert.equal(state.isOnLeave, false);
});

// 출근 이후 퇴근 버튼 활성화 확인
test('determinePunchState enables punch out after punch in', () => {
  const state = determinePunchState([
    {
      id: 'rec-1',
      userId: 'user-1',
      type: ATTENDANCE_TYPES.PUNCH_IN,
      serverTime: SAMPLE_TIMESTAMP_IN,
      ipAddress: '127.0.0.1'
    }
  ]);
  assert.equal(state.canPunchOut, true);
  assert.equal(state.canPunchIn, false);
});

// 퇴근 이후에는 버튼이 모두 비활성화되어야 한다.
test('determinePunchState disables both buttons after punch out', () => {
  const state = determinePunchState([
    {
      id: 'rec-1',
      userId: 'user-1',
      type: ATTENDANCE_TYPES.PUNCH_IN,
      serverTime: SAMPLE_TIMESTAMP_IN,
      ipAddress: '127.0.0.1'
    },
    {
      id: 'rec-2',
      userId: 'user-1',
      type: ATTENDANCE_TYPES.PUNCH_OUT,
      serverTime: SAMPLE_TIMESTAMP_OUT,
      ipAddress: '127.0.0.1'
    }
  ]);
  assert.equal(state.canPunchIn, false);
  assert.equal(state.canPunchOut, false);
});

// 근태 일정이 있는 경우 버튼이 비활성화되는지 확인한다.
test('determinePunchState blocks punches when leave is scheduled', () => {
  const state = determinePunchState(
    [],
    {
      isOnLeave: true,
      leaveType: '연차'
    }
  );
  assert.equal(state.canPunchIn, false);
  assert.equal(state.canPunchOut, false);
  assert.equal(state.isOnLeave, true);
});

// 출근 전 퇴근을 시도하면 거절되어야 한다.
test('validatePunchTransition rejects punching out before punching in', () => {
  const result = validatePunchTransition([], ATTENDANCE_TYPES.PUNCH_OUT);
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /출근 기록이 필요/);
});

// 퇴근 이후 재출근 시도도 거절되어야 한다.
test('validatePunchTransition prevents double punch in', () => {
  const result = validatePunchTransition(
    [
      {
        id: 'rec-1',
        userId: 'user-1',
        type: ATTENDANCE_TYPES.PUNCH_IN,
        serverTime: SAMPLE_TIMESTAMP_IN,
        ipAddress: '127.0.0.1'
      }
    ],
    ATTENDANCE_TYPES.PUNCH_IN
  );
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /이미 출근/);
});

// 서울 기준 날짜 경계 계산이 정확한지 확인한다.
test('getSeoulDayBoundaries returns start/end range in UTC', () => {
  const reference = new Date('2025-09-26T03:00:00Z');
  const boundaries = getSeoulDayBoundaries(reference);

  // 시작 시각은 전날 15:00 UTC(= 한국 00:00) 이어야 한다.
  assert.equal(boundaries.startUtcIso.startsWith('2025-09-25T15:00:00'), true);
  // 종료 시각은 당일 14:59:59.999 UTC 근처이다.
  assert.equal(boundaries.endUtcIso.startsWith('2025-09-26T14:59:59'), true);
  assert.equal(boundaries.isoDate, '2025-09-26');
});
