import { coinKey, defaultCosmetic, highScoreKey, leaderboardKey, progressionKey, starterHeroes } from "./config.js?v=testid2";
import { cleanName } from "./utils.js";

export function loadHighScore() {
  return Number(localStorage.getItem(highScoreKey)) || 0;
}

export function loadCoins() {
  return Number(localStorage.getItem(coinKey)) || 0;
}

export function saveCoins(coins) {
  localStorage.setItem(coinKey, String(coins));
}

export function loadProgression() {
  try {
    const parsed = JSON.parse(localStorage.getItem(progressionKey) || "{}");
    const unlocked = Array.isArray(parsed.unlockedHeroes) ? parsed.unlockedHeroes : starterHeroes;
    const upgrades = parsed.upgrades && typeof parsed.upgrades === "object" ? parsed.upgrades : {};
    const ownedCosmetics = Array.isArray(parsed.ownedCosmetics) ? parsed.ownedCosmetics : [defaultCosmetic];
    const equippedCosmetic = typeof parsed.equippedCosmetic === "string" ? parsed.equippedCosmetic : defaultCosmetic;
    return {
      unlockedHeroes: [...new Set([...starterHeroes, ...unlocked])],
      upgrades,
      ownedCosmetics: [...new Set([defaultCosmetic, ...ownedCosmetics])],
      equippedCosmetic
    };
  } catch {
    return { unlockedHeroes: [...starterHeroes], upgrades: {}, ownedCosmetics: [defaultCosmetic], equippedCosmetic: defaultCosmetic };
  }
}

export function saveProgression(state) {
  localStorage.setItem(
    progressionKey,
    JSON.stringify({
      unlockedHeroes: state.unlockedHeroes,
      upgrades: state.upgrades,
      ownedCosmetics: state.ownedCosmetics,
      equippedCosmetic: state.equippedCosmetic
    })
  );
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

