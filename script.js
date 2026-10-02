const boardEl = document.getElementById('board');
const statusText = document.getElementById('statusText');
const turnToken = document.getElementById('turnToken');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const scoreDrawEl = document.getElementById('scoreDraw');
const resetRoundBtn = document.getElementById('resetRoundBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const modeToggle = document.getElementById('modeToggle');
const burstLayer = document.getElementById('burstLayer');

const winningPatterns = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const state = {
  board: Array(9).fill(''),
  currentPlayer: 'X',
  gameOver: false,
  isSinglePlayer: false,
  scores: { X: 0, O: 0, draw: 0 }
};

function getWinnerResult(board) {
  for (const pattern of winningPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: pattern };
    }
  }

  if (board.every(Boolean)) {
    return { winner: 'draw', line: null };
  }

  return null;
}

function renderBoard() {
  boardEl.innerHTML = '';

  state.board.forEach((cellValue, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.index = String(index);
    cell.disabled = !!cellValue || state.gameOver;

    if (cellValue) {
      cell.textContent = cellValue;
      cell.classList.add(cellValue.toLowerCase());
    }

    if (cellValue) {
      cell.disabled = true;
    }

    cell.addEventListener('click', () => handleMove(index));
    boardEl.appendChild(cell);
  });
}

function updateStatus() {
  const player = state.currentPlayer;
  const tokenText = player === 'X' ? 'X' : 'O';

  turnToken.textContent = tokenText;
  turnToken.classList.remove('x', 'o');
  turnToken.classList.add(player === 'X' ? 'x' : 'o');

  if (state.gameOver) {
    statusText.textContent = 'Round complete';
    return;
  }

  const aiThinking = state.isSinglePlayer && player === 'O';
  statusText.textContent = aiThinking ? 'AI plotting move...' : `Player ${player} turn`;
}

function updateScores() {
  scoreXEl.textContent = state.scores.X;
  scoreOEl.textContent = state.scores.O;
  scoreDrawEl.textContent = state.scores.draw;
}

function startRound() {
  state.board = Array(9).fill('');
  state.currentPlayer = 'X';
  state.gameOver = false;
  burstLayer.innerHTML = '';
  renderBoard();
  updateStatus();
}

function addWinGlow(line) {
  if (!line) return;

  const cells = [...document.querySelectorAll('.cell')];
  line.forEach(index => {
    cells[index]?.classList.add('win');
  });
}

function triggerBurst() {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const palette = ['#74f9ff', '#ff74d8', '#8f7cff', '#5ce1c9'];

  for (let i = 0; i < 22; i++) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    particle.style.color = palette[i % palette.length];
    particle.style.setProperty('--dx', `${(Math.random() - 0.5) * 210}px`);
    particle.style.setProperty('--dy', `${(Math.random() - 0.5) * 210}px`);
    burstLayer.appendChild(particle);
  }

  setTimeout(() => {
    burstLayer.innerHTML = '';
  }, 700);
}

function finishRound(result) {
  state.gameOver = true;
  addWinGlow(result.line);

  if (result.winner === 'draw') {
    state.scores.draw += 1;
    statusText.textContent = 'Draw game';
    triggerBurst();
  } else {
    state.scores[result.winner] += 1;
    statusText.textContent = `Player ${result.winner} wins`;
    triggerBurst();
  }

  updateScores();
  renderBoard();
  updateStatus();
}

function handleMove(index) {
  if (state.board[index] || state.gameOver) return;

  state.board[index] = state.currentPlayer;
  const result = getWinnerResult(state.board);

  if (result) {
    finishRound(result);
    return;
  }

  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  renderBoard();
  updateStatus();

  if (state.isSinglePlayer && state.currentPlayer === 'O') {
    setTimeout(aiMove, 350);
  }
}

function minimax(board, depth, isMaximizing) {
  const result = getWinnerResult(board);

  if (result?.winner === 'O') return 10 - depth;
  if (result?.winner === 'X') return depth - 10;
  if (result?.winner === 'draw') return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < board.length; i++) {
      if (!board[i]) {
        board[i] = 'O';
        const score = minimax(board, depth + 1, false);
        board[i] = '';
        bestScore = Math.max(bestScore, score);
      }
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) {
      board[i] = 'X';
      const score = minimax(board, depth + 1, true);
      board[i] = '';
      bestScore = Math.min(bestScore, score);
    }
  }
  return bestScore;
}

function findBestMove(board) {
  let bestScore = -Infinity;
  let move = null;

  for (let i = 0; i < board.length; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const score = minimax(board, 0, false);
      board[i] = '';

      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }

  return move;
}

function aiMove() {
  if (state.gameOver) return;

  const move = findBestMove(state.board);
  if (move !== null) {
    handleMove(move);
  }
}

function toggleMode() {
  state.isSinglePlayer = !state.isSinglePlayer;
  modeToggle.classList.toggle('active', state.isSinglePlayer);
  startRound();
}

modeToggle.addEventListener('click', toggleMode);
resetRoundBtn.addEventListener('click', startRound);
resetScoreBtn.addEventListener('click', () => {
  state.scores = { X: 0, O: 0, draw: 0 };
  updateScores();
  startRound();
});

updateScores();
startRound();
