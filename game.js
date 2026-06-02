const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const menu = document.querySelector("#menu");
const gamePanel = document.querySelector("#gamePanel");
const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const message = document.querySelector("#message");
const touchControls = document.querySelector("#touchControls");
const touchStick = document.querySelector("#touchStick");
const touchKnob = document.querySelector("#touchKnob");
const touchFire = document.querySelector("#touchFire");
const touchSpecial = document.querySelector("#touchSpecial");
const playerNameInput = document.querySelector("#playerName");
const moveHint = document.querySelector("#moveHint");
const aimHint = document.querySelector("#aimHint");
const fireHint = document.querySelector("#fireHint");
const specialHint = document.querySelector("#specialHint");
const heroName = document.querySelector("#heroName");
const waveText = document.querySelector("#wave");
const scoreText = document.querySelector("#score");
const highScoreText = document.querySelector("#highScore");
const menuHighScoreText = document.querySelector("#menuHighScore");
const healthBar = document.querySelector("#healthBar");
const specialBar = document.querySelector("#specialBar");
const leaderboardList = document.querySelector("#leaderboardList");
const highScoreKey = "neon-bot-arena-high-score";
const leaderboardKey = "neon-bot-arena-leaderboard";

const heroes = {
  volt: {
    name: "Volt Runner",
    color: "#38d8ff",
    glow: "#b7ff4a",
    hp: 110,
    speed: 315,
    fireRate: 0.18,
    bulletDamage: 16,
    bulletSpeed: 780,
    specialCooldown: 6,
    specialName: "Blitzkette"
  },
  titan: {
    name: "Shield Titan",
    color: "#ffc857",
    glow: "#38d8ff",
    hp: 170,
    speed: 220,
    fireRate: 0.42,
    bulletDamage: 14,
    bulletSpeed: 620,
    specialCooldown: 8,
    specialName: "Energieschild"
  },
  nova: {
    name: "Nova Shade",
    color: "#ff4f92",
    glow: "#b7ff4a",
    hp: 90,
    speed: 275,
    fireRate: 0.34,
    bulletDamage: 32,
    bulletSpeed: 870,
    specialCooldown: 7,
    specialName: "Teleportpuls"
  }
};

const state = {
  device: "pc",
  selectedHero: "volt",
  running: false,
  paused: false,
  over: false,
  wave: 1,
  score: 0,
  highScore: Number(localStorage.getItem(highScoreKey)) || 0,
  startHighScore: Number(localStorage.getItem(highScoreKey)) || 0,
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

if (menuHighScoreText) menuHighScoreText.textContent = state.highScore;
if (highScoreText) highScoreText.textContent = state.highScore;
renderLeaderboard();

document.querySelectorAll(".device-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".device-btn").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.device = button.dataset.device;
  });
});

document.querySelectorAll(".fighter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".fighter").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.selectedHero = button.dataset.hero;
  });
});

playerNameInput?.addEventListener("keydown", (event) => event.stopPropagation());
playerNameInput?.addEventListener("keyup", (event) => event.stopPropagation());
startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);
window.addEventListener("keydown", (event) => {
  if (isTyping(event.target)) return;
  if (!state.running && event.code !== "Escape") return;
  if (["KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(event.code)) event.preventDefault();
  state.keys.add(event.code);
  if (event.code === "KeyP" || event.code === "Escape") togglePause();
  if (event.code === "Space") useSpecial();
});
window.addEventListener("keyup", (event) => {
  if (isTyping(event.target)) return;
  if (!state.running) return;
  state.keys.delete(event.code);
});
canvas.addEventListener("pointermove", updatePointer);
canvas.addEventListener("pointerdown", (event) => {
  if (state.device === "mobile") return;
  updatePointer(event);
  state.mouse.down = true;
});
window.addEventListener("pointerup", () => {
  state.mouse.down = false;
});
touchSpecial?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  useSpecial();
});
touchFire?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  state.touch.fire = true;
});
touchFire?.addEventListener("pointerup", () => {
  state.touch.fire = false;
});
touchFire?.addEventListener("pointercancel", () => {
  state.touch.fire = false;
});
touchStick?.addEventListener("pointerdown", startTouchMove);
touchStick?.addEventListener("pointermove", updateTouchMove);
touchStick?.addEventListener("pointerup", stopTouchMove);
touchStick?.addEventListener("pointercancel", stopTouchMove);

