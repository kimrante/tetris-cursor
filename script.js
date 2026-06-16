// 테트리스 보드 크기 (표준: 가로 10칸, 세로 20칸)
// style.css의 --board-cols, --board-rows 와 동기화됩니다.
const VERSION = "1.2.0";
const COLS = 10;
const ROWS = 20;
const DROP_INTERVAL_MS = 800;
const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };
const ROTATION_KICK_OFFSETS = [0, -1, 1, -2, 2];

// DOM 요소
const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const statusElement = document.getElementById("status");
const startButton = document.getElementById("start-btn");
const restartButton = document.getElementById("restart-btn");

/**
 * 7가지 테트로미노 정의
 * colorClass는 style.css의 .piece-i ~ .piece-l 과 반드시 1:1로 대응해야 합니다.
 */
const TETROMINOES = {
  I: {
    shape: [[1, 1, 1, 1]],
    colorClass: "piece-i",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    colorClass: "piece-o",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    colorClass: "piece-t",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    colorClass: "piece-s",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    colorClass: "piece-z",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    colorClass: "piece-j",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    colorClass: "piece-l",
  },
};

const PIECE_TYPES = Object.keys(TETROMINOES);

const GAME_STATE = {
  IDLE: "idle",
  PLAYING: "playing",
  PAUSED: "paused",
  GAMEOVER: "gameover",
};

// 게임 상태
let board = [];
let currentPiece = null;
let gameState = GAME_STATE.IDLE;
let score = 0;
let cellElements = [];
let dropIntervalId = null;

/**
 * CSS 변수에 보드 크기를 반영합니다.
 */
function applyBoardDimensions() {
  document.documentElement.style.setProperty("--board-cols", COLS);
  document.documentElement.style.setProperty("--board-rows", ROWS);
}

/**
 * 빈 보드 데이터를 만듭니다.
 * 0 = 빈 칸, 블록 타입 문자(I, O, T...) = 고정된 칸
 */
function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

/**
 * 테트로미노 블록 객체를 생성합니다.
 * @param {string} [type] - 블록 종류 (미지정 시 무작위, 잘못된 값은 무작위로 대체)
 */
function createPiece(type) {
  let pieceType = type;

  if (pieceType !== undefined && !TETROMINOES[pieceType]) {
    console.warn(
      `유효하지 않은 블록 타입 "${type}"입니다. 무작위 블록을 생성합니다.`
    );
    pieceType = undefined;
  }

  if (!pieceType) {
    pieceType = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  }

  const { shape } = TETROMINOES[pieceType];

  return {
    type: pieceType,
    shape: shape.map((row) => [...row]),
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
  };
}

/**
 * 블록이 (dx, dy)만큼 이동했을 때 보드 안에 놓일 수 있는지 검사합니다.
 * @param {object} piece - 현재 블록
 * @param {number} dx - 가로 이동량
 * @param {number} dy - 세로 이동량
 * @param {Array[]} matrix - 고정 블록이 있는 보드
 * @param {Array[]} [shapeOverride] - 회전 검사 등 shape를 대체할 때 사용
 */
function canMove(piece, dx, dy, matrix, shapeOverride = null) {
  if (!piece) {
    return false;
  }

  const shape = shapeOverride ?? piece.shape;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) {
        continue;
      }

      const boardRow = piece.y + row + dy;
      const boardCol = piece.x + col + dx;

      if (
        boardRow < 0 ||
        boardRow >= ROWS ||
        boardCol < 0 ||
        boardCol >= COLS
      ) {
        return false;
      }

      if (matrix[boardRow][boardCol] !== 0) {
        return false;
      }
    }
  }

  return true;
}

/**
 * shape 배열을 시계 방향 90도 회전합니다.
 */
function rotateMatrix(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      rotated[col][rows - 1 - row] = shape[row][col];
    }
  }

  return rotated;
}

/**
 * 블록을 회전합니다. 회전 후 충돌 시 벽 킥 오프셋을 시도합니다.
 */
function tryRotatePiece() {
  if (!currentPiece || gameState !== GAME_STATE.PLAYING) {
    return false;
  }

  const rotatedShape = rotateMatrix(currentPiece.shape);

  for (const kick of ROTATION_KICK_OFFSETS) {
    if (!canMove(currentPiece, kick, 0, board, rotatedShape)) {
      continue;
    }

    currentPiece.x += kick;
    currentPiece.shape = rotatedShape;
    refreshDisplay();
    return true;
  }

  return false;
}

/**
 * 가득 찬 행을 삭제하고 위 블록을 내립니다.
 * @returns {number} 삭제된 줄 수
 */
