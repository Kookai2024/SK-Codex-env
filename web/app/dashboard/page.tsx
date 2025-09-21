'use client';
// Where to edit: 대시보드 카드 구성이나 권한별 UI를 변경하려면 SUMMARY_TILES와 fetchSummaries를 업데이트하세요.
/**
 * @file web/app/dashboard/page.tsx
 * @description 역할 기반 대시보드와 공유 제어 UI를 제공하는 페이지입니다.
 */

import React from 'react';
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
    return <p className="text-sm">로그인 후 대시보드를 확인할 수 있습니다.</p>;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-slate-600">역할({role})에 따라 노출되는 정보가 다릅니다.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <article key={tile.id} className="table-like space-y-2">
            <h2 className="text-lg font-semibold">{tile.label}</h2>
            <p className="text-xs text-slate-500">{tile.description}</p>
            <p className="text-3xl font-bold">{tile.count}</p>
          </article>
        ))}
      </div>

      <section className="table-like space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">공유 설정</h2>
            <p className="text-xs text-slate-500">주간 보고서를 지정된 Obsidian 폴더에 복사하도록 설정합니다.</p>
          </div>
          <button
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40"
            onClick={handleSharingToggle}
            disabled={role !== 'admin'}
          >
            {sharingEnabled ? '공유 비활성화' : '공유 활성화'}
          </button>
        </header>
        {role !== 'admin' ? (
          <p className="text-xs text-amber-600">관리자만 공유 설정을 바꿀 수 있습니다.</p>
        ) : null}
      </section>

      {info ? <p className="text-sm text-green-600">{info}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
