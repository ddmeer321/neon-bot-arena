import { getHeroStats, getUpgradeCost, heroes, maxUpgradeLevel, starterHeroes } from "./config.js";
import { escapeHtml } from "./utils.js";
import { saveCoins, saveProgression } from "./storage.js";

export function isHeroUnlocked(state, heroId) {
  return state.unlockedHeroes.includes(heroId);
}

export function getHeroLevel(state, heroId) {
  return Number(state.upgrades[heroId]) || 0;
}

export function getSelectedHeroStats(state) {
  const hero = heroes[state.selectedHero];
  return getHeroStats(hero, getHeroLevel(state, state.selectedHero));
}

export function calculateCoinReward(state) {
  const baseReward = Math.max(25, state.wave * 15 + Math.floor(state.score / 80));
  const difficulty = state.difficulty || "normal";
  const multipliers = { easy: 0.25, normal: 1, hard: 1.35 };
  const minimums = { easy: 5, normal: 25, hard: 35 };
  return Math.max(minimums[difficulty] || 25, Math.round(baseReward * (multipliers[difficulty] || 1)));
}

export function addCoins(state, amount, dom) {
  state.coins += amount;
  saveCoins(state.coins);
  updateCoinDisplay(state, dom);
}

export function updateCoinDisplay(state, dom) {
  if (dom.coinCount) dom.coinCount.textContent = state.coins;
}

export function renderHeroMenu(state, dom) {
  if (!dom.heroList) return;
  dom.heroList.innerHTML = Object.values(heroes)
    .map((hero) => renderHeroCard(state, hero, isHeroUnlocked(state, hero.id), true))
    .join("");
  renderHeroDetails(state, dom);
}

export function renderShop(state, dom) {
  if (!dom.shopList) return;
  const lockedHeroes = Object.values(heroes).filter((hero) => !isHeroUnlocked(state, hero.id));
  dom.shopList.innerHTML =
    lockedHeroes.length === 0
      ? `<div class="empty-shop">Alle Helden freigeschaltet.</div>`
      : lockedHeroes.map((hero) => renderHeroCard(state, hero, false, false)).join("");
}

export function setupEconomyInput(state, dom) {
  dom.heroList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-hero]");
    if (!button) return;
    selectHero(state, dom, button.dataset.hero);
  });

  dom.shopList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy-hero]");
    if (!button) return;
    buyHero(state, dom, button.dataset.buyHero);
  });

  dom.heroDetails?.addEventListener("click", (event) => {
    if (!event.target.closest("#upgradeHeroBtn")) return;
    upgradeSelectedHero(state, dom);
  });
}

export function selectHero(state, dom, heroId) {
  if (!isHeroUnlocked(state, heroId)) {
    showShopPanel(dom);
    renderShop(state, dom);
    return;
  }
  state.selectedHero = heroId;
  renderHeroMenu(state, dom);
}

export function buyHero(state, dom, heroId) {
  const hero = heroes[heroId];
  if (!hero || isHeroUnlocked(state, heroId) || state.coins < hero.price) return;
  state.coins -= hero.price;
  state.unlockedHeroes.push(heroId);
  state.selectedHero = heroId;
  saveCoins(state.coins);
  saveProgression(state);
  updateCoinDisplay(state, dom);
  renderHeroMenu(state, dom);
  renderShop(state, dom);
  showHeroPanel(dom);
}

export function upgradeSelectedHero(state, dom) {
  const heroId = state.selectedHero;
  if (!isHeroUnlocked(state, heroId)) return;
  const level = getHeroLevel(state, heroId);
  if (level >= maxUpgradeLevel) return;
  const cost = getUpgradeCost(level);
  if (state.coins < cost) return;
  state.coins -= cost;
  state.upgrades[heroId] = level + 1;
  saveCoins(state.coins);
  saveProgression(state);
  updateCoinDisplay(state, dom);
  renderHeroMenu(state, dom);
}

export function showHeroPanel(dom) {
  dom.heroPanel?.classList.remove("hidden");
  dom.shopPanel?.classList.add("hidden");
  dom.heroMenuBtn?.classList.add("selected");
  dom.shopMenuBtn?.classList.remove("selected");
}

export function showShopPanel(dom) {
  dom.heroPanel?.classList.add("hidden");
  dom.shopPanel?.classList.remove("hidden");
  dom.heroMenuBtn?.classList.remove("selected");
  dom.shopMenuBtn?.classList.add("selected");
}

function renderHeroCard(state, hero, unlocked, selectable) {
  const level = getHeroLevel(state, hero.id);
  const selected = state.selectedHero === hero.id;
  const status = unlocked ? `Stufe ${level}` : `${hero.price} Münzen`;
  const action = selectable ? `data-hero="${hero.id}"` : `data-buy-hero="${hero.id}"`;
  return `
    <button class="fighter ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}" ${action}>
      <span class="portrait ${starterHeroes.includes(hero.id) ? hero.id : ""}" style="color:${hero.color}"></span>
      <span class="fighter-name">${escapeHtml(hero.name)}</span>
      <span class="fighter-role">${escapeHtml(hero.role)}</span>
      <span class="stats">${escapeHtml(hero.statsLabel)}</span>
      <span class="hero-status">${status}</span>
    </button>
  `;
}

function renderHeroDetails(state, dom) {
  if (!dom.heroDetails) return;
  const hero = heroes[state.selectedHero];
  const level = getHeroLevel(state, hero.id);
  const upgraded = getHeroStats(hero, level);
  const maxed = level >= maxUpgradeLevel;
  const cost = getUpgradeCost(level);
  dom.heroDetails.innerHTML = `
    <div>
      <span class="label">Ausgewählt</span>
      <strong>${escapeHtml(hero.name)}</strong>
      <p>Stufe ${level}/${maxUpgradeLevel} | Leben ${upgraded.hp} | Schaden ${upgraded.bulletDamage} | Tempo ${upgraded.speed}</p>
    </div>
    <button id="upgradeHeroBtn" ${maxed || state.coins < cost ? "disabled" : ""}>${maxed ? "Max Stufe" : `Upgrade ${cost} Münzen`}</button>
  `;
}
