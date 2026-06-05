import { loadHighScore, loadLeaderboard } from "./storage.js";

export function createState() {
  const highScore = loadHighScore();
  return {
    device: "pc",
    selectedHero: "volt",
    running: false,
    paused: false,
    over: false,
    wave: 1,
    score: 0,
    highScore,
    startHighScore: highScore,
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
