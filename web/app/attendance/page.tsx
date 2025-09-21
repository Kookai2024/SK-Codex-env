'use client';
// Where to edit: 근태 출근/퇴근 동작을 수정하려면 loadAttendance, handlePunchIn/Out 함수를 확인하세요.
/**
 * @file web/app/attendance/page.tsx
 * @description PocketBase 근태 기록을 조회하고 출근/퇴근을 기록하는 페이지입니다.
 */

import React from 'react';
import { useAuth } from '../providers';

interface AttendanceRecord {
  id: string;
  check_in_at?: string;
  check_out_at?: string;
  note?: string;
}

const ASIA_SEOUL_TZ = 'Asia/Seoul';

function formatDate(date: string | undefined) {
  // 날짜 문자열이 없으면 대시로 표시한다.
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: ASIA_SEOUL_TZ
  }).format(new Date(date));
}

export default function AttendancePage() {
  const { client, user, isAuthenticated } = useAuth(); // 인증 정보를 가져온다.
  const [record, setRecord] = React.useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const loadAttendance = React.useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 포맷을 만든다.
      const results = await client.collection('attendance').getFullList<AttendanceRecord>(1, {
        filter: `user="${user.id}" && work_date="${today}"`,
        sort: '-created'
      });

      setRecord(results[0] ?? null); // 가장 최근 기록을 저장한다.
    } catch (requestError: any) {
      if (requestError?.status === 403) {
        setError('권한이 없어 근태 데이터를 볼 수 없습니다. 관리자에게 문의하세요.');
      } else {
        setError('근태 기록을 불러오지 못했습니다. 서버 상태를 확인하세요.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, user]);

  React.useEffect(() => {
    void loadAttendance(); // 페이지가 로드될 때 근태 기록을 조회한다.
  }, [loadAttendance]);

  const handlePunchIn = async () => {
    if (!user) {
      setError('로그인 후 출근할 수 있습니다.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      if (!record) {
        // 기존 기록이 없으면 새로 생성한다.
        await client.collection('attendance').create({
          user: user.id,
          work_date: today,
          check_in_at: now,
          status: 'in_progress'
        });
      } else {
        // 기존 기록이 있다면 출근 시간만 업데이트한다.
        await client.collection('attendance').update(record.id, {
          check_in_at: now,
          status: 'in_progress'
        });
      }

      setInfo('출근이 기록되었습니다. 좋은 하루 되세요!');
      await loadAttendance();
    } catch (requestError: any) {
      if (requestError?.status === 403) {
        setError('권한이 없어 출근을 기록할 수 없습니다. 관리자에게 문의하세요.');
      } else {
        setError('출근 기록 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!user || !record) {
      setError('퇴근을 기록할 출근 기록이 없습니다.');
      setShowConfirm(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      const now = new Date().toISOString();
      await client.collection('attendance').update(record.id, {
        check_out_at: now,
        status: 'completed'
      });
      setInfo('퇴근이 기록되었습니다. 내일도 화이팅!');
      setShowConfirm(false);
      await loadAttendance();
    } catch (requestError: any) {
      setShowConfirm(false);
      if (requestError?.status === 403) {
        setError('퇴근을 기록할 권한이 없거나 잠금되었습니다. 관리자에게 문의하세요.');
      } else {
        setError('퇴근 기록 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <p className="text-sm">로그인 후 근태를 기록할 수 있습니다.</p>;
  }

  const hasCheckedIn = Boolean(record?.check_in_at);
  const hasCheckedOut = Boolean(record?.check_out_at);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">근태 기록</h1>
        <p className="text-sm text-slate-600">PocketBase의 attendance 컬렉션과 연동됩니다.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="table-like space-y-3">
          <h2 className="text-lg font-semibold">오늘의 기록</h2>
          <p className="text-sm">출근 시간: {formatDate(record?.check_in_at)}</p>
          <p className="text-sm">퇴근 시간: {formatDate(record?.check_out_at)}</p>
          <p className="text-xs text-slate-500">참고 메모: {record?.note ?? '-'}</p>
        </div>

        <div className="table-like space-y-4">
          <button
            className="w-full rounded bg-emerald-600 py-2 text-white disabled:opacity-40"
            onClick={handlePunchIn}
            disabled={isLoading || hasCheckedIn}
          >
            {hasCheckedIn ? '출근 완료' : '출근하기'}
          </button>
          <button
            className="w-full rounded bg-rose-600 py-2 text-white disabled:opacity-40"
            onClick={() => setShowConfirm(true)}
            disabled={isLoading || !hasCheckedIn || hasCheckedOut}
          >
            {hasCheckedOut ? '퇴근 완료' : '퇴근하기'}
          </button>
        </div>
      </div>

      {showConfirm ? (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-xl">
            <p className="text-sm">퇴근을 기록하면 수정이 어려울 수 있습니다. 계속 진행할까요?</p>
            <div className="flex gap-2 text-sm">
              <button className="flex-1 rounded border px-3 py-2" onClick={() => setShowConfirm(false)}>
                취소
              </button>
              <button className="flex-1 rounded bg-rose-600 px-3 py-2 text-white" onClick={handlePunchOut}>
                퇴근 확정
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {info ? <p className="text-sm text-green-600">{info}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
