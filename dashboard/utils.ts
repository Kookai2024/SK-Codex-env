/**
 * dashboard/utils.ts
 *
 * 대시보드 기능에서 재사용할 헬퍼 함수와 상수를 모아둔다.
 * API 응답 포맷과 역할별 권한 계산을 담당한다.
 */

import {
  DASHBOARD_ALLOWED_ROLES,
  DASHBOARD_WIDGET_KEYS,
  type DashboardApiResponse,
  type DashboardOverview,
  type DashboardPermissions,
  type DashboardRole
} from './types';

// 대시보드 공통 메시지를 상수로 정의한다.
export const DASHBOARD_MESSAGES = {
  FORBIDDEN: '대시보드에 접근할 권한이 없습니다.',
  UNAUTHENTICATED: '사용자 인증 정보가 필요합니다.'
} as const;

// 역할별 기본 권한 구성을 상수로 정의한다.
const DASHBOARD_ROLE_PERMISSIONS: Record<DashboardRole, DashboardPermissions> = {
  [DASHBOARD_ALLOWED_ROLES.ADMIN]: {
    canViewTeamSummary: true,
    canViewPersonalSummary: true,
    canViewAnnouncements: true,
    allowedWidgets: [
      DASHBOARD_WIDGET_KEYS.TEAM_OVERVIEW,
      DASHBOARD_WIDGET_KEYS.PERSONAL_OVERVIEW,
      DASHBOARD_WIDGET_KEYS.ANNOUNCEMENTS
    ]
  },
  [DASHBOARD_ALLOWED_ROLES.MEMBER]: {
    canViewTeamSummary: false,
    canViewPersonalSummary: true,
    canViewAnnouncements: true,
    allowedWidgets: [
      DASHBOARD_WIDGET_KEYS.PERSONAL_OVERVIEW,
      DASHBOARD_WIDGET_KEYS.ANNOUNCEMENTS
    ]
  },
  [DASHBOARD_ALLOWED_ROLES.GUEST]: {
    canViewTeamSummary: false,
    canViewPersonalSummary: false,
    canViewAnnouncements: false,
    allowedWidgets: []
  }
};

/**
 * REST 규격에 맞는 대시보드 API 응답 객체를 생성한다.
 * @param data 응답 데이터
 * @param error 오류 메시지
 * @param timeProvider 서버 타임스탬프 공급자
 */
export function buildDashboardApiResponse<T>(
  data: T | null,
  error: string | null,
  timeProvider: () => Date
): DashboardApiResponse<T> {
  // 서버 기준 현재 시각을 ISO 문자열로 변환한다.
  const timestamp = timeProvider().toISOString();
  return {
    ok: !error,
    data,
    error,
    timestamp
  };
}

/**
 * 역할에 따라 접근 가능한 대시보드 권한 구성을 반환한다.
 * @param role 사용자 역할
 */
export function resolveDashboardPermissions(role: DashboardRole): DashboardPermissions {
  // 사전에 정의한 권한 매핑을 그대로 반환한다.
  return DASHBOARD_ROLE_PERMISSIONS[role];
}

/**
 * 권한에 맞춰 대시보드 응답을 마무리한다.
 * @param overview 대시보드 전체 정보
 * @param timeProvider 서버 시각 공급자
 */
export function finalizeDashboardResponse(
  overview: DashboardOverview,
  timeProvider: () => Date
): DashboardApiResponse<{ overview: DashboardOverview }> {
  // overview를 data에 래핑하여 응답 규격을 통일한다.
  return buildDashboardApiResponse({ overview }, null, timeProvider);
}
