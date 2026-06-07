export function draw(dom, state) {
  const { canvas, ctx } = dom;
  ctx.save();
  const jitter = state.shake > 0 ? state.shake * 8 : 0;
  ctx.translate((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter);
  drawArena(ctx, canvas);
  if (state.player) {
    drawPickups(ctx, state);
    drawBullets(ctx, state);
    drawRobots(ctx, state);
    drawPlayer(ctx, state);
    drawParticles(ctx, state);
    drawSpecialEffects(ctx, state);
  }
  ctx.restore();
}

function drawArena(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#07121b");
  gradient.addColorStop(0.5, "#090b10");
  gradient.addColorStop(1, "#15101a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(56,216,255,0.11)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 64) line(ctx, x, 0, x, canvas.height);
  for (let y = 0; y < canvas.height; y += 64) line(ctx, 0, y, canvas.width, y);
  ctx.strokeStyle = "rgba(183,255,74,0.28)";
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 64, canvas.width - 44, canvas.height - 90);
}

function drawPlayer(ctx, state) {
  const player = state.player;
  const angle = getPlayerAngle(state);
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.shield > 0) {
    const shieldWarn = player.shield < 1.0;
    const blink = shieldWarn ? Math.sin(state.time * 18) * 0.4 + 0.6 : 1;
    ctx.strokeStyle = shieldWarn ? `rgba(255,80,80,${0.8 * blink})` : "rgba(255,200,87,0.75)";
    ctx.lineWidth = shieldWarn ? 3 : 5;
    ctx.beginPath();
    ctx.arc(0, 0, 35 + Math.sin(state.time * 9) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  glowCircle(ctx, 0, 0, player.radius + 13, player.hero.color, 0.22);
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

function drawRobots(ctx, state) {
  for (const robot of state.robots) {
    ctx.save();
    ctx.translate(robot.x, robot.y);
    glowCircle(ctx, 0, 0, robot.radius + 14, robot.boss ? "#ffc857" : "#ff4f92", robot.hit > 0 ? 0.34 : 0.15);
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
    if (robot.frozenTimer > 0) {
      const blink = Math.sin(state.time * 8) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(142,231,255,${blink})`;
      ctx.fillRect(-robot.radius, -robot.radius - 12, 9, 9);
    }
    if (robot.burnTimer > 0) {
      const flicker = Math.sin(state.time * 14) * 0.4 + 0.6;
      ctx.fillStyle = `rgba(255,80,20,${flicker})`;
      ctx.fillRect(-robot.radius, -robot.radius - 12, 9, 9);
    }
    ctx.restore();
  }
}

function drawBullets(ctx, state) {
  [...state.bullets, ...state.enemyBullets].forEach((bullet) => {
    glowCircle(ctx, bullet.x, bullet.y, bullet.radius + 8, bullet.color, 0.45);
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawParticles(ctx, state) {
  state.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.6));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  });
}

function drawPickups(ctx, state) {
  state.pickups.forEach((item) => {
    glowCircle(ctx, item.x, item.y, 22, "#b7ff4a", 0.26);
    ctx.fillStyle = "#b7ff4a";
    ctx.fillRect(item.x - 11, item.y - 4, 22, 8);
    ctx.fillRect(item.x - 4, item.y - 11, 8, 22);
  });
}

function getPlayerAngle(state) {
  const player = state.player;
  if (state.device === "mobile") {
    const nearest = state.robots.reduce((closest, robot) => (!closest || Math.hypot(player.x - robot.x, player.y - robot.y) < Math.hypot(player.x - closest.x, player.y - closest.y) ? robot : closest), null);
    if (nearest) return Math.atan2(nearest.y - player.y, nearest.x - player.x);
    if (Math.hypot(state.touch.moveX, state.touch.moveY) > 0.2) return Math.atan2(state.touch.moveY, state.touch.moveX);
  }
  return Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);
}

function glowCircle(ctx, x, y, radius, color, alpha) {
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

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawSpecialEffects(ctx, state) {
  // Nova Geisterbild
  if (state.novaGhost?.timer > 0) {
    state.novaGhost.timer -= 0.016;
    const alpha = Math.max(0, state.novaGhost.timer / 0.45) * 0.55;
    glowCircle(ctx, state.novaGhost.x, state.novaGhost.y, 26, state.novaGhost.color, alpha);
  }

  // Volt Blitzkette
  if (state.lightningChain?.timer > 0) {
    state.lightningChain.timer -= 0.016;
    const alpha = Math.max(0, state.lightningChain.timer / 0.4);
    const pts = [{ x: state.player?.x ?? 0, y: state.player?.y ?? 0 }, ...state.lightningChain.targets];
    ctx.strokeStyle = "#38d8ff";
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.8;
    for (let i = 0; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i+1].x) / 2 + (Math.random() - 0.5) * 30;
      const my = (pts[i].y + pts[i+1].y) / 2 + (Math.random() - 0.5) * 30;
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.quadraticCurveTo(mx, my, pts[i+1].x, pts[i+1].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Ember & Frost & Pulse Radius-Ringe
  for (const [key, color, maxR] of [
    ["emberRing", "#ff7a3d", 210],
    ["frostRing", "#8ee7ff", 230],
    ["pulseRing", "#b7ff4a", 200],
  ]) {
    const ring = state[key];
    if (ring?.timer > 0) {
      ring.timer -= 0.016;
      const progress = 1 - ring.timer / 0.45;
      const r = progress * maxR;
      ctx.globalAlpha = Math.max(0, (1 - progress) * 0.65);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}