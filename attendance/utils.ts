/**
 * attendance/utils.ts
 *
 * 출퇴근 기능에서 재사용할 유틸리티 함수를 모아둔다.
 * 시간대 계산, 상태 판별, 응답 구조 생성과 같은 순수 로직을 관리한다.
 */

import { DateTime } from 'luxon';
import {
  ATTENDANCE_CALENDAR_SHADING,
  ATTENDANCE_LEAVE_LABELS,
  ATTENDANCE_TIMEZONE,
  ATTENDANCE_TYPES,
  type AttendanceApiResponse,
  type AttendancePunchPayload,
  type AttendanceRecord,
  type AttendanceStateSummary,
  type AttendanceType,
  type LeaveCalendarMatrix,
  type LeaveScheduleEntry,
  type LeaveScheduleInfo,
  type LeaveType
} from './types';

// 캘린더를 구성할 때 사용할 상수 값들을 정의한다.
const CALENDAR_CONSTANTS = {
  DAYS_PER_WEEK: 7,
  MAX_WEEKS: 6
} as const;

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

/**
 * 휴무 일정 배열을 월간 캘린더 형태로 변환한다.
 * @param year 조회 연도 (예: 2025)
 * @param month 조회 월 (1~12)
 * @param entries 휴무 일정 목록
 */
export function buildLeaveCalendarMatrix(
  year: number,
  month: number,
  entries: LeaveScheduleEntry[]
): LeaveCalendarMatrix {
  // 요청된 연도가 유효한지 기본 검증을 수행한다.
  if (!Number.isInteger(year) || year < 1970 || year > 2100) {
    throw new Error('유효하지 않은 연도입니다.');
  }

  // 요청된 월이 1~12 범위인지 확인한다.
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('유효하지 않은 월입니다.');
  }

  // 조회 기준 월의 첫째 날을 Asia/Seoul 시간대로 계산한다.
  const firstDay = DateTime.fromObject({ year, month, day: 1 }, { zone: ATTENDANCE_TIMEZONE });
  if (!firstDay.isValid) {
    throw new Error('생성할 수 없는 날짜입니다.');
  }

  // Luxon에서 월요일을 1로 반환하므로, 일요일 기준 캘린더를 위해 나머지를 사용한다.
  const startOffset = firstDay.weekday % CALENDAR_CONSTANTS.DAYS_PER_WEEK;
  const calendarStart = firstDay.minus({ days: startOffset });

  // 조회 월의 마지막 날짜와 주 단위 보정치를 계산한다.
  const lastDay = firstDay.endOf('month');
  const endOffset = (CALENDAR_CONSTANTS.DAYS_PER_WEEK - 1) - (lastDay.weekday % CALENDAR_CONSTANTS.DAYS_PER_WEEK);
  const calendarEnd = lastDay.plus({ days: endOffset });

  // 날짜별 휴무 일정을 빠르게 찾기 위해 맵 구조로 변환한다.
  const entryMap = new Map<string, LeaveScheduleEntry>();
  for (const entry of entries) {
    const normalizedDate = DateTime.fromISO(entry.date, { zone: ATTENDANCE_TIMEZONE }).toISODate();
    if (!normalizedDate) {
      continue;
    }

    // 동일 날짜에 여러 일정이 있는 경우 종일 일정을 우선한다.
    const previous = entryMap.get(normalizedDate);
    if (!previous || (!previous.isFullDay && entry.isFullDay)) {
      entryMap.set(normalizedDate, entry);
    }
  }

  // 캘린더 셀을 일자 단위로 생성한다.
  const cells: LeaveCalendarMatrix[number] = [];
  const calendarEndMillis = calendarEnd.toMillis();
  let cursor = calendarStart;
  while (cursor.toMillis() <= calendarEndMillis) {
    const isoDate = cursor.toISODate() ?? cursor.toUTC().toISODate() ?? '';
    const mappedEntry = entryMap.get(isoDate) ?? null;

    // 음영 값은 일정 존재 여부 및 종일 여부에 따라 결정한다.
    const shading = mappedEntry
      ? mappedEntry.isFullDay
        ? ATTENDANCE_CALENDAR_SHADING.FULL
        : ATTENDANCE_CALENDAR_SHADING.HALF
      : ATTENDANCE_CALENDAR_SHADING.NONE;

    // 사용자에게 보여줄 라벨은 등록된 일정이 있는 경우에만 제공한다.
    const label = mappedEntry ? ATTENDANCE_LEAVE_LABELS[mappedEntry.leaveType] ?? null : null;

    cells.push({
      date: isoDate,
      isCurrentMonth: cursor.month === month,
      leaveType: (mappedEntry?.leaveType as LeaveType | null) ?? null,
      label,
      shading,
      note: mappedEntry?.note ?? null
    });

    // 날짜를 하루씩 증가시켜 다음 셀을 생성한다.
    cursor = cursor.plus({ days: 1 });
  }

  // 6주 표를 항상 유지하기 위해 부족한 주가 있다면 다음 달 날짜를 추가한다.
  while (cells.length / CALENDAR_CONSTANTS.DAYS_PER_WEEK < CALENDAR_CONSTANTS.MAX_WEEKS) {
    const lastCell = cells[cells.length - 1];
    const lastCellDate = DateTime.fromISO(lastCell.date || '', { zone: ATTENDANCE_TIMEZONE });
    const nextDate = lastCellDate.isValid ? lastCellDate.plus({ days: 1 }) : calendarEnd.plus({ days: 1 });
    const isoDate = nextDate.toISODate() ?? nextDate.toUTC().toISODate() ?? '';
    cells.push({
      date: isoDate,
      isCurrentMonth: nextDate.month === month,
      leaveType: null,
      label: null,
      shading: ATTENDANCE_CALENDAR_SHADING.NONE,
      note: null
    });
  }

  // 7일 단위로 배열을 분할해 2차원 형태의 캘린더를 구성한다.
  const matrix: LeaveCalendarMatrix = [];
  for (let index = 0; index < cells.length; index += CALENDAR_CONSTANTS.DAYS_PER_WEEK) {
    matrix.push(cells.slice(index, index + CALENDAR_CONSTANTS.DAYS_PER_WEEK));
  }

  return matrix;
}
