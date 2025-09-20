/**
 * todos/tests/todo-service.test.js
 *
 * TodoService가 비즈니스 규칙을 올바르게 적용하는지 검증한다.
 * 편집 잠금, 권한 검증, 칸반 보드 생성 등을 테스트한다.
 */

require('ts-node/register/transpile-only');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTodoService } = require('../api/todoService.ts');
const { TODO_STATUS, TODO_ALLOWED_ROLES } = require('../types.ts');

/**
 * 테스트용 메모리 저장소 구현체
 */
class InMemoryTodoRepository {
  constructor(initialTodos = []) {
    this.todos = [...initialTodos];
    this.lastQuery = null;
  }

  async listTodos(userId, filters = {}) {
    this.lastQuery = { userId, filters };
    let filteredTodos = this.todos.filter(todo => todo.userId === userId);
    
    // 필터 적용 (간단한 구현)
    if (filters.status && filters.status.length > 0) {
      filteredTodos = filteredTodos.filter(todo => filters.status.includes(todo.status));
    }
    
    return filteredTodos.map(todo => ({ ...todo }));
  }

  async getTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    return todo ? { ...todo } : null;
  }

  async createTodo(payload) {
    const todo = {
      ...payload,
      id: `todo-${this.todos.length + 1}`,
      projectCode: 'TEST',
      projectName: '테스트 프로젝트',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.todos.push(todo);
    return { ...todo };
  }

  async updateTodo(id, payload) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    this.todos[index] = {
      ...this.todos[index],
      ...payload,
      updatedAt: new Date().toISOString()
    };
    return { ...this.todos[index] };
  }

  async deleteTodo(id) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.todos.splice(index, 1);
    return true;
  }

  async updateTodoStatus(id, newStatus) {
    return this.updateTodo(id, { status: newStatus });
  }
}

// 고정 시간을 제공하는 타임 프로바이더
function createFixedTimeProvider(fixedDate) {
  return () => new Date(fixedDate);
}

// 공통 사용자 객체
const MEMBER_USER = {
  id: 'user-1',
  role: TODO_ALLOWED_ROLES.MEMBER,
  name: '테스트 사용자'
};

const ADMIN_USER = {
  id: 'admin-1',
  role: TODO_ALLOWED_ROLES.ADMIN,
  name: '관리자'
};

const GUEST_USER = {
  id: 'guest-1',
  role: 'guest',
  name: '게스트'
};

// Todo 생성 성공 테스트
test('createTodo stores a new todo item', async () => {
  const repository = new InMemoryTodoRepository();
  const service = createTodoService({ repository });

  const payload = {
    projectId: 'proj-1',
    title: '테스트 Todo',
    description: '테스트 설명',
    status: TODO_STATUS.PREWORK
  };

  const result = await service.createTodo(MEMBER_USER, payload);
  
  assert.equal(result.ok, true);
  assert.equal(result.data?.title, '테스트 Todo');
  assert.equal(result.data?.userId, MEMBER_USER.id);
  assert.equal(repository.todos.length, 1);
});

// 권한 검증 테스트 - 게스트는 Todo 생성 불가
test('createTodo rejects guest users', async () => {
  const repository = new InMemoryTodoRepository();
  const service = createTodoService({ repository });

  const payload = {
    projectId: 'proj-1',
    title: '테스트 Todo',
    status: TODO_STATUS.PREWORK
  };

  const result = await service.createTodo(GUEST_USER, payload);
  
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /권한/);
  assert.equal(repository.todos.length, 0);
});

// Todo 목록 조회 테스트
test('listTodos returns user todos', async () => {
  const initialTodos = [
    {
      id: 'todo-1',
      userId: 'user-1',
      projectId: 'proj-1',
      title: 'Todo 1',
      status: TODO_STATUS.PREWORK,
      projectCode: 'TEST',
      projectName: '테스트 프로젝트',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'todo-2',
      userId: 'user-2',
      projectId: 'proj-1',
      title: 'Todo 2',
      status: TODO_STATUS.DESIGN,
      projectCode: 'TEST',
      projectName: '테스트 프로젝트',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];

  const repository = new InMemoryTodoRepository(initialTodos);
  const service = createTodoService({ repository });

  const result = await service.listTodos(MEMBER_USER);
  
  assert.equal(result.ok, true);
  assert.equal(result.data?.length, 1);
  assert.equal(result.data?.[0].id, 'todo-1');
});

// 편집 잠금 테스트 - 다음날 오전 9시 이후에는 member 수정 불가
test('updateTodo blocks member editing after lock time', async () => {
  // 다음날 오전 9시 이후 시간으로 설정 (2024-01-02 10:00 KST = 2024-01-01 15:00 UTC)
  const lockTime = '2024-01-01T15:00:00Z';
  const timeProvider = createFixedTimeProvider(lockTime);
  
  const todo = {
    id: 'todo-1',
    userId: 'user-1',
    projectId: 'proj-1',
    title: '테스트 Todo',
    status: TODO_STATUS.PREWORK,
    projectCode: 'TEST',
    projectName: '테스트 프로젝트',
    createdAt: '2023-12-31T00:00:00Z', // 2023-12-31 생성 (더 이전 날짜)
    updatedAt: '2023-12-31T00:00:00Z'
  };

  const repository = new InMemoryTodoRepository([todo]);
  const service = createTodoService({ repository, timeProvider });

  const result = await service.updateTodo(MEMBER_USER, 'todo-1', { title: '수정된 제목' });
  
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /오전 9시/);
});

