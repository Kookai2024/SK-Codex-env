/**
 * todos/tests/todo-service.test.js
 *
 * Todo 서비스 레이어가 칸반 보드 구성과 편집 잠금 규칙을 지키는지 검증한다.
 */

require('ts-node/register/transpile-only');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTodoService } = require('../api/todoService.ts');
const {
  TODO_STATUSES,
  TODO_ALLOWED_ROLES
} = require('../types.ts');
const { computeNextLockTimestamp, TODO_MESSAGES } = require('../utils.ts');

/**
 * 테스트에서 사용할 메모리 기반 Todo 저장소 구현체이다.
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

// 공통으로 사용할 Todo 레코드 기본값이다.
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

// 칸반 보드가 상태별로 정렬되는지 검증한다.
test('todo service groups records into board columns', async () => {
  const repository = new InMemoryTodoRepository([
    createTodoFixture({ id: 'todo-1', status: TODO_STATUSES.PREWORK }),
    createTodoFixture({ id: 'todo-2', status: TODO_STATUSES.DESIGN }),
    createTodoFixture({ id: 'todo-3', status: TODO_STATUSES.DESIGN, assigneeName: '이디자이너' })
  ]);
  const now = new Date('2025-09-25T12:00:00.000Z');
  const service = createTodoService({ repository, timeProvider: () => now });

  const result = await service.getBoard({ id: 'admin-1', role: TODO_ALLOWED_ROLES.ADMIN }, {});
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  const designColumn = result.body.data.board.find((column) => column.status === TODO_STATUSES.DESIGN);
  assert.equal(designColumn.items.length, 2);
});

// 편집 잠금 이전에는 담당자가 업데이트할 수 있어야 한다.
test('todo service allows member update before lock', async () => {
  const repository = new InMemoryTodoRepository([createTodoFixture()]);
  const now = new Date('2025-09-25T12:00:00.000Z');
  const service = createTodoService({ repository, timeProvider: () => now });

  const result = await service.updateTodo(
    { id: 'user-1', role: TODO_ALLOWED_ROLES.MEMBER },
    'todo-1',
    { status: TODO_STATUSES.DESIGN }
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(repository.todos[0].status, TODO_STATUSES.DESIGN);
  assert.equal(result.body.data.todo.lockedAt, computeNextLockTimestamp(now));
});

// 잠금 시간이 지난 후에는 member가 수정할 수 없어야 한다.
test('todo service blocks member update after lock time', async () => {
  const repository = new InMemoryTodoRepository([
    createTodoFixture({ lockedAt: '2025-09-26T00:00:00.000Z' })
  ]);
  const now = new Date('2025-09-26T01:00:00.000Z');
  const service = createTodoService({ repository, timeProvider: () => now });

  const result = await service.updateTodo(
    { id: 'user-1', role: TODO_ALLOWED_ROLES.MEMBER },
    'todo-1',
    { notes: '수정 시도' }
  );

  assert.equal(result.status, 403);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.error, TODO_MESSAGES.LOCKED);
});

// 관리자는 잠금 이후에도 업데이트할 수 있어야 한다.
test('todo service allows admin update after lock', async () => {
  const repository = new InMemoryTodoRepository([
    createTodoFixture({ lockedAt: '2025-09-26T00:00:00.000Z' })
  ]);
  const now = new Date('2025-09-26T01:00:00.000Z');
  const service = createTodoService({ repository, timeProvider: () => now });

  const result = await service.updateTodo(
    { id: 'admin-1', role: TODO_ALLOWED_ROLES.ADMIN },
    'todo-1',
    { decision: '관리자 승인' }
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(repository.todos[0].decision, '관리자 승인');
});

// 게스트 사용자는 항상 거부되어야 한다.
test('todo service rejects guest updates', async () => {
  const repository = new InMemoryTodoRepository([createTodoFixture()]);
  const now = new Date('2025-09-25T12:00:00.000Z');
  const service = createTodoService({ repository, timeProvider: () => now });

  const result = await service.updateTodo(
    { id: 'guest-1', role: TODO_ALLOWED_ROLES.GUEST },
    'todo-1',
    { notes: '게스트 수정' }
  );

  assert.equal(result.status, 403);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.error, '해당 작업을 수행할 권한이 없습니다.');
});
