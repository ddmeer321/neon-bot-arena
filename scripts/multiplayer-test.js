const multiplayerUrl = "wss://neon-bot-arena.onrender.com";

let socket = null;
let connecting = false;
let clientId = null;
let multiplayerState = null;
let currentLobbyCount = 0;
let pendingCoopStart = null;
let coopStartTimer = null;
let startHandlerReady = false;
let lastWorldSend = 0;

export function setupMultiplayerTest(dom, state, startGame) {
  multiplayerState = state;
  dom.multiplayerTestBtn?.addEventListener("click", () => {
    connect(dom, true);
  });

  dom.createLobbyBtn?.addEventListener("click", () => {
    sendWhenConnected(dom, { type: "create-room", name: getPlayerName(dom) });
  });

  dom.joinLobbyBtn?.addEventListener("click", () => {
    const code = String(dom.lobbyCodeInput?.value || "").replace(/\D/g, "").slice(0, 4);
    if (code.length !== 4) {
      setStatus(dom, "Code fehlt", "error");
      return;
    }
    sendWhenConnected(dom, { type: "join-room", code, name: getPlayerName(dom) });
  });

  dom.leaveLobbyBtn?.addEventListener("click", () => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "leave-room" }));
    setLobby(dom, null, 0, 2, []);
    resetMultiplayerState();
  });

  dom.coopStartBtn?.addEventListener("click", () => {
    if (currentLobbyCount < 2) {
      setStatus(dom, "2 Spieler nötig", "error");
      return;
    }
    sendWhenConnected(dom, { type: "start-room" });
  });

  window.setInterval(() => {
    sendLocalPlayerState(state);
  }, 110);

  window.setInterval(() => {
    updateRemotePlayerAges(state);
  }, 250);

  window.addEventListener("beforeunload", () => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "leave-room" }));
  });

  setupStartHandler(dom, state, startGame);
}

function sendWhenConnected(dom, message) {
  const active = connect(dom, false);
  if (!active) return;

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return;
  }

  socket.addEventListener("open", () => socket.send(JSON.stringify(message)), { once: true });
}

function connect(dom, pingOnly) {
  if (socket?.readyState === WebSocket.OPEN) {
    if (pingOnly) socket.send(JSON.stringify({ type: "ping" }));
    return true;
  }
  if (connecting) return true;

  connecting = true;
  setStatus(dom, "Verbinde...", "loading");
  socket = new WebSocket(multiplayerUrl);

  socket.addEventListener("open", () => {
    connecting = false;
    setStatus(dom, "Verbunden", "ok");
    if (pingOnly) socket.send(JSON.stringify({ type: "ping" }));
  });

  socket.addEventListener("message", (event) => {
    const data = parseMessage(event.data);
    if (!data) return;
    if (data.type === "pong") {
      setStatus(dom, "Verbunden", "ok");
      return;
    }
    if (data.type === "welcome") {
      clientId = data.clientId || clientId;
      if (multiplayerState?.multiplayer) multiplayerState.multiplayer.clientId = clientId;
      return;
    }
    if (data.type === "room-state") {
      setStatus(dom, "Lobby verbunden", "ok");
      setLobby(dom, data.code, data.count, data.maxPlayers, data.players);
      setMultiplayerRole(data.hostId);
      return;
    }
    if (data.type === "start-game") {
      startCoopGame(data);
      return;
    }
    if (data.type === "player-states") {
      updateRemotePlayers(data.players || [], multiplayerState);
      return;
    }
    if (data.type === "world-state") {
      applyWorldSnapshot(data.snapshot, multiplayerState);
      return;
    }
    if (data.type === "player-action") {
      multiplayerState?.handleMultiplayerAction?.(data);
      return;
    }
    if (data.type === "room-left") {
      setStatus(dom, "Verbunden", "ok");
      setLobby(dom, null, 0, 2, []);
      resetMultiplayerState();
      return;
    }
    if (data.type === "room-error" || data.type === "error") {
      setStatus(dom, data.message || "Fehler", "error");
    }
  });

  socket.addEventListener("error", () => {
    connecting = false;
    setStatus(dom, "Fehler", "error");
  });

  socket.addEventListener("close", () => {
    connecting = false;
    socket = null;
    setStatus(dom, "Getrennt", "error");
    setLobby(dom, null, 0, 2, []);
    resetMultiplayerState();
  });

  return true;
}

