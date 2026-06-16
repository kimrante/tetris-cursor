// 테트리스 보드 크기 (표준: 가로 10칸, 세로 20칸)
// style.css의 --board-cols, --board-rows 와 동기화됩니다.
const COLS = 10;
const ROWS = 20;

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
 * 블록이 보드 안에 놓일 수 있는지 검사합니다.
 */
function isValidPosition(boardData, piece) {
  if (!piece) {
    return false;
  }

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (!piece.shape[row][col]) {
        continue;
      }

      const boardRow = piece.y + row;
      const boardCol = piece.x + col;

      if (
        boardRow < 0 ||
        boardRow >= ROWS ||
        boardCol < 0 ||
        boardCol >= COLS
      ) {
        return false;
      }

      if (boardData[boardRow][boardCol] !== 0) {
        return false;
      }
    }
  }

  return true;
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

  board = createEmptyBoard();
  currentPiece = createPiece();
  gameState = GAME_STATE.PLAYING;

  refreshDisplay();
  updateScore(0);
  updateStatus(`재시작됨 — 현재 블록: ${currentPiece.type}`);
  updateButtonStates();
}

// 버튼 이벤트 연결
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

// 페이지 로드 시 보드 준비
applyBoardDimensions();
initBoardCells();
initGame();
