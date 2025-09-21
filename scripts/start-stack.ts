/**
 * @file scripts/start-stack.ts
 * @description PocketBase 서버와 Next.js 웹앱을 동시에 실행하는 개발용 스타터 스크립트이다.
 */

import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(PROJECT_ROOT, 'server');
const WEB_DIR = path.join(PROJECT_ROOT, 'web');
const POCKETBASE_PORT = process.env.POCKETBASE_PORT ?? '8090';
const WEB_PORT = process.env.PORT ?? '3000';
const POCKETBASE_BIN_CANDIDATES = process.platform === 'win32' ? ['pocketbase.exe'] : ['pocketbase', 'pocketbase.exe'];

/** 로그 프리픽스를 붙여 출력한다. */
function log(prefix: string, message: string) {
  // eslint-disable-next-line no-console -- 개발 편의를 위해 콘솔 로그를 사용한다.
  console.log(`[${prefix}] ${message}`);
}

/** PocketBase 실행 파일 경로를 탐색한다. */
function resolvePocketBaseBinary(): string {
  for (const candidate of POCKETBASE_BIN_CANDIDATES) {
    const binaryPath = path.join(SERVER_DIR, candidate);
    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }
  }

  throw new Error('server 디렉터리에서 PocketBase 실행 파일을 찾을 수 없습니다.');
}

/** 자식 프로세스를 생성하고 표준 출력/에러를 프리픽스와 함께 전달한다. */
function spawnProcess(
  label: string,
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv }
): ChildProcess {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: 'pipe',
    shell: process.platform === 'win32'
  });

  child.stdout?.on('data', (data) => {
    log(label, data.toString().trim());
  });

  child.stderr?.on('data', (data) => {
    log(`${label}:error`, data.toString().trim());
  });

  child.on('exit', (code) => {
    log(label, `종료 코드 ${code ?? 0}로 프로세스가 종료되었습니다.`);
  });

  return child;
}

async function main() {
  log('stack', '개발 스택을 초기화합니다. 필요한 바이너리를 찾는 중...');
  let pocketBaseBinary: string;

  try {
    pocketBaseBinary = resolvePocketBaseBinary();
  } catch (error) {
    log('stack', (error as Error).message);
    process.exit(1);
    return;
  }

  log('stack', `PocketBase · ${pocketBaseBinary}`);
  log('stack', `Next.js · npm run dev (포트 ${WEB_PORT})`);

  const pocketbaseProcess = spawnProcess('pocketbase', pocketBaseBinary, ['serve', `--http=0.0.0.0:${POCKETBASE_PORT}`], {
    cwd: SERVER_DIR
  });

  const webProcess = spawnProcess('web', 'npm', ['run', 'dev'], {
    cwd: WEB_DIR,
    env: {
      ...process.env,
      PORT: WEB_PORT,
      NEXT_TELEMETRY_DISABLED: '1'
    }
  });

  log('stack', `PocketBase http://127.0.0.1:${POCKETBASE_PORT} · Next.js http://127.0.0.1:${WEB_PORT}`);
  log('stack', '종료하려면 Ctrl+C 를 누르세요. 두 프로세스가 함께 종료됩니다.');

  const shutdown = () => {
    log('stack', '정리 중... PocketBase와 Next.js를 종료합니다.');
    pocketbaseProcess.kill('SIGINT');
    webProcess.kill('SIGINT');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main();
