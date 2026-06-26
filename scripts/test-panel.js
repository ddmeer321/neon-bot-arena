import { heroes, maxUpgradeLevel, testIdKey, testPanelAccess } from "./config.js?v=cooprespawn1";
import { saveCoins, saveProgression } from "./storage.js?v=cooprespawn1";
import { cleanName } from "./utils.js";
import { renderHeroMenu, renderShop, updateCoinDisplay } from "./economy.js?v=cooprespawn1";

export function setupTestPanel({ dom, state, startGame }) {
  renderStoredTestId(dom);
  updateTestPanelAccess(dom, state);
  window.setInterval(() => updateTestPanelAccess(dom, state), 500);

  dom.testIdBtn?.addEventListener("click", async () => {
    const id = getOrCreateTestId();
    renderStoredTestId(dom);
    await copyTestId(id);
    updateTestPanelAccess(dom, state);
  });

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
  if (dom.testIdText) dom.testIdText.textContent = id ? `ID ${id}` : "Nicht erstellt";
}

function updateTestPanelAccess(dom, state) {
  const active = hasTestPanelAccess();
  dom.testPanel?.classList.toggle("hidden", !active);
  dom.testPanelGame?.classList.toggle("hidden", !active || !state.running || state.over);
  if (active && dom.testPanelUser) dom.testPanelUser.textContent = cleanName(dom.playerNameInput?.value || state.playerName);
}

function hasTestPanelAccess() {
  const id = localStorage.getItem(testIdKey);
  if (!id) return false;
  return testPanelAccess.some((entry) => String(entry) === id);
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
