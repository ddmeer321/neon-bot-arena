import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAOS_EVENT_DURATION,
  CHAOS_EVENTS,
  chooseChaosEvent,
  createSeededRandom,
  formatChaosTime,
  getChaosModifiers,
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

test("chaos modifiers only apply in chaos mode", () => {
  const turbo = chooseChaosEvent(null, () => 0);
  assert.equal(getChaosModifiers({ gameMode: "normal", chaosEventId: turbo.id }).playerSpeed, 1);
  assert.equal(getChaosModifiers({ gameMode: "chaos", chaosEventId: turbo.id }).playerSpeed, 1.55);
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
