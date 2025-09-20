/**
 * todos/types.ts
 *
 * Todo 기능에서 사용하는 공통 타입과 상수를 정의한다.
 * 프로젝트 코드 4자리, 상태 필드, 이슈/결정/노트 등을 포함한다.
 */

// Todo 상태값 상수를 정의한다.
export const TODO_STATUS = {
  PREWORK: '업무전',
  DESIGN: '설계중', 
  HOLD: '보류중',
  PO_PLACED: '발주완료',
  INCOMING: '입고예정'
} as const;

// 편집 잠금 시간 상수 (다음날 오전 9시)
export const EDIT_LOCK_TIME = {
  HOUR: 9,
  MINUTE: 0,
  SECOND: 0,
  MILLISECOND: 0
} as const;

// 프로젝트 코드 패턴 (4자리 대문자)
export const PROJECT_CODE_PATTERN = /^[A-Z0-9]{4}$/;

// RBAC 역할별 Todo 접근 권한
export const TODO_ALLOWED_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member'
} as const;

// Todo 상태 타입
export type TodoStatus = (typeof TODO_STATUS)[keyof typeof TODO_STATUS];

// 사용자 역할 타입
export type TodoRole = typeof TODO_ALLOWED_ROLES[keyof typeof TODO_ALLOWED_ROLES] | 'guest';

// REST API 응답 구조
export interface TodoApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

// Todo 항목을 표현하는 타입
export interface TodoItem {
  id: string;
  userId: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  title: string;
  description?: string | null;
  issue?: string | null;
  solution?: string | null;
  decision?: string | null;
  status: TodoStatus;
  notes?: string | null;
  dueDate?: string | null;
  lockedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 새로운 Todo 생성 시 사용하는 페이로드
export interface TodoCreatePayload {
  userId: string;
  projectId: string;
  title: string;
  description?: string | null;
  issue?: string | null;
  solution?: string | null;
  decision?: string | null;
  status: TodoStatus;
  notes?: string | null;
  dueDate?: string | null;
}

// Todo 수정 시 사용하는 페이로드
export interface TodoUpdatePayload {
  title?: string;
  description?: string | null;
  issue?: string | null;
  solution?: string | null;
  decision?: string | null;
  status?: TodoStatus;
  notes?: string | null;
  dueDate?: string | null;
}

// 사용자 컨텍스트 정보
export interface TodoUserContext {
  id: string;
  name?: string;
  role: TodoRole;
}

// 칸반 보드 상태 정보
export interface KanbanBoard {
  columns: KanbanColumn[];
  stats: KanbanStats;
}

// 칸반 컬럼 정보
export interface KanbanColumn {
  status: TodoStatus;
  label: string;
  items: TodoItem[];
  color: string;
}

// 칸반 통계 정보
export interface KanbanStats {
  total: number;
  byStatus: Record<TodoStatus, number>;
  overdue: number;
  dueToday: number;
}

// 편집 잠금 상태 정보
export interface EditLockStatus {
  isLocked: boolean;
  lockedAt?: string;
  canEdit: boolean;
  reason?: string;
}

// Todo 검색 및 필터링 옵션
export interface TodoFilters {
  status?: TodoStatus[];
  projectIds?: string[];
  userIds?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  searchText?: string;
}

// Todo 저장소 인터페이스
export interface TodoRepository {
  /**
   * 사용자별 Todo 목록을 조회한다.
   */
  listTodos(userId: string, filters?: TodoFilters): Promise<TodoItem[]>;

  /**
   * 특정 Todo를 조회한다.
   */
  getTodo(id: string): Promise<TodoItem | null>;

  /**
   * 새로운 Todo를 생성한다.
   */
  createTodo(payload: TodoCreatePayload): Promise<TodoItem>;

  /**
   * Todo를 수정한다.
   */
  updateTodo(id: string, payload: TodoUpdatePayload): Promise<TodoItem>;

  /**
   * Todo를 삭제한다.
   */
  deleteTodo(id: string): Promise<boolean>;

  /**
   * Todo 상태를 변경한다 (드래그 앤 드롭).
   */
  updateTodoStatus(id: string, newStatus: TodoStatus): Promise<TodoItem>;
}

// Todo 서비스 의존성
export interface TodoServiceDependencies {
  repository: TodoRepository;
  timeProvider?: () => Date;
}

// 편집 잠금 검증 결과
export interface EditLockValidation {
  canEdit: boolean;
  reason?: string;
  lockedAt?: string;
}