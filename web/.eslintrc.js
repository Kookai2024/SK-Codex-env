/**
 * @file web/.eslintrc.js
 * @description Next.js 기본 ESLint 설정에 TypeScript 규칙을 적용한 구성입니다.
 */

module.exports = {
  root: true,
  extends: ['next/core-web-vitals'], // Next.js 공식 추천 규칙을 따른다.
  rules: {
    'react/jsx-props-no-spreading': 'off' // 폼 컴포넌트 재사용성을 위해 스프레드 허용.
  }
};
