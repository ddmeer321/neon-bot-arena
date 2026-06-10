import { cosmetics, defaultCosmetic, getHeroStats, getUpgradeCost, heroes, maxUpgradeLevel, starterHeroes } from "./config.js?v=economyshop1";
import { escapeHtml } from "./utils.js";
import { saveCoins, saveProgression } from "./storage.js?v=economyshop1";

export function isHeroUnlocked(state, heroId) {
  return state.unlockedHeroes.includes(heroId);
}

export function getHeroLevel(state, heroId) {
  return Number(state.upgrades[heroId]) || 0;
}

export function getSelectedHeroStats(state) {
  const hero = heroes[state.selectedHero];
  const upgraded = getHeroStats(hero, getHeroLevel(state, state.selectedHero));
  const cosmetic = getEquippedCosmetic(state);
  if (!cosmetic || cosmetic.id === defaultCosmetic) return upgraded;
  return {
    ...upgraded,
    color: cosmetic.color || upgraded.color,
    glow: cosmetic.glow || upgraded.glow
  };
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
  const cosmeticCards = Object.values(cosmetics)
    .filter((cosmetic) => cosmetic.id !== defaultCosmetic)
    .map((cosmetic) => renderCosmeticCard(state, cosmetic))
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
        <span>Kosmetik</span>
        <strong>Nur Look</strong>
      </div>
      <div class="fighters shop-grid">${cosmeticCards}</div>
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

    const cosmeticButton = event.target.closest("[data-buy-cosmetic]");
    if (cosmeticButton) {
      buyCosmetic(state, dom, cosmeticButton.dataset.buyCosmetic);
      return;
    }

    const equipButton = event.target.closest("[data-equip-cosmetic]");
    if (equipButton) equipCosmetic(state, dom, equipButton.dataset.equipCosmetic);
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

export function isCosmeticOwned(state, cosmeticId) {
  return state.ownedCosmetics.includes(cosmeticId);
}

export function getEquippedCosmetic(state) {
  return cosmetics[state.equippedCosmetic] || cosmetics[defaultCosmetic];
}

export function buyCosmetic(state, dom, cosmeticId) {
  const cosmetic = cosmetics[cosmeticId];
  if (!cosmetic || isCosmeticOwned(state, cosmeticId) || state.coins < cosmetic.price) return;
  state.coins -= cosmetic.price;
  state.ownedCosmetics.push(cosmeticId);
  state.equippedCosmetic = cosmeticId;
  saveCoins(state.coins);
  saveProgression(state);
  updateCoinDisplay(state, dom);
  renderHeroMenu(state, dom);
  renderShop(state, dom);
}

export function equipCosmetic(state, dom, cosmeticId) {
  if (!cosmetics[cosmeticId] || !isCosmeticOwned(state, cosmeticId)) return;
  state.equippedCosmetic = cosmeticId;
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
  const status = unlocked ? `Stufe ${level}` : `${hero.price} MÃ¼nzen`;
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

function renderCosmeticCard(state, cosmetic) {
  const owned = isCosmeticOwned(state, cosmetic.id);
  const equipped = state.equippedCosmetic === cosmetic.id;
  const disabled = !owned && state.coins < cosmetic.price;
  const action = owned ? `data-equip-cosmetic="${cosmetic.id}"` : `data-buy-cosmetic="${cosmetic.id}"`;
  const status = equipped ? "Aktiv" : owned ? "AusrÃ¼sten" : `${cosmetic.price} MÃ¼nzen`;
  return `
    <button class="fighter cosmetic-card ${equipped ? "selected" : ""} ${owned ? "" : "locked"}" ${action} ${disabled ? "disabled" : ""}>
      <span class="cosmetic-swatch" style="--skin-color:${cosmetic.color}; --skin-glow:${cosmetic.glow};"></span>
      <span class="fighter-name">${escapeHtml(cosmetic.name)}</span>
      <span class="fighter-role">${escapeHtml(cosmetic.description)}</span>
      <span class="stats">Keine StÃ¤rke, nur Style</span>
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
  const cosmetic = getEquippedCosmetic(state);
  dom.heroDetails.innerHTML = `
    <div>
      <span class="label">AusgewÃ¤hlt</span>
      <strong>${escapeHtml(hero.name)}</strong>
      <p>Stufe ${level}/${maxUpgradeLevel} | Leben ${upgraded.hp} | Schaden ${upgraded.bulletDamage} | Tempo ${upgraded.speed} | Skin ${escapeHtml(cosmetic.name)}</p>
    </div>
    <button id="upgradeHeroBtn" ${maxed || state.coins < cost ? "disabled" : ""}>${maxed ? "Max Stufe" : `Upgrade ${cost} MÃ¼nzen`}</button>
  `;
}
