import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePlayerDamage,
  DEFAULT_GAME_MODE,
  GAME_MODES,
  getGameMode
} from "../scripts/game-modes.js";

test("all playable modes are available in the registry", () => {
  assert.equal(DEFAULT_GAME_MODE, "normal");
  assert.deepEqual(GAME_MODES.map((mode) => mode.id), ["normal", "chaos", "hardcore"]);
  assert.equal(getGameMode("normal").id, "normal");
  assert.equal(getGameMode("chaos").id, "chaos");
  assert.equal(getGameMode("hardcore").id, "hardcore");
  assert.equal(getGameMode("one-heart").id, "hardcore");
});

test("unknown modes safely fall back to normal", () => {
  assert.equal(getGameMode("future-mode").id, "normal");
});

test("mode ids are unique so future buttons stay unambiguous", () => {
  const ids = GAME_MODES.map((mode) => mode.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("hardcore turns any real hit into lethal damage even through a shield", () => {
  assert.equal(calculatePlayerDamage({ mode: "hardcore", currentHp: 170, amount: 0.1, shielded: true }), 170);
  assert.equal(calculatePlayerDamage({ mode: "one-heart", currentHp: 170, amount: 0.1, shielded: true }), 170);
  assert.ok(Math.abs(calculatePlayerDamage({ mode: "normal", currentHp: 170, amount: 10, shielded: true }) - 2.8) < 0.000001);
});
