import { heroes, maxUpgradeLevel, testIdKey, testPanelAccess, testSiteBuild } from "./config.js?v=testsite1";
import { saveCoins, saveProgression } from "./storage.js?v=musicvolume1";
import { cleanName } from "./utils.js";
import { renderHeroMenu, renderShop, updateCoinDisplay } from "./economy.js?v=settings6";
import { t } from "./settings.js?v=settings6";
import { appendTestLog } from "./test-logger.js?v=testlogs1";

export function setupTestPanel({ dom, state, startGame, advanceBossPhase, triggerBossQuake, triggerBossMask, triggerBossBats }) {
  renderStoredTestId(dom);
  updateTestPanelAccess(dom, state);
  window.setInterval(() => updateTestPanelAccess(dom, state), 500);
  window.addEventListener("languagechange", () => renderStoredTestId(dom));

  dom.testIdBtn?.addEventListener("click", async () => {
    const id = getOrCreateTestId();
    renderStoredTestId(dom);
    await copyTestId(id);
    updateTestPanelAccess(dom, state);
  });

  dom.playerNameInput?.addEventListener("input", () => updateTestPanelAccess(dom, state));

  bindAll([dom.testCoinsBtn, dom.testGameCoinsBtn], () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "coins_5000");
    state.coins += 5000;
    saveCoins(state.coins);
    updateEconomyViews(state, dom);
  });

  bindAll([dom.testMaxCoinsBtn], () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "coins_50000");
    state.coins = Math.max(state.coins, 50000);
    saveCoins(state.coins);
    updateEconomyViews(state, dom);
  });

  bindAll([dom.testWave10Btn, dom.testGameWave10Btn], () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "wave_10");
    startGame({ startWave: 10 });
    updateTestPanelAccess(dom, state);
  });

  bindAll([dom.testWave20Btn, dom.testGameWave20Btn], () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "wave_20");
    startGame({ startWave: 20 });
    updateTestPanelAccess(dom, state);
  });

  bindAll([dom.testUnlockBtn], () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "unlock_heroes");
    state.unlockedHeroes = Object.keys(heroes);
    saveProgression(state);
    updateEconomyViews(state, dom);
  });

  bindAll([dom.testMaxHeroBtn], () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "max_hero");
    state.upgrades[state.selectedHero] = maxUpgradeLevel;
    saveProgression(state);
    updateEconomyViews(state, dom);
  });

  bindAll([dom.testHealBtn, dom.testGameHealBtn], () => {
    if (!hasTestPanelAccess() || !state.player) return;
    activateTestMode(state, "heal");
    state.player.hp = state.player.maxHp;
    state.player.healFlash = 0.8;
  });

  bindAll([dom.testSpecialBtn, dom.testGameSpecialBtn], () => {
    if (!hasTestPanelAccess() || !state.player) return;
    activateTestMode(state, "special_ready");
    state.player.specialTimer = 0;
  });

  bindAll([dom.testEndbossBtn, dom.testGameEndbossBtn], () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "start_endboss");
    startGame({ endboss: true, skipPrep: true, playtest: true });
    updateTestPanelAccess(dom, state);
  });

  dom.testGameBossPhaseBtn?.addEventListener("click", () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "boss_phase_next");
    advanceBossPhase?.();
  });
  dom.testGameBossQuakeBtn?.addEventListener("click", () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "boss_quake");
    triggerBossQuake?.();
  });
  dom.testGameBossMaskBtn?.addEventListener("click", () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "boss_mask");
    triggerBossMask?.();
  });
  dom.testGameBossBatsBtn?.addEventListener("click", () => {
    if (!hasTestPanelAccess()) return;
    activateTestMode(state, "boss_bat_swarm");
    triggerBossBats?.();
  });
}

export function activateTestMode(state, action = "unknown") {
  if (state && typeof state === "object") {
    state.testMode = true;
    appendTestLog("test_action", {
      action,
      wave: state.wave,
      endbossPhase: state.endbossPhase
    });
  }
}

function bindAll(elements, handler) {
  elements.forEach((element) => element?.addEventListener("click", handler));
}

function updateEconomyViews(state, dom) {
  updateCoinDisplay(state, dom);
  renderHeroMenu(state, dom);
  renderShop(state, dom);
}

function getOrCreateTestId() {
  const existing = localStorage.getItem(testIdKey);
  if (existing) return existing;
  const generated = String(getRandomNumber(100000, 999999));
  localStorage.setItem(testIdKey, generated);
  return generated;
}

function renderStoredTestId(dom) {
  const id = localStorage.getItem(testIdKey);
  if (dom.testIdText) dom.testIdText.textContent = id ? `ID ${id}` : t("multiplayer.notCreated");
}

function updateTestPanelAccess(dom, state) {
  const active = hasTestPanelAccess();
  dom.testPanel?.classList.toggle("hidden", !active);
  dom.testPanelGame?.classList.toggle("hidden", !active || !state.running || state.over);
  if (active && dom.testPanelUser) dom.testPanelUser.textContent = cleanName(dom.playerNameInput?.value || state.playerName);
}

function hasTestPanelAccess() {
  return isTestPanelAllowed(
    window.location.hostname,
    window.location.search,
    localStorage.getItem(testIdKey),
    testPanelAccess,
    testSiteBuild
  );
}

export function isTestPanelAllowed(hostname, search = "", storedId = "", allowedIds = [], isTestSite = false) {
  if (isTestSite) return true;
  const params = new URLSearchParams(search);
  if (["localhost", "127.0.0.1"].includes(hostname) && params.has("playtest")) return true;
  if (!storedId) return false;
  return allowedIds.some((entry) => String(entry) === String(storedId));
}

function getRandomNumber(min, max) {
  const range = max - min + 1;
  if (window.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return min + (value[0] % range);
  }
  return min + Math.floor(Math.random() * range);
}

async function copyTestId(id) {
  try {
    await navigator.clipboard?.writeText(id);
  } catch {
    // Kopieren ist nur Komfort. Die ID bleibt trotzdem sichtbar gespeichert.
  }
}
