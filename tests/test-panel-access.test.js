import test from "node:test";
import assert from "node:assert/strict";
import { isLocalPlaytestLocation } from "../scripts/test-panel.js";

test("allows the test panel only on localhost with the playtest flag", () => {
  assert.equal(isLocalPlaytestLocation("localhost", "?playtest=1"), true);
  assert.equal(isLocalPlaytestLocation("127.0.0.1", "?playtest=1"), true);
  assert.equal(isLocalPlaytestLocation("localhost", ""), false);
  assert.equal(isLocalPlaytestLocation("ddmeer321.github.io", "?playtest=1"), false);
  assert.equal(isLocalPlaytestLocation("ddmeer321.github.io", "?testId=123456"), false);
});
