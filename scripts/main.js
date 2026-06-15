import { getDom } from "./dom.js?v=coopstart4";
import { createState } from "./state.js?v=coopstart4";
import { escapeHtml } from "./utils.js";
import { loadOnlineScores } from "./online-leaderboard.js?v=coopstart4";
import { setupInput } from "./input.js?v=coopstart4";
import { createGameplay } from "./gameplay.js?v=coopstart4";
import { draw } from "./render.js?v=coopstart4";
import { createFPSCounter } from "./fps.js";
import { renderHeroMenu, renderShop, setupEconomyInput, showHeroPanel, showShopPanel, updateCoinDisplay } from "./economy.js?v=coopstart4";
import { setupTestPanel } from "./test-panel.js?v=coopstart4";
import { setupMultiplayerTest } from "./multiplayer-test.js?v=coopstart4";



export function bootGame() {
  const dom = getDom();
  const state = createState();
  state.leaderboardFilter = "all";

  if (dom.menuHighScoreText) dom.menuHighScoreText.textContent = state.highScore;
  if (dom.highScoreText) dom.highScoreText.textContent = state.highScore;
  if (dom.difficultyText) dom.difficultyText.textContent = "Normal";
  updateCoinDisplay(state, dom);

  const renderLeaderboard = () => {
    if (!dom.leaderboardList) return;
    const hasOnlineScores = Array.isArray(state.onlineLeaderboard);
    const topScores = (hasOnlineScores ? state.onlineLeaderboard : state.leaderboard).slice(0, 10);
    if (dom.leaderboardMode) dom.leaderboardMode.textContent = hasOnlineScores ? "Online Rangliste" : "Lokale Rangliste";
    if (topScores.length === 0) {
      dom.leaderboardList.innerHTML = `<li><span>--</span><b>Noch kein Score</b><em>0</em></li>`;
      return;
    }
    dom.leaderboardList.innerHTML = topScores
      .map((entry, index) => `<li><span>#${index + 1}</span><b>${escapeHtml(entry.name)}</b><em>${entry.score}</em></li>`)
      .join("");
  };

  async function refreshOnlineLeaderboard() {
    const onlineScores = await loadOnlineScores(10, state.leaderboardFilter);
    if (onlineScores) {
      state.onlineLeaderboard = onlineScores;
      renderLeaderboard();
    }
  }

  renderLeaderboard();
  dom.leaderboardFilter?.addEventListener("change", () => {
    state.leaderboardFilter = dom.leaderboardFilter.value || "all";
    state.onlineLeaderboard = [];
    renderLeaderboard();
    refreshOnlineLeaderboard();
  });
  refreshOnlineLeaderboard();
  renderHeroMenu(state, dom);
  renderShop(state, dom);
  setupEconomyInput(state, dom);

  const gameplay = createGameplay({ dom, state, renderLeaderboard });
  setupInput({
    dom,
    state,
    startGame: gameplay.startGame,
    togglePause: gameplay.togglePause,
    useSpecial: gameplay.useSpecial
  });
  setupTestPanel({ dom, state, startGame: gameplay.startGame });
  setupMultiplayerTest(dom, state, gameplay.startGame);

  dom.heroMenuBtn?.addEventListener("click", () => {
    showHeroPanel(dom);
    renderHeroMenu(state, dom);
  });

  dom.shopMenuBtn?.addEventListener("click", () => {
    showShopPanel(dom);
    renderShop(state, dom);
  });

  function loop(last = performance.now()) {
    const now = performance.now();
    const dt = Math.min(0.033, (now - last) / 1000);
    if (state.running && !state.paused && !state.over) gameplay.update(dt);
    draw(dom, state);
    requestAnimationFrame(() => loop(now));
  }

  createFPSCounter();

  loop();
}

