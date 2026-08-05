import { heroes, maxUpgradeLevel } from "./config.js?v=musicvolume1";
import { saveCoins, saveProgression } from "./storage.js?v=musicvolume1";
import { cleanName } from "./utils.js";
import { renderHeroMenu, renderShop, updateCoinDisplay } from "./economy.js?v=chaos5";

export function setupTestPanel({ dom, state, startGame, advanceBossPhase, triggerBossQuake, triggerBossMask, triggerBossBats }) {
  if (!hasTestPanelAccess()) return;
  updateTestPanelAccess(dom, state);
  window.setInterval(() => updateTestPanelAccess(dom, state), 500);

  dom.playerNameInput?.addEventListener("input", () => updateTestPanelAccess(dom, state));

  bindAll([dom.testCoinsBtn, dom.testGameCoinsBtn], () => {
    if (!hasTestPanelAccess()) return;
    state.coins += 5000;
    saveCoins(state.coins);
    updateEconomyViews(state, dom);
  });

  bindAll([dom.testMaxCoinsBtn], () => {
    if (!hasTestPanelAccess()) return;
    state.coins = Math.max(state.coins, 50000);
    saveCoins(state.coins);
    updateEconomyViews(state, dom);
  });

  bindAll([dom.testWave10Btn, dom.testGameWave10Btn], () => {
    if (!hasTestPanelAccess()) return;
    startGame({ startWave: 10 });
    updateTestPanelAccess(dom, state);
  });

  bindAll([dom.testWave20Btn, dom.testGameWave20Btn], () => {
    if (!hasTestPanelAccess()) return;
    startGame({ startWave: 20 });
    updateTestPanelAccess(dom, state);
  });

  bindAll([dom.testUnlockBtn], () => {
    if (!hasTestPanelAccess()) return;
    state.unlockedHeroes = Object.keys(heroes);
    saveProgression(state);
    updateEconomyViews(state, dom);
  });

  bindAll([dom.testMaxHeroBtn], () => {
    if (!hasTestPanelAccess()) return;
    state.upgrades[state.selectedHero] = maxUpgradeLevel;
    saveProgression(state);
    updateEconomyViews(state, dom);
  });

  bindAll([dom.testHealBtn, dom.testGameHealBtn], () => {
    if (!hasTestPanelAccess() || !state.player) return;
    state.player.hp = state.player.maxHp;
    state.player.healFlash = 0.8;
  });

  bindAll([dom.testSpecialBtn, dom.testGameSpecialBtn], () => {
    if (!hasTestPanelAccess() || !state.player) return;
    state.player.specialTimer = 0;
  });

  bindAll([dom.testEndbossBtn, dom.testGameEndbossBtn], () => {
    if (!hasTestPanelAccess()) return;
    startGame({ endboss: true, skipPrep: true, playtest: true });
    updateTestPanelAccess(dom, state);
  });

  dom.testGameBossPhaseBtn?.addEventListener("click", () => {
    if (hasTestPanelAccess()) advanceBossPhase?.();
  });
  dom.testGameBossQuakeBtn?.addEventListener("click", () => {
    if (hasTestPanelAccess()) triggerBossQuake?.();
  });
  dom.testGameBossMaskBtn?.addEventListener("click", () => {
    if (hasTestPanelAccess()) triggerBossMask?.();
  });
  dom.testGameBossBatsBtn?.addEventListener("click", () => {
    if (hasTestPanelAccess()) triggerBossBats?.();
  });
}

function bindAll(elements, handler) {
  elements.forEach((element) => element?.addEventListener("click", handler));
}

function updateEconomyViews(state, dom) {
  updateCoinDisplay(state, dom);
  renderHeroMenu(state, dom);
  renderShop(state, dom);
}

function updateTestPanelAccess(dom, state) {
  const active = hasTestPanelAccess();
  dom.testPanel?.classList.toggle("hidden", !active);
  dom.testPanelGame?.classList.toggle("hidden", !active || !state.running || state.over);
  if (active && dom.testPanelUser) dom.testPanelUser.textContent = cleanName(dom.playerNameInput?.value || state.playerName);
}

function hasTestPanelAccess() {
  return isLocalPlaytestLocation(window.location.hostname, window.location.search);
}

export function isLocalPlaytestLocation(hostname, search = "") {
  const params = new URLSearchParams(search);
  return ["localhost", "127.0.0.1"].includes(hostname) && params.has("playtest");
}
