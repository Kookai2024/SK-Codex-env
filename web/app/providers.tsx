'use client';
/**
 * @file web/app/providers.tsx
 * @description PocketBase 인증 상태를 전역으로 공유하는 React Context Provider입니다.
 */

import React from 'react';
import type { RecordModel } from 'pocketbase';
import PocketBase from 'pocketbase';
import { getPocketBaseClient } from '../lib/pocketbase';

type UserRole = 'admin' | 'member' | 'guest';

interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

interface AuthContextValue {
  client: PocketBase;
  user: AuthenticatedUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  refreshFromStore: () => void;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function toAuthenticatedUser(model: RecordModel | null): AuthenticatedUser | null {
  // PocketBase 모델이 없으면 로그아웃 상태로 간주한다.
  if (!model) {
    return null;
  }

  return {
    id: model.id,
    email: model.email,
    name: model.name,
    role: (model.role as UserRole) ?? 'guest' // 역할이 없으면 게스트로 처리한다.
  };
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

  const contextValue = React.useMemo<AuthContextValue>(
    () => ({
      client,
      user,
      role: user?.role ?? 'guest',
      isAuthenticated: Boolean(user),
      refreshFromStore: () => setUser(toAuthenticatedUser(client.authStore.model)),
      logout: async () => {
        client.authStore.clear(); // 클라이언트 저장소를 정리한다.
        setUser(null); // 상태를 로그아웃으로 업데이트한다.
      }
    }),
    [client, user]
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
