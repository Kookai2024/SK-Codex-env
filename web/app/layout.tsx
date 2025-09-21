/**
 * @file web/app/layout.tsx
 * @description Next.js App Router의 루트 레이아웃으로, 스레드 감성의 전역 네비게이션과 공통 배경을 제공한다.
 */

import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import { AuthProvider } from './providers';

interface NavigationLink {
  /** 네비게이션에 렌더링할 경로 */
  href: string;
  /** 사용자에게 노출할 라벨 */
  label: string;
  /** 강조가 필요한 링크인지 여부 */
  isPrimary?: boolean;
}

// 상단 네비게이션 구성을 정의해 링크 관리가 쉽도록 한다.
const NAVIGATION_LINKS: NavigationLink[] = [
  { href: '/login', label: '로그인' },
  { href: '/attendance', label: '근태' },
  { href: '/me', label: '내 업무' },
  { href: '/dashboard', label: '대시보드', isPrimary: true }
];

export const metadata: Metadata = {
  title: 'Team Todo Console', // 브라우저 탭 제목을 정의한다.
  description: 'PocketBase 연동형 팀 할 일 & 근태 관리 도구' // 검색 엔진 설명을 제공한다.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 전역 배경과 인증 컨텍스트를 구성해 모든 페이지가 동일한 UI를 공유하도록 한다.
  return (
    <html lang="ko">
      <body className="app-background">
        <AuthProvider>
          <div className="app-shell">
            <div className="app-container">
              {/* 브랜드와 네비게이션을 스레드 스타일 카드 안에 배치한다. */}
              <header className="thread-navbar">
                <Link href="/" className="thread-navbar__brand">
                  <span className="thread-navbar__brand-mark">TT</span>
                  <span>Team Todo Console</span>
                </Link>
                <nav className="thread-nav-links" aria-label="주요 탐색">
                  {NAVIGATION_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`thread-nav-link${link.isPrimary ? ' thread-nav-link--primary' : ''}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="thread-navbar__meta">
                  <span className="thread-pill thread-pill--accent">Beta</span>
                  <span>최근 업데이트: 2024-05-01</span>
                </div>
              </header>

              {/* 메인 콘텐츠를 카드 스택 형태로 렌더링한다. */}
              <main className="thread-main">{children}</main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
