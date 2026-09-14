// Harax Game Zone · Chess engine (full rules, casual-friendly)
// Board: 8x8, index = row*8+col, row 0 = rank 8 (black's back rank), row 7 = rank 1.
// Sides: "w" (white — rows 6-7, moves first) | "b" (black — rows 0-1).
//
// Implemented: all piece moves, castling (with through-check rules),
// en passant, promotion (q/r/b/n), check/checkmate/stalemate,
// insufficient material, 50-move rule. No threefold repetition (casual play).
//
// state = { board, turn, castling, ep, quiet, moves, lastMove }
//   board:   Array(64) of null | { t:"p"|"n"|"b"|"r"|"q"|"k", c:"w"|"b" }
//   castling:{ wk, wq, bk, bq } — rights still intact
//   ep:      en-passant target square index or null
//   quiet:   halfmove clock (plies since capture/pawn move)
//   moves:   [{ from, to, piece, promo?, capture? }]
//
// move = { from, to, promo?: "q"|"r"|"b"|"n" }

const SIZE = 8;
const idx = (r, c) => r * SIZE + c;
const inB = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const other = (c) => (c === "w" ? "b" : "w");

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function createInitialState() {
  const board = Array(64).fill(null);
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < SIZE; c++) {
    board[idx(0, c)] = { t: back[c], c: "b" };
    board[idx(1, c)] = { t: "p", c: "b" };
    board[idx(6, c)] = { t: "p", c: "w" };
    board[idx(7, c)] = { t: back[c], c: "w" };
  }
  return {
    board,
    turn: "w",
    castling: { wk: true, wq: true, bk: true, bq: true },
    ep: null,
    quiet: 0,
    moves: [],
    lastMove: null,
  };
}

/* ── attack detection ─────────────────────────────────────── */

function isAttacked(board, square, by) {
  const r = Math.floor(square / 8);
  const c = square % 8;

  // pawns: a "by"-colored pawn attacks diagonally toward increasing rank for black
  const pr = by === "w" ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    if (inB(pr, c + dc)) {
      const p = board[idx(pr, c + dc)];
      if (p && p.t === "p" && p.c === by) return true;
    }
  }
  // knights
  for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) {
    if (inB(r + dr, c + dc)) {
      const p = board[idx(r + dr, c + dc)];
      if (p && p.t === "n" && p.c === by) return true;
    }
  }
  // king
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      if (inB(r + dr, c + dc)) {
        const p = board[idx(r + dr, c + dc)];
        if (p && p.t === "k" && p.c === by) return true;
      }
    }
  }
  // sliding: rook/queen then bishop/queen
  const rays = [
    [[1, 0], [-1, 0], [0, 1], [0, -1], "rq"],
    [[1, 1], [1, -1], [-1, 1], [-1, -1], "bq"],
  ];
  for (const ray of rays) {
    const types = ray[4];
    for (let i = 0; i < 4; i++) {
      const [dr, dc] = ray[i];
      let rr = r + dr, cc = c + dc;
      while (inB(rr, cc)) {
        const p = board[idx(rr, cc)];
        if (p) {
          if (p.c === by && types.includes(p.t)) return true;
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  }
  return false;
}

function kingSquare(board, color) {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.t === "k" && p.c === color) return i;
  }
  return -1;
}

function inCheck(board, color) {
  const k = kingSquare(board, color);
  return k >= 0 && isAttacked(board, k, other(color));
}

/* ── pseudo-legal move generation ─────────────────────────── */

function pawnMoves(state, from, out) {
  const { board, ep } = state;
  const p = board[from];
  const r = Math.floor(from / 8), c = from % 8;
  const dir = p.c === "w" ? -1 : 1; // white moves up (row decreases)
  const startRow = p.c === "w" ? 6 : 1;
  const lastRow = p.c === "w" ? 0 : 7;

  const push = (to, promo) => out.push({ from, to, piece: "p", promo, capture: null });
  const one = idx(r + dir, c);
  if (inB(r + dir, c) && !board[one]) {
    if (r + dir === lastRow) {
      for (const promo of ["q", "r", "b", "n"]) push(one, promo);
    } else {
      push(one, undefined);
      if (r === startRow) {
        const two = idx(r + 2 * dir, c);
        if (!board[two]) push(two, undefined);
      }
    }
  }
  for (const dc of [-1, 1]) {
    if (!inB(r + dir, c + dc)) continue;
    const to = idx(r + dir, c + dc);
    const target = board[to];
    if (target && target.c !== p.c) {
      if (r + dir === lastRow) {
        for (const promo of ["q", "r", "b", "n"]) out.push({ from, to, piece: "p", promo, capture: target.t });
      } else {
        out.push({ from, to, piece: "p", capture: target.t });
      }
    } else if (to === ep) {
      out.push({ from, to, piece: "p", capture: "p", ep: true });
    }
  }
}

