/**
 * todos/utils.ts
 *
 * Todo 기능에서 재사용할 유틸리티 함수들을 정의한다.
 * 편집 잠금 검증, 칸반 보드 생성, 상태 관리 등을 포함한다.
 */

import { DateTime } from 'luxon';
import {
  EDIT_LOCK_TIME,
  PROJECT_CODE_PATTERN,
  TODO_STATUS,
  TODO_ALLOWED_ROLES,
  type EditLockStatus,
  type EditLockValidation,
  type KanbanBoard,
  type KanbanColumn,
  type KanbanStats,
  type TodoFilters,
  type TodoItem,
  type TodoRole,
  type TodoStatus,
  type TodoUserContext
} from './types';

// Asia/Seoul 시간대 상수
const SEOUL_TIMEZONE = 'Asia/Seoul';

// 칸반 컬럼 설정
const KANBAN_COLUMNS = [
  { status: TODO_STATUS.PREWORK, label: '업무전', color: 'bg-gray-100' },
  { status: TODO_STATUS.DESIGN, label: '설계중', color: 'bg-blue-100' },
  { status: TODO_STATUS.HOLD, label: '보류중', color: 'bg-yellow-100' },
  { status: TODO_STATUS.PO_PLACED, label: '발주완료', color: 'bg-green-100' },
  { status: TODO_STATUS.INCOMING, label: '입고예정', color: 'bg-purple-100' }
] as const;

/**
 * 프로젝트 코드가 유효한 4자리 형식인지 검증한다.
 * @param code 검증할 프로젝트 코드
 */
export function validateProjectCode(code: string): boolean {
  return PROJECT_CODE_PATTERN.test(code);
}

/**
 * 사용자 역할이 Todo 기능을 사용할 수 있는지 검증한다.
 * @param user 사용자 컨텍스트
 */
export function validateTodoAccess(user: TodoUserContext): string | null {
  const allowedRoles = [TODO_ALLOWED_ROLES.ADMIN, TODO_ALLOWED_ROLES.MEMBER];
  if (!allowedRoles.includes(user.role as any)) {
    return '해당 기능을 사용할 권한이 없습니다.';
  }
  return null;
}

/**
 * Todo 항목이 편집 잠금 상태인지 검증한다.
 * 규칙: 다음날 오전 9시 이후에는 admin만 수정 가능
 * @param todoItem Todo 항목
 * @param user 사용자 컨텍스트
 * @param referenceTime 기준 시간 (기본값: 현재 시간)
 */
export function validateEditLock(
  todoItem: TodoItem,
  user: TodoUserContext,
  referenceTime: Date = new Date()
): EditLockValidation {
  // admin은 항상 편집 가능
  if (user.role === TODO_ALLOWED_ROLES.ADMIN) {
    return { canEdit: true };
  }

  // member는 편집 잠금 규칙 적용
  // Todo 생성일을 기준으로 다음날 오전 9시를 계산
  const todoCreatedDate = DateTime.fromISO(todoItem.createdAt).setZone(SEOUL_TIMEZONE);
  const nextDay9AM = todoCreatedDate.plus({ days: 1 }).set({
    hour: EDIT_LOCK_TIME.HOUR,
    minute: EDIT_LOCK_TIME.MINUTE,
    second: EDIT_LOCK_TIME.SECOND,
    millisecond: EDIT_LOCK_TIME.MILLISECOND
  });

  const seoulNow = DateTime.fromJSDate(referenceTime, { zone: SEOUL_TIMEZONE });

  // 현재 시간이 Todo 생성 다음날 오전 9시 이후인 경우
  if (seoulNow >= nextDay9AM) {
    return {
      canEdit: false,
      reason: '다음날 오전 9시 이후에는 관리자만 수정할 수 있습니다.',
      lockedAt: nextDay9AM.toISO()
    };
  }

  // 수정 가능
  return { canEdit: true };
}

/**
 * Todo 항목의 편집 잠금 상태 정보를 생성한다.
 * @param todoItem Todo 항목
 * @param user 사용자 컨텍스트
 * @param referenceTime 기준 시간
 */
export function getEditLockStatus(
  todoItem: TodoItem,
  user: TodoUserContext,
  referenceTime: Date = new Date()
): EditLockStatus {
  const validation = validateEditLock(todoItem, user, referenceTime);
  
  return {
    isLocked: !validation.canEdit,
    lockedAt: validation.lockedAt,
    canEdit: validation.canEdit,
    reason: validation.reason
  };
}

/**
 * Todo 목록을 칸반 보드 형태로 변환한다.
 * @param todos Todo 항목 목록
 * @param user 사용자 컨텍스트 (권한 확인용)
 */
export function createKanbanBoard(todos: TodoItem[], user: TodoUserContext): KanbanBoard {
  // 권한 검증
  const accessError = validateTodoAccess(user);
  if (accessError) {
    throw new Error(accessError);
  }

  // 상태별로 Todo 분류
  const todosByStatus = todos.reduce((acc, todo) => {
    if (!acc[todo.status]) {
      acc[todo.status] = [];
    }
    acc[todo.status].push(todo);
    return acc;
  }, {} as Record<TodoStatus, TodoItem[]>);

  // 칸반 컬럼 생성
  const columns: KanbanColumn[] = KANBAN_COLUMNS.map(columnConfig => ({
    status: columnConfig.status,
    label: columnConfig.label,
    items: todosByStatus[columnConfig.status] || [],
    color: columnConfig.color
  }));

  // 통계 계산
  const stats = calculateKanbanStats(todos);

  return {
    columns,
    stats
  };
}