function updatePointer(event) {
  if (state.device === "mobile") return;
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  state.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
}

function startTouchMove(event) {
  event.preventDefault();
  state.touch.stickPointer = event.pointerId;
  touchStick.setPointerCapture(event.pointerId);
  updateTouchMove(event);
}


function resizeCanavas() { 
canvas.width = window.innerWidth
canvas.height = window.innerHeight
}

window.addEventListener('resize', resizeCanavas);
resizeCanavas();


function updateTouchMove(event) {
  if (state.touch.stickPointer !== event.pointerId) return;
  const rect = touchStick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const length = Math.hypot(rawX, rawY);
  const max = rect.width * 0.34;
  const limited = Math.min(length, max);
  const angle = Math.atan2(rawY, rawX);
  const knobX = Math.cos(angle) * limited;
  const knobY = Math.sin(angle) * limited;
  state.touch.moveX = length > 8 ? knobX / max : 0;
  state.touch.moveY = length > 8 ? knobY / max : 0;
  touchKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
}

function stopTouchMove(event) {
  if (state.touch.stickPointer !== event.pointerId) return;
  state.touch.stickPointer = null;
  state.touch.moveX = 0;
  state.touch.moveY = 0;
  touchKnob.style.transform = "translate(0, 0)";
}

function startGame() {
  const hero = heroes[state.selectedHero];
  state.playerName = cleanName(playerNameInput?.value || state.playerName);
  if (playerNameInput) playerNameInput.value = state.playerName;
  state.running = true;
  state.paused = false;
  state.over = false;
  state.wave = 1;
  state.score = 0;
  state.startHighScore = state.highScore;
  state.time = 0;
  state.bullets = [];
  state.enemyBullets = [];
  state.robots = [];
  state.particles = [];
  state.pickups = [];
  state.player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 19,
    hp: hero.hp,
    maxHp: hero.hp,
    fireTimer: 0,
    specialTimer: 0,
    shield: 0,
    invincible: 0,
    hero
  };
  heroName.textContent = hero.name;
  applyDeviceMode();
  menu.classList.add("hidden");
  gamePanel.classList.remove("hidden");
  message.classList.add("hidden");
  spawnWave();
}

function applyDeviceMode() {
  const mobile = state.device === "mobile";
  gamePanel.classList.toggle("mobile-mode", mobile);
  touchControls?.classList.toggle("hidden", !mobile);
  if (moveHint) moveHint.textContent = mobile ? "Stick" : "WASD";
  if (aimHint) aimHint.textContent = mobile ? "Auto-Ziel" : "Maus";
  if (fireHint) fireHint.textContent = mobile ? "Feuer" : "Klick";
  if (specialHint) specialHint.textContent = mobile ? "Spezial" : "Leertaste";
  state.mouse.down = false;
  state.touch.fire = false;
  state.touch.moveX = 0;
  state.touch.moveY = 0;
}

function togglePause() {
  if (!state.running || state.over) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? ">" : "II";
  if (state.paused) {
    showPauseMenu();
  } else {
    message.classList.add("hidden");
  }
}

function showMessage(html) {
  message.innerHTML = html;
  message.classList.remove("hidden");
}

function showPauseMenu() {
  showMessage(
    `<strong>Pause</strong>${state.playerName}, du bist bei Welle ${state.wave}.<div class="message-actions"><button id="resumeBtn">Weiter</button><button id="menuBtn" class="secondary-btn">Hauptmenue</button></div>`
  );
  document.querySelector("#resumeBtn").addEventListener("click", togglePause);
  document.querySelector("#menuBtn").addEventListener("click", returnToMenu);
}

function spawnWave() {
  const count = 4 + state.wave * 2;
  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? -40 : side === 1 ? canvas.width + 40 : Math.random() * canvas.width;
    const y = side === 2 ? -40 : side === 3 ? canvas.height + 40 : Math.random() * canvas.height;
    const shooter = state.wave >= 2 && Math.random() < 0.28;
    const bruiser = state.wave >= 3 && Math.random() < 0.22;
    state.robots.push(makeRobot(x, y, shooter, bruiser));
  }
  if (state.wave % 4 === 0) {
    state.robots.push(makeRobot(canvas.width / 2, -70, true, true, true));
  }
}