function stepMoves(state, from, out, deltas, sliding) {
  const { board } = state;
  const p = board[from];
  const r = Math.floor(from / 8), c = from % 8;
  for (const [dr, dc] of deltas) {
    let rr = r + dr, cc = c + dc;
    while (inB(rr, cc)) {
      const to = idx(rr, cc);
      const target = board[to];
      if (!target) {
        out.push({ from, to, piece: p.t, capture: null });
      } else {
        if (target.c !== p.c) out.push({ from, to, piece: p.t, capture: target.t });
        break;
      }
      if (!sliding) break;
      rr += dr;
      cc += dc;
    }
  }
}

const N_D = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const B_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const R_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const K_D = [...B_D, ...R_D];

function pseudoMoves(state) {
  const { board, turn, castling } = state;
  const out = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.c !== turn) continue;
    if (p.t === "p") pawnMoves(state, i, out);
    else if (p.t === "n") stepMoves(state, i, out, N_D, false);
    else if (p.t === "b") stepMoves(state, i, out, B_D, true);
    else if (p.t === "r") stepMoves(state, i, out, R_D, true);
    else if (p.t === "q") stepMoves(state, i, out, K_D, true);
    else if (p.t === "k") {
      stepMoves(state, i, out, K_D, false);
      // castling
      const homeRow = turn === "w" ? 7 : 0;
      if (i === idx(homeRow, 4) && !inCheck(board, turn)) {
        const rights = turn === "w" ? [castling.wk, castling.wq] : [castling.bk, castling.bq];
        // king side: e1..g1, rook h1
        if (rights[0] && !board[idx(homeRow, 5)] && !board[idx(homeRow, 6)] &&
            board[idx(homeRow, 7)]?.t === "r" && board[idx(homeRow, 7)]?.c === turn &&
            !isAttacked(board, idx(homeRow, 5), other(turn)) && !isAttacked(board, idx(homeRow, 6), other(turn))) {
          out.push({ from: i, to: idx(homeRow, 6), piece: "k", capture: null, castle: "k" });
        }
        // queen side: e1..c1, squares d1/b1 empty, rook a1
        if (rights[1] && !board[idx(homeRow, 3)] && !board[idx(homeRow, 2)] && !board[idx(homeRow, 1)] &&
            board[idx(homeRow, 0)]?.t === "r" && board[idx(homeRow, 0)]?.c === turn &&
            !isAttacked(board, idx(homeRow, 3), other(turn)) && !isAttacked(board, idx(homeRow, 2), other(turn))) {
          out.push({ from: i, to: idx(homeRow, 2), piece: "k", capture: null, castle: "q" });
        }
      }
    }
  }
  return out;
}

/* ── make / unmake for legality filtering ─────────────────── */

function makeMove(state, move) {
  const board = [...state.board];
  const p = board[move.from];
  const castling = { ...state.castling };
  let ep = null;

  board[move.from] = null;

  if (move.ep) {
    // en passant: captured pawn sits behind the target square
    const capRow = p.c === "w" ? Math.floor(move.to / 8) + 1 : Math.floor(move.to / 8) - 1;
    board[idx(capRow, move.to % 8)] = null;
  }

  if (move.castle) {
    const homeRow = p.c === "w" ? 7 : 0;
    if (move.castle === "k") {
      board[idx(homeRow, 5)] = board[idx(homeRow, 7)];
      board[idx(homeRow, 7)] = null;
    } else {
      board[idx(homeRow, 3)] = board[idx(homeRow, 0)];
      board[idx(homeRow, 0)] = null;
    }
    castling[p.c === "w" ? "wk" : "bk"] = false;
    castling[p.c === "w" ? "wq" : "bq"] = false;
  }

  if (p.t === "p") {
    // double push sets the ep square
    if (Math.abs(Math.floor(move.to / 8) - Math.floor(move.from / 8)) === 2) {
      ep = idx((Math.floor(move.to / 8) + Math.floor(move.from / 8)) / 2, move.from % 8);
    }
    if (move.promo) board[move.to] = { t: move.promo, c: p.c };
    else board[move.to] = p;
  } else {
    board[move.to] = p;
  }

  // castling rights: king or rook moved, or rook captured on its home square
  if (p.t === "k") {
    if (p.c === "w") { castling.wk = false; castling.wq = false; }
    else { castling.bk = false; castling.bq = false; }
  }
  const ROOK_HOME = {
    w: { [idx(7, 0)]: "wq", [idx(7, 7)]: "wk" },
    b: { [idx(0, 0)]: "bq", [idx(0, 7)]: "bk" },
  };
  for (const sq of [move.from, move.to]) {
    const right = ROOK_HOME.w[sq] ?? ROOK_HOME.b[sq];
    if (right) castling[right] = false;
  }

  return { board, castling, ep };
}

