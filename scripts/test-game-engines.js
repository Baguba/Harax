#!/usr/bin/env node
// Unit tests for the Harax Game Zone engines (no DB, no sockets).
// Run: node scripts/test-game-engines.js

const { ENGINES } = require("../mini-services/chat-service/game-engines");
const ttt = ENGINES.TICTACTOE;
const ck = ENGINES.CHECKERS;
const ch = ENGINES.CHESS;

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; }
  else { fail++; console.error(`  ✗ ${name} ${extra}`); }
}

/* ── Tic-Tac-Toe ─────────────────────────────────────────── */
console.log("· Tic-Tac-Toe");
{
  let s = ttt.createInitialState();
  check("X moves first", s.turn === "X");
  check("9 legal moves at start", ttt.getLegalMoves(s).length === 9);

  const seq = [0, 3, 1, 4, 2]; // X wins with 0,1,2 column? 0,1,2 = top row
  let done = false, result = null;
  for (const to of seq) {
    const r = ttt.applyMove(s, { to });
    s = r.state;
    done = r.done;
    result = r.result;
  }
  check("X wins top row", done && result?.winner === "X" && result?.reason === "LINE");

  // draw path (verified: no line completes earlier)
  s = ttt.createInitialState();
  const drawSeq = [0, 4, 8, 2, 6, 3, 5, 7, 1];
  let dr = null;
  for (const to of drawSeq) {
    const r = ttt.applyMove(s, { to });
    s = r.state;
    dr = r;
  }
  check("draw detected", dr.done && dr.result.winner === null);

  // illegal move rejected
  s = ttt.createInitialState();
  s = ttt.applyMove(s, { to: 4 }).state; // NOTE: state is immutable — reassign
  let threw = false;
  try { ttt.applyMove(s, { to: 4 }); } catch { threw = true; }
  check("occupied cell rejected", threw);

  // random playouts never crash and always terminate
  let terminated = 0;
  for (let i = 0; i < 300; i++) {
    let st = ttt.createInitialState();
    let guard = 0;
    while (guard++ < 20) {
      const moves = ttt.getLegalMoves(st);
      if (moves.length === 0) { terminated++; break; }
      const m = moves[Math.floor(Math.random() * moves.length)];
      const r = ttt.applyMove(st, m);
      st = r.state;
      if (r.done) { terminated++; break; }
    }
  }
  check("300 random playouts all terminate", terminated === 300);

  // bot never plays an illegal move
  let botOk = true;
  for (let i = 0; i < 100; i++) {
    let st = ttt.createInitialState();
    let guard = 0;
    while (guard++ < 20) {
      const moves = ttt.getLegalMoves(st);
      if (moves.length === 0) break;
      const m = (st.turn === "O") ? ttt.botMove(st) : moves[Math.floor(Math.random() * moves.length)];
      if (!moves.some((x) => x.to === m.to)) { botOk = false; break; }
      const r = ttt.applyMove(st, m);
      st = r.state;
      if (r.done) break;
    }
  }
  check("bot moves always legal", botOk);
}

