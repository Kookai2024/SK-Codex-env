/**
 * attendance/utils.ts
 *
 * 출퇴근 기능에서 재사용할 유틸리티 함수를 모아둔다.
 * 시간대 계산, 상태 판별, 응답 구조 생성과 같은 순수 로직을 관리한다.
 */

import { DateTime } from 'luxon';
import {
  ATTENDANCE_TIMEZONE,
  ATTENDANCE_TYPES,
  type AttendanceApiResponse,
  type AttendancePunchPayload,
  type AttendanceRecord,
  type AttendanceStateSummary,
  type AttendanceType,
  type LeaveScheduleInfo
} from './types';

// 근태 메시지에서 사용할 기본 문구를 상수로 유지한다.
const DEFAULT_MESSAGES = {
  NEED_PUNCH_IN: '출근 기록이 없습니다. 출근 버튼을 눌러 업무를 시작하세요.',
  READY_FOR_PUNCH_OUT: '퇴근 시에는 확인 팝업에서 [네]를 눌러 저장하세요.',
  COMPLETED: '오늘 출퇴근 기록이 모두 저장되었습니다. 수고하셨습니다!',
  ON_LEAVE: '오늘은 사전 등록된 근태 일정이 있어 버튼이 비활성화됩니다.'
} as const;

/**
 * Asia/Seoul 기준 하루의 시작과 끝 시각을 계산한다.
 * @param referenceDate 기준 날짜 (기본값은 현재 시각)
 */
export function getSeoulDayBoundaries(referenceDate: Date = new Date()) {
  // 기준 날짜를 Asia/Seoul 시간대로 변환한다.
  const seoulDate = DateTime.fromJSDate(referenceDate, { zone: ATTENDANCE_TIMEZONE });
  // 하루의 시작과 끝(23:59:59.999)을 구한다.
  const startOfDay = seoulDate.startOf('day');
  const endOfDay = seoulDate.endOf('day');

  return {
    // PocketBase는 UTC로 저장하므로 UTC ISO 문자열로 변환한다.
    startUtcIso: startOfDay.toUTC().toISO({ suppressMilliseconds: false }) ?? '',
    endUtcIso: endOfDay.toUTC().toISO({ suppressMilliseconds: false }) ?? '',
    // 캘린더 조회 등에 사용하기 위한 YYYY-MM-DD 문자열도 함께 제공한다.
    isoDate: startOfDay.toISODate() ?? seoulDate.toISODate() ?? ''
  };
}

/**
 * 출퇴근 기록 목록을 서버 시간순으로 정렬한다.
 * @param records 정렬할 기록 목록
 */
export function sortRecordsByServerTime(records: AttendanceRecord[]): AttendanceRecord[] {
  // 원본 배열을 변경하지 않도록 복제본을 생성한다.
  return [...records].sort((a, b) => a.serverTime.localeCompare(b.serverTime));
}

/**
 * 오늘 버튼 활성화 상태를 계산한다.
 * @param records 오늘 저장된 출퇴근 기록 목록
 * @param leaveInfo 사전 등록된 근태 일정 정보
 */
export function determinePunchState(
  records: AttendanceRecord[],
  leaveInfo?: LeaveScheduleInfo | null
): AttendanceStateSummary {
  const sortedRecords = sortRecordsByServerTime(records);
  const lastRecord = sortedRecords[sortedRecords.length - 1];

  // 근태 일정이 있는 경우에는 버튼을 비활성화하고 안내 메시지를 표시한다.
  if (leaveInfo?.isOnLeave) {
    const leaveTypeText = leaveInfo.leaveType ? `${leaveInfo.leaveType} 일정` : '근태 일정';
    return {
      lastRecord,
      canPunchIn: false,
      canPunchOut: false,
      isOnLeave: true,
      message: `${leaveTypeText}이 등록되어 있습니다. 관리자에게 필요한 변경을 요청하세요.`
    };
  }

  // 출근 기록이 없는 경우 출근 버튼을 활성화한다.
  if (!lastRecord) {
    return {
      canPunchIn: true,
      canPunchOut: false,
      isOnLeave: false,
      message: DEFAULT_MESSAGES.NEED_PUNCH_IN
    };
  }

  // 마지막 기록이 출근이면 퇴근 버튼을 활성화한다.
  if (lastRecord.type === ATTENDANCE_TYPES.PUNCH_IN) {
    return {
      lastRecord,
      canPunchIn: false,
      canPunchOut: true,
      isOnLeave: false,
      message: DEFAULT_MESSAGES.READY_FOR_PUNCH_OUT
    };
  }

  // 마지막 기록이 퇴근이면 모든 버튼을 비활성화한다.
  return {
    lastRecord,
    canPunchIn: false,
    canPunchOut: false,
    isOnLeave: false,
    message: DEFAULT_MESSAGES.COMPLETED
  };
}

/**
 * 출퇴근 타입 전환이 유효한지 검사한다.
 * @param records 현재까지 저장된 출퇴근 기록
 * @param nextType 시도하려는 다음 출퇴근 타입
 */
export function validatePunchTransition(
  records: AttendanceRecord[],
  nextType: AttendanceType
): { ok: boolean; error?: string } {
  const sortedRecords = sortRecordsByServerTime(records);
  const lastRecord = sortedRecords[sortedRecords.length - 1];

  // 출근을 시도하는 경우: 아직 기록이 없거나 마지막이 퇴근이면 허용한다.
  if (nextType === ATTENDANCE_TYPES.PUNCH_IN) {
    if (!lastRecord || lastRecord.type === ATTENDANCE_TYPES.PUNCH_OUT) {
      return { ok: true };
    }
    return { ok: false, error: '이미 출근 처리가 완료되었습니다.' };
  }

  // 퇴근을 시도하는 경우: 마지막 기록이 출근일 때만 허용한다.
  if (nextType === ATTENDANCE_TYPES.PUNCH_OUT) {
    if (!lastRecord) {
      return { ok: false, error: '퇴근 전에는 출근 기록이 필요합니다.' };
    }
    if (lastRecord.type !== ATTENDANCE_TYPES.PUNCH_IN) {
      return { ok: false, error: '이미 퇴근 처리가 완료되었습니다.' };
    }
    return { ok: true };
  }

  // 기타 타입은 아직 지원하지 않는다.
  return { ok: false, error: '지원하지 않는 근태 타입입니다.' };
}

/**
 * 서버에 저장할 출퇴근 페이로드를 생성한다.
 * @param userId 사용자 ID
 * @param nextType 저장할 근태 타입
 * @param serverTimeIso 서버 타임스탬프 ISO 문자열
 * @param ipAddress 요청 IP 주소
 * @param note 선택적 메모
 */
export function createPunchPayload(
  userId: string,
  nextType: AttendanceType,
  serverTimeIso: string,
  ipAddress: string,
  note?: string | null
): AttendancePunchPayload {
  return {
    userId,
    type: nextType,
    serverTime: serverTimeIso,
    ipAddress,
    note: note ?? null
  };
}

/**
 * REST API 규칙에 맞는 응답 구조를 생성한다.
 * @param data 응답 데이터
 * @param error 오류 메시지
 * @param timeProvider 서버 타임스탬프 생성을 위한 함수
 */
export function buildApiResponse<T>(
  data: T | null,
  error: string | null,
  timeProvider: () => Date
): AttendanceApiResponse<T> {
  // 서버 시간을 기준으로 ISO 문자열을 생성한다.
  const serverNow = timeProvider();
  return {
    ok: !error,
    data,
    error,
    timestamp: serverNow.toISOString()
  };
}
