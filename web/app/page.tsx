/**
 * @file web/app/page.tsx
 * @description 홈 대시 안내 페이지로, 주요 경로와 사용 순서를 최신 스레드 피드 스타일로 소개한다.
 */

import Link from 'next/link';
import { threadClassNames } from '../features/design-system/ui/threadClassNames';

interface OnboardingStep {
  /** 단계 표시용 번호 */
  step: string;
  /** 단계 제목 */
  title: string;
  /** 단계 설명 */
  description: string;
  /** 추가 힌트나 팁 */
  hint: string;
}

interface QuickLink {
  /** 이동 경로 */
  href: string;
  /** 링크 라벨 */
  label: string;
  /** 간단한 설명 */
  description: string;
}

// 온보딩 단계 정보를 배열로 관리해 유지보수를 쉽게 한다.
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: '01',
    title: 'PocketBase 계정 준비',
    description: 'PocketBase 관리자에서 사용자 계정을 생성해 인증 흐름을 점검하세요.',
    hint: 'Admin UI → Users → 새로운 멤버 등록'
  },
  {
    step: '02',
    title: '역할 기반 로그인 확인',
    description: '로그인 후 상단에 표시되는 역할을 확인해 RBAC이 정상적으로 작동하는지 검증합니다.',
    hint: '각 역할마다 다른 페이지 구성이 나타납니다.'
  },
  {
    step: '03',
    title: '근태 기록 테스트',
    description: '출근/퇴근 버튼 상태가 현재 기록에 따라 바뀌는지 확인해 보세요.',
    hint: '퇴근 시 확인 모달이 노출되어야 합니다.'
  },
  {
    step: '04',
    title: '개인 칸반 이동',
    description: '작업을 드래그 대신 버튼으로 이동시켜 편집 잠금 배지를 경험해 보세요.',
    hint: '다음 날 09:00 이후에는 관리자만 수정 가능합니다.'
  },
  {
    step: '05',
    title: '대시보드 요약 확인',
    description: '역할에 따라 달라지는 통계 타일과 공유 제어 옵션을 살펴봅니다.',
    hint: '관리자만 주간 보고서 공유 토글을 조정할 수 있습니다.'
  }
];

// 빠르게 이동할 수 있는 주요 링크를 정의한다.
const QUICK_LINKS: QuickLink[] = [
  {
    href: '/attendance',
    label: '근태 기록 바로가기',
    description: '출근/퇴근 기록과 확인 모달 UX를 체험하세요.'
  },
  {
    href: '/me',
    label: '내 업무 칸반',
    description: '편집 잠금 뱃지와 단계 이동 버튼을 확인하세요.'
  },
  {
    href: '/dashboard',
    label: '대시보드 요약',
    description: '역할별 통계 카드와 공유 토글을 점검하세요.'
  }
];

export default function HomePage() {
  // 초보자에게 전체 흐름을 요약해 보여준다.
  return (
    <section className={threadClassNames.section}>
      {/* 온보딩 소개 헤더를 렌더링한다. */}
      <header className={threadClassNames.sectionHeader}>
        <span className={threadClassNames.eyebrow}>Onboarding Feed</span>
        <h1 className={threadClassNames.title}>팀 Todo 시스템 시작하기</h1>
        <p className={threadClassNames.subtitle}>왼쪽 메뉴를 따라 로그인 → 근태 → 내 업무 → 대시보드 순으로 기능을 체험해 보세요.</p>
      </header>

      <div className={threadClassNames.grid({ layout: 'two' })}>
        {/* 단계별 안내를 스레드 타임라인으로 표현한다. */}
        <article className={threadClassNames.panel({ variant: 'accent' })}>
          <h2>온보딩 체크리스트</h2>
          <p className={threadClassNames.panelDescription}>각 단계를 순서대로 확인하면 서비스 흐름이 빠르게 이해됩니다.</p>
          <ul className={threadClassNames.timeline}>
            {ONBOARDING_STEPS.map((step) => (
              <li key={step.step} className={threadClassNames.timelineItem}>
                <span className={threadClassNames.timelineBadge}>{step.step}</span>
                <div className={threadClassNames.timelineBody}>
                  <p className={threadClassNames.timelineTitle}>{step.title}</p>
                  <p>{step.description}</p>
                  <p className={threadClassNames.timelineHint}>{step.hint}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        {/* 빠른 액션 패널을 렌더링한다. */}
        <aside className={threadClassNames.panel({ variant: 'muted' })}>
          <h2>바로가기</h2>
          <p className={threadClassNames.panelDescription}>주요 페이지를 즉시 열어 스레드형 UX를 체험하세요.</p>
          <div className={threadClassNames.cardDivider} />
          {QUICK_LINKS.map((link, index) => {
            const isLastLink = index === QUICK_LINKS.length - 1; // 마지막 항목 여부를 계산한다.
            return (
              <div key={link.href}>
                <Link href={link.href} className={threadClassNames.button({ variant: 'link' })}>
                  <span>{link.label}</span>
                </Link>
                <p className={threadClassNames.muted}>{link.description}</p>
                {!isLastLink ? <div className={threadClassNames.cardDivider} /> : null}
              </div>
            );
          })}
        </aside>
      </div>
    </section>
  );
}
