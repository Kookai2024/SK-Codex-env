/**
 * todos/ui/TodoKanbanBoard.tsx
 *
 * Todo 칸반 보드 UI 컴포넌트이다.
 * 드래그 앤 드롭 기능과 편집 잠금 상태를 표시한다.
 */

import React, { useState, useCallback } from 'react';
import {
  type TodoItem,
  type KanbanBoard,
  type KanbanColumn,
  TODO_STATUS,
  type TodoUserContext
} from '../types';

// CSS 클래스 상수
const CLASS_NAMES = {
  BOARD: 'todo-kanban-board p-4 bg-gray-50 min-h-screen',
  HEADER: 'mb-6',
  TITLE: 'text-2xl font-bold text-gray-800 mb-2',
  STATS: 'flex gap-4 text-sm text-gray-600',
  COLUMNS: 'flex gap-4 overflow-x-auto pb-4',
  COLUMN: 'flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border',
  COLUMN_HEADER: 'p-4 border-b bg-gray-50 rounded-t-lg',
  COLUMN_TITLE: 'font-semibold text-gray-800',
  COLUMN_COUNT: 'ml-2 px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs',
  COLUMN_CONTENT: 'p-4 min-h-96',
  CARD: 'bg-white border rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow cursor-move',
  CARD_LOCKED: 'opacity-60 cursor-not-allowed',
  CARD_HEADER: 'flex justify-between items-start mb-2',
  CARD_TITLE: 'font-medium text-gray-800 text-sm',
  CARD_PROJECT: 'text-xs text-blue-600 font-medium',
  CARD_DESCRIPTION: 'text-sm text-gray-600 mb-2',
  CARD_META: 'flex justify-between items-center text-xs text-gray-500',
  CARD_DUE_DATE: 'flex items-center gap-1',
  DUE_DATE_OVERDUE: 'text-red-600',
  DUE_DATE_TODAY: 'text-orange-600',
  DUE_DATE_NORMAL: 'text-gray-500',
  LOCK_ICON: 'text-red-500 text-xs',
  EMPTY_COLUMN: 'text-center text-gray-400 py-8',
  DRAG_OVER: 'border-blue-300 bg-blue-50'
} as const;

// 컴포넌트 props 타입
export interface TodoKanbanBoardProps {
  /** 칸반 보드 데이터 */
  kanbanBoard: KanbanBoard;
  /** 사용자 컨텍스트 */
  user: TodoUserContext;
  /** Todo 카드 클릭 시 호출할 함수 */
  onTodoClick?: (todo: TodoItem) => void;
  /** Todo 상태 변경 시 호출할 함수 (드래그 앤 드롭) */
  onStatusChange?: (todoId: string, newStatus: string) => void;
  /** 로딩 상태 */
  loading?: boolean;
}

/**
 * Todo 카드 컴포넌트
 */
interface TodoCardProps {
  todo: TodoItem;
  user: TodoUserContext;
  onClick?: (todo: TodoItem) => void;
  onStatusChange?: (todoId: string, newStatus: string) => void;
}

