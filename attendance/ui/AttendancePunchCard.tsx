/**
 * attendance/ui/AttendancePunchCard.tsx
 *
 * 출퇴근 버튼 두 개와 상태 메시지를 보여주는 간단한 React 컴포넌트이다.
 * Punch In/Out 로직은 props로 받은 핸들러를 통해 외부에서 제어한다.
 */

import React from 'react';
import type { AttendanceStateSummary } from '../types';
import { ATTENDANCE_CONFIRM_MESSAGE } from '../types';

// 버튼 라벨과 보조 텍스트를 상수로 정의해 하드코딩을 피한다.
const LABELS = {
  PUNCH_IN: '출근',
  PUNCH_OUT: '퇴근',
  LAST_PUNCH_PREFIX: '마지막 기록'
} as const;

// CSS 클래스 명 역시 상수로 분리해 재사용성을 높인다.
const CLASS_NAMES = {
  CARD: 'attendance-card border rounded-lg p-4 shadow-sm bg-white flex flex-col gap-3',
  MESSAGE: 'text-sm text-slate-600',
  BUTTON_GROUP: 'flex gap-2',
  BUTTON: 'flex-1 py-2 rounded-md font-semibold',
  BUTTON_ACTIVE: 'bg-blue-600 text-white hover:bg-blue-700',
  BUTTON_DISABLED: 'bg-slate-200 text-slate-400 cursor-not-allowed'
} as const;

// 컴포넌트 props 타입을 명시적으로 선언한다.
export interface AttendancePunchCardProps {
  /** 오늘 출퇴근 상태 요약 정보 */
  state: AttendanceStateSummary;
  /** 출근 버튼 클릭 시 호출할 함수 */
  onPunchIn?: () => void;
  /** 퇴근 버튼 클릭 시 호출할 함수 */
  onPunchOut?: () => void;
  /** 퇴근 확인 팝업에 사용할 메시지 */
  confirmMessage?: string;
}

/**
 * Punch In/Out 버튼 카드 컴포넌트 구현체.
 * @param props AttendancePunchCardProps
 */
export const AttendancePunchCard: React.FC<AttendancePunchCardProps> = ({
  state,
  onPunchIn,
  onPunchOut,
  confirmMessage = ATTENDANCE_CONFIRM_MESSAGE
}) => {
  // 퇴근 시에는 확인 팝업을 통해 사용자의 의도를 다시 묻는다.
  const handlePunchOut = () => {
    if (!state.canPunchOut) {
      return;
    }
    const confirmed = window.confirm(confirmMessage);
    if (confirmed && onPunchOut) {
      onPunchOut();
    }
  };

  // 출근 버튼은 별도 팝업 없이 바로 핸들러를 호출한다.
  const handlePunchIn = () => {
    if (!state.canPunchIn) {
      return;
    }
    if (onPunchIn) {
      onPunchIn();
    }
  };

  // 버튼 스타일을 상태에 따라 동적으로 계산한다.
  const punchInClassName = `${CLASS_NAMES.BUTTON} ${
    state.canPunchIn ? CLASS_NAMES.BUTTON_ACTIVE : CLASS_NAMES.BUTTON_DISABLED
  }`;
  const punchOutClassName = `${CLASS_NAMES.BUTTON} ${
    state.canPunchOut ? CLASS_NAMES.BUTTON_ACTIVE : CLASS_NAMES.BUTTON_DISABLED
  }`;

  return (
    <section className={CLASS_NAMES.CARD} aria-live="polite">
      {/* 사용자에게 현재 안내 메시지를 전달한다. */}
      <p className={CLASS_NAMES.MESSAGE}>{state.message}</p>

      {/* 마지막 출퇴근 기록이 있을 경우 간단한 요약을 보여준다. */}
      {state.lastRecord ? (
        <p className="text-xs text-slate-500" data-testid="last-record">
          {LABELS.LAST_PUNCH_PREFIX}: {state.lastRecord.type} •{' '}
          {new Date(state.lastRecord.serverTime).toLocaleString()}
        </p>
      ) : null}

      {/* 버튼 두 개를 동일한 너비로 배치한다. */}
      <div className={CLASS_NAMES.BUTTON_GROUP}>
        <button
          type="button"
          className={punchInClassName}
          onClick={handlePunchIn}
          disabled={!state.canPunchIn}
        >
          {LABELS.PUNCH_IN}
        </button>
        <button
          type="button"
          className={punchOutClassName}
          onClick={handlePunchOut}
          disabled={!state.canPunchOut}
        >
          {LABELS.PUNCH_OUT}
        </button>
      </div>

      {/* 근태 일정일 경우 안내 문구를 추가로 보여준다. */}
      {state.isOnLeave ? (
        <p className="text-xs text-amber-600" data-testid="leave-notice">
          오늘은 등록된 근태 일정으로 버튼이 비활성화되었습니다.
        </p>
      ) : null}
    </section>
  );
};

AttendancePunchCard.displayName = 'AttendancePunchCard';
