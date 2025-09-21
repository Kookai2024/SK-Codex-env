/**
 * @file web/next.config.js
 * @description Next.js 애플리케이션 전역 설정 파일입니다.
 */

const path = require('path');

const nextConfig = {
  reactStrictMode: true, // Strict Mode를 활성화해 잠재적 버그를 빠르게 포착한다.
  experimental: {
    externalDir: true, // web 디렉터리 밖의 공유 모듈(auth 등)을 사용할 수 있도록 허용한다.
    outputFileTracingRoot: path.join(__dirname, '..') // 번들 추적 루트를 모노레포 최상위로 맞춘다.
  }
};

module.exports = nextConfig;