const TodoCard: React.FC<TodoCardProps> = ({ todo, user, onClick, onStatusChange }) => {
  const [isDragging, setIsDragging] = useState(false);

  // 편집 잠금 상태 계산
  const isLocked = todo.lockedAt && user.role !== 'admin';
  const canEdit = !isLocked || user.role === 'admin';

  // 마감일 상태 계산
  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return { className: '', text: '' };
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { className: CLASS_NAMES.DUE_DATE_OVERDUE, text: `${Math.abs(diffDays)}일 지연` };
    } else if (diffDays === 0) {
      return { className: CLASS_NAMES.DUE_DATE_TODAY, text: '오늘 마감' };
    } else if (diffDays <= 3) {
      return { className: CLASS_NAMES.DUE_DATE_NORMAL, text: `${diffDays}일 후` };
    }
    
    return { className: CLASS_NAMES.DUE_DATE_NORMAL, text: due.toLocaleDateString() };
  };

  const dueDateStatus = getDueDateStatus(todo.dueDate);

  // 드래그 시작 핸들러
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', todo.id);
    e.dataTransfer.effectAllowed = 'move';
  }, [todo.id, canEdit]);

  // 드래그 종료 핸들러
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 카드 클릭 핸들러
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(todo);
    }
  }, [todo, onClick]);

  return (
    <div
      className={`${CLASS_NAMES.CARD} ${isDragging ? 'opacity-50' : ''} ${!canEdit ? CLASS_NAMES.CARD_LOCKED : ''}`}
      draggable={canEdit}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      <div className={CLASS_NAMES.CARD_HEADER}>
        <h4 className={CLASS_NAMES.CARD_TITLE}>{todo.title}</h4>
        {!canEdit && <span className={CLASS_NAMES.LOCK_ICON}>🔒</span>}
      </div>
      
      <div className={CLASS_NAMES.CARD_PROJECT}>
        {todo.projectCode} - {todo.projectName}
      </div>
      
      {todo.description && (
        <p className={CLASS_NAMES.CARD_DESCRIPTION}>{todo.description}</p>
      )}
      
      <div className={CLASS_NAMES.CARD_META}>
        <div className={CLASS_NAMES.CARD_DUE_DATE}>
          {todo.dueDate && (
            <span className={dueDateStatus.className}>
              📅 {dueDateStatus.text}
            </span>
          )}
        </div>
        {!canEdit && <span className="text-xs text-red-500">편집 잠금</span>}
      </div>
    </div>
  );
};

/**
 * 칸반 컬럼 컴포넌트
 */
interface KanbanColumnProps {
  column: KanbanColumn;
  user: TodoUserContext;
  onTodoClick?: (todo: TodoItem) => void;
  onStatusChange?: (todoId: string, newStatus: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  column, 
  user, 
  onTodoClick, 
  onStatusChange 
}) => {
  const [dragOver, setDragOver] = useState(false);

  // 드래그 오버 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  // 드래그 리브 핸들러
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // 드롭 핸들러
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const todoId = e.dataTransfer.getData('text/plain');
    if (todoId && onStatusChange && column.status !== '') {
      onStatusChange(todoId, column.status);
    }
  }, [column.status, onStatusChange]);

  return (
    <div 
      className={`${CLASS_NAMES.COLUMN} ${dragOver ? CLASS_NAMES.DRAG_OVER : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={CLASS_NAMES.COLUMN_HEADER}>
        <h3 className={CLASS_NAMES.COLUMN_TITLE}>
          {column.label}
          <span className={CLASS_NAMES.COLUMN_COUNT}>
            {column.items.length}
          </span>
        </h3>
      </div>
      
      <div className={CLASS_NAMES.COLUMN_CONTENT}>
        {column.items.length === 0 ? (
          <div className={CLASS_NAMES.EMPTY_COLUMN}>
            여기에 Todo를 드롭하세요
          </div>
        ) : (
          column.items.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              user={user}
              onClick={onTodoClick}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Todo 칸반 보드 메인 컴포넌트
 */
export const TodoKanbanBoard: React.FC<TodoKanbanBoardProps> = ({
  kanbanBoard,
  user,
  onTodoClick,
  onStatusChange,
  loading = false
}) => {
  if (loading) {
    return (
      <div className={CLASS_NAMES.BOARD}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">칸반 보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={CLASS_NAMES.BOARD}>
      <div className={CLASS_NAMES.HEADER}>
        <h1 className={CLASS_NAMES.TITLE}>Todo 칸반 보드</h1>
        <div className={CLASS_NAMES.STATS}>
          <span>전체: {kanbanBoard.stats.total}개</span>
          <span>지연: {kanbanBoard.stats.overdue}개</span>
          <span>오늘 마감: {kanbanBoard.stats.dueToday}개</span>
        </div>
      </div>
      
      <div className={CLASS_NAMES.COLUMNS}>
        {kanbanBoard.columns.map((column) => (
          <KanbanColumn
            key={column.status}
            column={column}
            user={user}
            onTodoClick={onTodoClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
};

TodoKanbanBoard.displayName = 'TodoKanbanBoard';
