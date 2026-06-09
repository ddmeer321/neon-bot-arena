export function getDom() {
  const canvas = document.querySelector("#game");

  if (!canvas) {
    throw new Error("Canvas #game nicht gefunden");
  }

  return {
    canvas,
    ctx: canvas.getContext("2d"),
    menu: document.querySelector("#menu"),
    gamePanel: document.querySelector("#gamePanel"),
    startBtn: document.querySelector("#startBtn"),
    pauseBtn: document.querySelector("#pauseBtn"),
    message: document.querySelector("#message"),
    touchControls: document.querySelector("#touchControls"),
    touchStick: document.querySelector("#touchStick"),
    touchKnob: document.querySelector("#touchKnob"),
    touchFire: document.querySelector("#touchFire"),
    touchSpecial: document.querySelector("#touchSpecial"),
    playerNameInput: document.querySelector("#playerName"),
    moveHint: document.querySelector("#moveHint"),
    aimHint: document.querySelector("#aimHint"),
    fireHint: document.querySelector("#fireHint"),
    specialHint: document.querySelector("#specialHint"),
    heroName: document.querySelector("#heroName"),
    waveText: document.querySelector("#wave"),
    scoreText: document.querySelector("#score"),
    highScoreText: document.querySelector("#highScore"),
    difficultyText: document.querySelector("#difficultyHud"),
    menuHighScoreText: document.querySelector("#menuHighScore"),
    coinCount: document.querySelector("#coinCount"),
    heroMenuBtn: document.querySelector("#heroMenuBtn"),
    shopMenuBtn: document.querySelector("#shopMenuBtn"),
    heroPanel: document.querySelector("#heroPanel"),
    shopPanel: document.querySelector("#shopPanel"),
    heroList: document.querySelector("#heroList"),
    shopList: document.querySelector("#shopList"),
    heroDetails: document.querySelector("#heroDetails"),
    healthBar: document.querySelector("#healthBar"),
    specialBar: document.querySelector("#specialBar"),
    leaderboardList: document.querySelector("#leaderboardList")
  };
}
