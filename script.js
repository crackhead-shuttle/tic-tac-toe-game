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
const difficultyBtn = document.getElementById('difficultyBtn');
const soundToggle = document.getElementById('soundToggle');

const winningPatterns = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const difficultyLevels = ['Easy', 'Normal', 'Hard'];
const state = {
  board: Array(9).fill(''),
  currentPlayer: 'X',
  gameOver: false,
  isSinglePlayer: false,
  soundEnabled: true,
  difficultyIndex: 1,
  scores: { X: 0, O: 0, draw: 0 }
};

function playTone(freq, duration, type = 'sine', volume = 0.04) {
  if (!state.soundEnabled) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const audioCtx = new AudioCtx();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = freq;
  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  oscillator.stop(audioCtx.currentTime + duration);
}

function playMoveSound() {
  playTone(state.currentPlayer === 'X' ? 360 : 520, 0.08, 'triangle', 0.05);
}

function playWinSound() {
  playTone(760, 0.12, 'square', 0.05);
  setTimeout(() => playTone(980, 0.12, 'triangle', 0.05), 80);
}

function playDrawSound() {
  playTone(260, 0.12, 'sawtooth', 0.04);
}

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
  statusText.textContent = aiThinking ? 'AI planning move...' : `Player ${player} turn`;
}

function updateScores() {
  scoreXEl.textContent = state.scores.X;
  scoreOEl.textContent = state.scores.O;
  scoreDrawEl.textContent = state.scores.draw;
}

function updateDifficulty() {
  difficultyBtn.innerHTML = `<span>AI: ${difficultyLevels[state.difficultyIndex]}</span>`;
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
  const palette = ['#74f9ff', '#ff74d8', '#8f7cff', '#5ce1c9', '#ffd166'];

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
    playDrawSound();
  } else {
    state.scores[result.winner] += 1;
    statusText.textContent = `Player ${result.winner} wins`;
    playWinSound();
  }

  triggerBurst();
  updateScores();
  renderBoard();
  updateStatus();
}

function handleMove(index) {
  if (state.board[index] || state.gameOver) return;

  state.board[index] = state.currentPlayer;
  playMoveSound();

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

function getEasyMove(board) {
  const emptyIndices = board
    .map((cell, index) => (cell === '' ? index : null))
    .filter(index => index !== null);

  return emptyIndices[Math.floor(Math.random() * emptyIndices.length)] ?? null;
}

function getNormalMove(board) {
  const winningMove = findImmediateWinningMove(board, 'O');
  if (winningMove !== null) return winningMove;

  const blockMove = findImmediateWinningMove(board, 'X');
  if (blockMove !== null) return blockMove;

  const center = 4;
  if (!board[center]) return center;

  return getEasyMove(board);
}

function findImmediateWinningMove(board, player) {
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) {
      board[i] = player;
      const won = getWinnerResult(board)?.winner === player;
      board[i] = '';
      if (won) return i;
    }
  }
  return null;
}

function getAIMove(board) {
  if (state.difficultyIndex === 0) return getEasyMove(board);
  if (state.difficultyIndex === 1) return getNormalMove(board);

  return findBestMove(board);
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

  const move = getAIMove(state.board);
  if (move !== null) {
    handleMove(move);
  }
}

function toggleMode() {
  state.isSinglePlayer = !state.isSinglePlayer;
  modeToggle.classList.toggle('active', state.isSinglePlayer);
  state.currentPlayer = 'X';
  startRound();
}

function cycleDifficulty() {
  state.difficultyIndex = (state.difficultyIndex + 1) % difficultyLevels.length;
  updateDifficulty();
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  soundToggle.querySelector('.sound-icon').textContent = state.soundEnabled ? '🔊' : '🔇';
}

modeToggle.addEventListener('click', toggleMode);
resetRoundBtn.addEventListener('click', startRound);
resetScoreBtn.addEventListener('click', () => {
  state.scores = { X: 0, O: 0, draw: 0 };
  updateScores();
  startRound();
});
difficultyBtn.addEventListener('click', cycleDifficulty);
soundToggle.addEventListener('click', toggleSound);

updateDifficulty();
updateScores();
startRound();
modeToggle.classList.remove('active');

window.addEventListener('pointerdown', () => {
  if (window.AudioContext || window.webkitAudioContext) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
  }
}, { once: true });

soundToggle.querySelector('.sound-icon').textContent = '🔊';

statusText.textContent = 'Player X turn';
turnToken.classList.add('x');
turnToken.textContent = 'X';

if (state.isSinglePlayer && state.currentPlayer === 'O') {
  setTimeout(aiMove, 300);
}

setInterval(() => {
  if (state.isSinglePlayer && !state.gameOver && state.currentPlayer === 'O') {
    const movesLeft = state.board.filter(Boolean).length;
    if (movesLeft >= 0 && movesLeft < 9) {
      // no-op to keep event loop stable
    }
  }
}, 1000);



































































































































































































































































































































































































































































































































































n


































































































































































































n








































































































n








































































































































































































































"}
































































































































































































































n


























































































n




















































n











































n














n































n

n














n








n





n






n





n





n



n












"}]} ,