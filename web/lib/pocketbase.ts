/**
 * @file web/lib/pocketbase.ts
 * @description PocketBase SDK 클라이언트를 생성/재사용하는 헬퍼 모듈입니다.
 */

import PocketBase from 'pocketbase';

// PocketBase 기본 URL은 환경 변수에서 가져오고, 없으면 로컬 개발 주소를 사용한다.
const DEFAULT_PB_URL = 'http://127.0.0.1:8090';
const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? DEFAULT_PB_URL;

let cachedClient: PocketBase | null = null; // 클라이언트를 싱글톤으로 재사용하기 위한 캐시이다.

export function getPocketBaseClient(): PocketBase {
  // 이미 생성된 클라이언트가 있으면 재사용한다.
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new PocketBase(POCKETBASE_URL); // 새 PocketBase 인스턴스를 생성한다.
  return cachedClient;
}
