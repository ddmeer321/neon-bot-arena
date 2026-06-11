import { companions, defaultCosmetic, getHeroStats, getUpgradeCost, heroes, maxUpgradeLevel, starterHeroes } from "./config.js?v=sound1";
import { escapeHtml } from "./utils.js";
import { saveCoins, saveProgression } from "./storage.js?v=sound1";

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
  const baseReward = Math.max(12, state.wave * 8 + Math.floor(state.score / 170));
  const difficulty = state.difficulty || "normal";
  const multipliers = { easy: 0.18, normal: 0.55, hard: 0.85 };
  const minimums = { easy: 3, normal: 10, hard: 16 };
  const bossBonuses = { easy: 10, normal: 35, hard: 55 };
  const bossBonus = (Number(state.bossesDefeated) || 0) * (bossBonuses[difficulty] || 35);
  state.bossCoinBonus = bossBonus;
  return Math.max(minimums[difficulty] || 10, Math.round(baseReward * (multipliers[difficulty] || 0.55)) + bossBonus);
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
  const companionCards = Object.values(companions)
    .filter((companion) => companion.id !== defaultCosmetic)
    .map((companion) => renderCompanionCard(state, companion))
    .join("");
  dom.shopList.innerHTML = `
    <div class="shop-section">
      <div class="shop-heading">
        <span>Helden</span>
        <strong>${lockedHeroes.length === 0 ? "Fertig" : `${lockedHeroes.length} offen`}</strong>
      </div>
      <div class="fighters shop-grid">
        ${
          lockedHeroes.length === 0
            ? `<div class="empty-shop">Alle Helden freigeschaltet.</div>`
            : lockedHeroes.map((hero) => renderHeroCard(state, hero, false, false)).join("")
        }
      </div>
    </div>
    <div class="shop-section">
      <div class="shop-heading">
        <span>Begleiter</span>
        <strong>Nur Look</strong>
      </div>
      <div class="fighters shop-grid">${companionCards}</div>
    </div>
  `;
}

export function setupEconomyInput(state, dom) {
  dom.heroList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-hero]");
    if (!button) return;
    selectHero(state, dom, button.dataset.hero);
  });

  dom.shopList?.addEventListener("click", (event) => {
    const heroButton = event.target.closest("[data-buy-hero]");
    if (heroButton) {
      buyHero(state, dom, heroButton.dataset.buyHero);
      return;
    }

    const companionButton = event.target.closest("[data-buy-companion]");
    if (companionButton) {
      buyCompanion(state, dom, companionButton.dataset.buyCompanion);
      return;
    }

    const equipButton = event.target.closest("[data-equip-companion]");
    if (equipButton) equipCompanion(state, dom, equipButton.dataset.equipCompanion);
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

export function isCompanionOwned(state, companionId) {
  return state.ownedCosmetics.includes(companionId);
}

export function getEquippedCosmetic(state) {
  return companions[state.equippedCosmetic] || companions[defaultCosmetic];
}

export function buyCompanion(state, dom, companionId) {
  const companion = companions[companionId];
  if (!companion || isCompanionOwned(state, companionId) || state.coins < companion.price) return;
  state.coins -= companion.price;
  state.ownedCosmetics.push(companionId);
  state.equippedCosmetic = companionId;
  saveCoins(state.coins);
  saveProgression(state);
  updateCoinDisplay(state, dom);
  renderHeroMenu(state, dom);
  renderShop(state, dom);
}

export function equipCompanion(state, dom, companionId) {
  if (!companions[companionId] || !isCompanionOwned(state, companionId)) return;
  state.equippedCosmetic = companionId;
  saveProgression(state);
  renderHeroMenu(state, dom);
  renderShop(state, dom);
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

function renderCompanionCard(state, companion) {
  const owned = isCompanionOwned(state, companion.id);
  const equipped = state.equippedCosmetic === companion.id;
  const disabled = !owned && state.coins < companion.price;
  const action = owned ? `data-equip-companion="${companion.id}"` : `data-buy-companion="${companion.id}"`;
  const status = equipped ? "Aktiv" : owned ? "Ausrüsten" : `${companion.price} Münzen`;
  return `
    <button class="fighter companion-card ${equipped ? "selected" : ""} ${owned ? "" : "locked"}" ${action} ${disabled ? "disabled" : ""}>
      <span class="companion-swatch" style="--companion-color:${companion.color}; --companion-glow:${companion.glow};"></span>
      <span class="fighter-name">${escapeHtml(companion.name)}</span>
      <span class="fighter-role">${escapeHtml(companion.description)}</span>
      <span class="stats">Läuft neben dir, keine Stärke</span>
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
  const companion = getEquippedCosmetic(state);
  dom.heroDetails.innerHTML = `
    <div>
      <span class="label">Ausgewählt</span>
      <strong>${escapeHtml(hero.name)}</strong>
      <p>Stufe ${level}/${maxUpgradeLevel} | Leben ${upgraded.hp} | Schaden ${upgraded.bulletDamage} | Tempo ${upgraded.speed} | Begleiter ${escapeHtml(companion.name)}</p>
    </div>
    <button id="upgradeHeroBtn" ${maxed || state.coins < cost ? "disabled" : ""}>${maxed ? "Max Stufe" : `Upgrade ${cost} Münzen`}</button>
  `;
}

