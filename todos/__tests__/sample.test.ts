/**
 * @file todos/__tests__/sample.test.ts
 * @description Todos 도메인의 기본 동작을 검증하기 위한 간단한 Jest 테스트입니다.
 */

describe('todos smoke test suite', () => {
  // 배열 길이 검증을 통해 Jest 실행 경로가 정상인지 확인한다.
  it('verifies that an empty todo list has length 0', () => {
    const todoList: string[] = []; // 비어 있는 배열을 생성해 초기 상태를 표현한다.
    expect(todoList).toHaveLength(0); // 비어 있는 목록이 기본값인지 확인한다.
  });
});
