'use client';
// Where to edit: 근태 출근/퇴근 동작을 수정하려면 loadAttendance, handlePunchIn/Out 함수를 확인하세요.
/**
 * @file web/app/attendance/page.tsx
 * @description PocketBase 근태 기록을 최신 스레드형 카드 UI로 조회하고 출근/퇴근을 기록하는 페이지이다.
 */

import React from 'react';
import { threadClassNames } from '../../features/design-system/ui/threadClassNames';
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
    return (
      <section className={threadClassNames.section}>
        <article className={threadClassNames.panel({ variant: 'muted' })}>
          <p className={threadClassNames.muted}>로그인 후 근태를 기록할 수 있습니다.</p>
        </article>
      </section>
    );
  }

  const hasCheckedIn = Boolean(record?.check_in_at);
  const hasCheckedOut = Boolean(record?.check_out_at);

  return (
    <section className={threadClassNames.section}>
      <header className={threadClassNames.sectionHeader}>
        <span className={threadClassNames.eyebrow}>Attendance Thread</span>
        <h1 className={threadClassNames.title}>근태 기록</h1>
        <p className={threadClassNames.subtitle}>PocketBase의 attendance 컬렉션과 연동되어 역할에 맞춘 기록 흐름을 제공합니다.</p>
      </header>

      <div className={threadClassNames.grid({ layout: 'two' })}>
        {/* 오늘의 기록을 타임라인 카드로 보여준다. */}
        <article className={threadClassNames.panel()}>
          <div className={threadClassNames.meta}>
            <span>출근 · {formatDate(record?.check_in_at)}</span>
            <span>퇴근 · {formatDate(record?.check_out_at)}</span>
          </div>
          <h2>오늘의 기록</h2>
          <p className={threadClassNames.panelDescription}>현재 날짜 기준으로 가장 최신 근태 정보를 불러옵니다.</p>
          <div className={threadClassNames.cardDivider} />
          <div className={threadClassNames.meta}>
            <span className={threadClassNames.pill({ tone: hasCheckedIn ? 'accent' : 'default' })}>
              {hasCheckedIn ? '출근 완료' : '출근 대기'}
            </span>
            <span className={threadClassNames.pill({ tone: hasCheckedOut ? 'accent' : 'default' })}>
              {hasCheckedOut ? '퇴근 완료' : '퇴근 대기'}
            </span>
          </div>
          <p className={threadClassNames.muted}>참고 메모 · {record?.note ?? '-'}</p>
        </article>

        {/* 출근/퇴근 액션 영역을 구성한다. */}
        <article className={threadClassNames.panel()}>
          <h2>액션</h2>
          <p className={threadClassNames.panelDescription}>근태 버튼을 눌러 스레드에 새로운 이벤트를 추가하세요.</p>
          <div className={threadClassNames.cardDivider} />
          <button
            className={threadClassNames.button({ variant: 'primary' })}
            onClick={handlePunchIn}
            disabled={isLoading || hasCheckedIn}
          >
            {hasCheckedIn ? '출근 완료' : '출근 기록하기'}
          </button>
          <button
            className={threadClassNames.button({ variant: 'danger' })}
            onClick={() => setShowConfirm(true)}
            disabled={isLoading || !hasCheckedIn || hasCheckedOut}
          >
            {hasCheckedOut ? '퇴근 완료' : '퇴근 요청하기'}
          </button>
          <p className={threadClassNames.muted}>퇴근은 한 번 기록하면 수정이 어려우니 주의하세요.</p>
        </article>
      </div>

      {showConfirm ? (
        <div className={threadClassNames.modal} role="dialog" aria-modal="true">
          <div className={threadClassNames.modalCard}>
            <h2>퇴근을 기록할까요?</h2>
            <p className={threadClassNames.muted}>퇴근을 확정하면 편집 잠금이 적용될 수 있습니다. 계속 진행할지 선택하세요.</p>
            <div className={threadClassNames.modalActions}>
              <button className={threadClassNames.button({ variant: 'ghost' })} onClick={() => setShowConfirm(false)}>
                취소
              </button>
              <button className={threadClassNames.button({ variant: 'danger' })} onClick={handlePunchOut}>
                퇴근 확정
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {info ? <div className={threadClassNames.alert({ tone: 'success' })}>{info}</div> : null}
      {error ? <div className={threadClassNames.alert({ tone: 'error' })}>{error}</div> : null}
    </section>
  );
}