function parseMessage(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function setStatus(dom, text, state) {
  if (!dom.multiplayerStatus) return;
  dom.multiplayerStatus.textContent = text;
  dom.multiplayerStatus.dataset.state = state;
}

function setLobby(dom, code, count, maxPlayers, players = []) {
  currentLobbyCount = count;
  if (dom.lobbyCodeText) dom.lobbyCodeText.textContent = code ? `Lobby ${code}` : "Keine Lobby";
  if (dom.lobbyPlayersText) dom.lobbyPlayersText.textContent = `${count}/${maxPlayers} Spieler`;
  if (dom.coopStartText) dom.coopStartText.textContent = count >= 2 ? "Bereit" : "Warte auf 2 Spieler";
  if (dom.lobbyNames) {
    dom.lobbyNames.textContent = players.length
      ? players.map((player) => `${player.slot}. ${player.name || "Spieler"}${player.host ? " (Host)" : ""}`).join(" | ")
      : "Noch niemand in der Lobby";
  }
  if (code && dom.lobbyCodeInput) dom.lobbyCodeInput.value = code;
}

function getPlayerName(dom) {
  const value = String(dom.playerNameInput?.value || "").trim().replace(/\s+/g, " ").slice(0, 16);
  return value || "Spieler";
}

function sendLocalPlayerState(state) {
  if (socket?.readyState !== WebSocket.OPEN || !state.running || state.over || !state.player) return;
  if (socket.bufferedAmount > 50000) return;
  socket.send(JSON.stringify({
    type: "player-state",
    x: Math.round(state.player.x),
    y: Math.round(state.player.y),
    hero: state.player.hero?.name || state.selectedHero || "Held",
    color: state.player.hero?.color || "#38d8ff",
    hp: Math.round(state.player.hp),
    maxHp: Math.round(state.player.maxHp)
  }));
  sendWorldSnapshot(state);
}

function updateRemotePlayers(players, state) {
  if (!state) return;
  const now = performance.now();
  state.remotePlayers = players
    .filter((player) => player.id !== clientId)
    .map((player) => ({
      id: player.id,
      name: player.name || "Spieler",
      hero: player.hero || "Held",
      x: Number(player.x) || 0,
      y: Number(player.y) || 0,
      color: player.color || "#38d8ff",
      hp: Number(player.hp) || 0,
      maxHp: Number(player.maxHp) || 1,
      seenAt: now
    }));
}

function updateRemotePlayerAges(state) {
  if (!state?.remotePlayers) return;
  const now = performance.now();
  state.remotePlayers = state.remotePlayers.filter((player) => now - (player.seenAt || 0) < 3000);
}

function setupStartHandler(dom, state, startGame) {
  const runPendingStart = () => {
    if (!pendingCoopStart) return;
    const payload = pendingCoopStart;
    pendingCoopStart = null;
    if (coopStartTimer) {
      window.clearTimeout(coopStartTimer);
      coopStartTimer = null;
    }
    state.remotePlayers = [];
    state.multiplayer.active = true;
    state.multiplayer.hostId = payload.hostId || state.multiplayer.hostId;
    state.multiplayer.role = payload.hostId && payload.hostId === clientId ? "host" : "guest";
    startGame({ startWave: Number(payload.wave) || 1 });
  };

  window.__neonStartCoopGame = (payload) => {
    if (dom.coopStartText) dom.coopStartText.textContent = "Startet...";
    setStatus(dom, "Koop startet...", "ok");
    const delay = Math.max(0, Math.min(5000, Number(payload.delayMs) || 1200));
    pendingCoopStart = {
      ...payload,
      localStartAt: performance.now() + delay
    };
    if (coopStartTimer) window.clearTimeout(coopStartTimer);
    coopStartTimer = window.setTimeout(runPendingStart, delay);
  };

  if (startHandlerReady) return;
  startHandlerReady = true;
  const resumePendingStart = () => {
    if (!pendingCoopStart) return;
    if (performance.now() >= pendingCoopStart.localStartAt - 50) runPendingStart();
  };
  window.addEventListener("focus", resumePendingStart);
  document.addEventListener("visibilitychange", resumePendingStart);
}

function startCoopGame(payload) {
  if (typeof window.__neonStartCoopGame === "function") window.__neonStartCoopGame(payload);
}

function setMultiplayerRole(hostId) {
  if (!multiplayerState?.multiplayer) return;
  multiplayerState.multiplayer.active = Boolean(hostId);
  multiplayerState.multiplayer.hostId = hostId || null;
  multiplayerState.multiplayer.clientId = clientId;
  multiplayerState.multiplayer.role = hostId && hostId === clientId ? "host" : hostId ? "guest" : "solo";
}

function resetMultiplayerState() {
  if (!multiplayerState) return;
  multiplayerState.remotePlayers = [];
  if (multiplayerState.multiplayer) {
    multiplayerState.multiplayer.active = false;
    multiplayerState.multiplayer.role = "solo";
    multiplayerState.multiplayer.hostId = null;
    multiplayerState.multiplayer.lastWorldAt = 0;
  }
}

function sendWorldSnapshot(state) {
  if (state.multiplayer?.role !== "host" || socket?.readyState !== WebSocket.OPEN) return;
  const now = performance.now();
  if (now - lastWorldSend < 180 || socket.bufferedAmount > 50000) return;
  lastWorldSend = now;
  socket.send(JSON.stringify({
    type: "world-state",
    snapshot: createWorldSnapshot(state)
  }));
}

function createWorldSnapshot(state) {
  return {
    wave: state.wave,
    score: state.score,
    prepTimer: state.prepTimer,
    waveDelay: state.waveDelay,
    bossesDefeated: state.bossesDefeated,
    bossCoinBonus: state.bossCoinBonus,
    robots: cloneEntities(state.robots, 50),
    bullets: cloneEntities(state.bullets, 60),
    enemyBullets: cloneEntities(state.enemyBullets, 60),
    pickups: cloneEntities(state.pickups, 20)
  };
}

function cloneEntities(items, limit) {
  return (Array.isArray(items) ? items : []).slice(0, limit).map((item) => ({ ...item }));
}

function applyWorldSnapshot(snapshot, state) {
  if (!snapshot || state?.multiplayer?.role !== "guest") return;
  state.wave = Number(snapshot.wave) || state.wave;
  state.score = Number(snapshot.score) || 0;
  state.prepTimer = Number(snapshot.prepTimer) || 0;
  state.waveDelay = Number(snapshot.waveDelay) || 0;
  state.bossesDefeated = Number(snapshot.bossesDefeated) || 0;
  state.bossCoinBonus = Number(snapshot.bossCoinBonus) || 0;
  state.robots = cloneEntities(snapshot.robots, 50);
  state.bullets = cloneEntities(snapshot.bullets, 60);
  state.enemyBullets = cloneEntities(snapshot.enemyBullets, 60);
  state.pickups = cloneEntities(snapshot.pickups, 20);
  state.multiplayer.lastWorldAt = performance.now();
}

export function sendMultiplayerAction(action) {
  if (multiplayerState?.multiplayer?.role !== "guest" || socket?.readyState !== WebSocket.OPEN) return;
  if (socket.bufferedAmount > 50000) return;
  socket.send(JSON.stringify({ type: "player-action", action }));
}
