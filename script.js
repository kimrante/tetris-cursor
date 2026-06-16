// 테트리스 보드 크기 (표준: 가로 10칸, 세로 20칸)
const COLS = 10;
const ROWS = 20;

// DOM 요소
const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const statusElement = document.getElementById("status");
const startButton = document.getElementById("start-btn");
const restartButton = document.getElementById("restart-btn");

// 7가지 테트로미노 정의 (모양 + 색상 클래스)
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

// 게임 상태
let board = [];
let currentPiece = null;
let score = 0;

/**
 * 빈 보드 데이터를 만듭니다.
 * 0 = 빈 칸, 블록 타입 문자(I, O, T...) = 채워진 칸
 */
function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

/**
 * 테트로미노 블록 객체를 생성합니다.
 * @param {string} [type] - 블록 종류 (미지정 시 무작위)
 */
function createPiece(type) {
  const pieceType = type || PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  const { shape } = TETROMINOES[pieceType];

  return {
    type: pieceType,
    shape: shape.map((row) => [...row]),
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
  };
}

/**
 * 보드 위에 현재 블록을 그린 결과를 반환합니다. (원본 보드는 변경하지 않음)
 */
function drawPiece(boardData, piece) {
  const displayBoard = boardData.map((row) => [...row]);

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
 * 보드 데이터를 CSS Grid 셀로 화면에 그립니다.
 */
function renderBoard(displayBoard) {
  boardElement.innerHTML = "";

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const cellValue = displayBoard[row][col];
      if (cellValue) {
        const colorClass = TETROMINOES[cellValue].colorClass;
        cell.classList.add("filled", colorClass);
      }

      boardElement.appendChild(cell);
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
 * 보드와 현재 블록을 함께 화면에 갱신합니다.
 */
function refreshDisplay() {
  renderBoard(drawPiece(board, currentPiece));
}

/**
 * 게임을 초기화합니다.
 */
function initGame() {
  board = createEmptyBoard();
  currentPiece = createPiece();
  refreshDisplay();
  updateScore(0);
  updateStatus("대기 중");
}

/**
 * 게임을 시작합니다.
 */
function startGame() {
  board = createEmptyBoard();
  currentPiece = createPiece();
  refreshDisplay();
  updateScore(0);
  updateStatus(`준비됨 — 현재 블록: ${currentPiece.type}`);
}

/**
 * 게임을 재시작합니다.
 */
function restartGame() {
  startGame();
}

// 버튼 이벤트 연결
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

// 페이지 로드 시 보드와 블록 표시
initGame();
