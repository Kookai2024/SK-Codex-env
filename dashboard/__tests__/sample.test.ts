/**
 * @file dashboard/__tests__/sample.test.ts
 * @description Dashboard 요약 로직에 대한 기본 수준의 Jest 샘플 테스트입니다.
 */

describe('dashboard smoke test suite', () => {
  // 객체 키 개수 검증으로 단위 테스트 파이프라인이 정상인지 확인한다.
  it('counts summary sections correctly', () => {
    const summarySections = { tasks: true, attendance: true, reports: true }; // 임시 요약 섹션 객체 생성
    expect(Object.keys(summarySections)).toHaveLength(3); // 키 개수로 섹션 수를 검증한다.
  });
});
