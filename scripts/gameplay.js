import { clamp, cleanName, distance } from "./utils.js";
import { saveHighScore, saveLeaderboardEntry } from "./storage.js";
import { addCoins, calculateCoinReward, getSelectedHeroStats } from "./economy.js";

export function createGameplay({ dom, state, renderLeaderboard }) {
  function startGame() {
    const hero = getSelectedHeroStats(state);
    state.playerName = cleanName(dom.playerNameInput?.value || state.playerName);
    if (dom.playerNameInput) dom.playerNameInput.value = state.playerName;
    Object.assign(state, {
      running: true,
      paused: false,
      over: false,
      wave: 1,
      score: 0,
      startHighScore: state.highScore,
      time: 0,
      bullets: [],
      enemyBullets: [],
      robots: [],
      particles: [],
      pickups: []
    });
    state.player = {
      x: dom.canvas.width / 2,
      y: dom.canvas.height / 2,
      radius: 19,
      hp: hero.hp,
      maxHp: hero.hp,
      fireTimer: 0,
      specialTimer: 0,
      shield: 0,
      invincible: 0,
      healFlash: 0,
      damageBoostTimer: 0,
      speedBoostTimer: 0,
      pickupFlash: null,
      hero
    };
    dom.heroName.textContent = hero.name;
    applyDeviceMode();
    document.body.classList.add("playing");
    dom.menu.classList.add("hidden");
    dom.gamePanel.classList.remove("hidden");
    dom.message.classList.add("hidden");
    spawnWave();
  }

  function applyDeviceMode() {
    const mobile = state.device === "mobile";
    dom.gamePanel.classList.toggle("mobile-mode", mobile);
    dom.touchControls?.classList.toggle("hidden", !mobile);
    if (dom.moveHint) dom.moveHint.textContent = mobile ? "Stick" : "WASD";
    if (dom.aimHint) dom.aimHint.textContent = mobile ? "Auto-Ziel" : "Maus";
    if (dom.fireHint) dom.fireHint.textContent = mobile ? "Feuer" : "Klick";
    if (dom.specialHint) dom.specialHint.textContent = mobile ? "Spezial" : "Leertaste";
    state.mouse.down = false;
    state.touch.fire = false;
    state.touch.moveX = 0;
    state.touch.moveY = 0;
  }

  function togglePause() {
    if (!state.running || state.over) return;
    state.paused = !state.paused;
    dom.pauseBtn.textContent = state.paused ? ">" : "II";
    if (state.paused) showPauseMenu();
    else dom.message.classList.add("hidden");
  }

  function showMessage(html) {
    dom.message.innerHTML = html;
    dom.message.classList.remove("hidden");
  }

  function showPauseMenu() {
    showMessage(`<strong>Pause</strong>${state.playerName}, du bist bei Welle ${state.wave}.<div class="message-actions"><button id="resumeBtn">Weiter</button><button id="menuBtn" class="secondary-btn">Hauptmenü</button></div>`);
    const resumeBtn = document.querySelector("#resumeBtn");
    const menuBtn = document.querySelector("#menuBtn");
    resumeBtn.replaceWith(resumeBtn.cloneNode(true));
    menuBtn.replaceWith(menuBtn.cloneNode(true));
    document.querySelector("#resumeBtn").addEventListener("click", togglePause);
    document.querySelector("#menuBtn").addEventListener("click", returnToMenu);
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
      pulse(dom.canvas.width / 2, dom.canvas.height / 2, "#b7ff4a", 42);
    }
    updateHud();
  }

  function spawnWave() {
    const count = 4 + state.wave * 2;
    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      const x = side === 0 ? -40 : side === 1 ? dom.canvas.width + 40 : Math.random() * dom.canvas.width;
      const y = side === 2 ? -40 : side === 3 ? dom.canvas.height + 40 : Math.random() * dom.canvas.height;
      const shooter = state.wave >= 2 && Math.random() < 0.28;
      const bruiser = state.wave >= 3 && Math.random() < 0.22;
      state.robots.push(makeRobot(x, y, shooter, bruiser));
    }
    if (state.wave % 4 === 0) state.robots.push(makeRobot(dom.canvas.width / 2, -70, true, true, true));
  }

  function makeRobot(x, y, shooter, bruiser, boss = false) {
    const speed = boss ? 86 : bruiser ? 96 : 135 + state.wave * 4;
    return {
      x,
      y,
      radius: boss ? 34 : bruiser ? 25 : 18,
      hp: boss ? 260 + state.wave * 35 : bruiser ? 92 + state.wave * 11 : 48 + state.wave * 8,
      maxHp: boss ? 260 + state.wave * 35 : bruiser ? 92 + state.wave * 11 : 48 + state.wave * 8,
      speed,
      baseSpeed: speed,
      damage: boss ? 28 : bruiser ? 20 : 13,
      fireTimer: Math.random() * 2,
      shooter,
      bruiser,
      boss,
      hit: 0,
      stunTimer: 0,
      frozenTimer: 0,
      burnTimer: 0
    };
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
    player.x = clamp(player.x + (dx / len) * hero.speed * dt, 26, dom.canvas.width - 26);
    player.y = clamp(player.y + (dy / len) * hero.speed * dt, 72, dom.canvas.height - 40);
    player.fireTimer = Math.max(0, player.fireTimer - dt);
    player.specialTimer = Math.max(0, player.specialTimer - dt);
    player.shield = Math.max(0, player.shield - dt);
    player.invincible = Math.max(0, player.invincible - dt);
    player.healFlash = Math.max(0, player.healFlash - dt);
    player.damageBoostTimer = Math.max(0, player.damageBoostTimer - dt);
    player.speedBoostTimer = Math.max(0, player.speedBoostTimer - dt);
    if (player.pickupFlash) {
      player.pickupFlash.timer -= dt;
      if (player.pickupFlash.timer <= 0) player.pickupFlash = null;
    }
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
      const targets = state.robots
        .slice()
        .sort((a, b) => distance(player, a) - distance(player, b))
        .slice(0, 5);
      targets.forEach((robot) => {
        damageRobot(robot, 70, "#38d8ff");
        robot.stunTimer = 0.45;
      });
      state.lightningChain = { targets: targets.map(r => ({ x: r.x, y: r.y })), timer: 0.4 };
      pulse(player.x, player.y, "#38d8ff", 60);
    }

    if (state.selectedHero === "titan") {
      player.shield = 3.0;
      player.invincible = 0.7;
      pulse(player.x, player.y, "#ffc857", 54);
    }

    if (state.selectedHero === "nova") {
      const angle = getAimAngle();
      state.novaGhost = { x: player.x, y: player.y, timer: 0.45, color: player.hero.color };
      player.x = clamp(player.x + Math.cos(angle) * 190, 28, dom.canvas.width - 28);
      player.y = clamp(player.y + Math.sin(angle) * 190, 78, dom.canvas.height - 42);
      state.robots.filter((robot) => distance(player, robot) < 150).forEach((robot) => damageRobot(robot, 84, "#ff4f92"));
      player.invincible = 1.2;
      pulse(player.x, player.y, "#ff4f92", 90);
    }

    if (state.selectedHero === "ember") {
      state.robots.filter((robot) => distance(player, robot) < 210).forEach((robot) => {
        robot.burnTimer = 3.0;
        robot.burnFlash = 0.55;
        robot.burnSparkTimer = 0;
        damageRobot(robot, 95, "#ff7a3d");
        for (let i = 0; i < 10; i++) addParticle(robot.x, robot.y - robot.radius * 0.5, "#ff7a3d", 2.3);
      });
      state.emberRing = { x: player.x, y: player.y, timer: 0.58 };
      state.emberBurst = { x: player.x, y: player.y, timer: 0.5 };
      pulse(player.x, player.y, "#ff7a3d", 72);
    }

    if (state.selectedHero === "frost") {
      state.robots.filter((robot) => distance(player, robot) < 230).forEach((robot) => {
        robot.speed = robot.baseSpeed * 0.3;
        robot.frozenTimer = 3.0;
        damageRobot(robot, 55, "#8ee7ff");
      });
      state.frostRing = { x: player.x, y: player.y, timer: 0.45 };
      pulse(player.x, player.y, "#8ee7ff", 64);
    }

    if (state.selectedHero === "pulse") {
      const healed = Math.min(player.maxHp - player.hp, Math.round(player.maxHp * 0.35));
      player.hp += healed;
      player.healFlash = 1.0;
      player.invincible = Math.max(player.invincible, 0.35);
      state.robots.filter((robot) => distance(player, robot) < 150).forEach((robot) => damageRobot(robot, 48, "#b7ff4a"));
      state.pulseRing = { x: player.x, y: player.y, timer: 0.62 };
      state.healWave = { x: player.x, y: player.y, timer: 0.9, amount: healed };
      pulse(player.x, player.y, "#b7ff4a", 96);
    }
  }

  function getAimAngle() {
    const player = state.player;
    if (state.device === "mobile") {
      const nearest = state.robots.reduce((closest, robot) => (!closest || distance(player, robot) < distance(player, closest) ? robot : closest), null);
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
      if (bullet.life <= 0 || bullet.x < -30 || bullet.x > dom.canvas.width + 30 || bullet.y < -30 || bullet.y > dom.canvas.height + 30) {
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

      // Stun (Volt)
      if (robot.stunTimer > 0) {
        robot.stunTimer -= dt;
        continue;
      }

      // Frost-Verlangsamung
      if (robot.frozenTimer > 0) {
        robot.frozenTimer -= dt;
        if (robot.frozenTimer <= 0) robot.speed = robot.baseSpeed;
      }

      // Burn-Tick (Ember)
      if (robot.burnTimer > 0) {
        robot.burnTimer -= dt;
        robot.burnFlash = Math.max(0, (robot.burnFlash || 0) - dt);
        robot.burnSparkTimer = Math.max(0, (robot.burnSparkTimer || 0) - dt);
        robot.hp -= 8 * dt;
        if (robot.burnSparkTimer <= 0) {
          robot.burnSparkTimer = 0.12 + Math.random() * 0.08;
          addParticle(robot.x + (Math.random() - 0.5) * robot.radius, robot.y - robot.radius * 0.75, "#ff7a3d", 0.9);
          if (Math.random() < 0.45) addParticle(robot.x, robot.y, "#ffc857", 0.6);
        }
      }

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
          state.enemyBullets.push({ x: robot.x, y: robot.y, vx: Math.cos(angle) * 360, vy: Math.sin(angle) * 360, radius: robot.boss ? 7 : 5, life: 2, damage: robot.boss ? 18 : 12, color: "#ff4f92" });
        }
      }
      if (robot.hp <= 0) {
        state.robots.splice(i, 1);
        state.score += robot.boss ? 500 : robot.bruiser ? 90 : 45;
        pulse(robot.x, robot.y, robot.boss ? "#ffc857" : "#38d8ff", robot.boss ? 46 : 24);
        if (Math.random() < 0.14) state.pickups.push(makePickup(robot.x, robot.y));
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
    const reward = calculateCoinReward(state);
    state.lastCoinReward = reward;
    addCoins(state, reward, dom);
    saveHighScore(state, dom);
    saveLeaderboardEntry(state);
    renderLeaderboard();
    showMessage(`<strong>${isRecord ? "Neuer Highscore!" : "Game Over"}</strong>${state.playerName}, du hast Welle ${state.wave} erreicht und ${state.score} Punkte gesammelt.<br>Belohnung: +${reward} Münzen<br>Highscore: ${state.highScore}<div class="message-actions"><button id="againBtn">Nochmal</button><button id="gameOverMenuBtn" class="secondary-btn">Hauptmenü</button></div>`);
    const againBtn = document.querySelector("#againBtn");
    const menuBtn = document.querySelector("#gameOverMenuBtn");
    againBtn.replaceWith(againBtn.cloneNode(true));
    menuBtn.replaceWith(menuBtn.cloneNode(true));
    document.querySelector("#againBtn").addEventListener("click", startGame);
    document.querySelector("#gameOverMenuBtn").addEventListener("click", returnToMenu);
  }

  function returnToMenu() {
    Object.assign(state, { running: false, paused: false, over: false, player: null, bullets: [], enemyBullets: [], robots: [], particles: [], pickups: [] });
    dom.pauseBtn.textContent = "II";
    dom.message.classList.add("hidden");
    dom.gamePanel.classList.add("hidden");
    dom.touchControls?.classList.add("hidden");
    document.body.classList.remove("playing");
    dom.menu.classList.remove("hidden");
    renderLeaderboard();
  }

  function updateHud() {
    if (!state.player) return;
    if (state.score > state.highScore) saveHighScore(state, dom);
    dom.waveText.textContent = state.wave;
    dom.scoreText.textContent = state.score;
    if (dom.highScoreText) dom.highScoreText.textContent = state.highScore;
    dom.healthBar.style.width = `${clamp((state.player.hp / state.player.maxHp) * 100, 0, 100)}%`;
    dom.specialBar.style.width = `${clamp(100 - (state.player.specialTimer / state.player.hero.specialCooldown) * 100, 0, 100)}%`;
  }

  function addParticle(x, y, color, power) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 90 * power;
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 2 + Math.random() * 3, life: 0.25 + Math.random() * 0.35, color });
  }

  function pulse(x, y, color, amount) {
    for (let i = 0; i < amount; i++) addParticle(x, y, color, 4);
  }

  return { startGame, togglePause, useSpecial, update };
}
