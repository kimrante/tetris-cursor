// 테트리스 보드 크기 (표준: 가로 10칸, 세로 20칸)
// style.css의 --board-cols, --board-rows 와 동기화됩니다.
const VERSION = "1.4.0";
const COLS = 10;
const ROWS = 20;
const DROP_INTERVAL_MS = 800;
const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };
const ROTATION_KICK_OFFSETS = [0, -1, 1, -2, 2];
const SPAWN_Y = -1;
const SPAWN_KICKS = [
  { dx: 0, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: -2, dy: 0 },
  { dx: 2, dy: 0 },
  { dx: 0, dy: -1 },
];
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "];

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
let keyboardControlsInitialized = false;

// --- 보드 유틸리티 ---

function applyBoardDimensions() {
  document.documentElement.style.setProperty("--board-cols", COLS);
  document.documentElement.style.setProperty("--board-rows", ROWS);
}

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function isInsideBoardColumns(boardCol) {
  return boardCol >= 0 && boardCol < COLS;
}

function isInsideBoardRows(boardRow) {
  return boardRow >= 0 && boardRow < ROWS;
}

function isHiddenRow(boardRow) {
  return boardRow < 0;
}

function prepareFreshBoard() {
  stopDropLoop();
  board = createEmptyBoard();
  currentPiece = null;
  updateScore(0);
  refreshDisplay();
}

// --- 블록 유틸리티 ---

function resolvePieceType(type) {
  if (type !== undefined && !TETROMINOES[type]) {
    console.warn(
      `유효하지 않은 블록 타입 "${type}"입니다. 무작위 블록을 생성합니다.`
    );
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  }

  if (!type) {
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  }

  return type;
}

function createPiece(type) {
  const pieceType = resolvePieceType(type);
  const { shape } = TETROMINOES[pieceType];

  return {
    type: pieceType,
    shape: shape.map((row) => [...row]),
    x: Math.floor((COLS - shape[0].length) / 2),
    y: SPAWN_Y,
  };
}

function forEachOccupiedCell(piece, visitCell, options = {}) {
  const shape = options.shape ?? piece.shape;
  const offsetX = options.offsetX ?? 0;
  const offsetY = options.offsetY ?? 0;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) {
        continue;
      }

      visitCell(piece.y + row + offsetY, piece.x + col + offsetX);
    }
  }
}

function normalizeKick(kick) {
  return typeof kick === "number" ? { dx: kick, dy: 0 } : kick;
}

function findValidKick(piece, kicks, matrix, shapeOverride = null) {
  for (const rawKick of kicks) {
    const { dx, dy } = normalizeKick(rawKick);

    if (canMove(piece, dx, dy, matrix, shapeOverride)) {
      return { dx, dy };
    }
  }

  return null;
}

function applyKickToPiece(piece, kick) {
  piece.x += kick.dx;
  piece.y += kick.dy;
}

// --- 충돌 판정 ---

function canMove(piece, offsetX, offsetY, matrix, shapeOverride = null) {
  if (!piece) {
    return false;
  }

  const shape = shapeOverride ?? piece.shape;
  let canPlace = true;

  forEachOccupiedCell(
    piece,
    (boardRow, boardCol) => {
      if (!canPlace) {
        return;
      }

      if (!isInsideBoardColumns(boardCol)) {
        canPlace = false;
        return;
      }

      if (boardRow >= ROWS) {
        canPlace = false;
        return;
      }

      if (isHiddenRow(boardRow)) {
        return;
      }

      if (matrix[boardRow][boardCol] !== 0) {
        canPlace = false;
      }
    },
    { shape, offsetX, offsetY }
  );

  return canPlace;
}

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

// --- 스폰 ---

function findSpawnPosition(piece) {
  return findValidKick(piece, SPAWN_KICKS, board);
}

function trySpawnWithKick() {
  currentPiece = createPiece();
  const spawnKick = findSpawnPosition(currentPiece);

  if (!spawnKick) {
    triggerGameOver();
    return false;
  }

  applyKickToPiece(currentPiece, spawnKick);
  return true;
}

function spawnNextPiece() {
  if (!trySpawnWithKick()) {
    return;
  }

  updateStatus(`현재 블록: ${currentPiece.type}`);
  refreshDisplay();
}

// --- 블록 조작 ---

function isPlaying() {
  return gameState === GAME_STATE.PLAYING;
}

function tryMovePiece(offsetX, offsetY) {
  if (!currentPiece || !isPlaying()) {
    return false;
  }

  if (!canMove(currentPiece, offsetX, offsetY, board)) {
    return false;
  }

  currentPiece.x += offsetX;
  currentPiece.y += offsetY;
  refreshDisplay();
  return true;
}

function tryRotatePiece() {
  if (!currentPiece || !isPlaying()) {
    return false;
  }

  const rotatedShape = rotateMatrix(currentPiece.shape);
  const rotationKick = findValidKick(
    currentPiece,
    ROTATION_KICK_OFFSETS,
    board,
    rotatedShape
  );

  if (!rotationKick) {
    return false;
  }

  applyKickToPiece(currentPiece, rotationKick);
  currentPiece.shape = rotatedShape;
  refreshDisplay();
  return true;
}

function tryHardDrop() {
  if (!currentPiece || !isPlaying()) {
    return false;
  }

  while (canMove(currentPiece, 0, 1, board)) {
    currentPiece.y += 1;
  }

  refreshDisplay();
  handlePieceLocked();
  return true;
}

// --- 점수 · 라인 ---

