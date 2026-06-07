export const highScoreKey = "neon-bot-arena-high-score";
export const leaderboardKey = "neon-bot-arena-leaderboard";
export const coinKey = "neon-bot-arena-coins";
export const progressionKey = "neon-bot-arena-progression";

export const maxUpgradeLevel = 5;
export const starterHeroes = ["volt", "titan", "nova"];

export const heroes = {
  volt: {
    id: "volt",
    name: "Volt Runner",
    role: "Schnell, Blitzkette",
    statsLabel: "Tempo +++ | Leben ++ | Schaden ++",
    color: "#38d8ff",
    glow: "#b7ff4a",
    hp: 110,
    speed: 315,
    fireRate: 0.18,
    bulletDamage: 16,
    bulletSpeed: 780,
    specialCooldown: 6,
    specialName: "Blitzkette",
    price: 0
  },
  titan: {
    id: "titan",
    name: "Shield Titan",
    role: "Stark, Energieschild",
    statsLabel: "Tempo + | Leben +++ | Schaden +++",
    color: "#ffc857",
    glow: "#38d8ff",
    hp: 170,
    speed: 220,
    fireRate: 0.42,
    bulletDamage: 14,
    bulletSpeed: 620,
    specialCooldown: 8,
    specialName: "Energieschild",
    price: 0
  },
  nova: {
    id: "nova",
    name: "Nova Shade",
    role: "Präzise, Teleportpuls",
    statsLabel: "Tempo ++ | Leben + | Schaden ++",
    color: "#ff4f92",
    glow: "#b7ff4a",
    hp: 90,
    speed: 275,
    fireRate: 0.34,
    bulletDamage: 22,
    bulletSpeed: 870,
    specialCooldown: 7,
    specialName: "Teleportpuls",
    price: 0
  },
  ember: {
    id: "ember",
    name: "Ember Forge",
    role: "Feuerkraft, Brandwelle",
    statsLabel: "Tempo ++ | Leben ++ | Schaden +++",
    color: "#ff7a3d",
    glow: "#ffc857",
    hp: 120,
    speed: 255,
    fireRate: 0.28,
    bulletDamage: 24,
    bulletSpeed: 720,
    specialCooldown: 7,
    specialName: "Brandwelle",
    price: 450
  },
  frost: {
    id: "frost",
    name: "Frost Byte",
    role: "Kontrolle, Kältefeld",
    statsLabel: "Tempo ++ | Leben ++ | Schaden ++",
    color: "#8ee7ff",
    glow: "#f6f7fb",
    hp: 115,
    speed: 250,
    fireRate: 0.3,
    bulletDamage: 20,
    bulletSpeed: 700,
    specialCooldown: 8,
    specialName: "Kältefeld",
    price: 550
  },
  pulse: {
    id: "pulse",
    name: "Pulse Monk",
    role: "Ausdauer, Heilimpuls",
    statsLabel: "Tempo ++ | Leben +++ | Schaden ++",
    color: "#b7ff4a",
    glow: "#38d8ff",
    hp: 145,
    speed: 245,
    fireRate: 0.32,
    bulletDamage: 18,
    bulletSpeed: 760,
    specialCooldown: 9,
    specialName: "Heilimpuls",
    price: 650
  }
};

export function getUpgradeCost(level) {
  return 120 + level * 90;
}

export function getHeroStats(hero, level = 0) {
  const damageBoost = 1 + level * 0.1;
  const healthBoost = 1 + level * 0.12;
  const speedBoost = 1 + level * 0.04;
  return {
    ...hero,
    hp: Math.round(hero.hp * healthBoost),
    speed: Math.round(hero.speed * speedBoost),
    bulletDamage: Math.round(hero.bulletDamage * damageBoost)
  };
}
