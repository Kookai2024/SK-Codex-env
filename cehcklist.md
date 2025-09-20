# 진행 체크리스트

- [x] 중복 폴더 정리: 루트에 남아 있던 `team_todo_250921` 보조 사본과 남은 `node_modules` 캐시를 모두 삭제하고 필요한 `server` 디렉터리는 보존했습니다.
- [x] 코드 검토: 출퇴근(Attendance) 서비스의 인증/권한 처리와 예외 흐름을 확인했고, 테스트 스위트 실행 계획을 수립했습니다.
- [ ] PocketBase 실행 환경 보완: 현재 저장된 `pocketbase.exe`는 Windows 전용 바이너리여서 Linux 컨테이너에서는 실행되지 않습니다. Linux용 바이너리를 추가해야 서비스가 정상 기동됩니다.

## 메모
- 테스트 실행 전 `packages/server/scripts` 의존성을 설치하고 `npm test`를 통해 Attendance/Todo/Dashboard 테스트를 검증할 수 있습니다.
- PocketBase를 사용하려면 공식 배포 페이지에서 Linux용 실행 파일을 내려받아 `server/` 경로에 배치하거나 Docker 이미지를 사용하는 것이 안전합니다.
