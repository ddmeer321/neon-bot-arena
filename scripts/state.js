import { loadCoins, loadHighScore, loadLeaderboard, loadProgression } from "./storage.js?v=musicvolume1";

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
    endbossMode: false,
    endbossPhase: 0,
    endbossTransition: 0,
    pendingCompanionReward: false,
    prepTimer: 0,
    waveDelay: 0,
    nextWavePulse: 0,
    playerName: "Spieler",
    leaderboard: loadLeaderboard(),
    time: 0,
    shake: 0,
    networkEntitySequence: 0,
    mouse: { x: 640, y: 360, down: false },
    touch: { moveX: 0, moveY: 0, fire: false, stickPointer: null },
    keys: new Set(),
    player: null,
    remotePlayers: [],
    multiplayer: {
      active: false,
      role: "solo",
      clientId: null,
      hostId: null,
      playerCount: 1,
      lastWorldAt: 0
    },
    bullets: [],
    enemyBullets: [],
    robots: [],
    bossLasers: [],
    particles: [],
    pickups: []
  };
}

