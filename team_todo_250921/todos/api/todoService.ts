/**
 * todos/api/todoService.ts
 *
 * Todo 비즈니스 로직을 담당하는 서비스 레이어이다.
 * 편집 잠금 규칙, 권한 검증, 칸반 보드 생성 등을 처리한다.
 */

import {
  type TodoApiResponse,
  type TodoCreatePayload,
  type TodoItem,
  type TodoRepository,
  type TodoServiceDependencies,
  type TodoUpdatePayload,
  type TodoUserContext,
  type TodoFilters,
  type KanbanBoard,
  type EditLockStatus
} from '../types';
import {
  validateTodoAccess,
  validateEditLock,
  getEditLockStatus,
  createKanbanBoard,
  filterTodos,
  sortTodosByPriority,
  buildApiResponse
} from '../utils';

/**
 * REST API 응답을 생성하는 헬퍼 함수
 * @param data 응답 데이터
 * @param error 오류 메시지
 * @param timeProvider 서버 타임스탬프 생성을 위한 함수
 */
function buildApiResponse<T>(
  data: T | null,
  error: string | null,
  timeProvider: () => Date
): TodoApiResponse<T> {
  const serverNow = timeProvider();
  return {
    ok: !error,
    data,
    error,
    timestamp: serverNow.toISOString()
  };
}

/**
 * TodoService 인스턴스를 생성한다.
 * @param deps 저장소 및 의존성
 */
