import { coinKey, defaultCosmetic, heroes, highScoreKey, leaderboardKey, maxUpgradeLevel, progressionKey, starterHeroes } from "./config.js?v=companion2";
import { saveCoins, saveProgression } from "./storage.js?v=companion2";
import { renderHeroMenu, renderShop, updateCoinDisplay } from "./economy.js?v=companion2";

export function setupInput({ dom, state, startGame, togglePause, useSpecial }) {
  document.querySelectorAll(".device-btn[data-device]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".device-btn[data-device]").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      state.device = button.dataset.device;
    });
  });

  document.querySelectorAll(".difficulty-btn[data-difficulty]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".difficulty-btn[data-difficulty]").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      state.difficulty = button.dataset.difficulty || "normal";
    });
  });

  setupAdminPanel(dom, state, startGame);

  dom.playerNameInput?.addEventListener("keydown", (event) => event.stopPropagation());
  dom.playerNameInput?.addEventListener("keyup", (event) => event.stopPropagation());
  dom.startBtn.addEventListener("click", startGame);
  dom.pauseBtn.addEventListener("click", togglePause);

  window.addEventListener("keydown", (event) => {
    if (isTyping(event.target)) return;
    if (!state.running && event.code !== "Escape") return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(event.code)) event.preventDefault();
    state.keys.add(event.code);
    if (event.code === "KeyP" || event.code === "Escape") togglePause();
    if (event.code === "Space") useSpecial();
  });

  window.addEventListener("keyup", (event) => {
    if (isTyping(event.target)) return;
    if (!state.running) return;
    state.keys.delete(event.code);
  });

  dom.canvas.addEventListener("pointermove", (event) => updatePointer(event, dom, state));
  dom.canvas.addEventListener("pointerdown", (event) => {
    if (state.device === "mobile") return;
    updatePointer(event, dom, state);
    state.mouse.down = true;
  });
  window.addEventListener("pointerup", () => {
    state.mouse.down = false;
  });

  addTouchGuard(dom.gamePanel);
  addTouchGuard(dom.touchControls);
  addTouchGuard(dom.touchFire);
  addTouchGuard(dom.touchSpecial);
  addTouchGuard(dom.touchStick);

  dom.touchSpecial?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    useSpecial();
  });
  dom.touchFire?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    state.touch.fire = true;
  });
  dom.touchFire?.addEventListener("pointerup", () => {
    state.touch.fire = false;
  });
  dom.touchFire?.addEventListener("pointercancel", () => {
    state.touch.fire = false;
  });
  dom.touchStick?.addEventListener("pointerdown", (event) => startTouchMove(event, dom, state));
  dom.touchStick?.addEventListener("pointermove", (event) => updateTouchMove(event, dom, state));
  dom.touchStick?.addEventListener("pointerup", (event) => stopTouchMove(event, dom, state));
  dom.touchStick?.addEventListener("pointercancel", (event) => stopTouchMove(event, dom, state));
}


const adminCode = "code24.4";

function setupAdminPanel(dom, state, startGame) {
  const panel = document.querySelector("#adminPanel");
  const status = document.querySelector("#adminStatus");
  if (!panel || !dom.playerNameInput) return;

  const setStatus = (text) => {
    if (status) status.textContent = text;
  };

  const syncVisibility = () => {
    const active = dom.playerNameInput.value.trim() === adminCode;
    panel.classList.toggle("hidden", !active);
    if (active) setStatus("Admin aktiv. \u00c4nderungen gelten nur auf diesem Ger\u00e4t.");
  };

  dom.playerNameInput.addEventListener("input", syncVisibility);
  dom.playerNameInput.addEventListener("change", syncVisibility);
  syncVisibility();

  panel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button) return;
    const action = button.dataset.adminAction;

    if (action === "coins") {
      state.coins += 500;
      saveCoins(state.coins);
      updateCoinDisplay(state, dom);
      setStatus("+500 M\u00fcnzen hinzugef\u00fcgt.");
    }

    if (action === "unlock") {
      state.unlockedHeroes = Object.keys(heroes);
      saveProgression(state);
      renderHeroMenu(state, dom);
      renderShop(state, dom);
      setStatus("Alle Helden freigeschaltet.");
    }

    if (action === "max-upgrades") {
      state.unlockedHeroes = Object.keys(heroes);
      state.upgrades = Object.fromEntries(Object.keys(heroes).map((heroId) => [heroId, maxUpgradeLevel]));
      saveProgression(state);
      renderHeroMenu(state, dom);
      renderShop(state, dom);
      setStatus("Alle Helden sind auf Max-Stufe.");
    }

    if (action === "boss-start") {
      const difficultyLabel = document.querySelector(".difficulty-btn.selected span")?.textContent || state.difficulty || "Normal";
      setStatus("Starte Welle 10 auf " + difficultyLabel + ".");
      startGame({ startWave: 10 });
    }

    if (action === "reset") {
      if (!confirm("Lokalen Spielstand auf diesem Ger\u00e4t zur\u00fccksetzen?")) return;
      localStorage.removeItem(coinKey);
      localStorage.removeItem(highScoreKey);
      localStorage.removeItem(leaderboardKey);
      localStorage.removeItem(progressionKey);
      state.coins = 0;
      state.highScore = 0;
      state.leaderboard = [];
      state.unlockedHeroes = [...starterHeroes];
      state.upgrades = {};
      state.ownedCosmetics = [defaultCosmetic];
      state.equippedCosmetic = defaultCosmetic;
      state.selectedHero = "volt";
      updateCoinDisplay(state, dom);
      if (dom.menuHighScoreText) dom.menuHighScoreText.textContent = 0;
      if (dom.highScoreText) dom.highScoreText.textContent = 0;
      renderHeroMenu(state, dom);
      renderShop(state, dom);
      setStatus("Lokaler Spielstand zur\u00fcckgesetzt.");
    }
  });
}

function addTouchGuard(element) {
  if (!element) return;
  element.addEventListener("touchstart", (event) => {
    if (event.target.closest("button, input, textarea, .message")) return;
    event.preventDefault();
  }, { passive: false });
  element.addEventListener("contextmenu", (event) => {
    if (event.target.closest("button, input, textarea, .message")) return;
    event.preventDefault();
  });
  element.addEventListener("gesturestart", (event) => event.preventDefault());
}

function updatePointer(event, dom, state) {
  if (state.device === "mobile") return;
  const rect = dom.canvas.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * dom.canvas.width;
  state.mouse.y = ((event.clientY - rect.top) / rect.height) * dom.canvas.height;
}

function startTouchMove(event, dom, state) {
  event.preventDefault();
  state.touch.stickPointer = event.pointerId;
  dom.touchStick.setPointerCapture(event.pointerId);
  updateTouchMove(event, dom, state);
}

function updateTouchMove(event, dom, state) {
  if (state.touch.stickPointer !== event.pointerId) return;
  const rect = dom.touchStick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const length = Math.hypot(rawX, rawY);
  const max = rect.width * 0.34;
  const limited = Math.min(length, max);
  const angle = Math.atan2(rawY, rawX);
  const knobX = Math.cos(angle) * limited;
  const knobY = Math.sin(angle) * limited;
  state.touch.moveX = length > 8 ? knobX / max : 0;
  state.touch.moveY = length > 8 ? knobY / max : 0;
  dom.touchKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
}

function stopTouchMove(event, dom, state) {
  if (state.touch.stickPointer !== event.pointerId) return;
  state.touch.stickPointer = null;
  state.touch.moveX = 0;
  state.touch.moveY = 0;
  dom.touchKnob.style.transform = "translate(0, 0)";
}

function isTyping(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
}

