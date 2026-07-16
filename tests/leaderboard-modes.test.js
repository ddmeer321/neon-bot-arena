import assert from "node:assert/strict";
import test from "node:test";
import {
  filterLeaderboard,
  limitLeaderboardByMode,
  normalizeLeaderboard
} from "../scripts/storage.js";

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
