/**
 * @file auth/tests/__tests__/auth-utils.test.ts
 * @description 인증 유틸리티 함수의 동작을 검증한다.
 */

import {
  DEFAULT_USER_ROLE,
  buildRegistrationPayload,
  createApiResponse,
  mapRecordToAuthenticatedUser,
  normalizePocketBaseError
} from '../../utils';
import type { RegistrationInput } from '../../types';

describe('auth/utils', () => {
  it('buildRegistrationPayload는 PocketBase 요구사항에 맞춰 필드를 구성한다', () => {
    const input: RegistrationInput = {
      email: 'sample@example.com',
      password: 'secure-pass',
      name: '샘플 사용자',
      role: DEFAULT_USER_ROLE
    };

    const payload = buildRegistrationPayload(input);

    expect(payload).toMatchObject({
      email: input.email,
      password: input.password,
      passwordConfirm: input.password,
      name: input.name,
      role: input.role,
      emailVisibility: true
    });
  });

  it('createApiResponse는 성공/실패 상태에 따라 ok 값을 적절히 설정한다', () => {
    const success = createApiResponse({ data: { value: 1 } });
    const failure = createApiResponse({ error: '실패했습니다.' });

    expect(success.ok).toBe(true);
    expect(success.data).toEqual({ value: 1 });
    expect(typeof success.timestamp).toBe('string');

    expect(failure.ok).toBe(false);
    expect(failure.error).toBe('실패했습니다.');
  });

  it('normalizePocketBaseError는 필드 에러 메시지를 우선적으로 반환한다', () => {
    const errorMessage = normalizePocketBaseError({
      data: {
        email: { message: '이미 존재하는 이메일입니다.' }
      }
    });

    expect(errorMessage).toBe('이미 존재하는 이메일입니다.');
  });

  it('mapRecordToAuthenticatedUser는 레코드에서 핵심 필드를 추출한다', () => {
    const user = mapRecordToAuthenticatedUser({
      id: 'abc123',
      email: 'person@example.com',
      name: '홍길동'
    });

    expect(user).toEqual({
      id: 'abc123',
      email: 'person@example.com',
      name: '홍길동',
      role: DEFAULT_USER_ROLE
    });
  });
});
