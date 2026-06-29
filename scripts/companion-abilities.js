import { getEquippedCosmetic } from "./economy.js?v=bossattack2";

export const companionAbilities = {
  solar: { name: "Turbofeuer", description: "5 Sek. 25 % schneller schiessen", stat: "fireRate", multiplier: 1 / 1.25 },
  venom: { name: "Giftladung", description: "5 Sek. 25 % mehr Schaden", stat: "bulletDamage", multiplier: 1.25 },
  royal: { name: "Phasenschub", description: "5 Sek. 25 % schneller laufen", stat: "speed", multiplier: 1.25 },
  eclipse: { name: "Dunkelschild", description: "5 Sek. starkes Schutzschild", stat: "shield", multiplier: 1 }
};

export function setupCompanionAbilities({ state, dom, useHeroSpecial }) {
  let active = null;
  let lastTick = performance.now();

  const tick = () => {
    const now = performance.now();
    const dt = Math.min(0.25, (now - lastTick) / 1000);
    lastTick = now;
    if (!active) {
      annotateCompanions(dom);
      return;
    }
    if (state.player !== active.player || active.player.dead || state.over) {
      finishAbility();
      return;
    }
    active.player.companionAbilityTimer = Math.max(0, active.player.companionAbilityTimer - dt);
    if (active.player.companionAbilityTimer <= 0) {
      finishAbility();
      return;
    }
    updateHint();
  };

  window.setInterval(tick, 50);
  annotateCompanions(dom);
  if (typeof MutationObserver !== "undefined" && dom.shopList) {
    new MutationObserver(() => annotateCompanions(dom)).observe(dom.shopList, { childList: true, subtree: true });
  }

  function useSpecial() {
    const player = state.player;
    const wasReady = Boolean(player && !player.dead && player.specialTimer <= 0);
    useHeroSpecial();
    if (!wasReady || !player || player.specialTimer <= 0) return;

    const companion = getEquippedCosmetic(state);
    const ability = companionAbilities[companion?.id];
    if (!ability) return;
    finishAbility();

    active = { player, ability, originalValue: null };
    player.companionAbilityTimer = 5;
    player.pickupFlash = { color: companion.glow || companion.color, timer: 0.8 };

    if (ability.stat === "shield") {
      player.shield = Math.max(player.shield, 5);
    } else {
      active.originalValue = player.hero[ability.stat];
      player.hero[ability.stat] = active.originalValue * ability.multiplier;
    }
    updateHint();
  }

  function finishAbility() {
    if (!active) return;
    if (active.originalValue !== null) active.player.hero[active.ability.stat] = active.originalValue;
    active.player.companionAbilityTimer = 0;
    active = null;
    resetHint();
  }

  function updateHint() {
    if (!dom.specialHint || !active) return;
    dom.specialHint.textContent = `${active.ability.name}: ${active.player.companionAbilityTimer.toFixed(1)}s`;
  }

  function resetHint() {
    if (dom.specialHint) dom.specialHint.textContent = state.device === "mobile" ? "Spezial" : "Leertaste";
  }

  return { useSpecial };
}

function annotateCompanions(dom) {
  if (!dom.shopList) return;
  dom.shopList.querySelectorAll("[data-buy-companion], [data-equip-companion]").forEach((card) => {
    const id = card.dataset.buyCompanion || card.dataset.equipCompanion;
    const ability = companionAbilities[id];
    if (!ability) return;
    const role = card.querySelector(".fighter-role");
    const stats = card.querySelector(".stats");
    const roleText = `${ability.name}: ${ability.description}`;
    const statsText = "Aktiviert sich mit deiner Spezialfaehigkeit";
    if (role && role.textContent !== roleText) role.textContent = roleText;
    if (stats && stats.textContent !== statsText) stats.textContent = statsText;
  });
}
