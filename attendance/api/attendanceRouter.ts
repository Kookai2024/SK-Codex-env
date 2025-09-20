/**
 * attendance/api/attendanceRouter.ts
 *
 * Express 라우터를 통해 출퇴근 REST API 엔드포인트를 제공한다.
 * 모든 응답은 { ok, data, error, timestamp } 구조를 따른다.
 */

import type { Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import {
  type AttendanceServiceDependencies,
  type AttendanceUserContext
} from '../types';
import { createAttendanceService } from './attendanceService';

// 헤더 이름을 상수로 관리해 하드코딩을 피한다.
const HEADER_NAMES = {
  USER_ID: 'x-user-id',
  USER_ROLE: 'x-user-role',
  USER_NAME: 'x-user-name'
} as const;

// 허용된 요청 본문 구조를 zod로 검증한다.
const PunchBodySchema = z
  .object({
    note: z.string().max(200).optional().nullable()
  })
  .strict();

/**
 * 요청 헤더에서 사용자 정보를 추출한다.
 * @param req Express Request 객체
 */
function extractUserContext(req: Request): AttendanceUserContext | null {
  const userId = req.header(HEADER_NAMES.USER_ID);
  const role = req.header(HEADER_NAMES.USER_ROLE) as AttendanceUserContext['role'] | undefined;
  const name = req.header(HEADER_NAMES.USER_NAME) ?? undefined;

  if (!userId || !role) {
    return null;
  }

  return { id: userId, role, name };
}

/**
 * 사용자 헤더가 존재하는지 선행 검증한다.
 * @param req Express Request 객체
 * @param res Express Response 객체
 */
function ensureAuthenticated(req: Request, res: Response): AttendanceUserContext | null {
  const user = extractUserContext(req);
  if (!user) {
    res.status(401).json({
      ok: false,
      data: null,
      error: '사용자 인증 정보가 필요합니다.',
      timestamp: new Date().toISOString()
    });
    return null;
  }
  return user;
}

/**
 * 출퇴근 REST 라우터를 생성한다.
 * @param deps AttendanceServiceDependencies
 */
export function createAttendanceRouter(deps: AttendanceServiceDependencies) {
  const router = express.Router();
  const service = createAttendanceService(deps);

  // JSON 파싱 미들웨어를 라우터 수준에서 적용한다.
  router.use(express.json());

  // 오늘 출퇴근 상태 조회 엔드포인트
  router.get('/attendance/today', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const result = await service.getTodayStatus(user);
    res.status(result.ok ? 200 : 400).json(result);
  });

  // 출근 처리 엔드포인트
  router.post('/attendance/punch-in', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const parseResult = PunchBodySchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        data: null,
        error: '요청 본문이 유효하지 않습니다.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await service.punchIn(user, req.ip, parseResult.data.note ?? null);
    res.status(result.ok ? 200 : 400).json(result);
  });

  // 퇴근 처리 엔드포인트
  router.post('/attendance/punch-out', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const parseResult = PunchBodySchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        data: null,
        error: '요청 본문이 유효하지 않습니다.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await service.punchOut(user, req.ip, parseResult.data.note ?? null);
    res.status(result.ok ? 200 : 400).json(result);
  });

  return router;
}
