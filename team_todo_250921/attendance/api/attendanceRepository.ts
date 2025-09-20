/**
 * attendance/api/attendanceRepository.ts
 *
 * PocketBase를 사용한 출퇴근 기록 저장소 구현체이다.
 * AttendanceRepository 인터페이스를 구현하여 실제 데이터베이스 연동을 담당한다.
 */

import PocketBase from 'pocketbase';
import {
  type AttendancePunchPayload,
  type AttendanceRecord,
  type AttendanceRepository
} from '../types';

/**
 * PocketBase를 사용한 출퇴근 저장소 구현체
 */
export class PocketBaseAttendanceRepository implements AttendanceRepository {
  private pb: PocketBase;

  constructor(pocketBaseUrl: string = 'http://127.0.0.1:8090') {
    this.pb = new PocketBase(pocketBaseUrl);
  }

  /**
   * PocketBase 인증을 설정한다.
   * @param token 인증 토큰
   */
  setAuthToken(token: string): void {
    this.pb.authStore.save(token);
  }

  /**
   * 특정 사용자의 하루 기록 목록을 조회한다.
   * @param userId 사용자 ID
   * @param dayStartIso 조회 시작 시각(UTC ISO)
   * @param dayEndIso 조회 종료 시각(UTC ISO)
   */
  async listRecordsForDate(
    userId: string,
    dayStartIso: string,
    dayEndIso: string
  ): Promise<AttendanceRecord[]> {
    try {
      // PocketBase 쿼리: 특정 사용자의 해당 날짜 범위 내 출퇴근 기록 조회
      const records = await this.pb.collection('attendance').getList(1, 100, {
        filter: `user = "${userId}" && server_time >= "${dayStartIso}" && server_time <= "${dayEndIso}"`,
        sort: 'server_time',
        expand: 'user'
      });

      // PocketBase 응답을 AttendanceRecord 형태로 변환
      return records.items.map(this.mapPocketBaseRecordToAttendanceRecord);
    } catch (error) {
      console.error('출퇴근 기록 조회 실패:', error);
      throw new Error('출퇴근 기록을 불러오지 못했습니다.');
    }
  }

  /**
   * 새로운 출퇴근 기록을 저장한다.
   * @param payload 저장할 출퇴근 페이로드
   */
  async createRecord(payload: AttendancePunchPayload): Promise<AttendanceRecord> {
    try {
      // PocketBase에 저장할 데이터 형태로 변환
      const pocketBaseData = {
        user: payload.userId,
        type: payload.type === 'PUNCH_IN' ? 'in' : 'out', // PocketBase 스키마에 맞게 변환
        server_time: payload.serverTime,
        ip_address: payload.ipAddress,
        note: payload.note
      };

      // PocketBase에 기록 저장
      const record = await this.pb.collection('attendance').create(pocketBaseData);

      // 저장된 기록을 AttendanceRecord 형태로 변환하여 반환
      return this.mapPocketBaseRecordToAttendanceRecord(record);
    } catch (error) {
      console.error('출퇴근 기록 저장 실패:', error);
      throw new Error('출퇴근 기록을 저장하지 못했습니다.');
    }
  }

  /**
   * PocketBase 응답을 AttendanceRecord 형태로 변환한다.
   * @param pocketBaseRecord PocketBase에서 반환된 출퇴근 기록
   */
  private mapPocketBaseRecordToAttendanceRecord(pocketBaseRecord: any): AttendanceRecord {
    return {
      id: pocketBaseRecord.id,
      userId: pocketBaseRecord.user,
      type: pocketBaseRecord.type === 'in' ? 'PUNCH_IN' : 'PUNCH_OUT',
      serverTime: pocketBaseRecord.server_time,
      ipAddress: pocketBaseRecord.ip_address,
      note: pocketBaseRecord.note || null
    };
  }
}

/**
 * 출퇴근 저장소 인스턴스를 생성하는 팩토리 함수
 * @param pocketBaseUrl PocketBase 서버 URL (기본값: http://127.0.0.1:8090)
 */
export function createAttendanceRepository(pocketBaseUrl?: string): AttendanceRepository {
  return new PocketBaseAttendanceRepository(pocketBaseUrl);
}
