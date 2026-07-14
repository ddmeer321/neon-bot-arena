import test from "node:test";
import assert from "node:assert/strict";
import { activateTestMode, isTestPanelAllowed } from "../scripts/test-panel.js";
import { isOnlineScoreEligible } from "../scripts/online-leaderboard.js";

test("allows the test panel locally or with a configured test id", () => {
  const allowedIds = ["755051", "809587", "535127"];
  assert.equal(isTestPanelAllowed("localhost", "?playtest=1", "", allowedIds), true);
  assert.equal(isTestPanelAllowed("127.0.0.1", "?playtest=1", "", allowedIds), true);
  assert.equal(isTestPanelAllowed("localhost", "", "", allowedIds), false);
  assert.equal(isTestPanelAllowed("ddmeer321.github.io", "", "755051", allowedIds), true);
  assert.equal(isTestPanelAllowed("ddmeer321.github.io", "", "123456", allowedIds), false);
  assert.equal(isTestPanelAllowed("ddmeer321.github.io", "?testId=755051", "", allowedIds), false);
  assert.equal(isTestPanelAllowed("test.neon-bot-arena-test.pages.dev", "", "", allowedIds, true), true);
});

test("using the test panel blocks online scores for the session", () => {
  const state = { testMode: false };
  assert.equal(isOnlineScoreEligible(state), true);
  activateTestMode(state);
  assert.equal(state.testMode, true);
  assert.equal(isOnlineScoreEligible(state), false);
});

test("special game modes stay out of the normal online leaderboard", () => {
  assert.equal(isOnlineScoreEligible({ testMode: false, gameMode: "normal" }), true);
  assert.equal(isOnlineScoreEligible({ testMode: false, gameMode: "chaos" }), false);
  assert.equal(isOnlineScoreEligible({ testMode: false, gameMode: "one-heart" }), false);
});
