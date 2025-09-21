/**
 * @file auth/utils.ts
 * @description 인증 로직에서 재사용할 상수와 헬퍼 함수를 정의한다.
 */

import type { ApiResponse, AuthenticatedUser, RegistrationInput, RegistrationPayload, UserRole } from './types';

/** 신규 사용자가 부여받는 기본 역할 */
export const DEFAULT_USER_ROLE: UserRole = 'member';

/** PocketBase 규칙에 맞춰 회원가입 요청 본문을 구성한다. */
export function buildRegistrationPayload(input: RegistrationInput): RegistrationPayload {
  return {
    email: input.email,
    password: input.password,
    passwordConfirm: input.password,
    name: input.name,
    role: input.role ?? DEFAULT_USER_ROLE,
    emailVisibility: true
  };
}

/** 서버 타임스탬프를 ISO 문자열로 생성한다. */
export function createTimestamp(): string {
  return new Date().toISOString();
}

/** API 응답 포맷을 통일해 { ok, data, error, timestamp } 구조를 유지한다. */
export function createApiResponse<T>(params: { data?: T | null; error?: string }): ApiResponse<T> {
  return {
    ok: params.error == null,
    data: params.data == null ? undefined : params.data,
    error: params.error,
    timestamp: createTimestamp()
  };
}

/** PocketBase 에러 객체를 사람이 읽기 쉬운 메시지로 변환한다. */
export function normalizePocketBaseError(error: unknown): string {
  if (!error) {
    return '요청을 처리하던 중 알 수 없는 오류가 발생했습니다.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object') {
    const typedError = error as { message?: string; data?: Record<string, { message?: string }> };
    if (typedError?.data) {
      const fieldMessage = Object.values(typedError.data).find((field) => typeof field?.message === 'string');
      if (fieldMessage?.message) {
        return fieldMessage.message;
      }
    }

    if (typeof typedError?.message === 'string') {
      return typedError.message;
    }
  }

  return 'PocketBase 요청 중 예기치 않은 오류가 발생했습니다.';
}

/** PocketBase 인증 모델을 애플리케이션 전용 AuthenticatedUser로 변환한다. */
export function mapRecordToAuthenticatedUser(record: Record<string, unknown> | null): AuthenticatedUser | null {
  if (!record) {
    return null;
  }

  const typedRecord = record as { id?: unknown; email?: unknown; name?: unknown; role?: unknown };

  return {
    id: String(typedRecord.id ?? ''),
    email: String(typedRecord.email ?? ''),
    name: typedRecord.name ? String(typedRecord.name) : undefined,
    role: (typedRecord.role as UserRole) ?? DEFAULT_USER_ROLE
  };
}
