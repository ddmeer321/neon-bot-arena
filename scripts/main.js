import { getDom } from "./dom.js?v=testadmin1";
import { createState } from "./state.js?v=testadmin1";
import { escapeHtml } from "./utils.js";
import { loadOnlineScores } from "./online-leaderboard.js?v=testids1";
import { setupInput } from "./input.js?v=musicvolume1";
import { createGameplay } from "./gameplay.js?v=testadmin1";
import { draw } from "./render.js?v=testbats4";
import { createFPSCounter } from "./fps.js?v=testlogs1";
import { equipCompanion, renderHeroMenu, renderShop, setupEconomyInput, showHeroPanel, showShopPanel, updateCoinDisplay } from "./economy.js?v=settings6";
import { setupTestPanel } from "./test-panel.js?v=testadmin1";
import { setupMultiplayerTest } from "./multiplayer-test.js?v=testlogs1";
import { setupCompanionAbilities } from "./companion-abilities.js?v=settings6";
import { setupSettings, t } from "./settings.js?v=settings6";
import { setupScoreManagement } from "./score-management.js?v=deletion1";
import { setupTestLoggerUI } from "./test-logger.js?v=testlogs1";
import { setupTestDevtools } from "./test-devtools.js?v=testdevtools2";



export function bootGame() {
  setupSettings();
  setupScoreManagement();
  setupTestLoggerUI();
  const dom = getDom();
  const state = createState();
  setupTestDevtools(state);
  const playtestParams = new URLSearchParams(window.location.search);
  const isLocalPlaytest = ["localhost", "127.0.0.1"].includes(window.location.hostname) && playtestParams.has("playtest");
  if (isLocalPlaytest && playtestParams.get("hero") === "warden") state.selectedHero = "warden";
  state.leaderboardFilter = "all";

  if (dom.menuHighScoreText) dom.menuHighScoreText.textContent = state.highScore;
  if (dom.highScoreText) dom.highScoreText.textContent = state.highScore;
  if (dom.difficultyText) dom.difficultyText.textContent = t("menu.normal");
  updateCoinDisplay(state, dom);

  const renderLeaderboard = () => {
    if (!dom.leaderboardList) return;
    const hasOnlineScores = Array.isArray(state.onlineLeaderboard);
    const topScores = (hasOnlineScores ? state.onlineLeaderboard : state.leaderboard).slice(0, 10);
    if (dom.leaderboardMode) {
      const mode = hasOnlineScores ? t("leaderboard.online") : t("leaderboard.local");
      dom.leaderboardMode.textContent = state.leaderboardFilter === "players-2" ? `${mode} · ${t("menu.twoPlayers")}` : mode;
    }
    renderScoreList(dom.leaderboardList, topScores, state.leaderboardFilter === "players-2");
  };

  async function refreshOnlineLeaderboard() {
    const onlineScores = await loadOnlineScores(10, state.leaderboardFilter);
    if (onlineScores) state.onlineLeaderboard = onlineScores;
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
  window.addEventListener("onlineleaderboardchange", refreshOnlineLeaderboard);
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
      list.innerHTML = `<li><span>--</span><b>${t("leaderboard.empty")}</b><em>0</em></li>`;
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
    triggerBossMask: gameplay.triggerMaskBoomerangForPlaytest,
    triggerBossBats: gameplay.triggerBatSwarmForPlaytest,
    toggleGodMode: gameplay.toggleGodModeForPlaytest,
    clearThreats: gameplay.clearThreatsForPlaytest,
    defeatRobots: gameplay.defeatRobotsForPlaytest,
    addScore: gameplay.addScoreForPlaytest,
    spawnPickup: gameplay.spawnPickupForPlaytest,
    applyBlindness: gameplay.applyBlindnessForPlaytest
  });
  setupMultiplayerTest(dom, state, gameplay.startGame);

  window.addEventListener("languagechange", () => {
    renderLeaderboard();
    renderHeroMenu(state, dom);
    renderShop(state, dom);
    if (dom.difficultyText) dom.difficultyText.textContent = t(`menu.${state.difficulty || "normal"}`);
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

