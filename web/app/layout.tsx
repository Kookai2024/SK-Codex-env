/**
 * @file web/app/layout.tsx
 * @description Next.js App Router의 루트 레이아웃으로, 전역 네비게이션과 공통 스타일을 정의한다.
 */

import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import { AuthProvider } from './providers';

export const metadata: Metadata = {
  title: 'Team Todo Console', // 브라우저 탭 제목을 정의한다.
  description: 'PocketBase 연동형 팀 할 일 & 근태 관리 도구' // 검색 엔진 설명을 제공한다.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // HTML 기본 구조를 정의하고 내비게이션을 렌더링한다.
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider>
          <header className="border-b bg-white">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <Link href="/" className="font-semibold">
                Team Todo Console
              </Link>
              <div className="flex gap-4 text-sm">
                <Link href="/login">로그인</Link>
                <Link href="/attendance">근태</Link>
                <Link href="/me">내 업무</Link>
                <Link href="/dashboard">대시보드</Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