function makeRobot(x, y, shooter, bruiser, boss = false) {
  return {
    x,
    y,
    radius: boss ? 34 : bruiser ? 25 : 18,
    hp: boss ? 260 + state.wave * 35 : bruiser ? 92 + state.wave * 11 : 48 + state.wave * 8,
    maxHp: boss ? 260 + state.wave * 35 : bruiser ? 92 + state.wave * 11 : 48 + state.wave * 8,
    speed: boss ? 86 : bruiser ? 96 : 135 + state.wave * 4,
    damage: boss ? 28 : bruiser ? 20 : 13,
    fireTimer: Math.random() * 2,
    shooter,
    bruiser,
    boss,
    hit: 0
  };
}

function loop(last = performance.now()) {
  const now = performance.now();
  const dt = Math.min(0.033, (now - last) / 1000);
  if (state.running && !state.paused && !state.over) update(dt);
  draw();
  requestAnimationFrame(() => loop(now));
}

function update(dt) {
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 14);
  updatePlayer(dt);
  updateBullets(dt, state.bullets, true);
  updateBullets(dt, state.enemyBullets, false);
  updateRobots(dt);
  updateParticles(dt);
  updatePickups(dt);
  if (state.robots.length === 0) {
    state.wave += 1;
    state.score += 100;
    spawnWave();
    pulse(canvas.width / 2, canvas.height / 2, "#b7ff4a", 42);
  }
  updateHud();
}

function updatePlayer(dt) {
  const player = state.player;
  const hero = player.hero;
  let dx = 0;
  let dy = 0;
  if (state.keys.has("KeyW")) dy -= 1;
  if (state.keys.has("KeyS")) dy += 1;
  if (state.keys.has("KeyA")) dx -= 1;
  if (state.keys.has("KeyD")) dx += 1;
  if (state.device === "mobile") {
    dx += state.touch.moveX;
    dy += state.touch.moveY;
  }
  const len = Math.hypot(dx, dy) || 1;
  player.x = clamp(player.x + (dx / len) * hero.speed * dt, 26, canvas.width - 26);
  player.y = clamp(player.y + (dy / len) * hero.speed * dt, 72, canvas.height - 40);
  player.fireTimer = Math.max(0, player.fireTimer - dt);
  player.specialTimer = Math.max(0, player.specialTimer - dt);
  player.shield = Math.max(0, player.shield - dt);
  player.invincible = Math.max(0, player.invincible - dt);
  if ((state.mouse.down || state.touch.fire) && player.fireTimer <= 0) shoot();
}

function shoot() {
  const player = state.player;
  const hero = player.hero;
  player.fireTimer = hero.fireRate;
  const angle = getAimAngle();
  if (state.selectedHero === "titan") {
    [-0.18, 0, 0.18].forEach((spread) => addBullet(player.x, player.y, angle + spread, hero.bulletSpeed, hero.bulletDamage, hero.color, false));
  } else {
    addBullet(player.x, player.y, angle, hero.bulletSpeed, hero.bulletDamage, hero.color, state.selectedHero === "nova");
  }
}

function addBullet(x, y, angle, speed, damage, color, pierce) {
  state.bullets.push({
    x: x + Math.cos(angle) * 24,
    y: y + Math.sin(angle) * 24,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: pierce ? 5 : 4,
    life: 1.05,
    damage,
    color,
    pierce
  });
}

function useSpecial() {
  if (!state.running || state.paused || state.over) return;
  const player = state.player;
  if (player.specialTimer > 0) return;
  player.specialTimer = player.hero.specialCooldown;
  state.shake = 0.7;
  if (state.selectedHero === "volt") {
    state.robots
      .sort((a, b) => distance(player, a) - distance(player, b))
      .slice(0, 5)
      .forEach((robot) => damageRobot(robot, 70, "#38d8ff"));
    pulse(player.x, player.y, "#38d8ff", 34);
  }
  if (state.selectedHero === "titan") {
    player.shield = 4.4;
    player.invincible = 0.7;
    pulse(player.x, player.y, "#ffc857", 54);
  }
  if (state.selectedHero === "nova") {
    const angle = getAimAngle();
    player.x = clamp(player.x + Math.cos(angle) * 190, 28, canvas.width - 28);
    player.y = clamp(player.y + Math.sin(angle) * 190, 78, canvas.height - 42);
    state.robots.filter((robot) => distance(player, robot) < 150).forEach((robot) => damageRobot(robot, 84, "#ff4f92"));
    player.invincible = 0.9;
    pulse(player.x, player.y, "#ff4f92", 58);
  }
}

