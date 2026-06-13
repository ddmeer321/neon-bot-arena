import { companions, defaultCosmetic } from "./config.js?v=upgrade10b";

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
    drawBossHud(ctx, dom.canvas, state);
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
  drawCompanion(ctx, state);
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.healFlash > 0) {
    const alpha = Math.min(1, player.healFlash);
    glowCircle(ctx, 0, 0, player.radius + 42 + Math.sin(state.time * 13) * 4, "#b7ff4a", 0.18 * alpha);
    ctx.globalAlpha = 0.65 * alpha;
    ctx.strokeStyle = "#b7ff4a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 22, -Math.PI * 0.2, Math.PI * 1.35);
    ctx.stroke();
    ctx.fillStyle = "#b7ff4a";
    ctx.fillRect(-4, -player.radius - 35, 8, 22);
    ctx.fillRect(-11, -player.radius - 28, 22, 8);
    ctx.globalAlpha = 1;
  }
  if (player.damageBoostTimer > 0 || player.speedBoostTimer > 0 || player.pickupFlash) {
    const boostColor = player.pickupFlash?.color || (player.damageBoostTimer > 0 ? "#ff7a3d" : "#38d8ff");
    const boostAlpha = player.pickupFlash ? Math.min(1, player.pickupFlash.timer / 0.8) : 0.38 + Math.sin(state.time * 9) * 0.12;
    ctx.strokeStyle = boostColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = boostAlpha;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 30 + Math.sin(state.time * 10) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
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

function drawCompanion(ctx, state) {
  const player = state.player;
  const companion = companions[state.equippedCosmetic] || companions[defaultCosmetic];
  if (!player || !companion || companion.id === defaultCosmetic || companion.shape === "none") return;

  const bob = Math.sin(state.time * 5) * 5;
  const orbit = state.time * 1.8;
  const side = Math.sin(orbit) * 8;
  const x = player.x - 42 + side;
  const y = player.y - 28 + bob;
  const color = companion.color || "#38d8ff";
  const glow = companion.glow || color;

  ctx.save();
  glowCircle(ctx, x, y, 24, glow, 0.25);
  ctx.translate(x, y);
  ctx.strokeStyle = glow;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  if (companion.shape === "spark") {
    ctx.rotate(state.time * 2.5);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 16 : 7;
      const a = (Math.PI * 2 * i) / 8;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (companion.shape === "wisp") {
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.bezierCurveTo(16, -8, 10, 14, 0, 18);
    ctx.bezierCurveTo(-10, 14, -16, -8, 0, -17);
    ctx.fill();
  } else if (companion.shape === "core") {
    ctx.rotate(state.time);
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-15, -15, 30, 30);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillRect(-6, -3, 4, 4);
  ctx.fillRect(3, -3, 4, 4);
  ctx.restore();
}

function drawRobots(ctx, state) {
  for (const robot of state.robots) {
    ctx.save();
    ctx.translate(robot.x, robot.y);
    const robotGlow = robot.boss ? "#b11226" : "#ff4f92";
    glowCircle(ctx, 0, 0, robot.radius + (robot.boss ? 34 : 14), robotGlow, robot.boss ? 0.32 + Math.sin(state.time * 5) * 0.08 : robot.hit > 0 ? 0.34 : 0.15);
    if (robot.boss) {
      ctx.strokeStyle = "rgba(255,45,85,0.72)";
      ctx.lineWidth = 3;
      ctx.rotate(Math.sin(state.time * 2) * 0.04);
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (robot.radius + 5), Math.sin(a) * (robot.radius + 5));
        ctx.lineTo(Math.cos(a) * (robot.radius + 18), Math.sin(a) * (robot.radius + 18));
        ctx.stroke();
      }
    }
    ctx.fillStyle = robot.hit > 0 ? "#f6f7fb" : robot.boss ? "#5a0712" : robot.bruiser ? "#9aa4b8" : "#ff4f92";
    ctx.fillRect(-robot.radius, -robot.radius, robot.radius * 2, robot.radius * 2);
    if (robot.boss) {
      ctx.strokeStyle = "#ff2d55";
      ctx.lineWidth = 4;
      ctx.strokeRect(-robot.radius, -robot.radius, robot.radius * 2, robot.radius * 2);
      ctx.fillStyle = "rgba(255,45,85,0.28)";
      ctx.fillRect(-robot.radius + 6, -robot.radius + 6, robot.radius * 2 - 12, robot.radius * 2 - 12);
    }
    ctx.fillStyle = "#07121b";
    ctx.fillRect(-robot.radius * 0.55, -robot.radius * 0.22, robot.radius * 1.1, robot.radius * 0.25);
    ctx.fillStyle = robot.boss ? "#ffb3c1" : "#38d8ff";
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
      const burnAlpha = Math.min(1, robot.burnTimer / 0.7);
      const flicker = Math.sin(state.time * 18 + robot.x * 0.03) * 0.28 + 0.72;
      glowCircle(ctx, 0, 0, robot.radius + 24 + flicker * 4, "#ff7a3d", 0.16 * burnAlpha);
      ctx.globalAlpha = burnAlpha;
      ctx.strokeStyle = "#ff7a3d";
      ctx.lineWidth = robot.burnFlash > 0 ? 4 : 2;
      ctx.strokeRect(-robot.radius - 3, -robot.radius - 3, robot.radius * 2 + 6, robot.radius * 2 + 6);
      ctx.fillStyle = `rgba(255,122,61,${flicker})`;
      ctx.beginPath();
      ctx.moveTo(robot.radius - 8, -robot.radius - 4);
      ctx.lineTo(robot.radius + 2, -robot.radius - 22 - flicker * 5);
      ctx.lineTo(robot.radius + 12, -robot.radius - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,200,87,${0.8 * flicker})`;
      ctx.beginPath();
      ctx.arc(robot.radius + 2, -robot.radius - 8, 4 + flicker * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
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
    const color = item.color || "#b7ff4a";
    const pulseSize = 22 + Math.sin(state.time * 7 + item.x) * 3;
    glowCircle(ctx, item.x, item.y, pulseSize, color, 0.28);
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = item.life < 2 ? 0.55 + Math.sin(state.time * 18) * 0.35 : 1;
    if (item.type === "damage") {
      ctx.fillRect(-10, -4, 18, 14);
      ctx.fillRect(-7, -12, 5, 9);
      ctx.fillRect(-1, -13, 5, 10);
      ctx.fillRect(5, -12, 5, 9);
      ctx.fillRect(10, -8, 5, 11);
      ctx.fillRect(-6, 9, 11, 7);
      ctx.fillStyle = "rgba(255,255,255,0.42)";
      ctx.fillRect(-6, -10, 3, 4);
      ctx.fillRect(0, -11, 3, 4);
      ctx.fillRect(6, -10, 3, 4);
      ctx.strokeStyle = "#ffc857";
      ctx.lineWidth = 2;
      ctx.strokeRect(-11, -13, 27, 30);
    } else if (item.type === "speed") {
      ctx.beginPath();
      ctx.moveTo(-11, -10);
      ctx.lineTo(4, 0);
      ctx.lineTo(-11, 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(15, 0);
      ctx.lineTo(0, 10);
      ctx.stroke();
    } else {
      ctx.fillRect(-11, -4, 22, 8);
      ctx.fillRect(-4, -11, 8, 22);
    }
    ctx.restore();
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
  if (Array.isArray(state.meleeSwings)) {
    for (let i = state.meleeSwings.length - 1; i >= 0; i--) {
      const swing = state.meleeSwings[i];
      swing.timer -= 0.016;
      const duration = 0.2;
      const progress = 1 - swing.timer / duration;
      const alpha = Math.max(0, swing.timer / duration);
      ctx.save();
      ctx.translate(swing.x, swing.y);
      ctx.rotate(swing.angle);
      glowCircle(ctx, 36, 0, swing.range, swing.color, 0.16 * alpha);
      ctx.globalAlpha = alpha * 0.75;
      ctx.strokeStyle = swing.color;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, swing.range * (0.86 + progress * 0.18), -0.64, 0.64);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.24;
      ctx.fillStyle = swing.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, swing.range, -0.7, 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (swing.timer <= 0) state.meleeSwings.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

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
    ["pulseRing", "#b7ff4a", 185],
    ["wardenRing", "#d8dde8", 175],
  ]) {
    const ring = state[key];
    if (ring?.timer > 0) {
      const duration = key === "pulseRing" ? 0.62 : key === "emberRing" ? 0.58 : key === "wardenRing" ? 0.56 : 0.45;
      ring.timer -= 0.016;
      const progress = 1 - ring.timer / duration;
      const r = progress * maxR;
      ctx.globalAlpha = Math.max(0, (1 - progress) * 0.65);
      ctx.strokeStyle = color;
      ctx.lineWidth = key === "pulseRing" || key === "wardenRing" ? 5 : 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (key === "emberRing") {
        ctx.globalAlpha = Math.max(0, (1 - progress) * 0.32);
        ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
          const a = (Math.PI * 2 * i) / 14 + progress * 1.4;
          ctx.beginPath();
          ctx.moveTo(ring.x + Math.cos(a) * (r - 10), ring.y + Math.sin(a) * (r - 10));
          ctx.lineTo(ring.x + Math.cos(a) * (r + 22), ring.y + Math.sin(a) * (r + 22));
          ctx.stroke();
        }
      }
      if (key === "pulseRing") {
        ctx.globalAlpha = Math.max(0, (1 - progress) * 0.28);
        glowCircle(ctx, ring.x, ring.y, r * 0.72, color, 0.2);
      }
      if (key === "wardenRing") {
        ctx.globalAlpha = Math.max(0, (1 - progress) * 0.32);
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI * 2 * i) / 10 - progress * 0.7;
          ctx.beginPath();
          ctx.moveTo(ring.x + Math.cos(a) * (r - 18), ring.y + Math.sin(a) * (r - 18));
          ctx.lineTo(ring.x + Math.cos(a) * (r + 18), ring.y + Math.sin(a) * (r + 18));
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  if (state.emberBurst?.timer > 0) {
    state.emberBurst.timer -= 0.016;
    const progress = 1 - state.emberBurst.timer / 0.5;
    ctx.globalAlpha = Math.max(0, 1 - progress) * 0.5;
    ctx.strokeStyle = "#ffc857";
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      const inner = 34 + progress * 55;
      const outer = 76 + progress * 130 + Math.sin(state.time * 12 + i) * 8;
      ctx.beginPath();
      ctx.moveTo(state.emberBurst.x + Math.cos(a) * inner, state.emberBurst.y + Math.sin(a) * inner);
      ctx.lineTo(state.emberBurst.x + Math.cos(a) * outer, state.emberBurst.y + Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (state.healWave?.timer > 0) {
    state.healWave.timer -= 0.016;
    const progress = 1 - state.healWave.timer / 0.9;
    const alpha = Math.max(0, 1 - progress);
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = "#b7ff4a";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(state.healWave.x, state.healWave.y, 28 + progress * 130 + i * 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#b7ff4a";
    const bob = Math.sin(state.time * 9) * 3;
    ctx.fillRect(state.healWave.x - 5, state.healWave.y - 56 + bob, 10, 26);
    ctx.fillRect(state.healWave.x - 13, state.healWave.y - 48 + bob, 26, 10);
    ctx.globalAlpha = 1;
  }
}


function drawBossHud(ctx, canvas, state) {
  const boss = state.robots?.find((robot) => robot.boss);
  if (boss) {
    const width = Math.min(520, canvas.width - 56);
    const x = (canvas.width - width) / 2;
    const y = 82;
    const pct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    ctx.save();
    ctx.fillStyle = "rgba(8,12,20,0.78)";
    roundRect(ctx, x, y, width, 24, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, x + 4, y + 4, width - 8, 16, 5);
    ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x + width, y);
    grad.addColorStop(0, "#5a0712");
    grad.addColorStop(0.45, "#b11226");
    grad.addColorStop(1, "#ff2d55");
    ctx.fillStyle = grad;
    roundRect(ctx, x + 4, y + 4, (width - 8) * pct, 16, 5);
    ctx.fill();
    ctx.fillStyle = "#f6f7fb";
    ctx.font = "800 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Boss Welle " + state.wave, canvas.width / 2, y - 8);
    ctx.restore();
  }

  if (state.waveDelay > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(8,12,20,0.72)";
    roundRect(ctx, canvas.width / 2 - 145, 118, 290, 34, 8);
    ctx.fill();
    ctx.fillStyle = "#b7ff4a";
    ctx.font = "900 16px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N\u00e4chste Welle in " + Math.ceil(state.waveDelay) + "...", canvas.width / 2, 140);
    ctx.restore();
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

