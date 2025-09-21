/**
 * @file auth/tests/__tests__/registerUser.test.ts
 * @description PocketBase 회원가입 API 래퍼의 동작을 검증한다.
 */

import { registerUserWithPocketBase } from '../../api/registerUser';
import { DEFAULT_USER_ROLE } from '../../utils';
import type { RegistrationInput } from '../../types';

describe('auth/api/registerUser', () => {
  it('성공 시 생성된 사용자를 반환하고 자동 로그인한다', async () => {
    const input: RegistrationInput = {
      email: 'new@example.com',
      password: 'password123',
      name: '새 사용자',
      role: DEFAULT_USER_ROLE
    };

    const createMock = jest.fn().mockResolvedValue({ id: 'new-id', email: input.email, role: input.role, name: input.name });
    const authMock = jest.fn().mockResolvedValue({});
    const client = {
      collection: jest.fn().mockReturnValue({ create: createMock, authWithPassword: authMock }),
      authStore: {
        model: { id: 'new-id', email: input.email, role: input.role, name: input.name }
      }
    };

    const response = await registerUserWithPocketBase(client, input);

    expect(client.collection).toHaveBeenCalledWith('users');
    expect(createMock).toHaveBeenCalled();
    expect(authMock).toHaveBeenCalledWith(input.email, input.password);
    expect(response.ok).toBe(true);
    expect(response.data).toEqual({
      id: 'new-id',
      email: input.email,
      role: input.role,
      name: input.name
    });
  });

  it('에러 발생 시 표준 에러 메시지를 반환한다', async () => {
    const input: RegistrationInput = {
      email: 'duplicate@example.com',
      password: 'password123',
      name: '중복 사용자',
      role: DEFAULT_USER_ROLE
    };

    const createMock = jest.fn().mockRejectedValue({
      data: {
        email: { message: '이미 등록된 이메일입니다.' }
      }
    });

    const client = {
      collection: jest.fn().mockReturnValue({ create: createMock, authWithPassword: jest.fn() }),
      authStore: { model: null }
    };

    const response = await registerUserWithPocketBase(client, input);

    expect(response.ok).toBe(false);
    expect(response.error).toBe('이미 등록된 이메일입니다.');
  });
});
