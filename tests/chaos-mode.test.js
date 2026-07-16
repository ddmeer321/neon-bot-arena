import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAOS_EVENT_DURATION,
  CHAOS_EVENTS,
  CHAOS_METEOR_DAMAGE,
  CHAOS_RESPAWN_PROTECTION,
  chooseChaosEvent,
  createSeededRandom,
  formatChaosTime,
  getChaosRespawnHealth,
  isChaosEventActive,
  isPointOnActiveBrokenTile,
  startChaosRun,
  updateChaosRun
} from "../scripts/chaos-mode.js";

test("chaos starts with an event lasting one minute", () => {
  const state = { gameMode: "chaos" };
  const event = startChaosRun(state, () => 0);
  assert.equal(event.id, CHAOS_EVENTS[0].id);
  assert.equal(state.chaosEventTimer, CHAOS_EVENT_DURATION);
});

test("chaos changes event after a minute and avoids an immediate repeat", () => {
  const state = { gameMode: "chaos" };
  const first = startChaosRun(state, () => 0);
  const result = updateChaosRun(state, 60, () => 0);
  assert.equal(result.changed, true);
  assert.notEqual(result.event.id, first.id);
  assert.equal(state.chaosEventTimer, CHAOS_EVENT_DURATION);
});

test("chaos contains exactly the five hazard events", () => {
  assert.deepEqual(CHAOS_EVENTS.map((event) => event.id), ["broken-map", "blindness", "meteor", "mirror", "respawn"]);
  assert.equal(isChaosEventActive({ gameMode: "chaos", chaosEventId: "meteor" }, "meteor"), true);
  assert.equal(isChaosEventActive({ gameMode: "normal", chaosEventId: "meteor" }, "meteor"), false);
  assert.equal(formatChaosTime(59.2), "1:00");
  assert.equal(formatChaosTime(59), "0:59");
});

test("the same multiplayer seed creates the same event sequence", () => {
  const first = createSeededRandom(123456);
  const second = createSeededRandom(123456);
  assert.deepEqual(
    Array.from({ length: 8 }, () => first()),
    Array.from({ length: 8 }, () => second())
  );
});

test("hazard values match the chaos rules", () => {
  assert.equal(CHAOS_METEOR_DAMAGE, 24);
  assert.equal(CHAOS_RESPAWN_PROTECTION, 1);
  assert.equal(getChaosRespawnHealth(101), 25);
  const tile = { x: 100, y: 100, width: 80, height: 60, activationDelay: 0 };
  assert.equal(isPointOnActiveBrokenTile({ x: 120, y: 120 }, tile), true);
  assert.equal(isPointOnActiveBrokenTile({ x: 120, y: 120 }, { ...tile, activationDelay: 0.2 }), false);
});
