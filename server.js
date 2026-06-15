import http from "node:http";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT) || 3000;
const socketOpen = 1;
const rooms = new Map();

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "neon-bot-arena-multiplayer", rooms: rooms.size }));
    return;
  }

  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Neon Bot Arena Multiplayer Server");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  socket.clientId = crypto.randomUUID();
  socket.roomCode = null;
  socket.playerName = "Spieler";
  socket.playerState = null;
  socket.send(JSON.stringify({ type: "welcome", clientId: socket.clientId }));

  socket.on("message", (raw) => {
    const message = parseMessage(raw);
    if (!message) {
      socket.send(JSON.stringify({ type: "error", message: "Ungueltige Nachricht" }));
      return;
    }

    if (message.type === "ping") {
      socket.send(JSON.stringify({ type: "pong", clientId: socket.clientId, time: Date.now() }));
      return;
    }

    if (message.type === "create-room") {
      socket.playerName = normalizePlayerName(message.name);
      joinRoom(socket, createRoomCode());
      return;
    }

    if (message.type === "join-room") {
      const code = normalizeRoomCode(message.code);
      if (!code || !rooms.has(code)) {
        socket.send(JSON.stringify({ type: "room-error", message: "Lobby nicht gefunden" }));
        return;
      }
      socket.playerName = normalizePlayerName(message.name);
      joinRoom(socket, code);
      return;
    }

    if (message.type === "leave-room") {
      leaveRoom(socket);
      socket.send(JSON.stringify({ type: "room-left" }));
      return;
    }

    if (message.type === "start-room") {
      const room = rooms.get(socket.roomCode);
      if (!room) {
        socket.send(JSON.stringify({ type: "room-error", message: "Keine Lobby aktiv" }));
        return;
      }
      const delayMs = 1200;
      const seed = Math.floor(Math.random() * 1000000000);
      broadcastToRoom(room, { type: "start-game", delayMs, seed, wave: 1, hostId: getRoomHost(room)?.clientId || socket.clientId });
      return;
    }

    if (message.type === "world-state") {
      const room = rooms.get(socket.roomCode);
      if (!room || getRoomHost(room) !== socket) return;
      broadcastToRoom(room, {
        type: "world-state",
        hostId: socket.clientId,
        snapshot: sanitizeWorldSnapshot(message.snapshot)
      }, socket);
      return;
    }

    if (message.type === "player-action") {
      const room = rooms.get(socket.roomCode);
      const host = room ? getRoomHost(room) : null;
      if (!room || !host || host === socket) return;
      sendSocket(host, {
        type: "player-action",
        clientId: socket.clientId,
        name: socket.playerName || "Spieler",
        action: sanitizePlayerAction(message.action)
      });
      return;
    }

    if (message.type === "player-state") {
      socket.playerState = {
        x: clampNumber(message.x, 0, 1280),
        y: clampNumber(message.y, 0, 720),
        hero: normalizePlayerName(message.hero || "Held"),
        color: normalizeColor(message.color),
        hp: clampNumber(message.hp, 0, 9999),
        maxHp: clampNumber(message.maxHp, 1, 9999),
        time: Date.now()
      };
      const room = rooms.get(socket.roomCode);
      if (room) broadcastPlayerStates(room);
      return;
    }

    socket.send(JSON.stringify({ type: "error", message: "Unbekannte Nachricht" }));
  });

  socket.on("close", () => {
    leaveRoom(socket);
  });
});

server.listen(port, () => {
  console.log(`Neon Bot Arena multiplayer server listening on ${port}`);
});

function parseMessage(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
}

function createRoomCode() {
  for (let i = 0; i < 40; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!rooms.has(code)) return code;
  }
  return String(Date.now()).slice(-4);
}

function normalizeRoomCode(code) {
  return String(code || "").replace(/\D/g, "").slice(0, 4);
}

function normalizePlayerName(name) {
  const cleaned = String(name || "").trim().replace(/\s+/g, " ").slice(0, 16);
  return cleaned || "Spieler";
}