function clearLines() {
  let linesCleared = 0;

  for (let row = ROWS - 1; row >= 0; row--) {
    const isFullLine = board[row].every((cell) => cell !== 0);

    if (!isFullLine) {
      continue;
    }

    board.splice(row, 1);
    board.unshift(Array(COLS).fill(0));
    linesCleared++;
    row++;
  }

  return linesCleared;
}

/**
 * 블록 고정 후 라인 삭제·점수 반영·다음 블록 생성을 처리합니다.
 */
function handlePieceLocked() {
  lockPiece();

  const linesCleared = clearLines();
  if (linesCleared > 0) {
    const points = LINE_SCORES[linesCleared] ?? linesCleared * 100;
    updateScore(score + points);
    refreshDisplay();
  }

  spawnNextPiece();
}

/**
 * 현재 블록을 보드에 고정합니다.
 */
function lockPiece() {
  if (!currentPiece) {
    return;
  }

  for (let row = 0; row < currentPiece.shape.length; row++) {
    for (let col = 0; col < currentPiece.shape[row].length; col++) {
      if (!currentPiece.shape[row][col]) {
        continue;
      }

      const boardRow = currentPiece.y + row;
      const boardCol = currentPiece.x + col;

      if (
        boardRow >= 0 &&
        boardRow < ROWS &&
        boardCol >= 0 &&
        boardCol < COLS
      ) {
        board[boardRow][boardCol] = currentPiece.type;
      }
    }
  }

  currentPiece = null;
}

/**
 * 새 블록을 생성하고 게임 오버 여부를 확인합니다.
 */
function spawnNextPiece() {
  currentPiece = createPiece();

  if (!canMove(currentPiece, 0, 0, board)) {
    currentPiece = null;
    gameState = GAME_STATE.GAMEOVER;
    stopDropLoop();
    updateStatus("게임 오버 — 재시작 버튼을 누르세요");
    updateButtonStates();
    refreshDisplay();
    return;
  }

  updateStatus(`현재 블록: ${currentPiece.type}`);
  refreshDisplay();
}

/**
 * 블록을 이동합니다. 이동 가능할 때만 위치를 변경합니다.
 */
function tryMovePiece(dx, dy) {
  if (!currentPiece || gameState !== GAME_STATE.PLAYING) {
    return false;
  }

  if (!canMove(currentPiece, dx, dy, board)) {
    return false;
  }

  currentPiece.x += dx;
  currentPiece.y += dy;
  refreshDisplay();
  return true;
}

/**
 * 블록을 즉시 바닥까지 내립니다. (hard drop)
 */
function tryHardDrop() {
  if (!currentPiece || gameState !== GAME_STATE.PLAYING) {
    return false;
  }

  while (canMove(currentPiece, 0, 1, board)) {
    currentPiece.y += 1;
  }

  refreshDisplay();
  handlePieceLocked();
  return true;
}

/**
 * 키보드 입력을 처리합니다.
 */
function handleKeyDown(event) {
  if (gameState !== GAME_STATE.PLAYING) {
    return;
  }

  const gameKeys = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "];
  if (!gameKeys.includes(event.key)) {
    return;
  }

  event.preventDefault();

  switch (event.key) {
    case "ArrowLeft":
      tryMovePiece(-1, 0);
      break;
    case "ArrowRight":
      tryMovePiece(1, 0);
      break;
    case "ArrowDown":
      tryMovePiece(0, 1);
      break;
    case "ArrowUp":
      tryRotatePiece();
      break;
    case " ":
      tryHardDrop();
      break;
  }
}

let keyboardControlsInitialized = false;

/**
 * 키보드 이벤트를 한 번만 등록합니다.
 */
function initKeyboardControls() {
  if (keyboardControlsInitialized) {
    return;
  }

  document.addEventListener("keydown", handleKeyDown);
  keyboardControlsInitialized = true;
}

/**
 * 자동 낙하 1틱을 처리합니다.
 */
function tick() {
  if (gameState !== GAME_STATE.PLAYING || !currentPiece) {
    return;
  }

  if (tryMovePiece(0, 1)) {
    return;
  }

  handlePieceLocked();
}

/**
 * 자동 낙하 타이머를 시작합니다.
 */
function startDropLoop() {
  stopDropLoop();
  dropIntervalId = setInterval(tick, DROP_INTERVAL_MS);
}

/**
 * 자동 낙하 타이머를 중지합니다.
 */
function stopDropLoop() {
  if (dropIntervalId !== null) {
    clearInterval(dropIntervalId);
    dropIntervalId = null;
  }
}

