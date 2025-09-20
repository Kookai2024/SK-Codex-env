/**
 * attendance/tests/attendance-repository.test.js
 *
 * PocketBaseAttendanceRepository가 올바르게 PocketBase와 연동되는지 검증한다.
 * 실제 PocketBase 서버가 없어도 모킹을 통해 테스트한다.
 */

require('ts-node/register/transpile-only');
const test = require('node:test');
const assert = require('node:assert/strict');
const { PocketBaseAttendanceRepository } = require('../api/attendanceRepository.ts');

/**
 * PocketBase 모킹을 위한 Mock 클래스
 */
class MockPocketBase {
  constructor() {
    this.collection = new MockCollection();
    this.authStore = {
      save: (token) => {
        this.authToken = token;
      }
    };
    this.authToken = null;
  }
}

class MockCollection {
  constructor() {
    this.records = [];
    this.lastQuery = null;
  }

  async getList(page, perPage, options = {}) {
    this.lastQuery = { page, perPage, options };
    
    // 필터 조건에 따라 기록 필터링
    let filteredRecords = [...this.records];
    
    if (options.filter) {
      const filterParts = options.filter.split(' && ');
      filteredRecords = filteredRecords.filter(record => {
        return filterParts.every(filter => {
          if (filter.includes('user =')) {
            const userId = filter.match(/user = "([^"]+)"/)?.[1];
            return record.user === userId;
          }
          if (filter.includes('server_time >=')) {
            const startTime = filter.match(/server_time >= "([^"]+)"/)?.[1];
            return record.server_time >= startTime;
          }
          if (filter.includes('server_time <=')) {
            const endTime = filter.match(/server_time <= "([^"]+)"/)?.[1];
            return record.server_time <= endTime;
          }
          return true;
        });
      });
    }
    
    // 정렬 적용
    if (options.sort === 'server_time') {
      filteredRecords.sort((a, b) => a.server_time.localeCompare(b.server_time));
    }
    
    return {
      items: filteredRecords.slice(0, perPage),
      totalItems: filteredRecords.length,
      totalPages: Math.ceil(filteredRecords.length / perPage)
    };
  }

  async create(data) {
    const record = {
      id: `rec-${this.records.length + 1}`,
      ...data,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    this.records.push(record);
    return record;
  }
}

// 테스트용 기록 데이터
const TEST_RECORDS = [
  {
    id: 'rec-1',
    user: 'user-1',
    type: 'in',
    server_time: '2025-09-25T00:00:00Z',
    ip_address: '127.0.0.1',
    note: null
  },
  {
    id: 'rec-2',
    user: 'user-1',
    type: 'out',
    server_time: '2025-09-25T09:00:00Z',
    ip_address: '127.0.0.1',
    note: null
  },
  {
    id: 'rec-3',
    user: 'user-2',
    type: 'in',
    server_time: '2025-09-25T01:00:00Z',
    ip_address: '192.168.1.100',
    note: '지각 출근'
  }
];

// 저장소 생성 및 초기 데이터 설정
function createTestRepository() {
  const mockPb = new MockPocketBase();
  mockPb.collection.records = [...TEST_RECORDS];
  
  // PocketBase 모킹
  const originalPocketBase = require('pocketbase');
  const originalDefault = originalPocketBase.default;
  originalPocketBase.default = () => mockPb;
  
  const repository = new PocketBaseAttendanceRepository();
  repository.pb = mockPb;
  
  // 원본 PocketBase 복원을 위한 cleanup 함수
  const cleanup = () => {
    originalPocketBase.default = originalDefault;
  };
  
  return { repository, mockPb, cleanup };
}

// 날짜 범위 조회 테스트
test('listRecordsForDate returns records within date range', async (t) => {
  const { repository, mockPb, cleanup } = createTestRepository();
  
  t.after(() => cleanup());
  
  const records = await repository.listRecordsForDate(
    'user-1',
    '2025-09-25T00:00:00Z',
    '2025-09-25T23:59:59Z'
  );
  
  assert.equal(records.length, 2);
  assert.equal(records[0].userId, 'user-1');
  assert.equal(records[0].type, 'PUNCH_IN');
  assert.equal(records[1].type, 'PUNCH_OUT');
  
  // PocketBase 쿼리가 올바르게 생성되었는지 확인
  assert.ok(mockPb.collection.lastQuery);
  assert.equal(mockPb.collection.lastQuery.options.sort, 'server_time');
});

// 특정 사용자의 기록만 조회하는지 확인
test('listRecordsForDate filters by user correctly', async (t) => {
  const { repository, mockPb, cleanup } = createTestRepository();
  
  t.after(() => cleanup());
  
  const records = await repository.listRecordsForDate(
    'user-2',
    '2025-09-25T00:00:00Z',
    '2025-09-25T23:59:59Z'
  );
  
  assert.equal(records.length, 1);
  assert.equal(records[0].userId, 'user-2');
  assert.equal(records[0].note, '지각 출근');
});

// 새로운 기록 생성 테스트
test('createRecord stores new attendance record', async (t) => {
  const { repository, mockPb, cleanup } = createTestRepository();
  
  t.after(() => cleanup());
  
  const payload = {
    userId: 'user-3',
    type: 'PUNCH_IN',
    serverTime: '2025-09-26T00:00:00Z',
    ipAddress: '192.168.1.200',
    note: '새로운 출근 기록'
  };
  
  const record = await repository.createRecord(payload);
  
  assert.equal(record.userId, 'user-3');
  assert.equal(record.type, 'PUNCH_IN');
  assert.equal(record.ipAddress, '192.168.1.200');
  assert.equal(record.note, '새로운 출근 기록');
  
  // PocketBase에 실제로 저장되었는지 확인
  assert.equal(mockPb.collection.records.length, 4);
  const savedRecord = mockPb.collection.records[3];
  assert.equal(savedRecord.user, 'user-3');
  assert.equal(savedRecord.type, 'in'); // PocketBase 스키마 형태로 변환됨
});

// 타입 변환 테스트 (PUNCH_OUT)
test('createRecord converts PUNCH_OUT type correctly', async (t) => {
  const { repository, mockPb, cleanup } = createTestRepository();
  
  t.after(() => cleanup());
  
  const payload = {
    userId: 'user-1',
    type: 'PUNCH_OUT',
    serverTime: '2025-09-26T09:00:00Z',
    ipAddress: '127.0.0.1',
    note: null
  };
  
  const record = await repository.createRecord(payload);
  
  assert.equal(record.type, 'PUNCH_OUT');
  
  // PocketBase에 저장된 데이터는 'out' 형태
  const savedRecord = mockPb.collection.records[mockPb.collection.records.length - 1];
  assert.equal(savedRecord.type, 'out');
});

// 인증 토큰 설정 테스트
test('setAuthToken configures PocketBase authentication', (t) => {
  const { repository, mockPb, cleanup } = createTestRepository();
  
  t.after(() => cleanup());
  
  const testToken = 'test-auth-token';
  repository.setAuthToken(testToken);
  
  assert.equal(mockPb.authToken, testToken);
});

// 빈 결과 조회 테스트
test('listRecordsForDate returns empty array when no records found', async (t) => {
  const { repository, cleanup } = createTestRepository();
  
  t.after(() => cleanup());
  
  const records = await repository.listRecordsForDate(
    'non-existent-user',
    '2025-09-25T00:00:00Z',
    '2025-09-25T23:59:59Z'
  );
  
  assert.equal(records.length, 0);
  assert.equal(Array.isArray(records), true);
});
