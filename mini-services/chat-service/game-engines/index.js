// Harax Game Zone · engine registry
// Every engine exports: key, sides, turnLimitSec, createInitialState,
// getLegalMoves, applyMove, botMove.

const tictactoe = require("./tictactoe");
const checkers = require("./checkers");
const chess = require("./chess");

const ENGINES = {
  TICTACTOE: tictactoe,
  CHECKERS: checkers,
  CHESS: chess,
};

function engineFor(game) {
  return ENGINES[game] ?? null;
}

module.exports = { ENGINES, engineFor };
