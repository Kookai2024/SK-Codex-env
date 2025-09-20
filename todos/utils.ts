/**
 * todos/utils.ts
 *
 * Todo(할 일) 기능에서 재사용할 유틸리티 함수 모음이다.
 * API 응답 포맷, 칸반 변환, 편집 잠금 시간 계산 등을 담당한다.
 */

import { DateTime } from 'luxon';
import {
  TODO_STATUS_LABELS,
  TODO_STATUS_ORDER,
  TODO_TIMEZONE,
  type TodoApiResponse,
  type TodoBoard,
  type TodoBoardItem,
  type TodoItem
} from './types';

// API 응답 메시지를 상수로 정의해 중복을 줄인다.
export const TODO_MESSAGES = {
  LOCKED: '편집 가능 시간이 지났습니다. 관리자에게 요청하세요.',
  FORBIDDEN: '해당 작업을 수행할 권한이 없습니다.',
  NOT_FOUND: '요청한 할 일을 찾을 수 없습니다.'
} as const;

/**
 * REST 규칙에 맞는 Todo API 응답 객체를 생성한다.
 * @param data 응답 데이터
 * @param error 오류 메시지
 * @param timeProvider 서버 타임스탬프 생성을 위한 함수
 */
export function buildTodoApiResponse<T>(
  data: T | null,
  error: string | null,
  timeProvider: () => Date
): TodoApiResponse<T> {
  // timeProvider를 통해 서버 시각을 받아 ISO 문자열로 변환한다.
  const timestamp = timeProvider().toISOString();
  return {
    ok: !error,
    data,
    error,
    timestamp
  };
}

/**
 * 서버 기준 편집 잠금 시각(다음날 09:00 KST)을 계산한다.
 * @param reference 기준 시각(Date 객체)
 */
export function computeNextLockTimestamp(reference: Date): string {
  // Asia/Seoul 시간대로 변환해 날짜와 시간을 계산한다.
  const seoul = DateTime.fromJSDate(reference, { zone: TODO_TIMEZONE });
  const nextDayNineAm = seoul.plus({ days: 1 }).startOf('day').plus({ hours: 9 });
  // PocketBase 저장을 고려해 UTC ISO 문자열을 반환한다.
  return nextDayNineAm.toUTC().toISO({ suppressMilliseconds: false }) ?? seoul.toUTC().toISO() ?? '';
}

/**
 * 칸반 보드 구성을 위해 Todo 목록을 상태별로 묶는다.
 * @param todos 저장소에서 조회한 원본 Todo 레코드
 */
export function groupTodosIntoBoard(todos: TodoItem[]): TodoBoard {
  // 결과 컬렉션을 초기화한다.
  const board: TodoBoard = [];

  // 상태 순서를 미리 순회하며 각 컬럼을 생성한다.
  for (const status of TODO_STATUS_ORDER) {
    const items: TodoBoardItem[] = todos
      .filter((todo) => todo.status === status)
      .map((todo) => ({
        id: todo.id,
        title: todo.title,
        assigneeName: todo.assigneeName,
        dueDate: todo.dueDate,
        lockedAt: todo.lockedAt
      }));

    board.push({
      status,
      title: TODO_STATUS_LABELS[status],
      items
    });
  }

  return board;
}
