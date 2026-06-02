import { highScoreKey, leaderboardKey } from "./config.js";
import { cleanName } from "./utils.js";

export function loadHighScore() {
  return Number(localStorage.getItem(highScoreKey)) || 0;
}

export function saveHighScore(state, dom) {
  if (state.score <= state.highScore) return false;
  state.highScore = state.score;
  localStorage.setItem(highScoreKey, String(state.highScore));
  if (dom.menuHighScoreText) dom.menuHighScoreText.textContent = state.highScore;
  if (dom.highScoreText) dom.highScoreText.textContent = state.highScore;
  return true;
}

export function loadLeaderboard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(leaderboardKey) || "[]");
    return Array.isArray(parsed) ? normalizeLeaderboard(parsed).slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function saveLeaderboardEntry(state) {
  const existing = state.leaderboard.find((entry) => entry.name.toLowerCase() === state.playerName.toLowerCase());
  if (!existing) {
    state.leaderboard.push({ name: state.playerName, score: state.score, wave: state.wave, date: new Date().toISOString() });
  } else if (state.score > existing.score || (state.score === existing.score && state.wave > existing.wave)) {
    existing.name = state.playerName;
    existing.score = state.score;
    existing.wave = state.wave;
    existing.date = new Date().toISOString();
  }
  state.leaderboard = normalizeLeaderboard(state.leaderboard).slice(0, 10);
  localStorage.setItem(leaderboardKey, JSON.stringify(state.leaderboard));
}

export function normalizeLeaderboard(entries) {
  const bestByName = new Map();
  for (const entry of entries) {
    if (!entry || !entry.name) continue;
    const score = Number(entry.score);
    const wave = Number(entry.wave);
    if (!Number.isFinite(score)) continue;

    const name = cleanName(entry.name);
    const normalized = {
      name,
      score,
      wave: Number.isFinite(wave) ? wave : 1,
      date: entry.date || new Date().toISOString()
    };
    const current = bestByName.get(name.toLowerCase());
    if (!current || normalized.score > current.score || (normalized.score === current.score && normalized.wave > current.wave)) {
      bestByName.set(name.toLowerCase(), normalized);
    }
  }
  return [...bestByName.values()].sort((a, b) => b.score - a.score || b.wave - a.wave);
}
