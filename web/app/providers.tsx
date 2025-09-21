'use client';
/**
 * @file web/app/providers.tsx
 * @description PocketBase 인증 상태를 전역으로 공유하는 React Context Provider입니다.
 */

import React from 'react';
import type { RecordModel } from 'pocketbase';
import PocketBase from 'pocketbase';
import { registerUserWithPocketBase } from '@auth/api/registerUser';
import type { ApiResponse, AuthenticatedUser, RegistrationInput, UserRole } from '@auth/types';
import { createApiResponse, mapRecordToAuthenticatedUser, normalizePocketBaseError } from '@auth/utils';
import { getPocketBaseClient } from '../lib/pocketbase';

interface AuthContextValue {
  client: PocketBase;
  user: AuthenticatedUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  refreshFromStore: () => void;
  login: (email: string, password: string) => Promise<ApiResponse<AuthenticatedUser>>;
  register: (input: RegistrationInput) => Promise<ApiResponse<AuthenticatedUser>>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function toAuthenticatedUser(model: RecordModel | null): AuthenticatedUser | null {
  return mapRecordToAuthenticatedUser(model as unknown as Record<string, unknown> | null); // PocketBase 레코드를 도메인 모델로 변환한다.
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = React.useMemo(() => getPocketBaseClient(), []); // PocketBase 클라이언트를 메모이제이션한다.
  const [user, setUser] = React.useState<AuthenticatedUser | null>(() => toAuthenticatedUser(client.authStore.model));

  React.useEffect(() => {
    // authStore 변화 시 상태를 동기화한다.
    const remove = client.authStore.onChange(() => {
      setUser(toAuthenticatedUser(client.authStore.model));
    });

    return () => {
      remove(); // 컴포넌트 언마운트 시 이벤트를 정리한다.
    };
  }, [client]);

  const loginCallback = React.useCallback(
    async (email: string, password: string): Promise<ApiResponse<AuthenticatedUser>> => {
      try {
        await client.collection('users').authWithPassword(email, password); // PocketBase 로그인 요청을 수행한다.
        const nextUser = toAuthenticatedUser(client.authStore.model); // 최신 사용자 정보를 추출한다.
        if (!nextUser) {
          return createApiResponse({ error: '인증된 사용자 정보를 확인하지 못했습니다.' });
        }

        setUser(nextUser);
        return createApiResponse({ data: nextUser });
      } catch (error) {
        return createApiResponse({ error: normalizePocketBaseError(error) });
      }
    },
    [client]
  );

  const registerCallback = React.useCallback(
    async (input: RegistrationInput): Promise<ApiResponse<AuthenticatedUser>> => {
      const response = await registerUserWithPocketBase(client, input); // PocketBase에 회원가입을 위임한다.
      if (response.ok && response.data) {
        setUser(response.data); // 자동 로그인된 사용자 정보를 반영한다.
      }
      return response;
    },
    [client]
  );

  const contextValue = React.useMemo<AuthContextValue>(
    () => ({
      client,
      user,
      role: user?.role ?? 'guest',
      isAuthenticated: Boolean(user),
      refreshFromStore: () => setUser(toAuthenticatedUser(client.authStore.model)),
      login: loginCallback,
      register: registerCallback,
      logout: async () => {
        client.authStore.clear(); // 클라이언트 저장소를 정리한다.
        setUser(null); // 상태를 로그아웃으로 업데이트한다.
      }
    }),
    [client, loginCallback, registerCallback, user]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext); // 컨텍스트 값을 읽는다.
  if (!context) {
    throw new Error('useAuth 훅은 AuthProvider 내에서만 사용할 수 있습니다.');
  }
  return context;
}