/* ── Checkers ────────────────────────────────────────────── */
console.log("· Checkers");
{
  let s = ck.createInitialState();
  check("k (black) moves first", s.turn === "k");
  check("12 pieces per side at start",
    s.board.filter((p) => p?.s === "r").length === 12 &&
    s.board.filter((p) => p?.s === "k").length === 12);
  const firstMoves = ck.getLegalMoves(s);
  check("7 legal opening moves", firstMoves.length === 7, `got ${firstMoves.length}`);
  check("no captures at start", firstMoves.every((m) => m.jump == null));

  // forced capture scenario: red man at (3,2) [idx 26], black man at (4,3) [idx 35]
  // red to move must jump.
  const board = Array(64).fill(null);
  board[26] = { s: "r", k: false }; // r3c2
  board[35] = { s: "k", k: false }; // r4c3
  const st = { board, turn: "r", chain: null, quiet: 0, moves: [], lastMove: null };
  const moves = ck.getLegalMoves(st);
  check("capture is forced", moves.length === 1 && moves[0].jump === 35, JSON.stringify(moves));

  // multi-jump: red man at (2,3), black men at (3,2) and (5,2)
  // jump 1: (2,3)× (3,2) → (4,1); jump 2 (chain): (4,1)× (5,2) → (6,3)
  const b2 = Array(64).fill(null);
  b2[19] = { s: "r", k: false }; // (2,3)
  b2[26] = { s: "k", k: false }; // (3,2)
  b2[42] = { s: "k", k: false }; // (5,2)
  let st2 = { board: b2, turn: "r", chain: null, quiet: 0, moves: [], lastMove: null };
  let r1 = ck.applyMove(st2, { from: 19, to: 33 }); // lands (4,1), jumps (3,2)
  check("chain continues after first jump", r1.state.chain === 33 && r1.state.turn === "r" && !r1.done);
  const chainMoves = ck.getLegalMoves(r1.state);
  check("only chain piece may move", chainMoves.length === 1 && chainMoves[0].from === 33 && chainMoves[0].jump === 42, JSON.stringify(chainMoves));
  let r2 = ck.applyMove(r1.state, chainMoves[0]); // jumps (5,2), lands (6,3)=51
  check("chain resolved after second jump", r2.state.chain === null && r2.state.turn === "k");

  // kinging ends the move even mid-chain: red man (5,0) jumps (6,1) into row 7
  const b3 = Array(64).fill(null);
  b3[40] = { s: "r", k: false }; // (5,0)
  b3[49] = { s: "k", k: false }; // (6,1)
  const st3 = { board: b3, turn: "r", chain: null, quiet: 0, moves: [], lastMove: null };
  const r3 = ck.applyMove(st3, { from: 40, to: 58 }); // lands (7,2), kinged
  check("kinged on last row", r3.state.board[58]?.k === true);
  check("kinging ends chain + passes turn", r3.state.chain === null && r3.state.turn === "k");

  // no pieces = loss
  const b4 = Array(64).fill(null);
  b4[0] = { s: "r", k: true };
  const st4 = { board: b4, turn: "k", chain: null, quiet: 0, moves: [], lastMove: null };
  check("side with no pieces sees no moves", ck.getLegalMoves(st4).length === 0);

  // random playouts: terminate, forced-capture invariant, chain invariant
  let ok = true, term = 0;
  for (let g = 0; g < 200; g++) {
    let st = ck.createInitialState();
    let guard = 0;
    while (guard++ < 400) {
      const moves = ck.getLegalMoves(st);
      if (moves.length === 0) { term++; break; }
      // invariant: when not mid-chain, if any jump exists, ONLY jumps are offered
      if (st.chain == null) {
        const all = ck.getLegalMoves({ ...st, chain: null });
        const totalJumps = all.filter((m) => m.jump != null).length;
        const offeredJumps = moves.filter((m) => m.jump != null).length;
        if (totalJumps > 0 && offeredJumps !== totalJumps) { ok = false; break; }
      }
      if (st.chain != null && (moves.length === 0 || moves.some((m) => m.from !== st.chain || m.jump == null))) { ok = false; break; }
      const m = moves[Math.floor(Math.random() * moves.length)];
      const r = ck.applyMove(st, m);
      st = r.state;
      if (r.done) { term++; break; }
    }
  }
  check("200 random checkers games terminate", term === 200);
  check("forced-capture + chain invariants hold", ok);

  // bot legality over a full game
  let botOk = true;
  for (let g = 0; g < 20; g++) {
    let st = ck.createInitialState();
    let guard = 0;
    while (guard++ < 400) {
      const moves = ck.getLegalMoves(st);
      if (moves.length === 0) break;
      const m = ck.botMove(st);
      if (!m || !moves.some((x) => x.from === m.from && x.to === m.to)) { botOk = false; break; }
      const r = ck.applyMove(st, m);
      st = r.state;
      if (r.done) break;
    }
  }
  check("checkers bot always legal", botOk);
}

