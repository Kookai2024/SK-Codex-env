'use client';
// Where to edit: 로그인 및 회원가입 UI/로직을 조정하려면 AuthForm 관련 상태와 handleSubmit 함수를 확인하세요.
/**
 * @file web/app/login/page.tsx
 * @description PocketBase 이메일/비밀번호 인증과 회원가입을 Threads 감성 카드 UI로 제공하는 페이지이다.
 */

import React from 'react';
import type { RegistrationInput, UserRole } from '@auth/types';
import { DEFAULT_USER_ROLE, normalizePocketBaseError } from '@auth/utils';
import { threadClassNames } from '../../lib/ui/thread/threadStyles';
import { useAuth } from '../providers';

// 회원가입에서 선택 가능한 기본 역할 목록을 정의해 RBAC 기본 정책을 드러낸다.
const SIGN_UP_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'member', label: 'Member · 일반 멤버' },
  { value: 'guest', label: 'Guest · 게스트' }
];

// 비밀번호 최소 길이를 상수로 분리해 하드코딩을 피하고 재사용성을 높인다.
const MIN_PASSWORD_LENGTH = 8;

type AuthFormMode = 'login' | 'signup';

export default function LoginPage() {
  const { user, role, isAuthenticated, login, register, logout } = useAuth(); // 인증 컨텍스트에서 주요 액션을 가져온다.
  const [mode, setMode] = React.useState<AuthFormMode>('login');
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordConfirm, setPasswordConfirm] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<UserRole>(DEFAULT_USER_ROLE);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // 공통 입력값을 초기화하는 헬퍼를 분리해 재사용한다.
  const resetFormFields = React.useCallback(() => {
    setPassword('');
    setPasswordConfirm('');
    setName('');
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 폼 기본 제출 동작을 차단한다.
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      if (mode === 'login') {
        const response = await login(email, password); // PocketBase에 로그인 요청을 보낸다.
        if (!response.ok) {
          setError(response.error ?? '로그인 중 알 수 없는 오류가 발생했습니다.');
          return;
        }

        setMessage('로그인에 성공했습니다. 상단 네비게이션에서 다른 기능을 탐색해보세요.');
        resetFormFields();
        setEmail('');
      } else {
        if (password.length < MIN_PASSWORD_LENGTH) {
          setError(`비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
          return;
        }

        if (password !== passwordConfirm) {
          setError('비밀번호 확인이 일치하지 않습니다. 다시 입력해주세요.');
          return;
        }

        const registrationInput: RegistrationInput = {
          email,
          password,
          name,
          role: selectedRole
        };

        const response = await register(registrationInput); // 회원가입 및 자동 로그인을 시도한다.
        if (!response.ok) {
          setError(response.error ?? '회원가입 중 오류가 발생했습니다. 입력값을 다시 확인해주세요.');
          return;
        }

        setMessage('가입이 완료되었습니다. 자동 로그인으로 바로 서비스를 이용할 수 있어요.');
        resetFormFields();
        setEmail('');
        setSelectedRole(DEFAULT_USER_ROLE);
        setMode('login'); // 가입 이후에는 로그인 탭으로 전환해준다.
      }
    } catch (unknownError) {
      setError(normalizePocketBaseError(unknownError)); // 예기치 못한 에러 메시지를 정규화한다.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout(); // PocketBase authStore를 비운다.
    setMode('login');
    setMessage('로그아웃되었습니다. 다시 로그인하려면 정보를 입력하세요.');
  };

  return (
    <section className={threadClassNames.section}>
      <header className={threadClassNames.sectionHeader}>
        <span className={threadClassNames.eyebrow}>Authentication Thread</span>
        <h1 className={threadClassNames.title}>로그인 &amp; 회원가입</h1>
        <p className={threadClassNames.subtitle}>
          Threads 감성의 카드 UI에서 멤버 계정을 생성하거나 로그인하세요. 역할(Role)에 따라 접근 가능한 메뉴가 달라집니다.
        </p>
        <p className={threadClassNames.muted}>
          현재 상태 · {isAuthenticated ? `${user?.email ?? ''} (${role})` : '로그아웃됨'}
        </p>
      </header>

      <article className={threadClassNames.panel({ variant: 'muted' })}>
        <div className={threadClassNames.tabList}>
          <button
            type="button"
            className={threadClassNames.tabButton({ isActive: mode === 'login' })}
            onClick={() => setMode('login')}
          >
            로그인
          </button>
          <button
            type="button"
            className={threadClassNames.tabButton({ isActive: mode === 'signup' })}
            onClick={() => setMode('signup')}
          >
            회원가입
          </button>
        </div>

        <form className={threadClassNames.form} onSubmit={handleSubmit}>
          <div className={threadClassNames.field}>
            <label className={threadClassNames.label} htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              className={threadClassNames.input}
              placeholder="user@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {mode === 'signup' ? (
            <div className={threadClassNames.field}>
              <label className={threadClassNames.label} htmlFor="name">
                이름 또는 닉네임
              </label>
              <input
                id="name"
                type="text"
                className={threadClassNames.input}
                placeholder="홍길동"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
          ) : null}

          <div className={threadClassNames.field}>
            <label className={threadClassNames.label} htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              className={threadClassNames.input}
              placeholder="비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <p className={threadClassNames.helper}>최소 {MIN_PASSWORD_LENGTH}자 이상 입력해주세요.</p>
          </div>

          {mode === 'signup' ? (
            <>
              <div className={threadClassNames.field}>
                <label className={threadClassNames.label} htmlFor="passwordConfirm">
                  비밀번호 확인
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  className={threadClassNames.input}
                  placeholder="비밀번호 확인"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  required
                />
              </div>

              <div className={threadClassNames.field}>
                <label className={threadClassNames.label} htmlFor="role">
                  기본 역할 선택
                </label>
                <select
                  id="role"
                  className={threadClassNames.select}
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value as UserRole)}
                >
                  {SIGN_UP_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className={threadClassNames.helper}>
                  관리자 승인이 필요한 경우 PocketBase Admin에서 역할을 상향 조정하세요.
                </p>
              </div>
            </>
          ) : null}

          <button type="submit" className={threadClassNames.button({ variant: 'primary' })} disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>

        {isAuthenticated ? (
          <button className={threadClassNames.button({ variant: 'ghost' })} onClick={handleLogout}>
            로그아웃
          </button>
        ) : null}
      </article>

      {message ? <div className={threadClassNames.alert({ tone: 'success' })}>{message}</div> : null}
      {error ? <div className={threadClassNames.alert({ tone: 'error' })}>{error}</div> : null}
    </section>
  );
}
