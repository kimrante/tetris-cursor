// 테트리스 보드 크기 (표준: 가로 10칸, 세로 20칸)
const COLS = 10;
const ROWS = 20;

// DOM 요소
const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const statusElement = document.getElementById("status");
const startButton = document.getElementById("start-btn");
const restartButton = document.getElementById("restart-btn");

// 게임 상태 (골격 단계: 빈 보드만 표시)
let score = 0;

/**
 * 빈 보드 데이터를 만듭니다.
 * 0 = 빈 칸, 1 이상 = 채워진 칸 (추후 블록 종류로 확장)
 */
function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

/**
 * 보드 데이터를 화면에 그립니다.
 */
function renderBoard(board) {
  boardElement.innerHTML = "";

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (board[row][col] !== 0) {
        cell.classList.add("filled");
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
 * 게임을 초기화합니다. (골격 단계: 빈 보드만 렌더링)
 */
function initGame() {
  const board = createEmptyBoard();
  renderBoard(board);
  updateScore(0);
  updateStatus("대기 중");
}

/**
 * 게임을 시작합니다. (추후 블록 낙하 로직 추가 예정)
 */
function startGame() {
  initGame();
  updateStatus("준비됨 — 게임 로직은 아직 구현되지 않았습니다");
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

// 페이지 로드 시 빈 보드 표시
initGame();
