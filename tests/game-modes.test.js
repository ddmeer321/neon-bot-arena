import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GAME_MODE,
  GAME_MODES,
  getGameMode
} from "../scripts/game-modes.js";

test("normal mode is the default and available in the registry", () => {
  assert.equal(DEFAULT_GAME_MODE, "normal");
  assert.deepEqual(GAME_MODES.map((mode) => mode.id), ["normal"]);
  assert.equal(getGameMode("normal").id, "normal");
});

test("unknown modes safely fall back to normal", () => {
  assert.equal(getGameMode("future-mode").id, "normal");
});

test("mode ids are unique so future buttons stay unambiguous", () => {
  const ids = GAME_MODES.map((mode) => mode.id);
  assert.equal(new Set(ids).size, ids.length);
});