function getAimAngle() {
  const player = state.player;
  if (state.device === "mobile") {
    const nearest = state.robots.reduce((closest, robot) => {
      if (!closest) return robot;
      return distance(player, robot) < distance(player, closest) ? robot : closest;
    }, null);
    if (nearest) return Math.atan2(nearest.y - player.y, nearest.x - player.x);
    if (Math.hypot(state.touch.moveX, state.touch.moveY) > 0.2) return Math.atan2(state.touch.moveY, state.touch.moveX);
  }
  return Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);
}

function updateBullets(dt, bullets, playerOwned) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    addParticle(bullet.x, bullet.y, bullet.color, 1);
    if (bullet.life <= 0 || bullet.x < -30 || bullet.x > canvas.width + 30 || bullet.y < -30 || bullet.y > canvas.height + 30) {
      bullets.splice(i, 1);
      continue;
    }
    if (playerOwned) {
      for (const robot of state.robots) {
        if (distance(bullet, robot) < bullet.radius + robot.radius) {
          damageRobot(robot, bullet.damage, bullet.color);
          if (!bullet.pierce) {
            bullets.splice(i, 1);
            break;
          }
        }
      }
    } else if (distance(bullet, state.player) < bullet.radius + state.player.radius) {
      hurtPlayer(12 + state.wave * 2);
      bullets.splice(i, 1);
    }
  }
}

function updateRobots(dt) {
  const player = state.player;
  for (let i = state.robots.length - 1; i >= 0; i--) {
    const robot = state.robots[i];
    const angle = Math.atan2(player.y - robot.y, player.x - robot.x);
    const close = distance(robot, player) < robot.radius + player.radius + 5;
    robot.hit = Math.max(0, robot.hit - dt);
    if (!close) {
      robot.x += Math.cos(angle) * robot.speed * dt;
      robot.y += Math.sin(angle) * robot.speed * dt;
    } else {
      hurtPlayer(robot.damage * dt);
    }
    if (robot.shooter || robot.boss) {
      robot.fireTimer -= dt;
      if (robot.fireTimer <= 0 && distance(robot, player) < 620) {
        robot.fireTimer = robot.boss ? 0.75 : 1.5;
        state.enemyBullets.push({
          x: robot.x,
          y: robot.y,
          vx: Math.cos(angle) * 360,
          vy: Math.sin(angle) * 360,
          radius: robot.boss ? 7 : 5,
          life: 2,
          damage: robot.boss ? 18 : 12,
          color: "#ff4f92"
        });
      }
    }
    if (robot.hp <= 0) {
      state.robots.splice(i, 1);
      state.score += robot.boss ? 500 : robot.bruiser ? 90 : 45;
      pulse(robot.x, robot.y, robot.boss ? "#ffc857" : "#38d8ff", robot.boss ? 46 : 24);
      if (Math.random() < 0.12) state.pickups.push({ x: robot.x, y: robot.y, radius: 11, life: 8 });
    }
  }
}

function hurtPlayer(amount) {
  const player = state.player;
  if (player.invincible > 0) return;
  const reduced = player.shield > 0 ? amount * 0.28 : amount;
  player.hp -= reduced;
  state.shake = Math.max(state.shake, 0.28);
  if (player.hp <= 0) endGame();
}

function damageRobot(robot, amount, color) {
  robot.hp -= amount;
  robot.hit = 0.12;
  for (let i = 0; i < 8; i++) addParticle(robot.x, robot.y, color, 3);
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updatePickups(dt) {
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const item = state.pickups[i];
    item.life -= dt;
    if (distance(item, state.player) < item.radius + state.player.radius) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 24);
      pulse(item.x, item.y, "#b7ff4a", 22);
      state.pickups.splice(i, 1);
    } else if (item.life <= 0) {
      state.pickups.splice(i, 1);
    }
  }
}

