/**
 * @file auth/types.ts
 * @description 인증 기능에서 재사용할 타입과 상수를 정의한다.
 */

export type UserRole = 'admin' | 'member' | 'guest';

export interface AuthenticatedUser {
  /** PocketBase 사용자 고유 식별자 */
  id: string;
  /** 로그인에 사용된 이메일 주소 */
  email: string;
  /** 사용자 프로필 이름 혹은 닉네임 */
  name?: string;
  /** 역할 기반 접근 제어를 위한 사용자 역할 */
  role: UserRole;
}

export interface RegistrationInput {
  /** 가입할 사용자 이메일 */
  email: string;
  /** 가입에 사용할 비밀번호 */
  password: string;
  /** 사용자 표시 이름 */
  name: string;
  /** 부여할 기본 역할 */
  role: UserRole;
}

export interface RegistrationPayload {
  /** PocketBase users 컬렉션에 저장될 이메일 */
  email: string;
  /** PocketBase에서 요구하는 비밀번호 */
  password: string;
  /** PocketBase에서 요구하는 비밀번호 확인 필드 */
  passwordConfirm: string;
  /** 사용자 이름 */
  name: string;
  /** 역할 필드 */
  role: UserRole;
  /** 이메일 주소를 다른 사용자에게 노출할지 여부 */
  emailVisibility: boolean;
}

export interface ApiResponse<T> {
  /** 요청 성공 여부 */
  ok: boolean;
  /** 성공 시 반환할 데이터 */
  data?: T;
  /** 실패 시 표시할 메시지 */
  error?: string;
  /** 응답이 생성된 서버 타임스탬프 */
  timestamp: string;
}
