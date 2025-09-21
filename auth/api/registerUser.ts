/**
 * @file auth/api/registerUser.ts
 * @description PocketBase users 컬렉션과 통신해 회원가입과 자동 로그인을 수행한다.
 */

import type { ApiResponse, AuthenticatedUser, RegistrationInput } from '../types';
import { buildRegistrationPayload, createApiResponse, mapRecordToAuthenticatedUser, normalizePocketBaseError } from '../utils';

interface PocketBaseAuthCollection {
  create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  authWithPassword(email: string, password: string): Promise<unknown>;
}

interface PocketBaseClient {
  collection(collectionName: string): PocketBaseAuthCollection;
  authStore: {
    model: Record<string, unknown> | null;
  };
}

/** PocketBase users 컬렉션에 회원가입 요청을 보내고 성공 시 자동으로 로그인한다. */
export async function registerUserWithPocketBase(
  client: PocketBaseClient,
  input: RegistrationInput
): Promise<ApiResponse<AuthenticatedUser>> {
  try {
    const usersCollection = client.collection('users'); // users 컬렉션 핸들을 가져온다.
    const payload = buildRegistrationPayload(input); // PocketBase 형식에 맞게 본문을 만든다.
    const createdRecord = await usersCollection.create(payload as unknown as Record<string, unknown>); // 신규 사용자를 생성한다.
    await usersCollection.authWithPassword(input.email, input.password); // 곧바로 로그인해 authStore를 채운다.

    const authenticatedUser = mapRecordToAuthenticatedUser(client.authStore.model ?? createdRecord);
    if (!authenticatedUser) {
      return createApiResponse({ error: '회원가입 후 사용자 정보를 확인하지 못했습니다.' });
    }

    return createApiResponse({ data: authenticatedUser });
  } catch (error) {
    return createApiResponse({ error: normalizePocketBaseError(error) });
  }
}
