/**
 * @file jest.config.ts
 * @description 루트 레벨 Jest 설정 파일로, TypeScript 기반 단위 테스트를 실행하도록 구성한다.
 */

import type { Config } from 'jest';

// 각 기능 폴더에서 __tests__ 디렉터리를 인식하도록 설정한다.
const config: Config = {
  preset: 'ts-jest', // ts-jest를 사용해 TypeScript 파일을 바로 실행한다.
  testEnvironment: 'node', // 서버 사이드 로직을 기본으로 두기 때문에 node 환경을 사용한다.
  roots: ['<rootDir>/attendance', '<rootDir>/todos', '<rootDir>/dashboard'], // 테스트 루트를 명시해 탐색 범위를 축소한다.
  testMatch: ['**/__tests__/**/*.test.ts'], // __tests__ 폴더 내 test.ts 파일만 선택한다.
  moduleFileExtensions: ['ts', 'js', 'json'], // 로딩 가능한 확장자 목록이다.
  collectCoverageFrom: [
    'attendance/**/*.{ts,tsx}',
    'todos/**/*.{ts,tsx}',
    'dashboard/**/*.{ts,tsx}'
  ], // 기본 커버리지 수집 대상을 설정한다.
  verbose: true // 실행 중 자세한 로그를 출력해 초보자가 흐름을 파악하기 쉽도록 한다.
};

export default config;
