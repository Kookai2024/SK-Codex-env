/**
 * todos/api/todoService.ts
 *
 * Todo 칸반과 편집 잠금 규칙을 처리하는 서비스 레이어 구현체이다.
 * 저장소를 호출해 데이터를 조회/수정하고, RBAC 및 잠금 로직을 검증한다.
 */

import { DateTime } from 'luxon';
import {
  TODO_ALLOWED_ROLES,
  type TodoBoard,
  type TodoServiceDependencies,
  type TodoServiceResult,
  type TodoUpdateInput,
  type TodoUserContext
} from '../types';
import { buildTodoApiResponse, computeNextLockTimestamp, groupTodosIntoBoard, TODO_MESSAGES } from '../utils';

// 서비스에서 공통으로 사용할 메시지 모음이다. 테스트에서도 재사용할 수 있도록 export 한다.
export const TODO_SERVICE_MESSAGES = {
  NOT_ASSIGNED: '본인에게 할당된 업무만 수정할 수 있습니다.',
  NO_FIELDS: '수정할 필드를 한 개 이상 선택하세요.'
} as const;

/**
 * 편집 잠금이 현재 시각 기준으로 활성화되었는지 계산한다.
 * @param lockedAt 레코드에 저장된 잠금 시각
 * @param now 서버 현재 시각
 */
function isLockedForMembers(lockedAt: string | null, now: Date): boolean {
  if (!lockedAt) {
    return false;
  }

  const lockDate = DateTime.fromISO(lockedAt);
  if (!lockDate.isValid) {
    return false;
  }

  const nowUtc = DateTime.fromJSDate(now).toUTC();
  return nowUtc >= lockDate.toUTC();
}

/**
 * 업데이트 요청에서 undefined 필드를 제거해 저장소에 전달한다.
 * @param input 사용자 입력 값
 */
function sanitizeUpdateInput(input: TodoUpdateInput): TodoUpdateInput {
  const sanitized: TodoUpdateInput = {};
  for (const [key, value] of Object.entries(input) as [keyof TodoUpdateInput, string | null | undefined][]) {
    if (value !== undefined) {
      sanitized[key] = value ?? null;
    }
  }
  return sanitized;
}

/**
 * Todo 서비스 팩토리 함수.
 * @param deps 저장소 및 시간 공급자 의존성
 */
export function createTodoService(deps: TodoServiceDependencies) {
  const timeProvider = deps.timeProvider ?? (() => new Date());

  return {
    /**
     * 칸반 보드 데이터를 조회한다.
     * @param user 사용자 컨텍스트
     * @param filters 선택적 필터
     */
    async getBoard(
      user: TodoUserContext,
      filters = {}
    ): Promise<TodoServiceResult<{ board: TodoBoard }>> {
      const todos = await deps.repository.listBoard(filters);
      const board = groupTodosIntoBoard(todos);
      const body = buildTodoApiResponse({ board }, null, timeProvider);
      return { status: 200, body };
    },

    /**
     * Todo 레코드를 수정한다.
     * @param user 사용자 컨텍스트
     * @param todoId 수정할 레코드 ID
     * @param input 수정 요청 값
     */
    async updateTodo(
      user: TodoUserContext,
      todoId: string,
      input: TodoUpdateInput
    ): Promise<TodoServiceResult<{ todo: Record<string, unknown> }>> {
      const now = timeProvider();

      // 최소 한 개 이상의 필드가 존재해야 한다.
      if (Object.keys(input).length === 0) {
        const body = buildTodoApiResponse(null, TODO_SERVICE_MESSAGES.NO_FIELDS, () => now);
        return { status: 400, body };
      }

      const existing = await deps.repository.findById(todoId);
      if (!existing) {
        const body = buildTodoApiResponse(null, TODO_MESSAGES.NOT_FOUND, () => now);
        return { status: 404, body };
      }

      // 역할 기반 접근 제어 검증을 수행한다.
      if (user.role === TODO_ALLOWED_ROLES.GUEST) {
        const body = buildTodoApiResponse(null, TODO_MESSAGES.FORBIDDEN, () => now);
        return { status: 403, body };
      }

      if (user.role === TODO_ALLOWED_ROLES.MEMBER) {
        if (existing.assigneeId !== user.id) {
          const body = buildTodoApiResponse(null, TODO_SERVICE_MESSAGES.NOT_ASSIGNED, () => now);
          return { status: 403, body };
        }
        if (isLockedForMembers(existing.lockedAt, now)) {
          const body = buildTodoApiResponse(null, TODO_MESSAGES.LOCKED, () => now);
          return { status: 403, body };
        }
      }

      // 입력값에서 undefined를 제거하고 null 허용 필드는 null로 유지한다.
      const sanitizedInput = sanitizeUpdateInput(input);
      const lockedAt = computeNextLockTimestamp(now);
      const updated = await deps.repository.update(todoId, { ...sanitizedInput, lockedAt });

      const body = buildTodoApiResponse({ todo: updated }, null, () => now);
      return { status: 200, body };
    }
  };
}
