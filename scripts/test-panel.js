import { testIdKey, testPanelAccess } from "./config.js?v=testid1";
import { saveCoins } from "./storage.js?v=testid1";
import { cleanName } from "./utils.js";
import { renderHeroMenu, renderShop, updateCoinDisplay } from "./economy.js?v=testid1";

export function setupTestPanel({ dom, state, startGame }) {
  renderStoredTestId(dom);
  updateTestPanelAccess(dom, state);

  dom.testIdBtn?.addEventListener("click", async () => {
    const id = getOrCreateTestId();
    renderStoredTestId(dom);
    await copyTestId(id);
    updateTestPanelAccess(dom, state);
  });

  dom.playerNameInput?.addEventListener("input", () => updateTestPanelAccess(dom, state));

  dom.testCoinsBtn?.addEventListener("click", () => {
    if (!hasTestPanelAccess(dom)) return;
    state.coins += 5000;
    saveCoins(state.coins);
    updateCoinDisplay(state, dom);
    renderHeroMenu(state, dom);
    renderShop(state, dom);
  });

  dom.testMaxCoinsBtn?.addEventListener("click", () => {
    if (!hasTestPanelAccess(dom)) return;
    state.coins = Math.max(state.coins, 50000);
    saveCoins(state.coins);
    updateCoinDisplay(state, dom);
    renderHeroMenu(state, dom);
    renderShop(state, dom);
  });

  dom.testWave10Btn?.addEventListener("click", () => {
    if (!hasTestPanelAccess(dom)) return;
    startGame({ startWave: 10 });
  });
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
  const active = hasTestPanelAccess(dom);
  dom.testPanel?.classList.toggle("hidden", !active);
  if (active && dom.testPanelUser) dom.testPanelUser.textContent = cleanName(dom.playerNameInput?.value || state.playerName);
}

function hasTestPanelAccess(dom) {
  const id = localStorage.getItem(testIdKey);
  const name = cleanName(dom.playerNameInput?.value || "").toLowerCase();
  if (!id || !name) return false;
  return testPanelAccess.some((entry) => cleanName(entry.name).toLowerCase() === name && String(entry.id) === id);
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
