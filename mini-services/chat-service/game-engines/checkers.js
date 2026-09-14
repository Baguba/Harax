// Harax Game Zone · Checkers (English draughts) engine
// Board: 8x8, index = row*8+col, row 0 at the top. Playable squares: (row+col)%2===1.
// Sides: "r" (red — starts rows 0-2, moves DOWN) and "k" (black — starts rows 5-7, moves UP).
// "k" moves first.
//
// Rules implemented:
//   - men move 1 diagonally forward, kings 1 diagonally any direction
//   - captures by jumping (men and kings); multi-jump chains are mandatory
//   - captures are forced when available
//   - a man reaching the last row is kinged and the move ENDS there (official rule)
//   - lose when you have no pieces or no legal move on your turn
//   - 60 quiet plies (no capture / no man advance) => draw
//
// state = { board, turn, chain, quiet, moves, lastMove }
//   board: Array(64) of null | { s:"r"|"k", k:bool }
//   chain: if set, only that square may move (mid multi-jump) and only jumps

const SIZE = 8;
const QUIET_DRAW = 60;

const idx = (r, c) => r * SIZE + c;
const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const playable = (r, c) => (r + c) % 2 === 1;
const other = (s) => (s === "r" ? "k" : "r");
const forward = (s) => (s === "r" ? 1 : -1); // red moves down (+row), black up

function createInitialState() {
  const board = Array(64).fill(null);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (playable(r, c)) board[idx(r, c)] = { s: "r", k: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (playable(r, c)) board[idx(r, c)] = { s: "k", k: false };
    }
  }
  return { board, turn: "k", chain: null, quiet: 0, moves: [], lastMove: null };
}

function pieceDirs(piece) {
  if (piece.k) return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const f = forward(piece.s);
  return [[f, 1], [f, -1]];
}

/** All capture moves for the piece at (r,c). Each is a single jump. */
function jumpsFrom(board, r, c) {
  const piece = board[idx(r, c)];
  if (!piece) return [];
  const out = [];
  for (const [dr, dc] of pieceDirs(piece)) {
    const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
    if (!inBounds(tr, tc)) continue;
    const mid = board[idx(mr, mc)];
    if (mid && mid.s !== piece.s && !board[idx(tr, tc)]) {
      out.push({ from: idx(r, c), to: idx(tr, tc), jump: idx(mr, mc) });
    }
  }
  return out;
}

/** All quiet (non-capture) moves for the piece at (r,c). */
function slidesFrom(board, r, c) {
  const piece = board[idx(r, c)];
  if (!piece) return [];
  const out = [];
  for (const [dr, dc] of pieceDirs(piece)) {
    const tr = r + dr, tc = c + dc;
    if (inBounds(tr, tc) && !board[idx(tr, tc)]) {
      out.push({ from: idx(r, c), to: idx(tr, tc), jump: null });
    }
  }
  return out;
}

function sideSquares(board, side) {
  const squares = [];
  for (let i = 0; i < 64; i++) {
    if (board[i] && board[i].s === side) squares.push(i);
  }
  return squares;
}

function getLegalMoves(state) {
  const { board, turn, chain } = state;
  if (chain !== null && chain !== undefined) {
    return jumpsFrom(board, Math.floor(chain / 8), chain % 8); // mid multi-jump: jumps only
  }
  const squares = sideSquares(board, turn);
  const jumps = squares.flatMap((i) => jumpsFrom(board, Math.floor(i / 8), i % 8));
  if (jumps.length > 0) return jumps; // captures are forced
  return squares.flatMap((i) => slidesFrom(board, Math.floor(i / 8), i % 8));
}

function applyMove(state, move) {
  const { from, to } = move ?? {};
  if (typeof from !== "number" || typeof to !== "number") throw new Error("bad move");
  const legal = getLegalMoves(state);
  const match = legal.find((m) => m.from === from && m.to === to);
  if (!match) throw new Error("illegal move");

  const board = [...state.board];
  const piece = { ...board[from] };
  board[from] = null;
  if (match.jump !== null && match.jump !== undefined) board[match.jump] = null;

  // kinging — reaching the far row ends the move (even mid chain)
  const r = Math.floor(to / 8);
  const kinged = !piece.k && ((piece.s === "r" && r === 7) || (piece.s === "k" && r === 0));
  if (kinged) piece.k = true;
  board[to] = piece;

  const moved = {
    board,
    turn: state.turn,
    chain: null,
    quiet: state.quiet,
    moves: [...state.moves, {
      from, to,
      jump: match.jump ?? null,
      side: state.turn,
      kinged: kinged || piece.k,
    }],
    lastMove: { from, to },
  };

  const wasCapture = match.jump !== null && match.jump !== undefined;
  const quiet = wasCapture || !piece.k || kinged ? 0 : state.quiet + 1;
  moved.quiet = quiet;

  // multi-jump continuation (not after kinging)
  let done = false;
  let result = null;
  if (wasCapture && !kinged && jumpsFrom(board, r, to % 8).length > 0) {
    moved.chain = to; // same player continues jumping
  } else {
    moved.turn = other(state.turn);
    // terminal check: opponent out of pieces or out of moves
    const oppSquares = sideSquares(board, moved.turn);
    if (oppSquares.length === 0) {
      done = true;
      result = { winner: state.turn, reason: "NO_PIECES" };
    } else if (getLegalMoves(moved).length === 0) {
      done = true;
      result = { winner: state.turn, reason: "NO_MOVES" };
    } else if (quiet >= QUIET_DRAW) {
      done = true;
      result = { winner: null, reason: "QUIET" };
    }
  }

  return { state: moved, done, result };
}

/** Bot: always takes a jump when forced; otherwise mixes advances with safety. */
function botMove(state) {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  // within jumps: pick the one whose landing square is hardest to counter-jump
  const jumps = moves.filter((m) => m.jump !== null && m.jump !== undefined);
  if (jumps.length > 0) {
    let best = null;
    let bestScore = -Infinity;
    for (const m of jumps) {
      const next = { ...state, board: [...state.board] };
      next.board[m.to] = next.board[m.from];
      next.board[m.from] = null;
      next.board[m.jump] = null;
      const replies = getLegalMoves({ ...next, turn: other(state.turn), chain: null });
      const danger = replies.some((rm) => rm.to === m.to && rm.jump !== null) ? -5 : 0;
      const row = Math.floor(m.to / 8);
      const advance = state.turn === "r" ? row : 7 - row;
      const score = danger + advance + Math.random();
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  // quiet moves: prefer safe advances (avoid leaving a piece en prise)
  let best = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    const board = [...state.board];
    board[m.to] = board[m.from];
    board[m.from] = null;
    const replies = [];
    for (let i = 0; i < 64; i++) {
      if (board[i] && board[i].s === other(state.turn)) {
        replies.push(...jumpsFrom(board, Math.floor(i / 8), i % 8));
      }
    }
    const danger = replies.length > 0 ? -3 : 0;
    const row = Math.floor(m.to / 8);
    const advance = state.turn === "r" ? row : 7 - row;
    const backRowSafe = row === 0 || row === 7 ? 0.5 : 0;
    const score = danger + advance * 0.5 + backRowSafe + Math.random();
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

module.exports = {
  key: "CHECKERS",
  sides: ["k", "r"], // "k" (black) moves first
  turnLimitSec: 120,
  createInitialState,
  getLegalMoves,
  applyMove,
  botMove,
};
