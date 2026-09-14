// Harax Game Zone · Tic-Tac-Toe (X & O) engine
// Board: 9 cells, row-major (0..8). Sides: "X" | "O" — X always moves first.
//
// Uniform engine contract (see engines/index.js):
//   createInitialState() -> state
//   getLegalMoves(state) -> [{ to }]
//   applyMove(state, move) -> { state, done, result }
//     result = { winner: side|null, reason } (winner null + done = draw)

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6], // diagonals
];

function createInitialState() {
  return {
    board: Array(9).fill(null),
    turn: "X",
    moves: [], // [{ to, side }]
    lastMove: null,
  };
}

function winningLine(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

function getLegalMoves(state) {
  const line = winningLine(state.board);
  if (line) return [];
  if (!state.board.includes(null)) return [];
  return state.board
    .map((cell, i) => (cell === null ? { to: i } : null))
    .filter(Boolean);
}

function applyMove(state, move) {
  const idx = move?.to;
  if (typeof idx !== "number" || idx < 0 || idx > 8) throw new Error("bad move");
  if (state.board[idx] !== null) throw new Error("cell taken");
  if (getLegalMoves(state).length === 0) throw new Error("game over");

  const board = [...state.board];
  board[idx] = state.turn;

  const next = {
    board,
    turn: state.turn === "X" ? "O" : "X",
    moves: [...state.moves, { to: idx, side: state.turn }],
    lastMove: idx,
  };

  const line = winningLine(board);
  if (line) {
    return { state: next, done: true, result: { winner: state.turn, reason: "LINE", line } };
  }
  if (!board.includes(null)) {
    return { state: next, done: true, result: { winner: null, reason: "FULL" } };
  }
  return { state: next, done: false, result: null };
}

/** Perfect-play minimax with a light randomness dial so the bot is beatable. */
function botMove(state, randomness = 0.35) {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  if (Math.random() < randomness) return moves[Math.floor(Math.random() * moves.length)];

  const score = (board, me, depth) => {
    const line = winningLine(board);
    if (line) return board[line[0]] === me ? 10 - depth : depth - 10;
    if (!board.includes(null)) return 0;
    const turn = board.filter((c) => c === "X").length === board.filter((c) => c === "O").length ? "X" : "O";
    const results = board
      .map((c, i) => (c === null ? i : -1))
      .filter((i) => i >= 0)
      .map((i) => {
        const b = [...board];
        b[i] = turn;
        return score(b, me, depth + 1);
      });
    return turn === me ? Math.max(...results) : Math.min(...results);
  };

  const me = state.turn;
  let best = -Infinity;
  let bestMoves = [];
  for (const m of moves) {
    const b = [...state.board];
    b[m.to] = me;
    const s = score(b, me, 1);
    if (s > best) {
      best = s;
      bestMoves = [m];
    } else if (s === best) {
      bestMoves.push(m);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

module.exports = {
  key: "TICTACTOE",
  sides: ["X", "O"],
  turnLimitSec: 90,
  createInitialState,
  getLegalMoves,
  applyMove,
  botMove,
};