function endGame() {
  state.over = true;
  const isRecord = state.score > state.startHighScore;
  saveHighScore();
  saveLeaderboardEntry();
  showMessage(
    `<strong>${isRecord ? "Neuer Highscore!" : "Game Over"}</strong>${state.playerName}, du hast Welle ${state.wave} erreicht und ${state.score} Punkte gesammelt.<br>Highscore: ${state.highScore}<div class="message-actions"><button id="againBtn">Nochmal</button><button id="gameOverMenuBtn" class="secondary-btn">Hauptmenue</button></div>`
  );
  document.querySelector("#againBtn").addEventListener("click", startGame);
  document.querySelector("#gameOverMenuBtn").addEventListener("click", returnToMenu);
}

function saveHighScore() {
  if (state.score <= state.highScore) return false;
  state.highScore = state.score;
  localStorage.setItem(highScoreKey, String(state.highScore));
  if (menuHighScoreText) menuHighScoreText.textContent = state.highScore;
  if (highScoreText) highScoreText.textContent = state.highScore;
  return true;
}

function saveLeaderboardEntry() {
  const existing = state.leaderboard.find((entry) => entry.name.toLowerCase() === state.playerName.toLowerCase());
  if (!existing) {
    state.leaderboard.push({
      name: state.playerName,
      score: state.score,
      wave: state.wave,
      date: new Date().toISOString()
    });
  } else if (state.score > existing.score || (state.score === existing.score && state.wave > existing.wave)) {
    existing.name = state.playerName;
    existing.score = state.score;
    existing.wave = state.wave;
    existing.date = new Date().toISOString();
  }
  state.leaderboard.sort((a, b) => b.score - a.score || b.wave - a.wave);
  state.leaderboard = normalizeLeaderboard(state.leaderboard).slice(0, 10);
  localStorage.setItem(leaderboardKey, JSON.stringify(state.leaderboard));
  renderLeaderboard();
}

function renderLeaderboard() {
  if (!leaderboardList) return;
  const topScores = state.leaderboard.slice(0, 5);
  if (topScores.length === 0) {
    leaderboardList.innerHTML = `<li><span>--</span><b>Noch kein Score</b><em>0</em></li>`;
    return;
  }
  leaderboardList.innerHTML = topScores
    .map((entry, index) => `<li><span>#${index + 1}</span><b>${escapeHtml(entry.name)}</b><em>${entry.score}</em></li>`)
    .join("");
}

function returnToMenu() {
  state.running = false;
  state.paused = false;
  state.over = false;
  state.player = null;
  state.bullets = [];
  state.enemyBullets = [];
  state.robots = [];
  state.particles = [];
  state.pickups = [];
  pauseBtn.textContent = "II";
  message.classList.add("hidden");
  gamePanel.classList.add("hidden");
  touchControls?.classList.add("hidden");
  menu.classList.remove("hidden");
  renderLeaderboard();
}

function loadLeaderboard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(leaderboardKey) || "[]");
    return Array.isArray(parsed) ? normalizeLeaderboard(parsed).slice(0, 10) : [];
  } catch {
    return [];
  }
}

function normalizeLeaderboard(entries) {
  const bestByName = new Map();
  for (const entry of entries) {
    if (!entry || !entry.name) continue;
    const score = Number(entry.score);
    const wave = Number(entry.wave);
    if (!Number.isFinite(score)) continue;
    const name = cleanName(entry.name);
    const key = name.toLowerCase();
    const normalized = {
      name,
      score,
      wave: Number.isFinite(wave) ? wave : 1,
      date: entry.date || new Date().toISOString()
    };
    const current = bestByName.get(key);
    if (!current || normalized.score > current.score || (normalized.score === current.score && normalized.wave > current.wave)) {
      bestByName.set(key, normalized);
    }
  }
  return [...bestByName.values()].sort((a, b) => b.score - a.score || b.wave - a.wave);
}

function cleanName(name) {
  const cleaned = name.trim().replace(/\s+/g, " ").slice(0, 16);
  return cleaned || "Spieler";
}

