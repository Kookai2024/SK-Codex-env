/**
 * dashboard/tests/dashboard-router.test.js
 *
 * 대시보드 Express 라우터가 인증 및 RBAC 규칙을 지키는지 검증한다.
 */

require('ts-node/register/transpile-only');
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createDashboardRouter } = require('../api/dashboardRouter.ts');
const {
  DASHBOARD_ALLOWED_ROLES
} = require('../types.ts');
const { DASHBOARD_MESSAGES } = require('../utils.ts');

/**
 * 테스트용 메모리 대시보드 저장소 구현체이다.
 */
class FakeDashboardRepository {
  constructor() {
    this.calls = {
      getPersonalOverview: 0,
      getTeamOverview: 0,
      listAnnouncements: 0
    };
  }

  async getPersonalOverview() {
    this.calls.getPersonalOverview += 1;
    return {
      pendingTodos: 4,
      completedThisWeek: 1,
      nextLeaveDate: null,
      lastAttendanceType: 'PUNCH_IN',
      lastAttendanceAt: '2025-09-25T09:00:00.000Z'
    };
  }

  async getTeamOverview() {
    this.calls.getTeamOverview += 1;
    return {
      totalMembers: 7,
      activeProjects: 3,
      overdueTodos: 2,
      attendanceAlerts: 1
    };
  }

  async listAnnouncements(role) {
    this.calls.listAnnouncements += 1;
    return [
      {
        id: `notice-${role}`,
        message: '공지입니다.',
        level: 'info',
        publishedAt: '2025-09-25T08:00:00.000Z'
      }
    ];
  }
}

/**
 * 테스트용 Express 앱을 생성한다.
 * @param options 커스터마이징 옵션
 */
function createTestApp(options = {}) {
  const repository = options.repository ?? new FakeDashboardRepository();
  const timeProvider = options.timeProvider ?? (() => new Date('2025-09-25T12:00:00.000Z'));
  const app = express();
  app.use(createDashboardRouter({ repository, timeProvider }));
  return { app, repository };
}

// 인증 헤더가 없으면 401이 발생해야 한다.
test('dashboard router requires authentication headers', async () => {
  const { app } = createTestApp();

  const response = await request(app).get('/dashboard/overview');
  assert.equal(response.status, 401);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error, DASHBOARD_MESSAGES.UNAUTHENTICATED);
  assert.equal(response.body.timestamp, '2025-09-25T12:00:00.000Z');
});

// 게스트 역할은 접근이 거부되어야 한다.
test('dashboard router rejects guest role', async () => {
  const { app, repository } = createTestApp();

  const response = await request(app)
    .get('/dashboard/overview')
    .set('x-user-id', 'guest-1')
    .set('x-user-role', DASHBOARD_ALLOWED_ROLES.GUEST);

  assert.equal(response.status, 403);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error, DASHBOARD_MESSAGES.FORBIDDEN);
  assert.equal(repository.calls.getTeamOverview, 0);
});

// member는 개인 요약만 받아야 한다.
test('dashboard router returns personal overview for member', async () => {
  const { app, repository } = createTestApp();

  const response = await request(app)
    .get('/dashboard/overview')
    .set('x-user-id', 'member-1')
    .set('x-user-role', DASHBOARD_ALLOWED_ROLES.MEMBER);

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.overview.personalSummary.pendingTodos, 4);
  assert.equal(response.body.data.overview.teamSummary, null);
  assert.equal(repository.calls.getPersonalOverview, 1);
  assert.equal(repository.calls.getTeamOverview, 0);
  assert.equal(repository.calls.listAnnouncements, 1);
});

// admin은 팀 요약을 함께 받아야 한다.
test('dashboard router returns team overview for admin', async () => {
  const { app, repository } = createTestApp();

  const response = await request(app)
    .get('/dashboard/overview')
    .set('x-user-id', 'admin-1')
    .set('x-user-role', DASHBOARD_ALLOWED_ROLES.ADMIN);

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.overview.teamSummary.totalMembers, 7);
  assert.equal(response.body.data.overview.announcements.length, 1);
  assert.equal(repository.calls.getTeamOverview, 1);
});
