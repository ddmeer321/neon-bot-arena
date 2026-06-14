const multiplayerUrl = "wss://neon-bot-arena.onrender.com";

export function setupMultiplayerTest(dom) {
  dom.multiplayerTestBtn?.addEventListener("click", () => {
    runConnectionTest(dom);
  });
}

function runConnectionTest(dom) {
  if (!dom.multiplayerStatus) return;
  dom.multiplayerStatus.textContent = "Verbinde...";
  dom.multiplayerStatus.dataset.state = "loading";

  let finished = false;
  const socket = new WebSocket(multiplayerUrl);
  const timeout = window.setTimeout(() => {
    if (finished) return;
    finished = true;
    socket.close();
    setStatus(dom, "Keine Antwort", "error");
  }, 7000);

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "ping" }));
  });

  socket.addEventListener("message", (event) => {
    if (finished) return;
    const data = parseMessage(event.data);
    if (data?.type !== "pong" && data?.type !== "welcome") return;
    if (data.type === "welcome") {
      socket.send(JSON.stringify({ type: "ping" }));
      return;
    }
    finished = true;
    window.clearTimeout(timeout);
    setStatus(dom, "Verbunden", "ok");
    socket.close();
  });

  socket.addEventListener("error", () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timeout);
    setStatus(dom, "Fehler", "error");
  });

  socket.addEventListener("close", () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timeout);
    setStatus(dom, "Getrennt", "error");
  });
}

function parseMessage(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function setStatus(dom, text, state) {
  dom.multiplayerStatus.textContent = text;
  dom.multiplayerStatus.dataset.state = state;
}