// 관리자는 편집 잠금 시간 이후에도 수정 가능
test('updateTodo allows admin editing after lock time', async () => {
  const lockTime = '2024-01-01T15:00:00Z';
  const timeProvider = createFixedTimeProvider(lockTime);
  
  const todo = {
    id: 'todo-1',
    userId: 'user-1',
    projectId: 'proj-1',
    title: '테스트 Todo',
    status: TODO_STATUS.PREWORK,
    projectCode: 'TEST',
    projectName: '테스트 프로젝트',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const repository = new InMemoryTodoRepository([todo]);
  const service = createTodoService({ repository, timeProvider });

  const result = await service.updateTodo(ADMIN_USER, 'todo-1', { title: '관리자 수정' });
  
  assert.equal(result.ok, true);
  assert.equal(result.data?.title, '관리자 수정');
});

// 칸반 보드 생성 테스트
test('getKanbanBoard creates board with columns', async () => {
  const todos = [
    {
      id: 'todo-1',
      userId: 'user-1',
      projectId: 'proj-1',
      title: '업무전 Todo',
      status: TODO_STATUS.PREWORK,
      projectCode: 'TEST',
      projectName: '테스트 프로젝트',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'todo-2',
      userId: 'user-1',
      projectId: 'proj-1',
      title: '설계중 Todo',
      status: TODO_STATUS.DESIGN,
      projectCode: 'TEST',
      projectName: '테스트 프로젝트',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];

  const repository = new InMemoryTodoRepository(todos);
  const service = createTodoService({ repository });

  const result = await service.getKanbanBoard(MEMBER_USER);
  
  assert.equal(result.ok, true);
  assert.equal(result.data?.columns.length, 5); // 5개 상태 컬럼
  assert.equal(result.data?.stats.total, 2);
  assert.equal(result.data?.columns[0].items.length, 1); // 업무전 컬럼에 1개
  assert.equal(result.data?.columns[1].items.length, 1); // 설계중 컬럼에 1개
});

// Todo 상태 변경 테스트
test('updateTodoStatus changes todo status', async () => {
  const now = new Date();
  const todo = {
    id: 'todo-1',
    userId: 'user-1',
    projectId: 'proj-1',
    title: '테스트 Todo',
    status: TODO_STATUS.PREWORK,
    projectCode: 'TEST',
    projectName: '테스트 프로젝트',
    createdAt: now.toISOString(), // 현재 시간으로 설정
    updatedAt: now.toISOString()
  };

  const repository = new InMemoryTodoRepository([todo]);
  // 현재 시간을 사용하여 편집 잠금을 피함
  const service = createTodoService({ repository });

  const result = await service.updateTodoStatus(MEMBER_USER, 'todo-1', TODO_STATUS.DESIGN);
  
  assert.equal(result.ok, true);
  assert.equal(result.data?.status, TODO_STATUS.DESIGN);
});

// 삭제 권한 테스트 - member는 삭제 불가
test('deleteTodo blocks member deletion', async () => {
  const todo = {
    id: 'todo-1',
    userId: 'user-1',
    projectId: 'proj-1',
    title: '테스트 Todo',
    status: TODO_STATUS.PREWORK,
    projectCode: 'TEST',
    projectName: '테스트 프로젝트',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const repository = new InMemoryTodoRepository([todo]);
  const service = createTodoService({ repository });

  const result = await service.deleteTodo(MEMBER_USER, 'todo-1');
  
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /삭제 권한/);
});

// 관리자는 삭제 가능
test('deleteTodo allows admin deletion', async () => {
  const todo = {
    id: 'todo-1',
    userId: 'user-1',
    projectId: 'proj-1',
    title: '테스트 Todo',
    status: TODO_STATUS.PREWORK,
    projectCode: 'TEST',
    projectName: '테스트 프로젝트',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const repository = new InMemoryTodoRepository([todo]);
  const service = createTodoService({ repository });

  const result = await service.deleteTodo(ADMIN_USER, 'todo-1');
  
  assert.equal(result.ok, true);
  assert.equal(result.data, true);
  assert.equal(repository.todos.length, 0);
});
