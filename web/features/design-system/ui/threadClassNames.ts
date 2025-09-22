/**
 * @file web/features/design-system/ui/threadClassNames.ts
 * @description 스레드형 CSS 모듈을 조합해 기능별 클래스를 추상화한 헬퍼를 제공한다.
 */

import layoutStyles from '../styles/thread/layout.module.css';
import componentStyles from '../styles/thread/components.module.css';
import workflowStyles from '../styles/thread/workflow.module.css';

/** 카드 레이아웃에 적용할 수 있는 변형 값 목록 */
export type ThreadPanelVariant = 'default' | 'accent' | 'muted' | 'stat';
/** 그리드 배치 변형 목록 */
export type ThreadGridLayout = 'default' | 'two' | 'four' | 'kanban';
/** 버튼 스타일 변형 목록 */
export type ThreadButtonVariant = 'default' | 'primary' | 'danger' | 'ghost' | 'link';
/** 필 배지 색상 변형 목록 */
export type ThreadPillTone = 'default' | 'accent';
/** 알림 배경 변형 목록 */
export type ThreadAlertTone = 'success' | 'error' | 'info';
/** 탭 버튼 상태 옵션 */
export interface ThreadTabOptions {
  /** 현재 탭이 활성화 상태인지 여부 */
  isActive?: boolean;
}

/**
 * @description 조건부 클래스를 합쳐주는 유틸리티로 falsy 값은 자동으로 제거한다.
 */
export function composeThreadClasses(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' '); // 전달된 클래스 중 유효한 값만 연결한다.
}

/**
 * @description 전역에서 재사용할 스레드형 UI 클래스 모음이다.
 * @remarks 모듈 간 경계를 유지하면서도 호출부에서는 단일 객체처럼 다룰 수 있게 한다.
 */
export const threadClassNames = {
  appBackground: layoutStyles.appBackground,
  appShell: layoutStyles.appShell,
  appContainer: layoutStyles.appContainer,
  main: layoutStyles.main,
  navbar: layoutStyles.navbar,
  navbarBrand: layoutStyles.navbarBrand,
  navbarBrandMark: layoutStyles.navbarBrandMark,
  navLinks: layoutStyles.navLinks,
  navLink: (options?: { isPrimary?: boolean }) =>
    composeThreadClasses(
      layoutStyles.navLink,
      options?.isPrimary && layoutStyles.navLinkPrimary // 기본 링크에 프라이머리 강조를 적용한다.
    ),
  navbarMeta: layoutStyles.navbarMeta,
  section: componentStyles.section,
  sectionHeader: componentStyles.sectionHeader,
  eyebrow: componentStyles.eyebrow,
  title: componentStyles.title,
  subtitle: componentStyles.subtitle,
  panel: (options?: { variant?: ThreadPanelVariant }) =>
    composeThreadClasses(
      componentStyles.panel,
      options?.variant === 'accent' && componentStyles.panelAccent,
      options?.variant === 'muted' && componentStyles.panelMuted,
      options?.variant === 'stat' && componentStyles.panelStat // 통계 카드는 간격 변형을 적용한다.
    ),
  panelMetric: componentStyles.panelMetric,
  panelDescription: componentStyles.panelDescription,
  grid: (options?: { layout?: ThreadGridLayout }) =>
    composeThreadClasses(
      componentStyles.grid,
      options?.layout === 'two' && componentStyles.gridTwo,
      options?.layout === 'four' && componentStyles.gridFour,
      options?.layout === 'kanban' && componentStyles.gridKanban // 칸반 보드는 고정 폭 컬럼을 사용한다.
    ),
  pill: (options?: { tone?: ThreadPillTone }) =>
    composeThreadClasses(componentStyles.pill, options?.tone === 'accent' && componentStyles.pillAccent),
  button: (options?: { variant?: ThreadButtonVariant }) =>
    composeThreadClasses(
      componentStyles.button,
      options?.variant === 'primary' && componentStyles.buttonPrimary,
      options?.variant === 'danger' && componentStyles.buttonDanger,
      options?.variant === 'ghost' && componentStyles.buttonGhost,
      options?.variant === 'link' && componentStyles.buttonLink
    ),
  form: componentStyles.form,
  field: componentStyles.field,
  label: componentStyles.label,
  select: componentStyles.select,
  tabList: componentStyles.tabList,
  tabButton: (options?: ThreadTabOptions) =>
    composeThreadClasses(componentStyles.tabButton, options?.isActive && componentStyles.tabButtonActive),
  input: componentStyles.input,
  alert: (options?: { tone?: ThreadAlertTone }) =>
    composeThreadClasses(
      componentStyles.alert,
      options?.tone === 'success' && componentStyles.alertSuccess,
      options?.tone === 'error' && componentStyles.alertError,
      options?.tone === 'info' && componentStyles.alertInfo
    ),
  meta: componentStyles.meta,
  helper: componentStyles.helper,
  cardDivider: componentStyles.cardDivider,
  muted: componentStyles.muted,
  timeline: workflowStyles.timeline,
  timelineItem: workflowStyles.timelineItem,
  timelineBadge: workflowStyles.timelineBadge,
  timelineBody: workflowStyles.timelineBody,
  timelineTitle: workflowStyles.timelineTitle,
  timelineHint: workflowStyles.timelineHint,
  kanbanColumn: workflowStyles.kanbanColumn,
  kanbanCard: (options?: { isLocked?: boolean }) =>
    composeThreadClasses(
      workflowStyles.kanbanCard,
      options?.isLocked && workflowStyles.kanbanCardLocked // 편집 잠금 상태를 시각적으로 표시한다.
    ),
  kanbanCardBadge: workflowStyles.kanbanCardBadge,
  kanbanCardMeta: workflowStyles.kanbanCardMeta,
  kanbanCardActions: workflowStyles.kanbanCardActions,
  modal: workflowStyles.modal,
  modalCard: workflowStyles.modalCard,
  modalActions: workflowStyles.modalActions
} as const;
