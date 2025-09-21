/**
 * @file attendance/__tests__/sample.test.ts
 * @description Attendance 도메인에 대한 Jest 샘플 테스트입니다.
 *              초보자는 이 파일을 복사하여 새로운 테스트를 추가하면 됩니다.
 */

describe('attendance smoke test suite', () => {
  // 1+1=2 같은 연산 검증으로 Jest 설정이 올바른지 확인한다.
  it('ensures the math engine adds 1 and 1 to make 2', () => {
    const result = 1 + 1; // 단순 연산은 테스트 러너 작동 여부를 검증하는 역할을 한다.
    expect(result).toBe(2); // 기대값과 비교해 Jest 매처가 동작하는지 확인한다.
  });
});
