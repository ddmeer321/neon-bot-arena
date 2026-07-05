import test from "node:test";
import assert from "node:assert/strict";
import {
  addOwnedScoreReceipt,
  normalizeDeletionReceipt,
  removeOwnedScoreReceipt,
  sanitizeOwnedScoreReceipts
} from "../scripts/owned-score-store.js";
import {
  generateDeletionToken,
  ScoreDeletionError,
  validateDeletionPayload
} from "../supabase/functions/submit-score/deletion.js";

const scoreId = "123e4567-e89b-42d3-a456-426614174000";
const deleteToken = "a".repeat(64);

test("generates a 256-bit deletion token", () => {
  const token = generateDeletionToken((bytes) => bytes.fill(0xab));
  assert.equal(token, "ab".repeat(32));
});

test("validates score deletion requests", () => {
  assert.deepEqual(validateDeletionPayload({
    score_id: scoreId,
    delete_token: deleteToken
  }), {
    score_id: scoreId,
    delete_token: deleteToken
  });
  assert.throws(
    () => validateDeletionPayload({ score_id: scoreId, delete_token: "short" }),
    ScoreDeletionError
  );
});

test("stores only valid deletion receipts and removes them by score id", () => {
  const receipt = normalizeDeletionReceipt({
    deletion: { score_id: scoreId, delete_token: deleteToken }
  }, {
    name: "Spieler",
    scores: 220000,
    wave: 25
  });
  const stored = addOwnedScoreReceipt([], receipt);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].name, "Spieler");
  assert.deepEqual(removeOwnedScoreReceipt(stored, scoreId), []);
  assert.deepEqual(sanitizeOwnedScoreReceipts([{ scoreId: "invalid", deleteToken }]), []);
});
