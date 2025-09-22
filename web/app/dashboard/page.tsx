'use client';
// Where to edit: 대시보드 카드 구성이나 권한별 UI를 변경하려면 SUMMARY_TILES와 fetchSummaries를 업데이트하세요.
/**
 * @file web/app/dashboard/page.tsx
 * @description 역할 기반 대시보드를 최신 스레드형 카드 스타일로 구성해 주요 통계를 보여주는 페이지이다.
 */

import React from 'react';
import { threadClassNames } from '../../features/design-system/ui/threadClassNames';
import { useAuth } from '../providers';

interface SummaryTile {
  id: string;
  label: string;
  description: string;
  count: number;
}

export default function DashboardPage() {
  const { client, user, role, isAuthenticated } = useAuth();
  const [tiles, setTiles] = React.useState<SummaryTile[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [sharingEnabled, setSharingEnabled] = React.useState(false);
  const [info, setInfo] = React.useState<string | null>(null);

  const fetchSummaries = React.useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const [todoList, attendanceList, projectList, reportList] = await Promise.all([
        client.collection('todos').getList(1, 1, role === 'admin' ? {} : { filter: `assignee="${user.id}"` }),
        client.collection('attendance').getList(1, 1, role === 'admin' ? {} : { filter: `user="${user.id}"` }),
        client.collection('projects').getList(1, 1),
        client.collection('reports').getList(1, 1)
      ]);

      const tileData: SummaryTile[] = [
        {
          id: 'todos',
          label: '할 일',
          description: role === 'admin' ? '전체 팀 할 일 수' : '내게 할당된 할 일 수',
          count: todoList.totalItems
        },
        {
          id: 'attendance',
          label: '근태 기록',
          description: role === 'admin' ? '전체 출근/퇴근 기록 수' : '내 근태 기록 수',
          count: attendanceList.totalItems
        },
        {
          id: 'projects',
          label: '프로젝트',
          description: '진행 중인 프로젝트 수',
          count: projectList.totalItems
        },
        {
          id: 'reports',
          label: '주간 보고서',
          description: '작성된 보고서 수',
          count: reportList.totalItems
        }
      ];

      setTiles(tileData);
      setInfo(null);
      setError(null);
    } catch (requestError: any) {
      if (requestError?.status === 403) {
        setError('대시보드를 조회할 권한이 없습니다. 관리자에게 문의하세요.');
      } else {
        setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    }
  }, [client, role, user]);

  React.useEffect(() => {
    if (isAuthenticated) {
      void fetchSummaries();
    }
  }, [fetchSummaries, isAuthenticated]);

  const handleSharingToggle = async () => {
    if (role !== 'admin') {
      setError('공유 설정은 관리자만 변경할 수 있습니다.');
      return;
    }

    const nextValue = !sharingEnabled; // 토글 후 상태를 계산한다.
    setSharingEnabled(nextValue);
    setInfo(`주간 보고서 자동 공유가 ${nextValue ? '활성화' : '비활성화'}되었습니다.`);
  };

  if (!isAuthenticated) {
    return (
      <section className={threadClassNames.section}>
        <article className={threadClassNames.panel({ variant: 'muted' })}>
          <p className={threadClassNames.muted}>로그인 후 대시보드를 확인할 수 있습니다.</p>
        </article>
      </section>
    );
  }

  return (
    <section className={threadClassNames.section}>
      <header className={threadClassNames.sectionHeader}>
        <span className={threadClassNames.eyebrow}>Team Overview Thread</span>
        <h1 className={threadClassNames.title}>대시보드</h1>
        <p className={threadClassNames.subtitle}>역할({role})에 따라 노출되는 정보가 달라집니다. 팀의 흐름을 한눈에 확인하세요.</p>
      </header>

      <div className={threadClassNames.grid({ layout: 'four' })}>
        {tiles.map((tile) => (
          <article key={tile.id} className={threadClassNames.panel({ variant: 'stat' })}>
            <h2>{tile.label}</h2>
            <p className={threadClassNames.panelMetric}>{tile.count}</p>
            <p className={threadClassNames.panelDescription}>{tile.description}</p>
          </article>
        ))}
      </div>

      <article className={threadClassNames.panel({ variant: 'muted' })}>
        <header className={threadClassNames.meta}>
          <div>
            <h2>공유 설정</h2>
            <p className={threadClassNames.muted}>주간 보고서를 지정된 Obsidian 폴더에 복사하도록 설정합니다.</p>
          </div>
          <button
            className={threadClassNames.button({ variant: 'primary' })}
            onClick={handleSharingToggle}
            disabled={role !== 'admin'}
          >
            {sharingEnabled ? '공유 비활성화' : '공유 활성화'}
          </button>
        </header>
        {role !== 'admin' ? (
          <div className={threadClassNames.alert({ tone: 'info' })}>관리자만 공유 설정을 바꿀 수 있습니다.</div>
        ) : null}
      </article>

      {info ? <div className={threadClassNames.alert({ tone: 'success' })}>{info}</div> : null}
      {error ? <div className={threadClassNames.alert({ tone: 'error' })}>{error}</div> : null}
    </section>
  );
}
