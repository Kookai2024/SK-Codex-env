/**
 * todos/api/todoRouter.ts
 *
 * Todo 칸반 보드 및 편집 잠금 규칙을 노출하는 Express 라우터이다.
 * REST 원칙에 따라 { ok, data, error, timestamp } 구조로 응답한다.
 */

import type { Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import {
  TODO_STATUSES,
  type TodoRouterDependencies,
  type TodoUserContext
} from '../types';
import { createTodoService } from './todoService';

// 공통 헤더 이름을 상수로 유지해 하드코딩을 피한다.
const HEADER_NAMES = {
  USER_ID: 'x-user-id',
  USER_ROLE: 'x-user-role',
  USER_NAME: 'x-user-name'
} as const;

// 상태 값 검증을 위해 문자열 배열을 생성한다.
const STATUS_VALUES = Object.values(TODO_STATUSES) as [string, ...string[]];

// Todo 업데이트 요청 스키마를 정의한다.
const TodoUpdateSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional().nullable(),
    status: z.enum(STATUS_VALUES).optional(),
    issue: z.string().max(1000).optional().nullable(),
    solution: z.string().max(1000).optional().nullable(),
    decision: z.string().max(1000).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    dueDate: z
      .string()
      .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
      .optional()
      .nullable()
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: '수정할 필드를 한 개 이상 전달해야 합니다.'
  });

/**
 * 요청 헤더에서 사용자 정보를 추출한다.
 * @param req Express Request 객체
 */
function extractUserContext(req: Request): TodoUserContext | null {
  const userId = req.header(HEADER_NAMES.USER_ID);
  const role = req.header(HEADER_NAMES.USER_ROLE) as TodoUserContext['role'] | undefined;
  const name = req.header(HEADER_NAMES.USER_NAME) ?? undefined;

  if (!userId || !role) {
    return null;
  }

  return { id: userId, role, name };
}

/**
 * 인증 헤더가 존재하는지 검증하고 없으면 401 응답을 반환한다.
 * @param req Express Request 객체
 * @param res Express Response 객체
 */
function ensureAuthenticated(req: Request, res: Response): TodoUserContext | null {
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
 * Todo REST 라우터를 생성한다.
 * @param deps TodoRouterDependencies
 */
export function createTodoRouter(deps: TodoRouterDependencies) {
  const router = express.Router();
  const service = createTodoService(deps);

  // JSON 파싱 미들웨어를 라우터에 적용한다.
  router.use(express.json());

  // 칸반 보드를 조회하는 엔드포인트이다.
  router.get('/todos/board', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const projectId = Array.isArray(req.query.projectId) ? req.query.projectId[0] : req.query.projectId;
    const result = await service.getBoard(user, { projectId: projectId ?? null });
    res.status(result.status).json(result.body);
  });

  // Todo 레코드를 수정하는 엔드포인트이다.
  router.patch('/todos/:id', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const parseResult = TodoUpdateSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        data: null,
        error: parseResult.error.errors[0]?.message ?? '요청 본문이 유효하지 않습니다.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await service.updateTodo(user, req.params.id, parseResult.data);
    res.status(result.status).json(result.body);
  });

  return router;
}
