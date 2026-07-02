import { cleanName } from "./utils.js";

const SUPABASE_URL = "https://ncishdfeznjysqswsvzq.supabase.co";
const SUPABASE_KEY = "sb_publishable_NKMtRTJM-5O0rWaJP3pGaw_vvofM_H8";
const SCORE_TABLE = "scores";
const SCORE_FIELDS = "name,scores,wave,diffculty,bosses,hero,created_at";
const BLOCKED_SCORE_NAMES = new Set([["co", "de", "24", ".", "4"].join("")]);

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

export async function loadOnlineScores(limit = 10, difficulty = "all") {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${SCORE_TABLE}`);
    url.searchParams.set("select", SCORE_FIELDS);
    url.searchParams.set("order", "scores.desc,wave.desc,created_at.desc");
    url.searchParams.set("limit", String(Math.max(limit * 6, 50)));
    if (difficulty && difficulty !== "all") url.searchParams.set("diffculty", `eq.${difficulty}`);

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Rangliste konnte nicht geladen werden: ${response.status}`);

    const rows = await response.json();
    return Array.isArray(rows) ? getBestScoresByName(rows.map(normalizeScoreRow).filter(Boolean)).slice(0, limit) : [];
  } catch (error) {
    console.warn(error);
    return null;
  }
}

export async function submitOnlineScore(state) {
  const name = cleanName(state.playerName);
  if (BLOCKED_SCORE_NAMES.has(name.toLowerCase())) {
    return { ok: false, reason: "blocked-name" };
  }

  const entry = {
    name,
    scores: Math.max(0, Math.round(Number(state.score) || 0)),
    wave: Math.max(1, Math.round(Number(state.wave) || 1)),
    diffculty: state.difficulty || "normal",
    bosses: Math.max(0, Math.round(Number(state.bossesDefeated) || 0)),
    hero: state.player?.hero?.name || state.selectedHero || "Unbekannt"
  };
  if (!isPlausibleScore(entry.scores, entry.wave, entry.bosses)) {
    return { ok: false, reason: "implausible-score" };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${SCORE_TABLE}`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(entry)
    });

    if (!response.ok) {
      const details = await readResponseError(response);
      const reason = response.status === 409 ? "score-conflict" : "http-error";
      console.warn(`Score konnte nicht gespeichert werden: ${response.status}${details ? ` (${details})` : ""}`);
      return { ok: false, reason, status: response.status, details };
    }
    return { ok: true };
  } catch (error) {
    console.warn(error);
    return {
      ok: false,
      reason: "network-error",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function readResponseError(response) {
  try {
    const text = await response.text();
    if (!text) return "";
    try {
      const payload = JSON.parse(text);
      return [payload.code, payload.message, payload.details].filter(Boolean).join(": ");
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    return "";
  }
}

function normalizeScoreRow(row) {
  if (!row || !row.name) return null;
  const name = cleanName(row.name);
  if (BLOCKED_SCORE_NAMES.has(name.toLowerCase())) return null;
  const score = Number(row.scores);
  if (!Number.isFinite(score)) return null;
  const wave = Number(row.wave) || 1;
  const bosses = Number(row.bosses) || 0;
  if (!isPlausibleScore(score, wave, bosses)) return null;
  return {
    name,
    score,
    wave,
    difficulty: row.diffculty || "normal",
    bosses,
    hero: row.hero || "",
    date: row.created_at || new Date().toISOString()
  };
}

function getBestScoresByName(scores) {
  const bestByName = new Map();
  for (const entry of scores) {
    const key = entry.name.toLowerCase();
    const current = bestByName.get(key);
    if (!current || entry.score > current.score || (entry.score === current.score && entry.wave > current.wave)) {
      bestByName.set(key, entry);
    }
  }
  return [...bestByName.values()].sort((a, b) => b.score - a.score || b.wave - a.wave);
}

function isPlausibleScore(score, wave, bosses = 0) {
  const safeWave = Math.max(1, Math.round(Number(wave) || 1));
  const safeBosses = Math.max(0, Math.round(Number(bosses) || 0));
  const maxScore = 5000 + safeWave * 1200 + safeWave * safeWave * 70 + safeBosses * 1200;
  return score <= maxScore;
}
