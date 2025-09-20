/**
 * attendance/types.ts
 *
 * 출퇴근(Attendance) 기능에서 사용하는 공통 타입과 상수를 정의한다.
 * 모든 모듈에서 동일한 계약을 참조할 수 있도록 별도 파일로 분리한다.
 */

// 허용된 근태 타입 상수를 객체 형태로 관리한다.
export const ATTENDANCE_TYPES = {
  PUNCH_IN: 'PUNCH_IN',
  PUNCH_OUT: 'PUNCH_OUT',
  LEAVE: 'LEAVE'
} as const;

// 서버에서 출퇴근 데이터를 저장할 때 사용하는 시간대 상수이다.
export const ATTENDANCE_TIMEZONE = 'Asia/Seoul' as const;

// RBAC(Role Based Access Control)을 위해 허용된 사용자 역할을 명시적으로 정의한다.
export const ATTENDANCE_ALLOWED_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member'
} as const;

// 출퇴근 요청 본문에서 사용할 확인 메시지를 상수로 유지한다.
export const ATTENDANCE_CONFIRM_MESSAGE =
  '금일 업무를 종료하고 저장 하시겠습니까? (금일 업무는 명일 오전 9시까지 수정 가능합니다.)';

// 출퇴근 타입 유니언 타입을 생성한다.
export type AttendanceType = (typeof ATTENDANCE_TYPES)[keyof typeof ATTENDANCE_TYPES];

// 사용자 역할 타입을 정의한다.
export type AttendanceRole = typeof ATTENDANCE_ALLOWED_ROLES[keyof typeof ATTENDANCE_ALLOWED_ROLES] | 'guest';

// REST API 응답에서 공통적으로 사용하는 형태를 정의한다.
export interface AttendanceApiResponse<T> {
  /** 성공 여부를 나타낸다. */
  ok: boolean;
  /** 응답 데이터가 존재하면 data에 담고, 없으면 null로 유지한다. */
  data: T | null;
  /** 오류 메시지가 있을 경우 문자열로 제공한다. */
  error: string | null;
  /** 서버 타임스탬프(ISO 문자열) */
  timestamp: string;
}

// 출퇴근 기록 한 건을 표현하는 타입이다.
export interface AttendanceRecord {
  /** PocketBase 또는 서버에서 발급한 식별자 */
  id: string;
  /** 기록을 생성한 사용자 ID */
  userId: string;
  /** 출근/퇴근 타입 */
  type: AttendanceType;
  /** 서버에서 기록한 ISO 타임스탬프 */
  serverTime: string;
  /** 요청을 보낸 클라이언트 IP 주소 */
  ipAddress: string;
  /** 추가 메모 또는 상태 정보 */
  note?: string | null;
}

// API에서 주고받는 사용자 컨텍스트 정보를 정의한다.
export interface AttendanceUserContext {
  /** 사용자 식별자 */
  id: string;
  /** 사용자 이름(선택 사항) */
  name?: string;
  /** 사용자 역할 */
  role: AttendanceRole;
}

// 서버가 새로운 출퇴근 기록을 생성할 때 사용하는 페이로드 타입이다.
export interface AttendancePunchPayload {
  /** 기록을 생성할 사용자 ID */
  userId: string;
  /** 기록 타입 */
  type: AttendanceType;
  /** 서버 타임스탬프 ISO 문자열 */
  serverTime: string;
  /** 요청을 보낸 IP 주소 */
  ipAddress: string;
  /** 선택적 메모 필드 */
  note?: string | null;
}

// 오늘 출퇴근 현황을 반환할 때 사용할 상태 정보 타입이다.
export interface AttendanceStateSummary {
  /** 마지막 기록이 존재하면 해당 기록을 담는다. */
  lastRecord?: AttendanceRecord;
  /** 출근 버튼 활성화 여부 */
  canPunchIn: boolean;
  /** 퇴근 버튼 활성화 여부 */
  canPunchOut: boolean;
  /** 오늘이 사전 등록된 근태(연차 등)인지 여부 */
  isOnLeave: boolean;
  /** 사용자에게 보여줄 안내 메시지 */
  message: string;
}

// 사전 등록된 근태 정보를 나타내는 타입이다.
export interface LeaveScheduleInfo {
  /** 오늘 근태 일정 존재 여부 */
  isOnLeave: boolean;
  /** 근태 유형 (연차/반차/출장 등) */
  leaveType?: string;
}

// 근태 일정을 조회하는 함수 시그니처를 정의한다.
export type LeaveLookupFn = (userId: string, isoDate: string) => Promise<LeaveScheduleInfo | null>;

// 출퇴근 데이터를 저장/조회하기 위한 저장소 인터페이스를 정의한다.
export interface AttendanceRepository {
  /**
   * 특정 사용자의 하루 기록 목록을 조회한다.
   * @param userId 사용자 ID
   * @param dayStartIso 조회 시작 시각(UTC ISO)
   * @param dayEndIso 조회 종료 시각(UTC ISO)
   */
  listRecordsForDate(userId: string, dayStartIso: string, dayEndIso: string): Promise<AttendanceRecord[]>;

  /**
   * 새로운 출퇴근 기록을 저장한다.
   * @param payload 저장할 출퇴근 페이로드
   */
  createRecord(payload: AttendancePunchPayload): Promise<AttendanceRecord>;
}

// AttendanceService를 생성할 때 필요한 의존성 모음 타입이다.
export interface AttendanceServiceDependencies {
  /** 출퇴근 기록 저장소 구현체 */
  repository: AttendanceRepository;
  /** 근태 일정 조회 함수 (없으면 null 허용) */
  leaveLookup?: LeaveLookupFn | null;
  /** 시간 생성 함수(테스트에서 고정 값을 주입하기 위함) */
  timeProvider?: () => Date;
}
