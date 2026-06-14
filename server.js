import http from "node:http";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT) || 3000;
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "neon-bot-arena-multiplayer" }));
    return;
  }

  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Neon Bot Arena Multiplayer Server");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  const clientId = crypto.randomUUID();
  socket.send(JSON.stringify({ type: "welcome", clientId }));

  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Ungueltige Nachricht" }));
      return;
    }

    if (message.type === "ping") {
      socket.send(JSON.stringify({ type: "pong", clientId, time: Date.now() }));
      return;
    }

    socket.send(JSON.stringify({ type: "echo", clientId, message }));
  });
});

server.listen(port, () => {
  console.log(`Neon Bot Arena multiplayer server listening on ${port}`);
});