function getLegalMoves(state) {
  const out = [];
  for (const move of pseudoMoves(state)) {
    const next = makeMove(state, move);
    if (!inCheck(next.board, state.turn)) out.push(move);
  }
  return out;
}

/* ── apply + terminal detection ───────────────────────────── */

function insufficientMaterial(board) {
  const pieces = board.filter(Boolean);
  const nonKings = pieces.filter((p) => p.t !== "k");
  if (nonKings.length === 0) return true; // K vs K
  if (nonKings.length === 1 && (nonKings[0].t === "b" || nonKings[0].t === "n")) return true; // K+minor vs K
  if (nonKings.length === 2 && nonKings.every((p) => p.t === "b")) {
    // same-color bishops
    const sq = [];
    for (let i = 0; i < 64; i++) if (board[i]?.t === "b") sq.push(i);
    const [a, b] = sq.map((s) => (Math.floor(s / 8) + (s % 8)) % 2);
    if (a === b) return true;
  }
  return false;
}

function applyMove(state, move) {
  const promo = ["q", "r", "b", "n"].includes(move?.promo) ? move.promo : null;
  const legal = getLegalMoves(state);
  const candidates = legal.filter((m) => m.from === move?.from && m.to === move?.to);
  let mv = null;
  if (candidates.length === 1) mv = candidates[0];
  else if (candidates.length > 1) {
    // multiple from/to matches = promotion: use the requested piece, default queen
    mv = candidates.find((m) => (m.promo ?? null) === (promo ?? "q")) ?? null;
  }
  if (!mv) throw new Error("illegal move");

  const p = state.board[mv.from];
  const next = makeMove(state, mv);
  const isPawn = p.t === "p";
  const isCapture = Boolean(mv.capture) || Boolean(mv.ep);

  const newState = {
    board: next.board,
    turn: other(state.turn),
    castling: next.castling,
    ep: next.ep,
    quiet: isPawn || isCapture ? 0 : state.quiet + 1,
    moves: [...state.moves, {
      from: mv.from, to: mv.to, piece: mv.piece,
      promo: mv.promo ?? null, capture: mv.capture ?? null,
      castle: mv.castle ?? null, ep: mv.ep ? true : undefined,
    }],
    lastMove: { from: mv.from, to: mv.to },
  };

  // terminal states
  const oppMoves = getLegalMoves(newState);
  if (oppMoves.length === 0) {
    if (inCheck(newState.board, newState.turn)) {
      return { state: newState, done: true, result: { winner: state.turn, reason: "CHECKMATE" } };
    }
    return { state: newState, done: true, result: { winner: null, reason: "STALEMATE" } };
  }
  if (insufficientMaterial(newState.board)) {
    return { state: newState, done: true, result: { winner: null, reason: "MATERIAL" } };
  }
  if (newState.quiet >= 100) {
    return { state: newState, done: true, result: { winner: null, reason: "FIFTY" } };
  }
  return { state: newState, done: false, result: null };
}

/** Simple greedy bot: takes the best capture, protects pieces, likes the center. */
function botMove(state) {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  const CENTER = [idx(3, 3), idx(3, 4), idx(4, 3), idx(4, 4)];
  let best = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    let score = Math.random();
    if (m.capture) score += VALUE[m.capture] ?? 0.5;
    if (m.promo) score += VALUE[m.promo];
    if (CENTER.includes(m.to)) score += 0.3;
    if (CENTER.includes(m.from)) score -= 0.1;

    // avoid hanging the moved piece: simulate and see if it can be captured for free
    const next = makeMove(state, m);
    const replies = pseudoMoves({ ...state, board: next.board, turn: other(state.turn) });
    const hanging = replies.find((rm) => rm.to === m.to && rm.capture);
    if (hanging) score -= VALUE[m.piece] * 0.6;
    if (inCheck(next.board, other(state.turn))) score += 0.8; // giving check is nice

    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/** Human-ish notation for the move list, e.g. "e2–e4", "e7×e8=Q", "0-0". */
function describe(move) {
  if (move.castle === "k") return "0-0";
  if (move.castle === "q") return "0-0-0";
  const sq = (i) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}`;
  const sep = move.capture ? "×" : "–";
  const promo = move.promo ? `=${move.promo.toUpperCase()}` : "";
  return `${sq(move.from)}${sep}${sq(move.to)}${promo}`;
}

module.exports = {
  key: "CHESS",
  sides: ["w", "b"],
  turnLimitSec: 180,
  createInitialState,
  getLegalMoves,
  applyMove,
  botMove,
  describe,
  inCheck,
  kingSquare,
};
