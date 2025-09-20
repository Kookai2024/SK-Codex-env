/**
 * todos/types.ts
 *
 * Todo(할 일) 기능에서 사용하는 상수와 타입을 정의한다.
 * 모든 필드와 상수는 주석으로 설명해 유지보수성을 높인다.
 */

// Todo 상태 값을 하드코딩하지 않도록 상수로 선언한다.
export const TODO_STATUSES = {
  PREWORK: 'prework',
  DESIGN: 'design',
  HOLD: 'hold',
  PO_PLACED: 'po_placed',
  INCOMING: 'incoming'
} as const;

// 상태 값을 한글 라벨로 매핑해 UI에서 재사용한다.
export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  [TODO_STATUSES.PREWORK]: '업무 전',
  [TODO_STATUSES.DESIGN]: '설계 중',
  [TODO_STATUSES.HOLD]: '보류 중',
  [TODO_STATUSES.PO_PLACED]: '발주 완료',
  [TODO_STATUSES.INCOMING]: '입고 예정'
};

// 상태를 표시할 기본 순서를 상수 배열로 유지한다.
export const TODO_STATUS_ORDER: TodoStatus[] = [
  TODO_STATUSES.PREWORK,
  TODO_STATUSES.DESIGN,
  TODO_STATUSES.HOLD,
  TODO_STATUSES.PO_PLACED,
  TODO_STATUSES.INCOMING
];

// 역할 기반 접근 제어를 위해 역할 상수를 정의한다.
export const TODO_ALLOWED_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest'
} as const;

// Todo 기능에서 사용할 표준 시간대를 상수로 유지한다.
export const TODO_TIMEZONE = 'Asia/Seoul' as const;

// 상태 문자열 유니언 타입을 생성한다.
export type TodoStatus = (typeof TODO_STATUSES)[keyof typeof TODO_STATUSES];

// 역할 문자열 유니언 타입을 생성한다.
export type TodoRole = (typeof TODO_ALLOWED_ROLES)[keyof typeof TODO_ALLOWED_ROLES];

// API 응답 기본 구조를 정의한다.
export interface TodoApiResponse<T> {
  /** 요청 성공 여부 */
  ok: boolean;
  /** 실제 응답 데이터(없으면 null) */
  data: T | null;
  /** 오류 메시지(없으면 null) */
  error: string | null;
  /** 서버 타임스탬프 ISO 문자열 */
  timestamp: string;
}

// 서비스 계층에서 통일된 반환 구조를 유지하기 위한 타입이다.
export interface TodoServiceResult<T> {
  /** HTTP 상태 코드 */
  status: number;
  /** 응답 본문 */
  body: TodoApiResponse<T>;
}

// 클라이언트로부터 전달받는 사용자 컨텍스트를 정의한다.
export interface TodoUserContext {
  /** 사용자 식별자 */
  id: string;
  /** 사용자 이름(선택 사항) */
  name?: string;
  /** 사용자 역할 */
  role: TodoRole;
}

// Todo 레코드 한 건을 표현하는 타입이다.
export interface TodoItem {
  /** PocketBase 레코드 식별자 */
  id: string;
  /** 할 일 제목 */
  title: string;
  /** 상세 설명 */
  description: string | null;
  /** 프로젝트 식별자 */
  projectId: string;
  /** 프로젝트 코드 */
  projectCode: string;
  /** 프로젝트 이름 */
  projectName: string;
  /** 할 일 담당자 사용자 ID */
  assigneeId: string;
  /** 할 일 담당자 이름 */
  assigneeName: string;
  /** 현재 상태 */
  status: TodoStatus;
  /** 이슈 요약 */
  issue: string | null;
  /** 해결 방안 */
  solution: string | null;
  /** 결정 사항 */
  decision: string | null;
  /** 참고 메모 */
  notes: string | null;
  /** 마감일(YYYY-MM-DD 형식) */
  dueDate: string | null;
  /** 다음 편집 잠금 시각 ISO 문자열 */
  lockedAt: string | null;
  /** 레코드가 마지막으로 수정된 서버 타임스탬프 */
  updatedAt: string;
  /** 레코드가 생성된 서버 타임스탬프 */
  createdAt: string;
}

// 칸반 보드에 표시할 아이템 타입이다.
export interface TodoBoardItem {
  /** 레코드 식별자 */
  id: string;
  /** 제목 */
  title: string;
  /** 담당자 이름 */
  assigneeName: string;
  /** 마감일 */
  dueDate: string | null;
  /** 잠금 시각 */
  lockedAt: string | null;
}

// 칸반 보드에서 하나의 컬럼을 표현하는 타입이다.
export interface TodoBoardColumn {
  /** 컬럼 상태 값 */
  status: TodoStatus;
  /** 사용자에게 보여줄 라벨 */
  title: string;
  /** 컬럼에 포함된 아이템 목록 */
  items: TodoBoardItem[];
}

// 칸반 보드 전체를 표현하는 타입이다.
export type TodoBoard = TodoBoardColumn[];

// 칸반 조회 시 사용할 선택적 필터를 정의한다.
export interface TodoBoardFilters {
  /** 특정 프로젝트 ID로 필터링할 때 사용한다. */
  projectId?: string | null;
}

// Todo 업데이트 시 허용되는 필드를 정의한다.
export interface TodoUpdateInput {
  /** 제목 */
  title?: string;
  /** 상세 설명 */
  description?: string | null;
  /** 상태 */
  status?: TodoStatus;
  /** 이슈 */
  issue?: string | null;
  /** 해결 방안 */
  solution?: string | null;
  /** 결정 사항 */
  decision?: string | null;
  /** 참고 메모 */
  notes?: string | null;
  /** 마감일 */
  dueDate?: string | null;
}

// 저장소 계층에서 Todo 데이터를 조회/수정할 때 사용할 인터페이스이다.
export interface TodoRepository {
  /** 칸반 보드 구성을 위한 레코드 목록을 반환한다. */
  listBoard(filters?: TodoBoardFilters): Promise<TodoItem[]>;
  /** 단일 레코드를 조회한다. */
  findById(id: string): Promise<TodoItem | null>;
  /** 레코드를 업데이트하고 최신 상태를 반환한다. */
  update(
    id: string,
    patch: TodoUpdateInput & { lockedAt?: string | null }
  ): Promise<TodoItem>;
}

// 서비스 계층에서 필요한 의존성 모음 타입이다.
export interface TodoServiceDependencies {
  /** Todo 저장소 구현체 */
  repository: TodoRepository;
  /** 서버 타임스탬프 생성을 위한 함수(테스트에서 주입) */
  timeProvider?: () => Date;
}

// 라우터 계층에서 필요한 의존성 모음 타입이다.
export interface TodoRouterDependencies extends TodoServiceDependencies {}