/**
 * 보드 위에 활성 블록을 합성한 결과를 반환합니다. (원본 보드는 변경하지 않음)
 */
function drawPiece(boardData, piece) {
  const displayBoard = boardData.map((row) => [...row]);

  if (!piece) {
    return displayBoard;
  }

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (!piece.shape[row][col]) {
        continue;
      }

      const boardRow = piece.y + row;
      const boardCol = piece.x + col;

      if (
        boardRow >= 0 &&
        boardRow < ROWS &&
        boardCol >= 0 &&
        boardCol < COLS
      ) {
        displayBoard[boardRow][boardCol] = piece.type;
      }
    }
  }

  return displayBoard;
}

/**
 * 보드 셀 DOM을 한 번만 생성합니다.
 */
function initBoardCells() {
  boardElement.innerHTML = "";
  cellElements = [];

  for (let row = 0; row < ROWS; row++) {
    cellElements[row] = [];

    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      boardElement.appendChild(cell);
      cellElements[row][col] = cell;
    }
  }
}

/**
 * 단일 셀의 시각 상태를 갱신합니다.
 */
function updateCellAppearance(cell, cellValue) {
  cell.className = "cell";

  if (!cellValue || !TETROMINOES[cellValue]) {
    return;
  }

  cell.classList.add("filled", TETROMINOES[cellValue].colorClass);
}

/**
 * 보드 데이터를 화면에 그립니다. (기존 셀의 class만 갱신)
 */
function renderBoard(displayBoard) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      updateCellAppearance(cellElements[row][col], displayBoard[row][col]);
    }
  }
}

/**
 * 점수를 화면에 표시합니다.
 */
function updateScore(value) {
  score = value;
  scoreElement.textContent = score;
}

/**
 * 게임 상태 메시지를 화면에 표시합니다.
 */
function updateStatus(message) {
  statusElement.textContent = message;
}

/**
 * 게임 상태에 따라 버튼 활성/비활성을 조정합니다.
 */
function updateButtonStates() {
  startButton.disabled =
    gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.PAUSED;
  restartButton.disabled = gameState === GAME_STATE.IDLE;
}

/**
 * 보드와 현재 블록을 함께 화면에 갱신합니다.
 */
function refreshDisplay() {
  renderBoard(drawPiece(board, currentPiece));
}

/**
 * 라운드를 초기화합니다.
 */
function setupRound({ spawnPiece, statusMessage }) {
  stopDropLoop();
  board = createEmptyBoard();
  currentPiece = spawnPiece ? createPiece() : null;
  gameState = spawnPiece ? GAME_STATE.PLAYING : GAME_STATE.IDLE;

  refreshDisplay();
  updateScore(0);

  const message =
    statusMessage ??
    (spawnPiece
      ? `준비됨 — 현재 블록: ${currentPiece.type}`
      : "시작 버튼을 눌러 게임을 시작하세요");

  updateStatus(message);
  updateButtonStates();

  if (spawnPiece) {
    if (!canMove(currentPiece, 0, 0, board)) {
      currentPiece = null;
      gameState = GAME_STATE.GAMEOVER;
      updateStatus("게임 오버");
      updateButtonStates();
      refreshDisplay();
      return;
    }

    startDropLoop();
  }
}

/**
 * 페이지 로드 시 게임을 준비합니다. (대기 상태, 블록 없음)
 */
function initGame() {
  setupRound({ spawnPiece: false });
}

/**
 * 게임을 시작합니다.
 */
function startGame() {
  if (gameState !== GAME_STATE.IDLE && gameState !== GAME_STATE.GAMEOVER) {
    return;
  }

  setupRound({ spawnPiece: true });
}

/**
 * 진행 중인 게임을 재시작합니다.
 */
function restartGame() {
  if (gameState === GAME_STATE.IDLE) {
    return;
  }

  stopDropLoop();
  board = createEmptyBoard();
  currentPiece = createPiece();
  gameState = GAME_STATE.PLAYING;

  if (!canMove(currentPiece, 0, 0, board)) {
    currentPiece = null;
    gameState = GAME_STATE.GAMEOVER;
    updateStatus("게임 오버");
    updateButtonStates();
    refreshDisplay();
    return;
  }

  refreshDisplay();
  updateScore(0);
  updateStatus(`재시작됨 — 현재 블록: ${currentPiece.type}`);
  updateButtonStates();
  startDropLoop();
}

// 버튼 이벤트 연결
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

// 페이지 로드 시 보드 준비
applyBoardDimensions();
initBoardCells();
initKeyboardControls();
initGame();
