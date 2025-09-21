/**
 * @file web/lib/ui/thread/threadStyles.ts
 * @description 스레드형 UI 전용 CSS Module을 함수형 헬퍼로 감싸 재사용하기 쉽게 만든다.
 */

import threadModule from './thread.module.css';

/**
 * @description 조건부 클래스를 합쳐주는 유틸리티로, falsy 값은 자동으로 제거한다.
 */
export function composeThreadClasses(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' '); // 전달된 클래스 중 유효한 값만 연결한다.
}

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
 * @description 전역에서 재사용할 스레드형 UI 클래스 모음이다.
 * @remarks 문자열과 함수를 혼합해 필요 시 조건부 클래스를 쉽게 구성한다.
 */
export const threadClassNames = {
  appBackground: threadModule.appBackground,
  appShell: threadModule.appShell,
  appContainer: threadModule.appContainer,
  main: threadModule.main,
  navbar: threadModule.navbar,
  navbarBrand: threadModule.navbarBrand,
  navbarBrandMark: threadModule.navbarBrandMark,
  navLinks: threadModule.navLinks,
  navLink: (options?: { isPrimary?: boolean }) =>
    composeThreadClasses(
      threadModule.navLink,
      options?.isPrimary && threadModule.navLinkPrimary // 기본 링크에 필요 시 프라이머리 강조를 더한다.
    ),
  navbarMeta: threadModule.navbarMeta,
  section: threadModule.section,
  sectionHeader: threadModule.sectionHeader,
  eyebrow: threadModule.eyebrow,
  title: threadModule.title,
  subtitle: threadModule.subtitle,
  panel: (options?: { variant?: ThreadPanelVariant }) =>
    composeThreadClasses(
      threadModule.panel,
      options?.variant === 'accent' && threadModule.panelAccent,
      options?.variant === 'muted' && threadModule.panelMuted,
      options?.variant === 'stat' && threadModule.panelStat // 통계 카드에는 간격 변형을 추가한다.
    ),
  panelMetric: threadModule.panelMetric,
  panelDescription: threadModule.panelDescription,
  grid: (options?: { layout?: ThreadGridLayout }) =>
    composeThreadClasses(
      threadModule.grid,
      options?.layout === 'two' && threadModule.gridTwo,
      options?.layout === 'four' && threadModule.gridFour,
      options?.layout === 'kanban' && threadModule.gridKanban // 칸반 뷰 정렬을 위한 변형이다.
    ),
  pill: (options?: { tone?: ThreadPillTone }) =>
    composeThreadClasses(threadModule.pill, options?.tone === 'accent' && threadModule.pillAccent),
  button: (options?: { variant?: ThreadButtonVariant }) =>
    composeThreadClasses(
      threadModule.button,
      options?.variant === 'primary' && threadModule.buttonPrimary,
      options?.variant === 'danger' && threadModule.buttonDanger,
      options?.variant === 'ghost' && threadModule.buttonGhost,
      options?.variant === 'link' && threadModule.buttonLink
    ),
  form: threadModule.form,
  field: threadModule.field,
  label: threadModule.label,
  select: threadModule.select,
  tabList: threadModule.tabList,
  tabButton: (options?: ThreadTabOptions) =>
    composeThreadClasses(threadModule.tabButton, options?.isActive && threadModule.tabButtonActive),
  input: threadModule.input,
  alert: (options?: { tone?: ThreadAlertTone }) =>
    composeThreadClasses(
      threadModule.alert,
      options?.tone === 'success' && threadModule.alertSuccess,
      options?.tone === 'error' && threadModule.alertError,
      options?.tone === 'info' && threadModule.alertInfo
    ),
  meta: threadModule.meta,
  timeline: threadModule.timeline,
  timelineItem: threadModule.timelineItem,
  timelineBadge: threadModule.timelineBadge,
  timelineBody: threadModule.timelineBody,
  timelineTitle: threadModule.timelineTitle,
  timelineHint: threadModule.timelineHint,
  kanbanColumn: threadModule.kanbanColumn,
  kanbanCard: (options?: { isLocked?: boolean }) =>
    composeThreadClasses(threadModule.kanbanCard, options?.isLocked && threadModule.kanbanCardLocked),
  kanbanCardBadge: threadModule.kanbanCardBadge,
  kanbanCardMeta: threadModule.kanbanCardMeta,
  kanbanCardActions: threadModule.kanbanCardActions,
  empty: threadModule.empty,
  modal: threadModule.modal,
  modalCard: threadModule.modalCard,
  modalActions: threadModule.modalActions,
  cardDivider: threadModule.cardDivider,
  helper: threadModule.helper,
  muted: threadModule.muted
} as const;
