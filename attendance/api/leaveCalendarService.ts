/**
 * attendance/api/leaveCalendarService.ts
 *
 * 근태 캘린더(휴무 일정) 조회 로직을 담당하는 서비스 레이어이다.
 * 사용자 역할을 검증하고, 저장소에서 휴무 데이터를 조회한 뒤 캘린더 형태로 응답한다.
 */

import { DateTime } from 'luxon';
import {
  ATTENDANCE_ALLOWED_ROLES,
  ATTENDANCE_TIMEZONE,
  type AttendanceApiResponse,
  type AttendanceUserContext,
  type LeaveCalendarMatrix,
  type LeaveCalendarServiceDependencies
} from '../types';
import { buildApiResponse, buildLeaveCalendarMatrix } from '../utils';

// 근태 캘린더 기능을 사용할 수 있는 역할 목록을 Set으로 정의한다.
const CALENDAR_ALLOWED_ROLES = new Set<AttendanceUserContext['role']>([
  ATTENDANCE_ALLOWED_ROLES.ADMIN,
  ATTENDANCE_ALLOWED_ROLES.MEMBER
]);

// 서비스에서 공통으로 사용할 메시지 상수 모음이다.
const CALENDAR_MESSAGES = {
  FORBIDDEN: '근태 캘린더에 접근할 권한이 없습니다.',
  INVALID_RANGE: '연도 또는 월 정보가 유효하지 않습니다.',
  LOAD_ERROR: '근태 캘린더를 불러오는 중 오류가 발생했습니다.'
} as const;

/**
 * 연도/월 입력값이 올바른지 검증한다.
 * @param year 조회 연도
 * @param month 조회 월
 */
function validateYearMonth(year: number, month: number): boolean {
  // 연도와 월이 모두 정수인지 확인한다.
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return false;
  }
  // 연도는 1970~2100 범위로 제한한다.
  if (year < 1970 || year > 2100) {
    return false;
  }
  // 월은 1~12 범위만 허용한다.
  return month >= 1 && month <= 12;
}

/**
 * 휴무 캘린더 서비스를 생성한다.
 * @param deps 저장소 및 시간 공급자 의존성
 */
export function createLeaveCalendarService(
  deps: LeaveCalendarServiceDependencies
) {
  const timeProvider = deps.timeProvider ?? (() => new Date());

  return {
    /**
     * 지정한 사용자/연월에 대한 근태 캘린더를 반환한다.
     * @param user 사용자 컨텍스트
     * @param year 조회 연도
     * @param month 조회 월
     */
    async getMonthlyCalendar(
      user: AttendanceUserContext,
      year: number,
      month: number
    ): Promise<AttendanceApiResponse<{ calendar: LeaveCalendarMatrix }>> {
      const now = timeProvider();

      // 역할 검증: admin/member만 접근 가능하도록 제한한다.
      if (!CALENDAR_ALLOWED_ROLES.has(user.role)) {
        return buildApiResponse(null, CALENDAR_MESSAGES.FORBIDDEN, () => now);
      }

      // 연월 입력값이 유효하지 않으면 400 응답을 반환한다.
      if (!validateYearMonth(year, month)) {
        return buildApiResponse(null, CALENDAR_MESSAGES.INVALID_RANGE, () => now);
      }

      try {
        // 조회할 월의 시작/종료 날짜를 계산한다.
        const startOfMonth = DateTime.fromObject({ year, month, day: 1 }, { zone: ATTENDANCE_TIMEZONE });
        const endOfMonth = startOfMonth.endOf('month');
        const startIso = startOfMonth.toISODate();
        const endIso = endOfMonth.toISODate();

        if (!startIso || !endIso) {
          return buildApiResponse(null, CALENDAR_MESSAGES.INVALID_RANGE, () => now);
        }

        // 저장소에서 해당 기간의 휴무 일정을 불러온다.
        const leaveEntries = await deps.repository.listForRange(user.id, startIso, endIso);

        // 유틸리티 함수를 사용해 월간 캘린더 행렬을 생성한다.
        const calendar = buildLeaveCalendarMatrix(year, month, leaveEntries);
        return buildApiResponse({ calendar }, null, () => now);
      } catch (error) {
        return buildApiResponse(null, CALENDAR_MESSAGES.LOAD_ERROR, () => now);
      }
    }
  };
}
