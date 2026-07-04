const ALLOWED_DIFFICULTIES = new Set(["easy", "normal", "hard"]);
const ALLOWED_HEROES = new Set([
  "Volt Runner",
  "Shield Titan",
  "Nova Shade",
  "Ember Forge",
  "Frost Byte",
  "Pulse Monk",
  "Iron Warden"
]);
const BLOCKED_NAMES = new Set(["code24"]);

export class ScoreValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ScoreValidationError";
    this.status = status;
  }
}

export function validateScorePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ScoreValidationError("Invalid JSON payload");
  }

  const name = normalizeName(payload.name);
  const scores = readInteger(payload.scores, "scores", 0, 100_000_000);
  const wave = readInteger(payload.wave, "wave", 1, 500);
  const bosses = readInteger(payload.bosses, "bosses", 0, 200);
  const playerCount = readInteger(payload.player_count, "player_count", 1, 3);
  const difficulty = String(payload.diffculty || "");
  const hero = String(payload.hero || "").trim();

  if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
    throw new ScoreValidationError("Invalid difficulty");
  }
  if (!ALLOWED_HEROES.has(hero)) {
    throw new ScoreValidationError("Invalid hero");
  }
  if (!isPlausibleScore(scores, wave, bosses)) {
    throw new ScoreValidationError("Implausible score", 422);
  }

  return {
    name,
    scores,
    wave,
    diffculty: difficulty,
    bosses,
    hero,
    player_count: playerCount
  };
}

export function isPlausibleScore(score, wave, bosses = 0) {
  const safeWave = Math.max(1, Math.round(Number(wave) || 1));
  const safeBosses = Math.max(0, Math.round(Number(bosses) || 0));
  const maxScore = 5000 + safeWave * 1200 + safeWave * safeWave * 70 + safeBosses * 1200;
  return Number.isInteger(score) && score >= 0 && score <= maxScore;
}

function normalizeName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ").slice(0, 16);
  if (!name || BLOCKED_NAMES.has(name.toLowerCase())) {
    throw new ScoreValidationError("Invalid player name");
  }
  if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) {
    throw new ScoreValidationError("Invalid player name");
  }
  return name;
}

function readInteger(value, field, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ScoreValidationError(`Invalid ${field}`);
  }
  return number;
}
