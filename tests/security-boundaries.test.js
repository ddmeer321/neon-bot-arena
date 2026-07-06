import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scoreSql = readFileSync(new URL("../SUPABASE_SCORE_DELETION.sql", import.meta.url), "utf8");
const leaderboardClient = readFileSync(new URL("../scripts/online-leaderboard.js", import.meta.url), "utf8");

test("public score access excludes identifiers, timestamps and deletion secrets", () => {
  const grant = scoreSql.match(/GRANT SELECT \(([\s\S]*?)\) ON TABLE public\.scores TO anon, authenticated;/i);
  assert.ok(grant, "column-level public SELECT grant is missing");
  assert.doesNotMatch(grant[1], /public_id|delete_token_hash|created_at/i);
  assert.doesNotMatch(leaderboardClient, /select.*created_at/i);
});
