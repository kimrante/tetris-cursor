# Release Notes

## v1.4.0 (2026-06-16)

### 추가
- 히든 스폰 행 (`SPAWN_Y = -1`) 및 스폰 킥 (`SPAWN_KICKS`)
- 천장 잠금 감지 (`lockedAboveVisible`) 및 게임 오버 처리

### 변경
- High 버그 수정: 스폰 즉시 게임 오버 완화, 천장 고정 시 게임 오버
- 안전 리팩토링: `forEachOccupiedCell`, `findValidKick`, `prepareFreshBoard` 등 함수 분리
- 버전 1.4.0으로 갱신

## v1.3.0 (2026-06-16)

### 추가
- 키보드 조작 (`←` `→` `↓` `↑` `Space`)
- 점수 계산 함수 `calculateLineScore`, `applyLineClearScore`
- 게임 오버·재시작 통합 함수 `triggerGameOver`, `resetGame`

### 변경
- 라인 삭제, 점수, 게임 오버, 재시작 로직 정리
- 재시작 시 보드·점수·타이머·상태 일괄 초기화
- `setInterval` 중복 실행 방지 (`stopDropLoop` → `startDropLoop`)

## v1.2.0 (2026-06-16)

### 추가
- 자동 낙하 (`tick`, `setInterval` 기반)
- 충돌 판정 함수 `canMove(piece, dx, dy, matrix)`
- 블록 고정 후 라인 삭제 (`clearLines`) 및 점수 반영
- 블록 회전 (`rotateMatrix`, `tryRotatePiece`) 및 벽 킥 처리
- `↑` 키 블록 회전 조작
- 게임 오버 조건 (스폰 위치 충돌 시)

### 변경
- 코드 리뷰 개선사항 반영 (게임 상태, 렌더링 최적화, UX, 접근성)
- `handlePieceLocked`로 고정 → 라인 삭제 → 스폰 흐름 통합
- README 및 버전 정보 갱신

### 포함된 이전 버전 요약

**v1.1.0**
- 7종 테트로미노 정의 및 보드 렌더링
- `createPiece`, `drawPiece`, `renderBoard` 함수 분리

**v1.0.0**
- 프로젝트 골격 (HTML/CSS/JS)
- 10×20 게임 보드, 점수·버튼·조작법 UI
