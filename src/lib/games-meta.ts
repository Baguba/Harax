// Harax Game Zone · shared meta + DTO types (client-side).
// Point values mirror mini-services/chat-service/games.js (POINTS) — keep in sync.

export type GameKey = "TICTACTOE" | "CHECKERS" | "CHESS";

export interface GameMeta {
  key: GameKey;
  name: string;
  tag: string;
  blurb: string;
  winPts: number;
  drawPts: number;
  lossPts: number;
  turnSecs: number;
  vsBotOnly?: boolean;
}

export const GAMES: Record<GameKey, GameMeta> = {
  TICTACTOE: {
    key: "TICTACTOE",
    name: "X & O",
    tag: "Quick brain brawl",
    blurb: "Three in a row wins. Sounds easy — till someone blocks you twice.",
    winPts: 6, drawPts: 2, lossPts: 0, turnSecs: 90,
  },
  CHECKERS: {
    key: "CHECKERS",
    name: "Checkers",
    tag: "Jump the campus",
    blurb: "Forced jumps, chain captures, kings. Leave no piece behind.",
    winPts: 12, drawPts: 4, lossPts: 1, turnSecs: 120,
  },
  CHESS: {
    key: "CHESS",
    name: "Chess",
    tag: "The big-brain battle",
    blurb: "Full rules — castling, en passant, promotions, the lot.",
    winPts: 15, drawPts: 5, lossPts: 1, turnSecs: 180,
  },
};

export const GAME_LIST = [GAMES.TICTACTOE, GAMES.CHECKERS, GAMES.CHESS];

/** Points ladder shared with the server (games.js POINTS). */
export const POINTS_LADDER: Record<GameKey, { win: number; draw: number; loss: number }> = {
  TICTACTOE: { win: 6, draw: 2, loss: 0 },
  CHECKERS: { win: 12, draw: 4, loss: 1 },
  CHESS: { win: 15, draw: 5, loss: 1 },
};

export const WEEKLY_PRIZES = [
  { rank: 1, label: "Gold champion trophy + 500 ETB campus voucher", emoji: "🏆" },
  { rank: 2, label: "Silver trophy + 300 ETB campus voucher", emoji: "🥈" },
  { rank: 3, label: "Bronze trophy + 150 ETB campus voucher", emoji: "🥉" },
];

/* ── wire types (what the socket service + REST return) ───── */

export interface GameUserDTO {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export interface EngineState {
  board: unknown[]; // per-game shape
  turn: string; // engine side symbol
  moves: GameMoveRecord[];
  lastMove: { from: number; to: number } | number | null;
  chain?: number | null; // checkers multi-jump lock
  castling?: { wk: boolean; wq: boolean; bk: boolean; bq: boolean };
  ep?: number | null;
  quiet?: number;
}

export interface GameMoveRecord {
  from: number;
  to: number;
  side?: string;
  piece?: string;
  promo?: string | null;
  capture?: string | null;
  castle?: string | null;
  jump?: number | null;
  kinged?: boolean;
  ep?: boolean;
}

export interface LegalMove {
  from: number;
  to: number;
  jump?: number | null;
  capture?: string | null;
  promo?: string;
  castle?: string | null;
  ep?: boolean;
}

export interface MatchResult {
  winnerId: string | null;
  reason: string | null;
  isDraw: boolean;
}

export interface MatchDTO {
  id: string;
  game: GameKey;
  status: "WAITING" | "ACTIVE" | "FINISHED";
  vsBot: boolean;
  hostColor: string;
  host: GameUserDTO | null;
  guest: GameUserDTO | null;
  turn: string;
  lastMoveAt: string;
  moveDeadline: string | null;
  state: EngineState;
  legalMoves: LegalMove[];
  check: boolean;
  result: MatchResult | null;
  myColor: string | null;
  createdAt: string;
}

export interface LobbyRow {
  id: string;
  game: GameKey;
  host: GameUserDTO | null;
  hostColor: string;
  createdAt: string;
}

export interface SeasonInfo {
  index: number;
  startsAt: string;
  endsAt: string;
}

export interface MyGameStats {
  points: number;
  wins: number;
  draws: number;
  losses: number;
  rank: number | null;
  played: number;
}

export interface HistoryRow {
  id: string;
  game: GameKey;
  vsBot: boolean;
  status: string;
  opponent: GameUserDTO | null;
  myColor: string;
  winnerId: string | null;
  reason: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface LeaderRow {
  rank: number;
  user: GameUserDTO;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  isMe: boolean;
}

export interface PastSeason {
  index: number;
  startsAt: string;
  endsAt: string;
  winners: Array<{ user: GameUserDTO; rank: number; points: number; prize: string }>;
}

/* ── helpers ──────────────────────────────────────────────── */

/** Board index → algebraic name (row 0 = rank 8), e.g. 52 -> "e2". */
export function squareName(idx: number): string {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  return `${files[idx % 8]}${8 - Math.floor(idx / 8)}`;
}

export function otherColor(c: string): string {
  const map: Record<string, string> = { X: "O", O: "X", r: "k", k: "r", w: "b", b: "w" };
  return map[c] ?? c;
}

export const CHESS_GLYPH: Record<string, string> = {
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
};

export const RESULT_COPY: Record<string, string> = {
  LINE: "three in a row",
  FULL: "board full",
  NO_PIECES: "opponent ran out of pieces",
  NO_MOVES: "opponent had no moves left",
  QUIET: "no progress for too long",
  CHECKMATE: "checkmate",
  STALEMATE: "stalemate",
  MATERIAL: "not enough pieces left to win",
  FIFTY: "50-move rule",
  RESIGN: "resignation",
  TIMEOUT: "clock ran out",
  ABANDON: "opponent left the board",
  DRAW_AGREED: "draw agreed",
  ABORTED: "match cancelled",
};

export function resultCopy(reason: string | null | undefined): string {
  if (!reason) return "";
  return RESULT_COPY[reason] ?? reason;
}
