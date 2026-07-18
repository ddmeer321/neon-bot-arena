import assert from "node:assert/strict";
import test from "node:test";
import {
  filterLeaderboard,
  isScorePersistenceAllowed,
  limitLeaderboardByMode,
  loadHighScore,
  loadLeaderboard,
  normalizeLeaderboard,
  saveHighScore,
  saveLeaderboardEntry
} from "../scripts/storage.js";

test("test builds never persist high scores or leaderboard entries", () => {
  const state = {
    testMode: false,
    score: 500,
    highScore: 100,
    wave: 4,
    gameMode: "chaos",
    difficulty: "hard",
    playerName: "Tester",
    leaderboard: []
  };

  assert.equal(isScorePersistenceAllowed(state), false);
  assert.equal(loadHighScore(), 0);
  assert.deepEqual(loadLeaderboard(), []);
  assert.equal(saveHighScore(state, {}), false);
  assert.equal(saveLeaderboardEntry(state), false);
  assert.equal(state.highScore, 100);
  assert.deepEqual(state.leaderboard, []);
});

test("legacy scores stay in normal while mode scores remain separate", () => {
  const scores = normalizeLeaderboard([
    { name: "Dodo", score: 100, wave: 2 },
    { name: "Dodo", score: 80, wave: 2, mode: "chaos" },
    { name: "Dodo", score: 60, wave: 1, mode: "one-heart" }
  ]);
  assert.equal(filterLeaderboard(scores, "normal")[0].score, 100);
  assert.equal(filterLeaderboard(scores, "chaos")[0].score, 80);
  assert.equal(filterLeaderboard(scores, "hardcore")[0].score, 60);
  assert.equal(scores.some((entry) => entry.mode === "one-heart"), false);
});

test("leaderboards keep ten scores per mode instead of ten total", () => {
  const entries = normalizeLeaderboard([
    ...Array.from({ length: 12 }, (_, index) => ({ name: `N${index}`, score: 100 - index, wave: 1, mode: "normal" })),
    ...Array.from({ length: 12 }, (_, index) => ({ name: `C${index}`, score: 100 - index, wave: 1, mode: "chaos" })),
    ...Array.from({ length: 12 }, (_, index) => ({ name: `H${index}`, score: 100 - index, wave: 1, mode: "hardcore" }))
  ]);
  const limited = limitLeaderboardByMode(entries);
  assert.equal(limited.length, 30);
  assert.equal(filterLeaderboard(limited, "normal").length, 10);
  assert.equal(filterLeaderboard(limited, "chaos").length, 10);
  assert.equal(filterLeaderboard(limited, "hardcore").length, 10);
});
