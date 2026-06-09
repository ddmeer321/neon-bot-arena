import { cleanName } from "./utils.js";

const SUPABASE_URL = "https://ncishdfeznjysqswsvzq.supabase.co";
const SUPABASE_KEY = "sb_publishable_NKMtRTJM-5O0rWaJP3pGaw_vvofM_H8";
const SCORE_TABLE = "scores";
const SCORE_FIELDS = "name,scores,wave,diffculty,bosses,hero,created_at";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

export async function loadOnlineScores(limit = 10) {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${SCORE_TABLE}`);
    url.searchParams.set("select", SCORE_FIELDS);
    url.searchParams.set("order", "scores.desc,wave.desc,created_at.desc");
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Rangliste konnte nicht geladen werden: ${response.status}`);

    const rows = await response.json();
    return Array.isArray(rows) ? rows.map(normalizeScoreRow).filter(Boolean) : [];
  } catch (error) {
    console.warn(error);
    return null;
  }
}

export async function submitOnlineScore(state) {
  try {
    const entry = {
      name: cleanName(state.playerName),
      scores: Math.max(0, Math.round(Number(state.score) || 0)),
      wave: Math.max(1, Math.round(Number(state.wave) || 1)),
      diffculty: state.difficulty || "normal",
      bosses: Math.max(0, Math.round(Number(state.bossesDefeated) || 0)),
      hero: state.player?.hero?.name || state.selectedHero || "Unbekannt"
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${SCORE_TABLE}`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(entry)
    });

    if (!response.ok) throw new Error(`Score konnte nicht gespeichert werden: ${response.status}`);
    return true;
  } catch (error) {
    console.warn(error);
    return false;
  }
}

function normalizeScoreRow(row) {
  if (!row || !row.name) return null;
  const score = Number(row.scores);
  if (!Number.isFinite(score)) return null;
  return {
    name: cleanName(row.name),
    score,
    wave: Number(row.wave) || 1,
    difficulty: row.diffculty || "normal",
    bosses: Number(row.bosses) || 0,
    hero: row.hero || "",
    date: row.created_at || new Date().toISOString()
  };
}