export function createTodoService(deps: TodoServiceDependencies) {
  const timeProvider = deps.timeProvider ?? (() => new Date());

  return {
    /**
     * 사용자의 Todo 목록을 조회한다.
     * @param user 사용자 컨텍스트
     * @param filters 필터링 옵션
     */
    async listTodos(
      user: TodoUserContext,
      filters?: TodoFilters
    ): Promise<TodoApiResponse<TodoItem[]>> {
      const accessError = validateTodoAccess(user);
      if (accessError) {
        return buildApiResponse(null, accessError, timeProvider);
      }

      try {
        let todos = await deps.repository.listTodos(user.id, filters);
        
        // admin이 아닌 경우 자신의 Todo만 조회
        if (user.role !== 'admin') {
          todos = todos.filter(todo => todo.userId === user.id);
        }

        // 우선순위 순으로 정렬
        todos = sortTodosByPriority(todos);

        return buildApiResponse(todos, null, timeProvider);
      } catch (error) {
        return buildApiResponse(null, 'Todo 목록을 불러오지 못했습니다.', timeProvider);
      }
    },

    /**
     * 특정 Todo를 조회한다.
     * @param user 사용자 컨텍스트
     * @param todoId Todo ID
     */
    async getTodo(
      user: TodoUserContext,
      todoId: string
    ): Promise<TodoApiResponse<TodoItem & { editLock: EditLockStatus }>> {
      const accessError = validateTodoAccess(user);
      if (accessError) {
        return buildApiResponse(null, accessError, timeProvider);
      }

      try {
        const todo = await deps.repository.getTodo(todoId);
        if (!todo) {
          return buildApiResponse(null, 'Todo를 찾을 수 없습니다.', timeProvider);
        }

        // 권한 검증: admin이 아니면 자신의 Todo만 조회 가능
        if (user.role !== 'admin' && todo.userId !== user.id) {
          return buildApiResponse(null, '접근 권한이 없습니다.', timeProvider);
        }

        // 편집 잠금 상태 계산
        const editLock = getEditLockStatus(todo, user, timeProvider());

        return buildApiResponse({ ...todo, editLock }, null, timeProvider);
      } catch (error) {
        return buildApiResponse(null, 'Todo를 불러오지 못했습니다.', timeProvider);
      }
    },

    /**
     * 새로운 Todo를 생성한다.
     * @param user 사용자 컨텍스트
     * @param payload 생성할 Todo 데이터
     */
    async createTodo(
      user: TodoUserContext,
      payload: TodoCreatePayload
    ): Promise<TodoApiResponse<TodoItem>> {
      const accessError = validateTodoAccess(user);
      if (accessError) {
        return buildApiResponse(null, accessError, timeProvider);
      }

      try {
        // 사용자 ID를 자동으로 설정
        const createPayload = {
          ...payload,
          userId: user.id
        };

        const todo = await deps.repository.createTodo(createPayload);
        return buildApiResponse(todo, null, timeProvider);
      } catch (error) {
        return buildApiResponse(null, 'Todo를 생성하지 못했습니다.', timeProvider);
      }
    },

    /**
     * Todo를 수정한다.
     * @param user 사용자 컨텍스트
     * @param todoId Todo ID
     * @param payload 수정할 데이터
     */
    async updateTodo(
      user: TodoUserContext,
      todoId: string,
      payload: TodoUpdatePayload
    ): Promise<TodoApiResponse<TodoItem>> {
      const accessError = validateTodoAccess(user);
      if (accessError) {
        return buildApiResponse(null, accessError, timeProvider);
      }

      try {
        // 기존 Todo 조회
        const existingTodo = await deps.repository.getTodo(todoId);
        if (!existingTodo) {
          return buildApiResponse(null, 'Todo를 찾을 수 없습니다.', timeProvider);
        }

        // 권한 검증
        if (user.role !== 'admin' && existingTodo.userId !== user.id) {
          return buildApiResponse(null, '수정 권한이 없습니다.', timeProvider);
        }

        // 편집 잠금 검증
        const editValidation = validateEditLock(existingTodo, user, timeProvider());
        if (!editValidation.canEdit) {
          return buildApiResponse(null, editValidation.reason || '편집할 수 없습니다.', timeProvider);
        }

        // Todo 수정
        const updatedTodo = await deps.repository.updateTodo(todoId, payload);
        return buildApiResponse(updatedTodo, null, timeProvider);
      } catch (error) {
        return buildApiResponse(null, 'Todo를 수정하지 못했습니다.', timeProvider);
      }
    },

    /**
     * Todo를 삭제한다.
     * @param user 사용자 컨텍스트
     * @param todoId Todo ID
     */
    async deleteTodo(
      user: TodoUserContext,
      todoId: string
    ): Promise<TodoApiResponse<boolean>> {
      const accessError = validateTodoAccess(user);
      if (accessError) {
        return buildApiResponse(null, accessError, timeProvider);
      }

      try {
        // 기존 Todo 조회
        const existingTodo = await deps.repository.getTodo(todoId);
        if (!existingTodo) {
          return buildApiResponse(null, 'Todo를 찾을 수 없습니다.', timeProvider);
        }

        // 권한 검증: admin만 삭제 가능
        if (user.role !== 'admin') {
          return buildApiResponse(null, '삭제 권한이 없습니다.', timeProvider);
        }

        // Todo 삭제
        const deleted = await deps.repository.deleteTodo(todoId);
        return buildApiResponse(deleted, null, timeProvider);
      } catch (error) {
        return buildApiResponse(null, 'Todo를 삭제하지 못했습니다.', timeProvider);
      }
    },

    /**
     * Todo 상태를 변경한다 (드래그 앤 드롭).
     * @param user 사용자 컨텍스트
     * @param todoId Todo ID
     * @param newStatus 새로운 상태
     */
    async updateTodoStatus(
      user: TodoUserContext,
      todoId: string,
      newStatus: string
    ): Promise<TodoApiResponse<TodoItem>> {
      const accessError = validateTodoAccess(user);
      if (accessError) {
        return buildApiResponse(null, accessError, timeProvider);
      }

      try {
        // 기존 Todo 조회
        const existingTodo = await deps.repository.getTodo(todoId);
        if (!existingTodo) {
          return buildApiResponse(null, 'Todo를 찾을 수 없습니다.', timeProvider);
        }

        // 권한 검증
        if (user.role !== 'admin' && existingTodo.userId !== user.id) {
          return buildApiResponse(null, '수정 권한이 없습니다.', timeProvider);
        }

        // 편집 잠금 검증
        const editValidation = validateEditLock(existingTodo, user, timeProvider());
        if (!editValidation.canEdit) {
          return buildApiResponse(null, editValidation.reason || '상태를 변경할 수 없습니다.', timeProvider);
        }

        // 상태 변경
        const updatedTodo = await deps.repository.updateTodoStatus(todoId, newStatus as any);
        return buildApiResponse(updatedTodo, null, timeProvider);
      } catch (error) {
        return buildApiResponse(null, 'Todo 상태를 변경하지 못했습니다.', timeProvider);
      }
    },

    /**
     * 칸반 보드를 생성한다.
     * @param user 사용자 컨텍스트
     * @param filters 필터링 옵션
     */
    async getKanbanBoard(
      user: TodoUserContext,
      filters?: TodoFilters
    ): Promise<TodoApiResponse<KanbanBoard>> {
      const accessError = validateTodoAccess(user);
      if (accessError) {
        return buildApiResponse(null, accessError, timeProvider);
      }

      try {
        let todos = await deps.repository.listTodos(user.id, filters);
        
        // admin이 아닌 경우 자신의 Todo만 조회
        if (user.role !== 'admin') {
          todos = todos.filter(todo => todo.userId === user.id);
        }

        // 칸반 보드 생성
        const kanbanBoard = createKanbanBoard(todos, user);
        return buildApiResponse(kanbanBoard, null, timeProvider);
      } catch (error) {
        return buildApiResponse(null, '칸반 보드를 불러오지 못했습니다.', timeProvider);
      }
    }
  };
}
