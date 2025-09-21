'use client';
// Where to edit: 칸반 컬럼 구성이나 이동 로직을 수정하려면 KANBAN_COLUMNS와 handleMove 함수를 변경하세요.
/**
 * @file web/app/me/page.tsx
 * @description 개인 업무 칸반을 표시하고 편집 잠금 상태를 시각화하는 페이지입니다.
 */

import React from 'react';
import { useAuth } from '../providers';

interface TodoRecord {
  id: string;
  title: string;
  status: TodoStatus;
  updated?: string;
  created?: string;
}

type TodoStatus = 'prework' | 'design' | 'hold' | 'po_placed' | 'incoming';

const KANBAN_COLUMNS: TodoStatus[] = ['prework', 'design', 'hold', 'po_placed', 'incoming'];
const COLUMN_LABELS: Record<TodoStatus, string> = {
  prework: '사전 준비',
  design: '설계 중',
  hold: '보류',
  po_placed: '발주 완료',
  incoming: '입고 예정'
};

const ASIA_SEOUL_TZ = 'Asia/Seoul';
function buildSeoulDateKey(date: Date) {
  // en-CA 포맷은 YYYY-MM-DD 형식이라 문자열 분해가 쉽다.
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: ASIA_SEOUL_TZ });
  return formatter.format(date);
}

function computeLockDeadline(updatedAt: string | undefined, createdAt: string | undefined) {
  const referenceIso = updatedAt ?? createdAt;
  if (!referenceIso) {
    return null;
  }

  const referenceDate = new Date(referenceIso);
  const [year, month, day] = buildSeoulDateKey(referenceDate).split('-').map((part) => Number(part));
  const utcDeadline = Date.UTC(year, month - 1, day + 1, 0, 0, 0); // KST 09:00은 UTC 00:00에 해당한다.
  return new Date(utcDeadline);
}

function isLockedForUser(todo: TodoRecord, role: 'admin' | 'member' | 'guest') {
  if (role === 'admin') {
    return false;
  }

  const deadline = computeLockDeadline(todo.updated, todo.created);
  if (!deadline) {
    return false;
  }

  return Date.now() > deadline.getTime();
}

export default function PersonalKanbanPage() {
  const { client, user, role, isAuthenticated } = useAuth();
  const [columns, setColumns] = React.useState<Record<TodoStatus, TodoRecord[]>>({
    prework: [],
    design: [],
    hold: [],
    po_placed: [],
    incoming: []
  });
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadTodos = React.useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const records = await client.collection('todos').getFullList<TodoRecord>(200, {
        filter: `assignee="${user.id}"`,
        sort: '+updated,+created'
      });

      const grouped: Record<TodoStatus, TodoRecord[]> = {
        prework: [],
        design: [],
        hold: [],
        po_placed: [],
        incoming: []
      };

      for (const todo of records) {
        // 존재하지 않는 상태는 보류 컬럼으로 이동시켜 정합성을 유지한다.
        const status = todo.status ?? 'hold';
        grouped[status]?.push(todo);
      }

      setColumns(grouped);
    } catch (requestError: any) {
      if (requestError?.status === 403) {
        setError('할 일을 불러올 권한이 없습니다. 관리자에게 문의하세요.');
      } else {
        setError('할 일을 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, user]);

  React.useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  const handleMove = async (todo: TodoRecord, direction: 1 | -1) => {
    const currentIndex = KANBAN_COLUMNS.indexOf(todo.status);
    const nextIndex = currentIndex + direction;
    const nextStatus = KANBAN_COLUMNS[nextIndex];

    if (nextStatus === undefined) {
      return; // 이동 가능한 위치가 없으면 조용히 반환한다.
    }

    if (isLockedForUser(todo, role)) {
      setError('편집 잠금 상태입니다. 잠금 해제 후 다시 시도하세요.');
      return;
    }

    try {
      await client.collection('todos').update(todo.id, { status: nextStatus });
      setInfo(`${todo.title} 작업이 ${COLUMN_LABELS[nextStatus]} 단계로 이동했습니다.`);
      await loadTodos();
    } catch (requestError: any) {
      if (requestError?.status === 403) {
        setError('서버에서 잠금이 감지되었습니다. 관리자 승인 후 다시 시도하세요.');
      } else {
        setError('작업 이동 중 오류가 발생했습니다.');
      }
    }
  };

  if (!isAuthenticated) {
    return <p className="text-sm">로그인 후 개인 칸반을 확인할 수 있습니다.</p>;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">내 업무 칸반</h1>
        <p className="text-sm text-slate-600">다음 날 오전 9시 이후에는 관리자만 수정 가능합니다.</p>
      </header>

      {isLoading ? <p className="text-sm">작업을 불러오는 중입니다...</p> : null}

      <div className="grid gap-4 md:grid-cols-5">
        {KANBAN_COLUMNS.map((columnKey) => {
          const todosInColumn = columns[columnKey];
          return (
            <div key={columnKey} className="table-like space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{COLUMN_LABELS[columnKey]}</h2>
                <span className="rounded-full bg-slate-200 px-3 py-0.5 text-xs">{todosInColumn.length}</span>
              </div>

              <div className="space-y-3">
                {todosInColumn.map((todoItem) => {
                  const locked = isLockedForUser(todoItem, role);
                  return (
                    <article key={todoItem.id} className="space-y-3 rounded border bg-white p-3 text-sm shadow">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{todoItem.title}</h3>
                        {locked ? <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">LOCK</span> : null}
                      </div>
                      <div className="flex gap-2 text-xs text-slate-500">
                        <span>수정: {todoItem.updated ? buildSeoulDateKey(new Date(todoItem.updated)) : '-'}</span>
                        <span>생성: {todoItem.created ? buildSeoulDateKey(new Date(todoItem.created)) : '-'}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <button
                          className="flex-1 rounded border px-2 py-1 disabled:opacity-40"
                          onClick={() => handleMove(todoItem, -1)}
                          disabled={locked || role === 'guest' || KANBAN_COLUMNS.indexOf(todoItem.status) === 0}
                        >
                          이전 단계
                        </button>
                        <button
                          className="flex-1 rounded border px-2 py-1 disabled:opacity-40"
                          onClick={() => handleMove(todoItem, 1)}
                          disabled={locked || role === 'guest' || KANBAN_COLUMNS.indexOf(todoItem.status) === KANBAN_COLUMNS.length - 1}
                        >
                          다음 단계
                        </button>
                      </div>
                    </article>
                  );
                })}

                {todosInColumn.length === 0 ? (
                  <p className="text-xs text-slate-500">현재 항목이 없습니다.</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {info ? <p className="text-sm text-green-600">{info}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