function normalizeColor(color) {
  const value = String(color || "");
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#38d8ff";
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function joinRoom(socket, code) {
  leaveRoom(socket);
  let room = rooms.get(code);
  if (!room) {
    room = { code, clients: new Set(), createdAt: Date.now() };
    rooms.set(code, room);
  }

  if (room.clients.size >= 2) {
    socket.send(JSON.stringify({ type: "room-error", message: "Lobby ist voll" }));
    return;
  }

  room.clients.add(socket);
  socket.roomCode = code;
  broadcastRoom(room);
}

function leaveRoom(socket) {
  const code = socket.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.roomCode = null;
  if (!room) return;
  room.clients.delete(socket);
  if (room.clients.size === 0) {
    rooms.delete(code);
    return;
  }
  broadcastRoom(room);
}

function broadcastRoom(room) {
  const host = getRoomHost(room);
  const players = [...room.clients].map((client, index) => ({
    id: client.clientId,
    name: client.playerName || "Spieler",
    slot: index + 1,
    host: client === host
  }));
  const payload = JSON.stringify({
    type: "room-state",
    code: room.code,
    players,
    hostId: host?.clientId || null,
    count: players.length,
    maxPlayers: 2
  });

  sendPayload(room, payload);
}

function broadcastPlayerStates(room) {
  const players = [...room.clients]
    .filter((client) => client.playerState)
    .map((client) => ({
      id: client.clientId,
      name: client.playerName || "Spieler",
      ...client.playerState
    }));
  const payload = JSON.stringify({ type: "player-states", players });

  sendPayload(room, payload);
}

function broadcastToRoom(room, message, exclude = null) {
  sendPayload(room, JSON.stringify(message), exclude);
}

function sendPayload(room, payload, exclude = null) {
  for (const client of room.clients) {
    if (client === exclude) continue;
    if (client.readyState === socketOpen) client.send(payload);
  }
}

function getRoomHost(room) {
  return room?.clients?.values().next().value || null;
}

function sendSocket(socket, message) {
  if (socket?.readyState === socketOpen) socket.send(JSON.stringify(message));
}

function sanitizeWorldSnapshot(snapshot = {}) {
  return {
    wave: clampNumber(snapshot.wave, 1, 999),
    score: clampNumber(snapshot.score, 0, 99999999),
    prepTimer: clampNumber(snapshot.prepTimer, 0, 30),
    waveDelay: clampNumber(snapshot.waveDelay, 0, 30),
    bossesDefeated: clampNumber(snapshot.bossesDefeated, 0, 999),
    bossCoinBonus: clampNumber(snapshot.bossCoinBonus, 0, 999999),
    robots: sanitizeEntities(snapshot.robots, 80),
    bullets: sanitizeEntities(snapshot.bullets, 120),
    enemyBullets: sanitizeEntities(snapshot.enemyBullets, 120),
    pickups: sanitizeEntities(snapshot.pickups, 30)
  };
}

function sanitizePlayerAction(action = {}) {
  const kind = String(action.kind || "").slice(0, 24);
  return {
    kind,
    hero: normalizePlayerName(action.hero || "Held"),
    pickupType: String(action.pickupType || "").slice(0, 16),
    x: clampNumber(action.x, 0, 1280),
    y: clampNumber(action.y, 0, 720),
    angle: clampNumber(action.angle, -Math.PI * 2, Math.PI * 2),
    color: normalizeColor(action.color),
    damage: clampNumber(action.damage, 0, 9999),
    bullets: sanitizeEntities(action.bullets, 5)
  };
}

function sanitizeEntities(entities, limit) {
  if (!Array.isArray(entities)) return [];
  return entities.slice(0, limit).map((entity) => {
    const clean = {};
    for (const [key, value] of Object.entries(entity || {})) {
      if (typeof value === "number") {
        clean[key] = clampNumber(value, -10000, 10000);
      } else if (typeof value === "boolean") {
        clean[key] = value;
      } else if (typeof value === "string") {
        clean[key] = value.slice(0, 32);
      }
    }
    return clean;
  });
}
