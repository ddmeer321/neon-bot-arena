import { loadCoins, loadHighScore, loadLeaderboard, loadProgression } from "./storage.js?v=testpanel2";

export function createState() {
  const highScore = loadHighScore();
  const progression = loadProgression();
  return {
    device: "pc",
    difficulty: "normal",
    selectedHero: "volt",
    running: false,
    paused: false,
    over: false,
    wave: 1,
    score: 0,
    highScore,
    startHighScore: highScore,
    coins: loadCoins(),
    unlockedHeroes: progression.unlockedHeroes,
    upgrades: progression.upgrades,
    ownedCosmetics: progression.ownedCosmetics,
    equippedCosmetic: progression.equippedCosmetic,
    lastCoinReward: 0,
    bossCoinBonus: 0,
    bossesDefeated: 0,
    waveDelay: 0,
    nextWavePulse: 0,
    playerName: "Spieler",
    leaderboard: loadLeaderboard(),
    time: 0,
    shake: 0,
    mouse: { x: 640, y: 360, down: false },
    touch: { moveX: 0, moveY: 0, fire: false, stickPointer: null },
    keys: new Set(),
    player: null,
    bullets: [],
    enemyBullets: [],
    robots: [],
    particles: [],
    pickups: []
  };
}