/**
 * 칸반 보드 통계를 계산한다.
 * @param todos Todo 항목 목록
 */
export function calculateKanbanStats(todos: TodoItem[]): KanbanStats {
  const now = DateTime.now().setZone(SEOUL_TIMEZONE);
  const today = now.startOf('day');
  
  const stats: KanbanStats = {
    total: todos.length,
    byStatus: {
      [TODO_STATUS.PREWORK]: 0,
      [TODO_STATUS.DESIGN]: 0,
      [TODO_STATUS.HOLD]: 0,
      [TODO_STATUS.PO_PLACED]: 0,
      [TODO_STATUS.INCOMING]: 0
    },
    overdue: 0,
    dueToday: 0
  };

  todos.forEach(todo => {
    // 상태별 카운트
    stats.byStatus[todo.status]++;

    // 마감일 관련 통계
    if (todo.dueDate) {
      const dueDate = DateTime.fromISO(todo.dueDate).setZone(SEOUL_TIMEZONE);
      if (dueDate < today) {
        stats.overdue++;
      } else if (dueDate.hasSame(today, 'day')) {
        stats.dueToday++;
      }
    }
  });

  return stats;
}

/**
 * Todo 검색 및 필터링을 적용한다.
 * @param todos 원본 Todo 목록
 * @param filters 필터링 옵션
 */
export function filterTodos(todos: TodoItem[], filters: TodoFilters): TodoItem[] {
  let filteredTodos = [...todos];

  // 상태 필터
  if (filters.status && filters.status.length > 0) {
    filteredTodos = filteredTodos.filter(todo => filters.status!.includes(todo.status));
  }

  // 프로젝트 필터
  if (filters.projectIds && filters.projectIds.length > 0) {
    filteredTodos = filteredTodos.filter(todo => filters.projectIds!.includes(todo.projectId));
  }

  // 사용자 필터
  if (filters.userIds && filters.userIds.length > 0) {
    filteredTodos = filteredTodos.filter(todo => filters.userIds!.includes(todo.userId));
  }

  // 마감일 범위 필터
  if (filters.dueDateFrom) {
    const fromDate = DateTime.fromISO(filters.dueDateFrom).setZone(SEOUL_TIMEZONE);
    filteredTodos = filteredTodos.filter(todo => {
      if (!todo.dueDate) return false;
      const todoDueDate = DateTime.fromISO(todo.dueDate).setZone(SEOUL_TIMEZONE);
      return todoDueDate >= fromDate;
    });
  }

  if (filters.dueDateTo) {
    const toDate = DateTime.fromISO(filters.dueDateTo).setZone(SEOUL_TIMEZONE);
    filteredTodos = filteredTodos.filter(todo => {
      if (!todo.dueDate) return false;
      const todoDueDate = DateTime.fromISO(todo.dueDate).setZone(SEOUL_TIMEZONE);
      return todoDueDate <= toDate;
    });
  }

  // 텍스트 검색 필터
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filteredTodos = filteredTodos.filter(todo => 
      todo.title.toLowerCase().includes(searchLower) ||
      todo.description?.toLowerCase().includes(searchLower) ||
      todo.projectCode.toLowerCase().includes(searchLower) ||
      todo.projectName.toLowerCase().includes(searchLower)
    );
  }

  return filteredTodos;
}

/**
 * Todo 항목의 마감일 상태를 계산한다.
 * @param dueDate 마감일 (ISO 문자열)
 * @param referenceTime 기준 시간
 */
export function getDueDateStatus(dueDate: string | null, referenceTime: Date = new Date()): {
  isOverdue: boolean;
  isDueToday: boolean;
  daysUntilDue: number;
} {
  if (!dueDate) {
    return { isOverdue: false, isDueToday: false, daysUntilDue: 0 };
  }

  const now = DateTime.fromJSDate(referenceTime).setZone(SEOUL_TIMEZONE);
  const due = DateTime.fromISO(dueDate).setZone(SEOUL_TIMEZONE);
  const daysUntilDue = Math.ceil(due.diff(now, 'days').days);

  return {
    isOverdue: daysUntilDue < 0,
    isDueToday: daysUntilDue === 0,
    daysUntilDue
  };
}

/**
 * Todo 항목의 우선순위를 계산한다.
 * 마감일이 가까울수록, 상태가 진행 중일수록 높은 우선순위
 * @param todo Todo 항목
 */
export function calculateTodoPriority(todo: TodoItem): number {
  const statusPriority = {
    [TODO_STATUS.INCOMING]: 5,
    [TODO_STATUS.PO_PLACED]: 4,
    [TODO_STATUS.DESIGN]: 3,
    [TODO_STATUS.HOLD]: 2,
    [TODO_STATUS.PREWORK]: 1
  };

  let priority = statusPriority[todo.status];

  // 마감일이 있는 경우 우선순위 조정
  if (todo.dueDate) {
    const dueStatus = getDueDateStatus(todo.dueDate);
    if (dueStatus.isOverdue) {
      priority += 10; // 지연된 항목은 최고 우선순위
    } else if (dueStatus.isDueToday) {
      priority += 5; // 오늘 마감인 항목은 높은 우선순위
    } else if (dueStatus.daysUntilDue <= 3) {
      priority += 2; // 3일 이내 마감인 항목은 중간 우선순위
    }
  }

  return priority;
}

/**
 * Todo 목록을 우선순위 순으로 정렬한다.
 * @param todos Todo 목록
 */
export function sortTodosByPriority(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    const priorityA = calculateTodoPriority(a);
    const priorityB = calculateTodoPriority(b);
    return priorityB - priorityA; // 높은 우선순위가 먼저
  });
}