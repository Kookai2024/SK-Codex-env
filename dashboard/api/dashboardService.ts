/**
 * dashboard/api/dashboardService.ts
 *
 * 대시보드 권한별 뷰 구성을 담당하는 서비스 레이어이다.
 * 저장소를 호출하기 전에 역할 기반 권한을 검증한다.
 */

import {
  DASHBOARD_ALLOWED_ROLES,
  type DashboardAnnouncement,
  type DashboardOverview,
  type DashboardServiceDependencies,
  type DashboardServiceResult,
  type DashboardUserContext
} from '../types';
import {
  buildDashboardApiResponse,
  finalizeDashboardResponse,
  resolveDashboardPermissions,
  DASHBOARD_MESSAGES
} from '../utils';

/**
 * 대시보드 서비스 팩토리를 생성한다.
 * @param deps 저장소와 타임 공급자 의존성
 */
export function createDashboardService(deps: DashboardServiceDependencies) {
  const timeProvider = deps.timeProvider ?? (() => new Date());

  return {
    /**
     * 역할에 따른 대시보드 개요 데이터를 반환한다.
     * @param user 사용자 컨텍스트
     */
    async getOverview(
      user: DashboardUserContext
    ): Promise<DashboardServiceResult<{ overview: DashboardOverview }>> {
      const now = timeProvider();

      // 게스트 역할은 대시보드 접근이 금지된다.
      if (user.role === DASHBOARD_ALLOWED_ROLES.GUEST) {
        const body = buildDashboardApiResponse(null, DASHBOARD_MESSAGES.FORBIDDEN, () => now);
        return { status: 403, body };
      }

      // 역할에 맞는 권한 구성을 계산한다.
      const permissions = resolveDashboardPermissions(user.role);

      // 공지, 개인, 팀 데이터를 권한에 따라 조건부로 조회한다.
      const [announcements, personalSummary, teamSummary] = await Promise.all([
        permissions.canViewAnnouncements
          ? deps.repository.listAnnouncements(user.role)
          : Promise.resolve([] as DashboardAnnouncement[]),
        permissions.canViewPersonalSummary
          ? deps.repository.getPersonalOverview(user.id)
          : Promise.resolve(null),
        permissions.canViewTeamSummary
          ? deps.repository.getTeamOverview()
          : Promise.resolve(null)
      ]);

      // 클라이언트가 사용할 개요 객체를 조립한다.
      const overview: DashboardOverview = {
        role: user.role,
        permissions,
        personalSummary,
        teamSummary,
        announcements
      };

      const body = finalizeDashboardResponse(overview, () => now);
      return { status: 200, body };
    }
  };
}
