export const highScoreKey = "neon-bot-arena-high-score";
export const leaderboardKey = "neon-bot-arena-leaderboard";
export const coinKey = "neon-bot-arena-coins";
export const progressionKey = "neon-bot-arena-progression";
export const testIdKey = "neon-bot-arena-test-id";

export const maxUpgradeLevel = 10;
export const starterHeroes = ["volt", "titan", "nova"];
export const defaultCosmetic = "classic";
export const testPanelAccess = [
  "755051",
  "809587",
  "535127"
];

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
    speed: 260,
    fireRate: 0.34,
    bulletDamage: 16,
    bulletSpeed: 870,
    specialCooldown: 8,
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
  },
  warden: {
    id: "warden",
    name: "Iron Warden",
    role: "Nahkampf, Klingensturm",
    statsLabel: "Tempo + | Leben ++++ | Schaden ++++",
    color: "#d8dde8",
    glow: "#ff2d55",
    hp: 220,
    speed: 185,
    fireRate: 0.52,
    bulletDamage: 58,
    bulletSpeed: 0,
    specialCooldown: 9,
    specialName: "Klingensturm",
    price: 850
  }
};

export const companions = {
  classic: {
    id: "classic",
    name: "Kein Begleiter",
    description: "Nur dein Held",
    shape: "none",
    color: null,
    glow: null,
    price: 0
  },
  solar: {
    id: "solar",
    name: "Solar Drohne",
    description: "Kleine Flammen-Drohne",
    shape: "spark",
    color: "#ff8f3d",
    glow: "#ffd166",
    price: 900
  },
  venom: {
    id: "venom",
    name: "Venom Mini",
    description: "Grüner Energie-Begleiter",
    shape: "orb",
    color: "#60ff7a",
    glow: "#d6ff4a",
    price: 1200
  },
  royal: {
    id: "royal",
    name: "Royal Wisp",
    description: "Schwebende Rift-Figur",
    shape: "wisp",
    color: "#a78bfa",
    glow: "#38d8ff",
    price: 1600
  },
  eclipse: {
    id: "eclipse",
    name: "Eclipse Core",
    description: "Dunkler Mini-Kern",
    shape: "core",
    color: "#ef4444",
    glow: "#7f1d1d",
    price: 2200
  }
};

export function getUpgradeCost(level) {
  const costs = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 7500, 10000];
  return costs[Math.min(level, costs.length - 1)];
}

export function getHeroStats(hero, level = 0) {
  const damageBoost = 1 + level * 0.07;
  const healthBoost = 1 + level * 0.08;
  const speedBoost = 1 + level * 0.02;
  return {
    ...hero,
    hp: Math.round(hero.hp * healthBoost),
    speed: Math.round(hero.speed * speedBoost),
    bulletDamage: Math.round(hero.bulletDamage * damageBoost)
  };
}
