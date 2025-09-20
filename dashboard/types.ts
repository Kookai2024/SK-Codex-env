/**
 * dashboard/types.ts
 *
 * 대시보드 기능에서 사용하는 모든 상수와 타입을 정의한다.
 * 역할 기반 권한과 위젯 구조를 명확히 설명해 다른 계층에서 재사용하도록 돕는다.
 */

// 대시보드 접근을 허용하는 사용자 역할 상수이다.
export const DASHBOARD_ALLOWED_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest'
} as const;

// 대시보드에서 제공하는 위젯 키 상수이다.
export const DASHBOARD_WIDGET_KEYS = {
  TEAM_OVERVIEW: 'team_overview',
  PERSONAL_OVERVIEW: 'personal_overview',
  ANNOUNCEMENTS: 'announcements'
} as const;

// 대시보드 알림 메시지의 심각도 레벨 상수이다.
export const DASHBOARD_ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
} as const;

// 역할 문자열 유니언 타입이다.
export type DashboardRole =
  (typeof DASHBOARD_ALLOWED_ROLES)[keyof typeof DASHBOARD_ALLOWED_ROLES];

// 위젯 키 문자열 유니언 타입이다.
export type DashboardWidgetKey =
  (typeof DASHBOARD_WIDGET_KEYS)[keyof typeof DASHBOARD_WIDGET_KEYS];

// 알림 심각도 문자열 유니언 타입이다.
export type DashboardAlertLevel =
  (typeof DASHBOARD_ALERT_LEVELS)[keyof typeof DASHBOARD_ALERT_LEVELS];

// REST API 응답 공통 구조를 정의한다.
export interface DashboardApiResponse<T> {
  /** 성공 여부 */
  ok: boolean;
  /** 실제 데이터(없다면 null) */
  data: T | null;
  /** 오류 메시지(없다면 null) */
  error: string | null;
  /** 서버 타임스탬프 ISO 문자열 */
  timestamp: string;
}

// 서비스 계층에서 통일된 반환 타입이다.
export interface DashboardServiceResult<T> {
  /** HTTP 상태 코드 */
  status: number;
  /** 응답 본문 */
  body: DashboardApiResponse<T>;
}

// 사용자 컨텍스트 정보를 담는 타입이다.
export interface DashboardUserContext {
  /** 사용자 ID */
  id: string;
  /** 사용자 이름(선택 사항) */
  name?: string;
  /** 사용자 역할 */
  role: DashboardRole;
}

// 개인 요약 정보 구조를 정의한다.
export interface DashboardPersonalOverview {
  /** 나에게 할당된 미완료 업무 수 */
  pendingTodos: number;
  /** 이번 주에 완료한 업무 수 */
  completedThisWeek: number;
  /** 예정된 휴가 날짜(없으면 null) */
  nextLeaveDate: string | null;
  /** 마지막 출퇴근 기록 타입(예: PUNCH_IN, PUNCH_OUT) */
  lastAttendanceType: string | null;
  /** 마지막 출퇴근 기록 시각 ISO 문자열 */
  lastAttendanceAt: string | null;
}

// 팀 요약 정보 구조를 정의한다.
export interface DashboardTeamOverview {
  /** 전체 팀원 수 */
  totalMembers: number;
  /** 진행 중인 프로젝트 수 */
  activeProjects: number;
  /** 마감 기한이 지난 Todo 수 */
  overdueTodos: number;
  /** 출퇴근 이상 감지 수 */
  attendanceAlerts: number;
}

// 공지 및 경보 정보를 나타내는 타입이다.
export interface DashboardAnnouncement {
  /** 고유 ID */
  id: string;
  /** 메시지 본문 */
  message: string;
  /** 경보 레벨 */
  level: DashboardAlertLevel;
  /** 게시 시각 ISO 문자열 */
  publishedAt: string;
}

// 대시보드 접근 권한 구성을 정의한다.
export interface DashboardPermissions {
  /** 팀 요약 위젯 접근 가능 여부 */
  canViewTeamSummary: boolean;
  /** 개인 요약 위젯 접근 가능 여부 */
  canViewPersonalSummary: boolean;
  /** 공지 위젯 접근 가능 여부 */
  canViewAnnouncements: boolean;
  /** 접근 가능한 위젯 키 목록 */
  allowedWidgets: DashboardWidgetKey[];
}

// 클라이언트가 사용할 대시보드 전체 구조이다.
export interface DashboardOverview {
  /** 응답을 생성한 사용자 역할 */
  role: DashboardRole;
  /** 역할에 따른 권한 정보 */
  permissions: DashboardPermissions;
  /** 개인 요약 정보(권한이 없으면 null) */
  personalSummary: DashboardPersonalOverview | null;
  /** 팀 요약 정보(권한이 없으면 null) */
  teamSummary: DashboardTeamOverview | null;
  /** 공지 및 경보 목록 */
  announcements: DashboardAnnouncement[];
}

// 대시보드 데이터를 조회하는 저장소 인터페이스이다.
export interface DashboardRepository {
  /** 사용자별 개인 요약 정보를 반환한다. */
  getPersonalOverview(userId: string): Promise<DashboardPersonalOverview>;
  /** 팀 전체 요약 정보를 반환한다. */
  getTeamOverview(): Promise<DashboardTeamOverview>;
  /** 역할에 맞는 공지 목록을 반환한다. */
  listAnnouncements(role: DashboardRole): Promise<DashboardAnnouncement[]>;
}

// 서비스 레이어 생성 시 필요한 의존성을 정의한다.
export interface DashboardServiceDependencies {
  /** 대시보드 데이터 저장소 구현 */
  repository: DashboardRepository;
  /** 서버 타임스탬프 생성을 위한 함수(테스트 주입용) */
  timeProvider?: () => Date;
}

// 라우터를 생성할 때 사용하는 의존성 타입이다.
export interface DashboardRouterDependencies extends DashboardServiceDependencies {}
