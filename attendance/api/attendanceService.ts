/**
 * attendance/api/attendanceService.ts
 *
 * 출퇴근 기록 생성을 담당하는 서비스 레이어이다.
 * 저장소(repository)와 시간/근태 조회 의존성을 주입받아 비즈니스 규칙을 적용한다.
 */

import {
  ATTENDANCE_ALLOWED_ROLES,
  ATTENDANCE_TYPES,
  type AttendanceApiResponse,
  type AttendanceRecord,
  type AttendanceServiceDependencies,
  type AttendanceStateSummary,
  type AttendanceUserContext
} from '../types';
import {
  buildApiResponse,
  createPunchPayload,
  determinePunchState,
  getSeoulDayBoundaries,
  validatePunchTransition
} from '../utils';

// 출퇴근 허용 역할을 Set으로 만들어 빠르게 검사한다.
const ALLOWED_ROLE_SET = new Set<AttendanceUserContext['role']>([
  ATTENDANCE_ALLOWED_ROLES.ADMIN,
  ATTENDANCE_ALLOWED_ROLES.MEMBER
]);

// 근태 일정으로 인해 버튼이 막힐 때 사용할 메시지 상수이다.
const BLOCKED_BY_LEAVE_MESSAGE = '오늘은 사전 등록된 근태 일정으로 인해 출퇴근 기록을 변경할 수 없습니다.';

/**
 * 사용자 역할이 출퇴근 기능을 사용할 수 있는지 검사한다.
 * @param user 사용자 컨텍스트
 */
function validateRole(user: AttendanceUserContext): string | null {
  if (!ALLOWED_ROLE_SET.has(user.role)) {
    return '해당 기능을 사용할 권한이 없습니다.';
  }
  return null;
}

/**
 * 하루 단위 데이터를 조회하기 위한 도우미 함수를 생성한다.
 * @param deps AttendanceServiceDependencies
 */
function createDailyContextLoader(deps: AttendanceServiceDependencies) {
  return async (userId: string, referenceDate: Date) => {
    const { repository, leaveLookup } = deps;
    const boundaries = getSeoulDayBoundaries(referenceDate);
    // 저장소에서 오늘 날짜에 해당하는 기록을 가져온다.
    const records = await repository.listRecordsForDate(
      userId,
      boundaries.startUtcIso,
      boundaries.endUtcIso
    );
    // 근태 일정 조회 함수가 제공되었다면 호출한다.
    const leaveInfo = leaveLookup ? await leaveLookup(userId, boundaries.isoDate) : null;
    return { records, leaveInfo, boundaries };
  };
}

/**
 * AttendanceService 인스턴스를 생성한다.
 * @param deps 저장소/시간/근태 조회 의존성
 */
export function createAttendanceService(deps: AttendanceServiceDependencies) {
  const timeProvider = deps.timeProvider ?? (() => new Date());
  const loadDailyContext = createDailyContextLoader(deps);

  return {
    /**
     * 오늘 사용자의 출퇴근 버튼 상태를 조회한다.
     * @param user 사용자 컨텍스트
     */
    async getTodayStatus(
      user: AttendanceUserContext
    ): Promise<AttendanceApiResponse<{ state: AttendanceStateSummary }>> {
      const roleError = validateRole(user);
      const now = timeProvider();
      if (roleError) {
        return buildApiResponse(null, roleError, () => now);
      }

      try {
        const { records, leaveInfo } = await loadDailyContext(user.id, now);
        const state = determinePunchState(records, leaveInfo);
        return buildApiResponse({ state }, null, () => now);
      } catch (error) {
        return buildApiResponse(null, '출퇴근 현황을 불러오지 못했습니다.', () => now);
      }
    },

    /**
     * 출근 버튼을 처리한다.
     * @param user 사용자 컨텍스트
     * @param ipAddress 요청 IP 주소
     */
    async punchIn(
      user: AttendanceUserContext,
      ipAddress: string,
      note?: string | null
    ): Promise<AttendanceApiResponse<{ record: AttendanceRecord; state: AttendanceStateSummary }>> {
      return this.handlePunch(user, ipAddress, ATTENDANCE_TYPES.PUNCH_IN, note);
    },

    /**
     * 퇴근 버튼을 처리한다.
     * @param user 사용자 컨텍스트
     * @param ipAddress 요청 IP 주소
     */
    async punchOut(
      user: AttendanceUserContext,
      ipAddress: string,
      note?: string | null
    ): Promise<AttendanceApiResponse<{ record: AttendanceRecord; state: AttendanceStateSummary }>> {
      return this.handlePunch(user, ipAddress, ATTENDANCE_TYPES.PUNCH_OUT, note);
    },

    /**
     * Punch In/Out 공통 처리를 담당한다.
     * @param user 사용자 컨텍스트
     * @param ipAddress 요청 IP 주소
     * @param nextType 시도할 출퇴근 타입
     */
    async handlePunch(
      user: AttendanceUserContext,
      ipAddress: string,
      nextType: (typeof ATTENDANCE_TYPES)[keyof typeof ATTENDANCE_TYPES],
      note?: string | null
    ): Promise<AttendanceApiResponse<{ record: AttendanceRecord; state: AttendanceStateSummary }>> {
      const now = timeProvider();
      const roleError = validateRole(user);
      if (roleError) {
        return buildApiResponse(null, roleError, () => now);
      }

      try {
        const { records, leaveInfo } = await loadDailyContext(user.id, now);

        // 근태 일정이 있는 경우 출퇴근 변경을 허용하지 않는다.
        if (leaveInfo?.isOnLeave) {
          return buildApiResponse(null, BLOCKED_BY_LEAVE_MESSAGE, () => now);
        }

        const validation = validatePunchTransition(records, nextType);
        if (!validation.ok) {
          return buildApiResponse(null, validation.error ?? '유효하지 않은 출퇴근 시도입니다.', () => now);
        }

        // 출퇴근 기록을 생성한다.
        const payload = createPunchPayload(user.id, nextType, now.toISOString(), ipAddress, note);
        const savedRecord = await deps.repository.createRecord(payload);

        // 저장된 기록을 포함해 새 상태를 계산한다.
        const state = determinePunchState([...records, savedRecord], leaveInfo);
        return buildApiResponse({ record: savedRecord, state }, null, () => now);
      } catch (error) {
        return buildApiResponse(null, '출퇴근 기록을 저장하는 중 문제가 발생했습니다.', () => now);
      }
    }
  };
}