/* ── Chess ───────────────────────────────────────────────── */
console.log("· Chess");
{
  // perft-style counts from the starting position
  const s0 = ch.createInitialState();
  const d1 = ch.getLegalMoves(s0).length;
  check("perft(1) = 20", d1 === 20, `got ${d1}`);
  let d2 = 0, d3 = 0;
  for (const m1 of ch.getLegalMoves(s0)) {
    const r1 = ch.applyMove(s0, m1);
    if (r1.done) { d2++; continue; }
    d2 += ch.getLegalMoves(r1.state).length;
    for (const m2 of ch.getLegalMoves(r1.state)) {
      const r2 = ch.applyMove(r1.state, m2);
      if (r2.done) { d3++; continue; }
      d3 += ch.getLegalMoves(r2.state).length;
    }
  }
  check("perft(2) = 400", d2 === 400, `got ${d2}`);
  check("perft(3) = 8902", d3 === 8902, `got ${d3}`);

  // helper: apply a sequence of from/to squares
  const play = (state, pairs) => {
    let st = state;
    let last = null;
    for (const [from, to, promo] of pairs) {
      const r = ch.applyMove(st, { from, to, promo });
      st = r.state;
      last = r;
    }
    return { state: st, last };
  };

  // fool's mate: 1. f3 e5 2. g4 Qh4#
  const fm = play(ch.createInitialState(), [[53, 37], [12, 28], [54, 38], [3, 39]]); // f2f3 e7e5 g2g4 d8h4
  check("fool's mate detected", fm.last.done && fm.last.result.reason === "CHECKMATE" && fm.last.result.winner === "b");

  // castling kingside for white from a cleared path
  const cb = Array(64).fill(null);
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++) { cb[56 + c] = { t: back[c], c: "w" }; }
  cb[61] = null; cb[62] = null; // clear f1 g1
  cb[8] = { t: "p", c: "b" }; cb[9] = { t: "p", c: "b" }; cb[10] = { t: "p", c: "b" }; cb[11] = { t: "p", c: "b" };
  cb[12] = { t: "p", c: "b" }; cb[13] = { t: "p", c: "b" }; cb[14] = { t: "p", c: "b" }; cb[15] = { t: "p", c: "b" };
  const cs = { board: cb, turn: "w", castling: { wk: true, wq: true, bk: false, bq: false }, ep: null, quiet: 0, moves: [], lastMove: null };
  const castleMoves = ch.getLegalMoves(cs).filter((m) => m.castle === "k");
  check("white can castle kingside", castleMoves.length === 1);
  if (castleMoves.length === 1) {
    const rc = ch.applyMove(cs, castleMoves[0]);
    check("castling moves king e1->g1 and rook h1->f1",
      rc.state.board[62]?.t === "k" && rc.state.board[61]?.t === "r" && rc.state.board[63] === null);
    check("castling rights revoked after castling", rc.state.castling.wk === false && rc.state.castling.wq === false);
  }

  // en passant: 1.e4 a6 2.e5 d5 3.exd6 e.p. — the d5 pawn vanishes while white lands on d6
  const ep = play(ch.createInitialState(), [[52, 36], [8, 16], [36, 28], [11, 27], [28, 19]]);
  const epMoves = ep.state.moves;
  check("en passant recorded", epMoves[4].ep === true && ep.state.board[27] === null && ep.state.board[19]?.t === "p" && ep.state.board[19]?.c === "w",
    JSON.stringify(epMoves[4]));

  // promotion: white pawn a7 -> a8
  const pb = Array(64).fill(null);
  pb[8] = { t: "p", c: "w" };   // a7
  pb[4] = { t: "k", c: "b" };   // e8
  pb[60] = { t: "k", c: "w" };  // e1
  const ps = { board: pb, turn: "w", castling: { wk: false, wq: false, bk: false, bq: false }, ep: null, quiet: 0, moves: [], lastMove: null };
  const promos = ch.getLegalMoves(ps).filter((m) => m.from === 8);
  check("4 promotion options generated", promos.length === 4);
  const rq = ch.applyMove(ps, { from: 8, to: 0, promo: "q" });
  check("promotion to queen applied", rq.state.board[0]?.t === "q");
  const defaulted = ch.applyMove(ps, { from: 8, to: 0 }); // no promo -> defaults to queen
  check("missing promo defaults to queen", defaulted.state.board[0]?.t === "q");

  // stalemate: black Ka8; white Kb6 + Qc7 — no legal move, no check
  const sb = Array(64).fill(null);
  sb[0] = { t: "k", c: "b" };   // a8
  sb[49] = { t: "k", c: "w" };  // b6
  sb[10] = { t: "q", c: "w" };  // c7
  const ss = { board: sb, turn: "b", castling: { wk: false, wq: false, bk: false, bq: false }, ep: null, quiet: 0, moves: [], lastMove: null };
  const smoves = ch.getLegalMoves(ss);
  check("stalemate: no legal moves", smoves.length === 0);
  check("stalemate: not in check", !ch.inCheck(sb, "b"));

  // insufficient material K vs K
  const mb = Array(64).fill(null);
  mb[4] = { t: "k", c: "b" };
  mb[60] = { t: "k", c: "w" };
  const ms = { board: mb, turn: "w", castling: { wk: false, wq: false, bk: false, bq: false }, ep: null, quiet: 0, moves: [], lastMove: null };
  const mm = ch.getLegalMoves(ms);
  const mres = ch.applyMove(ms, mm[0]);
  check("K vs K ends as MATERIAL draw", mres.done && mres.result.reason === "MATERIAL");

  // random full-game playouts (both sides bot) — no crashes, legal always
  let botOk = true, finished = 0;
  for (let g = 0; g < 15; g++) {
    let st = ch.createInitialState();
    let guard = 0;
    while (guard++ < 300) {
      const moves = ch.getLegalMoves(st);
      if (moves.length === 0) { finished++; break; }
      const m = ch.botMove(st);
      if (!m || !moves.some((x) => x.from === m.from && x.to === m.to && (x.promo ?? null) === (m.promo ?? null))) { botOk = false; break; }
      const r = ch.applyMove(st, m);
      st = r.state;
      if (r.done) { finished++; break; }
    }
  }
  check("chess bot games run legally", botOk);

  // describe() notation
  check("notation e2–e4", ch.describe({ from: 52, to: 36 }) === "e2–e4");
  check("notation 0-0", ch.describe({ castle: "k" }) === "0-0");
}

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
