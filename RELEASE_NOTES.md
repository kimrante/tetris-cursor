# Release Notes

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