function calculateLineScore(linesCleared) {
  if (linesCleared <= 0) {
    return 0;
  }

  return LINE_SCORES[linesCleared] ?? linesCleared * 100;
}

function applyLineClearScore(linesCleared) {
  const points = calculateLineScore(linesCleared);
  if (points > 0) {
    updateScore(score + points);
  }
  return points;
}

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

function lockPiece() {
  if (!currentPiece) {
    return { lockedAboveVisible: false };
  }

  let lockedAboveVisible = false;

  forEachOccupiedCell(currentPiece, (boardRow, boardCol) => {
    if (!isInsideBoardColumns(boardCol)) {
      return;
    }

    if (isHiddenRow(boardRow)) {
      lockedAboveVisible = true;
      return;
    }

    if (!isInsideBoardRows(boardRow)) {
      return;
    }

    board[boardRow][boardCol] = currentPiece.type;
  });

  currentPiece = null;
  return { lockedAboveVisible };
}

function handlePieceLocked() {
  const lockResult = lockPiece();

  if (lockResult.lockedAboveVisible) {
    triggerGameOver();
    return;
  }

  const linesCleared = clearLines();
  if (linesCleared > 0) {
    const points = applyLineClearScore(linesCleared);
    updateStatus(`${linesCleared}줄 클리어! +${points}점`);
    refreshDisplay();
  }

  spawnNextPiece();
}

// --- 게임 흐름 ---

function triggerGameOver() {
  currentPiece = null;
  gameState = GAME_STATE.GAMEOVER;
  stopDropLoop();
  updateStatus("게임 오버 — 재시작 버튼을 누르세요");
  updateButtonStates();
  refreshDisplay();
}

function setupRound({ spawnPiece, statusMessage }) {
  prepareFreshBoard();
  gameState = spawnPiece ? GAME_STATE.PLAYING : GAME_STATE.IDLE;
  updateButtonStates();

  if (!spawnPiece) {
    updateStatus(statusMessage ?? "시작 버튼을 눌러 게임을 시작하세요");
    return;
  }

  if (!trySpawnWithKick()) {
    return;
  }

  updateStatus(statusMessage ?? `준비됨 — 현재 블록: ${currentPiece.type}`);
  startDropLoop();
}

function resetGame({ statusMessage } = {}) {
  prepareFreshBoard();
  gameState = GAME_STATE.PLAYING;

  if (!trySpawnWithKick()) {
    return;
  }

  refreshDisplay();
  updateStatus(statusMessage ?? `재시작됨 — 현재 블록: ${currentPiece.type}`);
  updateButtonStates();
  startDropLoop();
}

function initGame() {
  setupRound({ spawnPiece: false });
}

function startGame() {
  if (gameState !== GAME_STATE.IDLE && gameState !== GAME_STATE.GAMEOVER) {
    return;
  }

  setupRound({ spawnPiece: true });
}

function restartGame() {
  if (gameState === GAME_STATE.IDLE) {
    return;
  }

  resetGame();
}

// --- 타이머 ---

function tick() {
  if (!isPlaying() || !currentPiece) {
    return;
  }

  if (tryMovePiece(0, 1)) {
    return;
  }

  handlePieceLocked();
}

function startDropLoop() {
  stopDropLoop();
  dropIntervalId = setInterval(tick, DROP_INTERVAL_MS);
}

function stopDropLoop() {
  if (dropIntervalId !== null) {
    clearInterval(dropIntervalId);
    dropIntervalId = null;
  }
}

// --- 렌더링 ---

function drawPiece(boardData, piece) {
  const displayBoard = boardData.map((row) => [...row]);

  if (!piece) {
    return displayBoard;
  }

  forEachOccupiedCell(piece, (boardRow, boardCol) => {
    if (isInsideBoardRows(boardRow) && isInsideBoardColumns(boardCol)) {
      displayBoard[boardRow][boardCol] = piece.type;
    }
  });

  return displayBoard;
}

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

function updateCellAppearance(cell, cellValue) {
  cell.className = "cell";

  if (!cellValue || !TETROMINOES[cellValue]) {
    return;
  }

  cell.classList.add("filled", TETROMINOES[cellValue].colorClass);
}

function renderBoard(displayBoard) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      updateCellAppearance(cellElements[row][col], displayBoard[row][col]);
    }
  }
}

function refreshDisplay() {
  renderBoard(drawPiece(board, currentPiece));
}

// --- UI ---

function updateScore(value) {
  score = value;
  scoreElement.textContent = score;
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function updateButtonStates() {
  startButton.disabled = isPlaying() || gameState === GAME_STATE.PAUSED;
  restartButton.disabled =
    gameState === GAME_STATE.IDLE || gameState === GAME_STATE.PAUSED;
}

// --- 입력 ---

function handleKeyDown(event) {
  if (!isPlaying()) {
    return;
  }

  if (!GAME_KEYS.includes(event.key)) {
    return;
  }

  event.preventDefault();

  const keyActions = {
    ArrowLeft: () => tryMovePiece(-1, 0),
    ArrowRight: () => tryMovePiece(1, 0),
    ArrowDown: () => tryMovePiece(0, 1),
    ArrowUp: () => tryRotatePiece(),
    " ": () => tryHardDrop(),
  };

  keyActions[event.key]();
}

function initKeyboardControls() {
  if (keyboardControlsInitialized) {
    return;
  }

  document.addEventListener("keydown", handleKeyDown);
  keyboardControlsInitialized = true;
}

// --- 초기화 ---

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

applyBoardDimensions();
initBoardCells();
initKeyboardControls();
initGame();
