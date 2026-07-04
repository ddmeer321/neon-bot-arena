import assert from "node:assert/strict";
import test from "node:test";
import {
  ScoreValidationError,
  isPlausibleScore,
  validateScorePayload
} from "../supabase/functions/submit-score/validation.js";

const validScore = {
  name: "Spieler 1",
  scores: 12_000,
  wave: 10,
  diffculty: "normal",
  bosses: 1,
  hero: "Volt Runner",
  player_count: 1
};

test("accepts and normalizes a legitimate score", () => {
  assert.deepEqual(validateScorePayload({ ...validScore, name: "  Spieler   1  " }), validScore);
});

test("rejects a fabricated score above the server-side limit", () => {
  assert.throws(
    () => validateScorePayload({ ...validScore, scores: 999_999 }),
    (error) => error instanceof ScoreValidationError && error.status === 422
  );
});

test("rejects invalid leaderboard fields", () => {
  assert.throws(() => validateScorePayload({ ...validScore, diffculty: "godmode" }), /difficulty/);
  assert.throws(() => validateScorePayload({ ...validScore, player_count: 9 }), /player_count/);
  assert.throws(() => validateScorePayload({ ...validScore, hero: "Admin" }), /hero/);
  assert.throws(() => validateScorePayload({ ...validScore, name: "<script>" }), /player name/);
});

test("plausibility helper keeps legitimate high-wave scores", () => {
  assert.equal(isPlausibleScore(30_000, 20, 2), true);
  assert.equal(isPlausibleScore(1_000_000, 20, 2), false);
});
