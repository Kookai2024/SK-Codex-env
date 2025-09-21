/**
 * @file web/jest.config.js
 * @description UI 레벨 Jest 구성을 위한 스텁 파일입니다. 향후 컴포넌트 테스트 시 확장하세요.
 */

module.exports = {
  preset: 'ts-jest', // 나중에 ts-jest 기반으로 확장할 수 있도록 기본값을 둔다.
  testEnvironment: 'jsdom', // 브라우저 환경 시뮬레이션을 위한 설정이다.
  setupFilesAfterEnv: [], // 필요시 RTL 설정 파일을 추가한다.
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'] // App Router 컴포넌트 테스트를 위한 패턴이다.
};
