import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TEST_LOG_ENTRIES,
  TEST_LOG_STORAGE_KEY,
  appendTestLog,
  clearTestLogs,
  createTestLogEntry,
  normalizeTestLogs,
  readTestLogs
} from "../scripts/test-logger.js";

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  };
}

test("test logs sanitize type and details", () => {
  const entry = createTestLogEntry("Boss Attack!", {
    damage: 12.345,
    message: "x".repeat(220)
  }, { now: 0, sessionId: "session-test" });

  assert.equal(entry.type, "boss_attack_");
  assert.equal(entry.details.damage, 12.35);
  assert.equal(entry.details.message.length, 160);
  assert.equal(entry.timestamp, "1970-01-01T00:00:00.000Z");
});

test("test logs keep only the newest 500 entries", () => {
  const storage = createMemoryStorage();
  for (let index = 0; index < MAX_TEST_LOG_ENTRIES + 8; index += 1) {
    appendTestLog("tick", { index }, storage);
  }
  const entries = readTestLogs(storage);
  assert.equal(entries.length, MAX_TEST_LOG_ENTRIES);
  assert.equal(entries[0].details.index, 8);
  assert.equal(entries.at(-1).details.index, MAX_TEST_LOG_ENTRIES + 7);
});

test("invalid stored logs are ignored and logs can be cleared", () => {
  const storage = createMemoryStorage();
  storage.setItem(TEST_LOG_STORAGE_KEY, JSON.stringify([null, { type: "ok", details: { value: true } }]));
  assert.equal(normalizeTestLogs("invalid").length, 0);
  assert.equal(readTestLogs(storage).length, 1);
  clearTestLogs(storage);
  assert.deepEqual(readTestLogs(storage), []);
});
