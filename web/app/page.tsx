/**
 * @file web/app/page.tsx
 * @description 홈 대시 안내 페이지로, 주요 경로와 사용 순서를 소개한다.
 */

export default function HomePage() {
  // 초보자에게 전체 흐름을 요약해 보여준다.
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">팀 Todo 시스템 시작하기</h1>
      <p>왼쪽 메뉴를 따라 로그인 → 근태 → 내 업무 → 대시보드 순으로 기능을 체험하세요.</p>
      <ol className="list-decimal space-y-2 pl-6 text-sm">
        <li>PocketBase 관리자에서 사용자 계정을 생성합니다.</li>
        <li>
          로그인 페이지에서 이메일/비밀번호로 인증 후, 상단에 표시된 역할에 따라 UI가 달라지는지 확인합니다.
        </li>
        <li>근태 페이지에서 출근/퇴근 버튼 상태가 현재 기록에 따라 토글되는 것을 확인합니다.</li>
        <li>내 업무 페이지에서 칸반 컬럼 이동 시 편집 잠금 배지를 확인합니다.</li>
        <li>대시보드 페이지에서는 역할별 주요 타일과 공유 제어 옵션을 살펴봅니다.</li>
      </ol>
    </section>
  );
}
