/**
 * todos/tests/todo-router.test.js
 *
 * Todo REST 라우터가 RBAC, 편집 잠금, 유효성 검사를 지키는지 검증한다.
 */

require('ts-node/register/transpile-only');
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createTodoRouter } = require('../api/todoRouter.ts');
const {
  TODO_ALLOWED_ROLES,
  TODO_STATUSES
} = require('../types.ts');
const { computeNextLockTimestamp, TODO_MESSAGES } = require('../utils.ts');

/**
 * 테스트용 메모리 Todo 저장소 구현체이다.
 */
class InMemoryTodoRepository {
  constructor(initialTodos = []) {
    this.todos = initialTodos.map((todo) => ({ ...todo }));
  }

  async listBoard() {
    return this.todos.map((todo) => ({ ...todo }));
  }

  async findById(id) {
    const found = this.todos.find((todo) => todo.id === id);
    return found ? { ...found } : null;
  }

  async update(id, patch) {
    const index = this.todos.findIndex((todo) => todo.id === id);
    if (index === -1) {
      throw new Error('not found');
    }
    const updated = {
      ...this.todos[index],
      ...patch,
      lockedAt: patch.lockedAt ?? null,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
    this.todos[index] = { ...updated };
    return { ...updated };
  }
}

// 공통 테스트 데이터를 생성한다.
function createTodoFixture(overrides = {}) {
  return {
    id: 'todo-1',
    title: '샘플 업무',
    description: '설명',
    projectId: 'project-1',
    projectCode: 'WEB1',
    projectName: '웹 리뉴얼',
    assigneeId: 'user-1',
    assigneeName: '박개발자',
    status: TODO_STATUSES.PREWORK,
    issue: null,
    solution: null,
    decision: null,
    notes: null,
    dueDate: '2025-09-30',
    lockedAt: null,
    updatedAt: '2025-09-20T00:00:00.000Z',
    createdAt: '2025-09-19T00:00:00.000Z',
    ...overrides
  };
}

// 테스트 편의를 위한 헤더 빌더 함수이다.
function buildHeaders(role = TODO_ALLOWED_ROLES.MEMBER, userId = 'user-1') {
  return {
    'x-user-id': userId,
    'x-user-role': role,
    'x-user-name': role === TODO_ALLOWED_ROLES.ADMIN ? 'Admin User' : 'Member User'
  };
}

// 라우터를 포함한 Express 앱을 생성한다.
function createTestApp({
  todos = [createTodoFixture()],
  time = new Date('2025-09-25T12:00:00.000Z')
} = {}) {
  const repository = new InMemoryTodoRepository(todos);
  const router = createTodoRouter({ repository, timeProvider: () => time });
  const app = express();
  app.use(router);
  return { app, repository, time };
}

// 칸반 조회가 성공적으로 동작해야 한다.
test('todo router returns board response', async () => {
  const { app } = createTestApp();
  const response = await request(app).get('/todos/board').set(buildHeaders());

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.board.length > 0, true);
});

// 담당자는 잠금 전에는 상태를 변경할 수 있어야 한다.
test('todo router allows member patch before lock', async () => {
  const { app, repository, time } = createTestApp();

  const response = await request(app)
    .patch('/todos/todo-1')
    .set(buildHeaders())
    .send({ status: TODO_STATUSES.DESIGN });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(repository.todos[0].status, TODO_STATUSES.DESIGN);
  assert.equal(response.body.data.todo.lockedAt, computeNextLockTimestamp(time));
});

// 잠금 이후에는 member가 거절되어야 한다.
test('todo router blocks member patch after lock', async () => {
  const { app } = createTestApp({
    todos: [createTodoFixture({ lockedAt: '2025-09-26T00:00:00.000Z' })],
    time: new Date('2025-09-26T01:00:00.000Z')
  });

  const response = await request(app)
    .patch('/todos/todo-1')
    .set(buildHeaders())
    .send({ notes: '수정 시도' });

  assert.equal(response.status, 403);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error, TODO_MESSAGES.LOCKED);
});

// 인증 헤더가 없으면 401이어야 한다.
test('todo router rejects missing auth headers', async () => {
  const { app } = createTestApp();
  const response = await request(app).patch('/todos/todo-1').send({ status: TODO_STATUSES.DESIGN });
  assert.equal(response.status, 401);
  assert.equal(response.body.ok, false);
});

// 잘못된 본문을 보내면 400 오류가 발생해야 한다.
test('todo router rejects empty patch body', async () => {
  const { app } = createTestApp();
  const response = await request(app).patch('/todos/todo-1').set(buildHeaders()).send({});
  assert.equal(response.status, 400);
  assert.equal(response.body.ok, false);
});
