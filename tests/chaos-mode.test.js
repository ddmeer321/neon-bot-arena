import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAOS_EVENT_DURATION,
  CHAOS_EVENTS,
  CHAOS_METEOR_DAMAGE,
  CHAOS_METEOR_MAX_RADIUS,
  CHAOS_METEOR_MIN_RADIUS,
  CHAOS_RESPAWN_PROTECTION,
  chooseChaosEvent,
  createSeededRandom,
  formatChaosTime,
  getChaosEnemyFireInterval,
  getChaosEnemyShotAngles,
  getChaosEnemySpeed,
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

test("chaos contains all seven hazard events", () => {
  assert.deepEqual(CHAOS_EVENTS.map((event) => event.id), ["broken-map", "blindness", "meteor", "enemy-rush", "bullet-storm", "mirror", "respawn"]);
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
  assert.equal(CHAOS_METEOR_MIN_RADIUS, 24);
  assert.equal(CHAOS_METEOR_MAX_RADIUS, 34);
  assert.equal(CHAOS_RESPAWN_PROTECTION, 1);
  assert.equal(getChaosRespawnHealth(101), 25);
  const tile = { x: 100, y: 100, width: 80, height: 60, activationDelay: 0 };
  assert.equal(isPointOnActiveBrokenTile({ x: 120, y: 120 }, tile), true);
  assert.equal(isPointOnActiveBrokenTile({ x: 120, y: 120 }, { ...tile, activationDelay: 0.2 }), false);
});

test("enemy rush and bullet storm apply their combat modifiers", () => {
  const rush = { gameMode: "chaos", chaosEventId: "enemy-rush" };
  const storm = { gameMode: "chaos", chaosEventId: "bullet-storm" };
  const normal = { gameMode: "normal", chaosEventId: "bullet-storm" };

  assert.equal(getChaosEnemySpeed(100, rush), 165);
  assert.equal(getChaosEnemySpeed(100, normal), 100);
  assert.ok(Math.abs(getChaosEnemyFireInterval(1.5, storm) - 0.87) < 0.000001);
  const stormAngles = getChaosEnemyShotAngles(1, storm);
  assert.ok(Math.abs(stormAngles[0] - 0.82) < 0.000001);
  assert.ok(Math.abs(stormAngles[1] - 1.18) < 0.000001);
  assert.deepEqual(getChaosEnemyShotAngles(1, normal), [1]);
});