function isTyping(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function updateHud() {
  if (!state.player) return;
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(highScoreKey, String(state.highScore));
    if (menuHighScoreText) menuHighScoreText.textContent = state.highScore;
  }
  waveText.textContent = state.wave;
  scoreText.textContent = state.score;
  if (highScoreText) highScoreText.textContent = state.highScore;
  healthBar.style.width = `${clamp((state.player.hp / state.player.maxHp) * 100, 0, 100)}%`;
  specialBar.style.width = `${clamp(100 - (state.player.specialTimer / state.player.hero.specialCooldown) * 100, 0, 100)}%`;
}

function draw() {
  ctx.save();
  const jitter = state.shake > 0 ? state.shake * 8 : 0;
  ctx.translate((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter);
  drawArena();
  if (state.player) {
    drawPickups();
    drawBullets();
    drawRobots();
    drawPlayer();
    drawParticles();
  }
  ctx.restore();
}

function drawArena() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#07121b");
  gradient.addColorStop(0.5, "#090b10");
  gradient.addColorStop(1, "#15101a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(56,216,255,0.11)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(183,255,74,0.28)";
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 64, canvas.width - 44, canvas.height - 90);
}

function drawPlayer() {
  const player = state.player;
  const angle = Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.shield > 0) {
    ctx.strokeStyle = "rgba(255,200,87,0.75)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 35 + Math.sin(state.time * 9) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  glowCircle(0, 0, player.radius + 13, player.hero.color, 0.22);
  ctx.fillStyle = player.hero.color;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(angle);
  ctx.fillStyle = "#f6f7fb";
  ctx.fillRect(5, -5, 28, 10);
  ctx.fillStyle = player.hero.glow;
  ctx.fillRect(24, -3, 12, 6);
  ctx.restore();
}

function drawRobots() {
  for (const robot of state.robots) {
    ctx.save();
    ctx.translate(robot.x, robot.y);
    glowCircle(0, 0, robot.radius + 14, robot.boss ? "#ffc857" : "#ff4f92", robot.hit > 0 ? 0.34 : 0.15);
    ctx.fillStyle = robot.hit > 0 ? "#f6f7fb" : robot.boss ? "#ffc857" : robot.bruiser ? "#9aa4b8" : "#ff4f92";
    ctx.fillRect(-robot.radius, -robot.radius, robot.radius * 2, robot.radius * 2);
    ctx.fillStyle = "#07121b";
    ctx.fillRect(-robot.radius * 0.55, -robot.radius * 0.22, robot.radius * 1.1, robot.radius * 0.25);
    ctx.fillStyle = "#38d8ff";
    ctx.fillRect(-robot.radius * 0.44, -robot.radius * 0.18, robot.radius * 0.3, robot.radius * 0.14);
    ctx.fillRect(robot.radius * 0.16, -robot.radius * 0.18, robot.radius * 0.3, robot.radius * 0.14);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(-robot.radius, robot.radius + 8, robot.radius * 2, 5);
    ctx.fillStyle = "#b7ff4a";
    ctx.fillRect(-robot.radius, robot.radius + 8, robot.radius * 2 * (robot.hp / robot.maxHp), 5);
    ctx.restore();
  }
}

function drawBullets() {
  [...state.bullets, ...state.enemyBullets].forEach((bullet) => {
    glowCircle(bullet.x, bullet.y, bullet.radius + 8, bullet.color, 0.45);
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawParticles() {
  state.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  });
}

function drawPickups() {
  state.pickups.forEach((item) => {
    glowCircle(item.x, item.y, 22, "#b7ff4a", 0.26);
    ctx.fillStyle = "#b7ff4a";
    ctx.fillRect(item.x - 11, item.y - 4, 22, 8);
    ctx.fillRect(item.x - 4, item.y - 11, 8, 22);
  });
}

function addParticle(x, y, color, power) {
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 90 * power;
  state.particles.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 2 + Math.random() * 3,
    life: 0.25 + Math.random() * 0.35,
    color
  });
}

function pulse(x, y, color, amount) {
  for (let i = 0; i < amount; i++) addParticle(x, y, color, 4);
}

function glowCircle(x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

loop();
