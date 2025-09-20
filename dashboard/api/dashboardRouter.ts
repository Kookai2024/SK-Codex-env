/**
 * dashboard/api/dashboardRouter.ts
 *
 * Express 라우터를 통해 대시보드 권한별 뷰 API를 제공한다.
 * 모든 응답은 { ok, data, error, timestamp } 구조를 따른다.
 */

import type { Request, Response } from 'express';
import express from 'express';
import { createDashboardService } from './dashboardService';
import {
  DASHBOARD_MESSAGES,
  buildDashboardApiResponse
} from '../utils';
import {
  type DashboardRouterDependencies,
  type DashboardUserContext
} from '../types';

// 요청 헤더 키를 상수로 정의해 중복을 방지한다.
const HEADER_NAMES = {
  USER_ID: 'x-user-id',
  USER_ROLE: 'x-user-role',
  USER_NAME: 'x-user-name'
} as const;

/**
 * 요청 헤더에서 사용자 컨텍스트를 추출한다.
 * @param req Express 요청 객체
 */
function extractUserContext(req: Request): DashboardUserContext | null {
  const id = req.header(HEADER_NAMES.USER_ID);
  const role = req.header(HEADER_NAMES.USER_ROLE) as DashboardUserContext['role'] | undefined;
  const name = req.header(HEADER_NAMES.USER_NAME) ?? undefined;

  // 필수 헤더가 모두 존재하는 경우에만 컨텍스트를 반환한다.
  if (!id || !role) {
    return null;
  }

  return { id, role, name };
}

/**
 * 인증 헤더를 검증하고 실패 시 401 응답을 반환한다.
 * @param req Express 요청 객체
 * @param res Express 응답 객체
 * @param timeProvider 서버 타임스탬프 공급자
 */
function ensureAuthenticated(
  req: Request,
  res: Response,
  timeProvider: () => Date
): DashboardUserContext | null {
  const user = extractUserContext(req);
  if (!user) {
    // 인증 정보가 없으면 즉시 401을 반환한다.
    res.status(401).json(buildDashboardApiResponse(null, DASHBOARD_MESSAGES.UNAUTHENTICATED, timeProvider));
    return null;
  }
  return user;
}

/**
 * 대시보드 REST 라우터를 생성한다.
 * @param deps 서비스 의존성 모음
 */
export function createDashboardRouter(deps: DashboardRouterDependencies) {
  const router = express.Router();
  const service = createDashboardService(deps);
  const timeProvider = deps.timeProvider ?? (() => new Date());

  // JSON 본문 파싱을 라우터 차원에서 적용한다.
  router.use(express.json());

  // 대시보드 개요 엔드포인트
  router.get('/dashboard/overview', async (req, res) => {
    const user = ensureAuthenticated(req, res, timeProvider);
    if (!user) {
      return;
    }

    const result = await service.getOverview(user);
    res.status(result.status).json(result.body);
  });

  return router;
}
