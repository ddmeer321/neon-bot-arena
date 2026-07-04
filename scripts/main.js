import { getDom } from "./dom.js?v=musicvolume1";
import { createState } from "./state.js?v=coop6";
import { escapeHtml } from "./utils.js";
import { loadOnlineScores } from "./online-leaderboard.js?v=leaderboard3";
import { setupInput } from "./input.js?v=musicvolume1";
import { createGameplay } from "./gameplay.js?v=coop6";
import { draw } from "./render.js?v=musicvolume1";
import { createFPSCounter } from "./fps.js";
import { equipCompanion, renderHeroMenu, renderShop, setupEconomyInput, showHeroPanel, showShopPanel, updateCoinDisplay } from "./economy.js?v=musicvolume1";
import { setupTestPanel } from "./test-panel.js?v=musicvolume1";
import { setupMultiplayerTest } from "./multiplayer-test.js?v=coop6";
import { setupCompanionAbilities } from "./companion-abilities.js?v=musicvolume1";



export function bootGame() {
  const dom = getDom();
  const state = createState();
  const playtestParams = new URLSearchParams(window.location.search);
  const isLocalPlaytest = ["localhost", "127.0.0.1"].includes(window.location.hostname) && playtestParams.has("playtest");
  if (isLocalPlaytest && playtestParams.get("hero") === "warden") state.selectedHero = "warden";
  state.leaderboardFilter = "all";

  if (dom.menuHighScoreText) dom.menuHighScoreText.textContent = state.highScore;
  if (dom.highScoreText) dom.highScoreText.textContent = state.highScore;
  if (dom.difficultyText) dom.difficultyText.textContent = "Normal";
  updateCoinDisplay(state, dom);

  const renderLeaderboard = () => {
    if (!dom.leaderboardList) return;
    const hasOnlineScores = Array.isArray(state.onlineLeaderboard);
    const topScores = (hasOnlineScores ? state.onlineLeaderboard : state.leaderboard).slice(0, 10);
    if (dom.leaderboardMode) {
      dom.leaderboardMode.textContent = hasOnlineScores ? "Online Solo-Rangliste" : "Lokale Solo-Rangliste";
    }
    renderScoreList(dom.leaderboardList, topScores);
    renderScoreList(dom.duoLeaderboardList, (state.duoOnlineLeaderboard || []).slice(0, 10), true);
  };

  async function refreshOnlineLeaderboard() {
    const [onlineScores, duoScores] = await Promise.all([
      loadOnlineScores(10, state.leaderboardFilter),
      loadOnlineScores(10, "players-2")
    ]);
    if (onlineScores) state.onlineLeaderboard = onlineScores;
    if (duoScores) state.duoOnlineLeaderboard = duoScores;
    renderLeaderboard();
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
  dom.rewardEquipBtn?.addEventListener("click", () => {
    equipCompanion(state, dom, "scipios-mask");
    dom.companionReward?.classList.add("hidden");
    state.pendingCompanionReward = false;
  });
  dom.rewardCloseBtn?.addEventListener("click", () => {
    dom.companionReward?.classList.add("hidden");
    state.pendingCompanionReward = false;
  });

  function renderScoreList(list, scores, showDuoBadge = false) {
    if (!list) return;
    if (scores.length === 0) {
      list.innerHTML = `<li><span>--</span><b>Noch kein Score</b><em>0</em></li>`;
      return;
    }
    list.innerHTML = scores
      .map((entry, index) => {
        const badge = showDuoBadge ? " <small>2P</small>" : "";
        return `<li><span>#${index + 1}</span><b>${escapeHtml(entry.name)}${badge}</b><em>${entry.score}</em></li>`;
      })
      .join("");
  }

  const gameplay = createGameplay({ dom, state, renderLeaderboard });
  const companionAbilities = setupCompanionAbilities({ state, dom, useHeroSpecial: gameplay.useSpecial });
  setupInput({
    dom,
    state,
    startGame: gameplay.startGame,
    togglePause: gameplay.togglePause,
    useSpecial: companionAbilities.useSpecial
  });
  setupTestPanel({
    dom,
    state,
    startGame: gameplay.startGame,
    advanceBossPhase: gameplay.advanceEndbossPhaseForPlaytest,
    triggerBossQuake: gameplay.triggerEndbossQuakeForPlaytest,
    triggerBossMask: gameplay.triggerMaskBoomerangForPlaytest
  });
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

