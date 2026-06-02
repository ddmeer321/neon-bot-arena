import { getDom } from "./dom.js";
import { createState } from "./state.js";
import { escapeHtml } from "./utils.js";
import { setupInput } from "./input.js";
import { createGameplay } from "./gameplay.js";
import { draw } from "./render.js";

export function bootGame() {
  const dom = getDom();
  const state = createState();

  if (dom.menuHighScoreText) dom.menuHighScoreText.textContent = state.highScore;
  if (dom.highScoreText) dom.highScoreText.textContent = state.highScore;

  const renderLeaderboard = () => {
    if (!dom.leaderboardList) return;
    const topScores = state.leaderboard.slice(0, 5);
    if (topScores.length === 0) {
      dom.leaderboardList.innerHTML = `<li><span>--</span><b>Noch kein Score</b><em>0</em></li>`;
      return;
    }
    dom.leaderboardList.innerHTML = topScores
      .map((entry, index) => `<li><span>#${index + 1}</span><b>${escapeHtml(entry.name)}</b><em>${entry.score}</em></li>`)
      .join("");
  };

  renderLeaderboard();

  const gameplay = createGameplay({ dom, state, renderLeaderboard });
  setupInput({
    dom,
    state,
    startGame: gameplay.startGame,
    togglePause: gameplay.togglePause,
    useSpecial: gameplay.useSpecial
  });

  function loop(last = performance.now()) {
    const now = performance.now();
    const dt = Math.min(0.033, (now - last) / 1000);
    if (state.running && !state.paused && !state.over) gameplay.update(dt);
    draw(dom, state);
    requestAnimationFrame(() => loop(now));
  }

  loop();
}
