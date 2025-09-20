/**
 * todos/api/todoRouter.ts
 *
 * Express 라우터를 통해 Todo REST API 엔드포인트를 제공한다.
 * 모든 응답은 { ok, data, error, timestamp } 구조를 따른다.
 */

import type { Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import {
  type TodoServiceDependencies,
  type TodoUserContext,
  type TodoCreatePayload,
  type TodoUpdatePayload,
  TODO_STATUS
} from '../types';
import { createTodoService } from './todoService';

// 헤더 이름을 상수로 관리
const HEADER_NAMES = {
  USER_ID: 'x-user-id',
  USER_ROLE: 'x-user-role',
  USER_NAME: 'x-user-name'
} as const;

// Todo 생성 요청 본문 스키마
const TodoCreateSchema = z
  .object({
    projectId: z.string().min(1, '프로젝트 ID는 필수입니다'),
    title: z.string().min(1, '제목은 필수입니다').max(200, '제목은 200자 이하여야 합니다'),
    description: z.string().max(1000).optional().nullable(),
    issue: z.string().max(1000).optional().nullable(),
    solution: z.string().max(1000).optional().nullable(),
    decision: z.string().max(1000).optional().nullable(),
    status: z.enum([TODO_STATUS.PREWORK, TODO_STATUS.DESIGN, TODO_STATUS.HOLD, TODO_STATUS.PO_PLACED, TODO_STATUS.INCOMING]),
    notes: z.string().max(500).optional().nullable(),
    dueDate: z.string().datetime().optional().nullable()
  })
  .strict();

// Todo 수정 요청 본문 스키마
const TodoUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional().nullable(),
    issue: z.string().max(1000).optional().nullable(),
    solution: z.string().max(1000).optional().nullable(),
    decision: z.string().max(1000).optional().nullable(),
    status: z.enum([TODO_STATUS.PREWORK, TODO_STATUS.DESIGN, TODO_STATUS.HOLD, TODO_STATUS.PO_PLACED, TODO_STATUS.INCOMING]).optional(),
    notes: z.string().max(500).optional().nullable(),
    dueDate: z.string().datetime().optional().nullable()
  })
  .strict();

// Todo 상태 변경 요청 본문 스키마
const TodoStatusUpdateSchema = z
  .object({
    status: z.enum([TODO_STATUS.PREWORK, TODO_STATUS.DESIGN, TODO_STATUS.HOLD, TODO_STATUS.PO_PLACED, TODO_STATUS.INCOMING])
  })
  .strict();

// 필터 쿼리 파라미터 스키마
const TodoFiltersSchema = z
  .object({
    status: z.string().optional().transform(val => val ? val.split(',') : undefined),
    projectIds: z.string().optional().transform(val => val ? val.split(',') : undefined),
    userIds: z.string().optional().transform(val => val ? val.split(',') : undefined),
    dueDateFrom: z.string().datetime().optional(),
    dueDateTo: z.string().datetime().optional(),
    searchText: z.string().max(100).optional()
  })
  .strict();

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
 * 사용자 헤더가 존재하는지 선행 검증한다.
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
 * @param deps TodoServiceDependencies
 */
export function createTodoRouter(deps: TodoServiceDependencies) {
  const router = express.Router();
  const service = createTodoService(deps);

  // JSON 파싱 미들웨어
  router.use(express.json());

  // Todo 목록 조회 엔드포인트
  router.get('/todos', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    try {
      // 쿼리 파라미터 파싱
      const filtersResult = TodoFiltersSchema.safeParse(req.query);
      const filters = filtersResult.success ? filtersResult.data : undefined;

      const result = await service.listTodos(user, filters);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        data: null,
        error: '서버 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      });
    }
  });

  // 특정 Todo 조회 엔드포인트
  router.get('/todos/:id', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        ok: false,
        data: null,
        error: 'Todo ID가 필요합니다.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await service.getTodo(user, id);
    res.status(result.ok ? 200 : 400).json(result);
  });

  // Todo 생성 엔드포인트
  router.post('/todos', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const parseResult = TodoCreateSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        data: null,
        error: '요청 본문이 유효하지 않습니다.',
        details: parseResult.error.errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await service.createTodo(user, parseResult.data as TodoCreatePayload);
    res.status(result.ok ? 201 : 400).json(result);
  });

  // Todo 수정 엔드포인트
  router.put('/todos/:id', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        ok: false,
        data: null,
        error: 'Todo ID가 필요합니다.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const parseResult = TodoUpdateSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        data: null,
        error: '요청 본문이 유효하지 않습니다.',
        details: parseResult.error.errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await service.updateTodo(user, id, parseResult.data as TodoUpdatePayload);
    res.status(result.ok ? 200 : 400).json(result);
  });

  // Todo 삭제 엔드포인트
  router.delete('/todos/:id', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        ok: false,
        data: null,
        error: 'Todo ID가 필요합니다.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await service.deleteTodo(user, id);
    res.status(result.ok ? 200 : 400).json(result);
  });

  // Todo 상태 변경 엔드포인트 (드래그 앤 드롭용)
  router.patch('/todos/:id/status', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        ok: false,
        data: null,
        error: 'Todo ID가 필요합니다.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const parseResult = TodoStatusUpdateSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(400).json({
        ok: false,
        data: null,
        error: '요청 본문이 유효하지 않습니다.',
        details: parseResult.error.errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await service.updateTodoStatus(user, id, parseResult.data.status);
    res.status(result.ok ? 200 : 400).json(result);
  });

  // 칸반 보드 조회 엔드포인트
  router.get('/todos/kanban', async (req, res) => {
    const user = ensureAuthenticated(req, res);
    if (!user) {
      return;
    }

    try {
      // 쿼리 파라미터 파싱
      const filtersResult = TodoFiltersSchema.safeParse(req.query);
      const filters = filtersResult.success ? filtersResult.data : undefined;

      const result = await service.getKanbanBoard(user, filters);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        data: null,
        error: '서버 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
