import { getDom } from "./dom.js?v=huddiff1";
import { createState } from "./state.js?v=boss2";
import { escapeHtml } from "./utils.js";
import { loadOnlineScores } from "./online-leaderboard.js?v=onlineboard1";
import { setupInput } from "./input.js?v=bossdiff2";
import { createGameplay } from "./gameplay.js?v=onlineboard1";
import { draw } from "./render.js?v=adminboss2";
import { createFPSCounter } from "./fps.js";
import { renderHeroMenu, renderShop, setupEconomyInput, showHeroPanel, showShopPanel, updateCoinDisplay } from "./economy.js?v=boss2";



export function bootGame() {
  const dom = getDom();
  const state = createState();

  if (dom.menuHighScoreText) dom.menuHighScoreText.textContent = state.highScore;
  if (dom.highScoreText) dom.highScoreText.textContent = state.highScore;
  if (dom.difficultyText) dom.difficultyText.textContent = "Normal";
  updateCoinDisplay(state, dom);

  const renderLeaderboard = () => {
    if (!dom.leaderboardList) return;
    const onlineScores = Array.isArray(state.onlineLeaderboard) ? state.onlineLeaderboard : [];
    const topScores = (onlineScores.length ? onlineScores : state.leaderboard).slice(0, 10);
    if (dom.leaderboardMode) dom.leaderboardMode.textContent = onlineScores.length ? "Online Rangliste" : "Lokale Rangliste";
    if (topScores.length === 0) {
      dom.leaderboardList.innerHTML = `<li><span>--</span><b>Noch kein Score</b><em>0</em></li>`;
      return;
    }
    dom.leaderboardList.innerHTML = topScores
      .map((entry, index) => `<li><span>#${index + 1}</span><b>${escapeHtml(entry.name)}</b><em>${entry.score}</em></li>`)
      .join("");
  };

  async function refreshOnlineLeaderboard() {
    const onlineScores = await loadOnlineScores(10);
    if (onlineScores) {
      state.onlineLeaderboard = onlineScores;
      renderLeaderboard();
    }
  }

  renderLeaderboard();
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
