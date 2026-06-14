const multiplayerUrl = "wss://neon-bot-arena.onrender.com";

let socket = null;
let connecting = false;

export function setupMultiplayerTest(dom) {
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
  });
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
    if (data.type === "room-state") {
      setStatus(dom, "Lobby verbunden", "ok");
      setLobby(dom, data.code, data.count, data.maxPlayers, data.players);
      return;
    }
    if (data.type === "room-left") {
      setStatus(dom, "Verbunden", "ok");
      setLobby(dom, null, 0, 2, []);
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
  if (dom.lobbyCodeText) dom.lobbyCodeText.textContent = code ? `Lobby ${code}` : "Keine Lobby";
  if (dom.lobbyPlayersText) dom.lobbyPlayersText.textContent = `${count}/${maxPlayers} Spieler`;
  if (dom.lobbyNames) {
    dom.lobbyNames.textContent = players.length
      ? players.map((player) => `${player.slot}. ${player.name || "Spieler"}`).join(" | ")
      : "Noch niemand in der Lobby";
  }
  if (code && dom.lobbyCodeInput) dom.lobbyCodeInput.value = code;
}

function getPlayerName(dom) {
  const value = String(dom.playerNameInput?.value || "").trim().replace(/\s+/g, " ").slice(0, 16);
  return value || "Spieler";
}
