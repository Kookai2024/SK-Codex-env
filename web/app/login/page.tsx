'use client';
// Where to edit: 로그인 폼 필드나 검증 로직을 바꾸고 싶다면 아래 컴포넌트를 수정하세요.
/**
 * @file web/app/login/page.tsx
 * @description PocketBase 이메일/비밀번호 인증을 최신 스레드형 카드 레이아웃으로 제공하는 페이지이다.
 */

import React from 'react';
import { threadClassNames } from '../../lib/ui/thread/threadStyles';
import { useAuth } from '../providers';

export default function LoginPage() {
  const { client, user, role, isAuthenticated, refreshFromStore, logout } = useAuth(); // 인증 상태 훅을 가져온다.
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 폼의 기본 제출 동작을 막는다.
    setIsSubmitting(true); // 제출 중 상태를 표시한다.
    setMessage(null);
    setError(null);

    try {
      await client.collection('users').authWithPassword(email, password); // PocketBase 인증 요청을 보낸다.
      refreshFromStore(); // authStore에 반영된 사용자 정보를 다시 읽는다.
      setMessage('로그인에 성공했습니다. 다른 페이지로 이동해 역할별 기능을 확인하세요.');
      setEmail('');
      setPassword('');
    } catch (authError: unknown) {
      console.error(authError);
      setError('로그인에 실패했습니다. 이메일 또는 비밀번호를 확인하세요.');
    } finally {
      setIsSubmitting(false); // 제출 상태를 해제한다.
    }
  };

  const handleLogout = async () => {
    await logout(); // PocketBase authStore를 정리한다.
    setMessage('로그아웃되었습니다. 다시 로그인하려면 정보를 입력하세요.');
  };

  return (
    <section className={threadClassNames.section}>
      <header className={threadClassNames.sectionHeader}>
        <span className={threadClassNames.eyebrow}>Authentication Thread</span>
        <h1 className={threadClassNames.title}>로그인</h1>
        <p className={threadClassNames.subtitle}>PocketBase 사용자 계정을 이용해 인증합니다. 역할에 따라 메뉴와 권한이 달라집니다.</p>
        <p className={threadClassNames.muted}>현재 상태: {isAuthenticated ? `${user?.email ?? ''} (${role})` : '로그아웃됨'}</p>
      </header>

      <article className={threadClassNames.panel({ variant: 'muted' })}>
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
          </div>

          <button type="submit" className={threadClassNames.button({ variant: 'primary' })} disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
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
