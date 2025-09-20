/**
 * dashboard/tests/dashboard-service.test.js
 *
 * 대시보드 서비스가 역할에 따라 올바른 데이터를 반환하는지 검증한다.
 */

require('ts-node/register/transpile-only');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createDashboardService } = require('../api/dashboardService.ts');
const {
  DASHBOARD_ALLOWED_ROLES
} = require('../types.ts');
const { DASHBOARD_MESSAGES } = require('../utils.ts');

/**
 * 메모리 기반 대시보드 저장소 테스트 구현체이다.
 */
class FakeDashboardRepository {
  constructor() {
    this.calls = {
      getPersonalOverview: 0,
      getTeamOverview: 0,
      listAnnouncements: 0
    };
  }

  async getPersonalOverview(userId) {
    this.calls.getPersonalOverview += 1;
    return {
      pendingTodos: 3,
      completedThisWeek: 2,
      nextLeaveDate: '2025-10-01',
      lastAttendanceType: 'PUNCH_OUT',
      lastAttendanceAt: '2025-09-25T10:00:00.000Z'
    };
  }

  async getTeamOverview() {
    this.calls.getTeamOverview += 1;
    return {
      totalMembers: 5,
      activeProjects: 2,
      overdueTodos: 1,
      attendanceAlerts: 0
    };
  }

  async listAnnouncements(role) {
    this.calls.listAnnouncements += 1;
    return [
      {
        id: `notice-for-${role}`,
        message: '테스트 공지',
        level: 'info',
        publishedAt: '2025-09-25T09:00:00.000Z'
      }
    ];
  }
}

// 게스트 사용자는 접근이 차단되어야 한다.
test('dashboard service blocks guest access', async () => {
  const repository = new FakeDashboardRepository();
  const now = new Date('2025-09-25T12:00:00.000Z');
  const service = createDashboardService({ repository, timeProvider: () => now });

  const result = await service.getOverview({ id: 'guest-1', role: DASHBOARD_ALLOWED_ROLES.GUEST });
  assert.equal(result.status, 403);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.error, DASHBOARD_MESSAGES.FORBIDDEN);
  assert.equal(result.body.data, null);
  assert.equal(repository.calls.getPersonalOverview, 0);
  assert.equal(repository.calls.getTeamOverview, 0);
  assert.equal(repository.calls.listAnnouncements, 0);
});

// member는 개인 데이터만 조회하고 팀 데이터는 호출하지 않아야 한다.
test('dashboard service returns personal overview for member without team call', async () => {
  const repository = new FakeDashboardRepository();
  const now = new Date('2025-09-25T12:00:00.000Z');
  const service = createDashboardService({ repository, timeProvider: () => now });

  const result = await service.getOverview({ id: 'member-1', role: DASHBOARD_ALLOWED_ROLES.MEMBER });
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  const overview = result.body.data.overview;
  assert.equal(overview.personalSummary.pendingTodos, 3);
  assert.equal(overview.teamSummary, null);
  assert.equal(repository.calls.getPersonalOverview, 1);
  assert.equal(repository.calls.getTeamOverview, 0);
  assert.equal(repository.calls.listAnnouncements, 1);
});

// admin은 팀/개인 정보와 공지 모두 받아야 한다.
test('dashboard service returns full overview for admin', async () => {
  const repository = new FakeDashboardRepository();
  const now = new Date('2025-09-25T12:00:00.000Z');
  const service = createDashboardService({ repository, timeProvider: () => now });

  const result = await service.getOverview({ id: 'admin-1', role: DASHBOARD_ALLOWED_ROLES.ADMIN });
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  const overview = result.body.data.overview;
  assert.equal(overview.teamSummary.totalMembers, 5);
  assert.equal(overview.personalSummary.pendingTodos, 3);
  assert.equal(overview.announcements.length, 1);
  assert.equal(repository.calls.getPersonalOverview, 1);
  assert.equal(repository.calls.getTeamOverview, 1);
  assert.equal(repository.calls.listAnnouncements, 1);
});
