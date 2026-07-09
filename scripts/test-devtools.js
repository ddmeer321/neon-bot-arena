import { MAX_TEST_LOG_ENTRIES, readTestLogs } from "./test-logger.js?v=testlogs1";

const consoleEntries = [];
const maxConsoleEntries = 250;
let activeTab = "console";
let latestPayload = "";
let patched = false;
let refreshTimer = null;

export function setupTestDevtools(state) {
  patchConsole();
  const dock = document.querySelector("#testDevtoolsDock");
  const output = document.querySelector("#testDevtoolsOutput");
  const title = document.querySelector("#testDevtoolsTitle");
  const status = document.querySelector("#testDevtoolsStatus");
  const tabs = [...document.querySelectorAll("[data-devtools-tab]")];
  const openButtons = [
    document.querySelector("#openTestDevtoolsBtn"),
    document.querySelector("#testGameDevtoolsBtn")
  ].filter(Boolean);
  const closeButton = document.querySelector("#testDevtoolsCloseBtn");
  const refreshButton = document.querySelector("#testDevtoolsRefreshBtn");
  const copyButton = document.querySelector("#testDevtoolsCopyBtn");
  const clearButton = document.querySelector("#testDevtoolsClearBtn");

  if (!dock || !output) return;

  const render = () => {
    latestPayload = buildPayload(activeTab, state);
    output.textContent = latestPayload;
    if (title) title.textContent = getTabTitle(activeTab);
    tabs.forEach((tab) => tab.classList.toggle("selected", tab.dataset.devtoolsTab === activeTab));
  };

  const open = () => {
    dock.classList.remove("hidden");
    document.body.classList.add("test-devtools-open");
    render();
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(render, 900);
  };

  const close = () => {
    dock.classList.add("hidden");
    document.body.classList.remove("test-devtools-open");
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  };

  openButtons.forEach((button) => button.addEventListener("click", open));
  closeButton?.addEventListener("click", close);
  refreshButton?.addEventListener("click", () => {
    render();
    setStatus(status, "Aktualisiert");
  });
  copyButton?.addEventListener("click", async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard nicht verfügbar");
      await navigator.clipboard.writeText(latestPayload || buildPayload(activeTab, state));
      setStatus(status, "In Zwischenablage kopiert");
    } catch {
      setStatus(status, "Kopieren fehlgeschlagen");
    }
  });
  clearButton?.addEventListener("click", () => {
    consoleEntries.length = 0;
    render();
    setStatus(status, "Console geleert");
  });
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.devtoolsTab || "console";
      render();
    });
  });

  dock.addEventListener("pointerdown", (event) => event.stopPropagation());
  dock.addEventListener("touchmove", (event) => event.stopPropagation(), { passive: true });

  window.addEventListener("testlogchange", () => {
    if (!dock.classList.contains("hidden") && activeTab === "logs") render();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dock.classList.contains("hidden")) close();
  });
}

function patchConsole() {
  if (patched) return;
  patched = true;

  ["log", "warn", "error", "info"].forEach((method) => {
    const original = console[method]?.bind(console);
    console[method] = (...args) => {
      pushConsoleEntry(method, args);
      original?.(...args);
    };
  });

  window.addEventListener("error", (event) => {
    pushConsoleEntry("error", [
      event.message,
      `${getShortFile(event.filename)}:${event.lineno || 0}:${event.colno || 0}`
    ]);
  });
  window.addEventListener("unhandledrejection", (event) => {
    pushConsoleEntry("error", ["Unhandled promise", event.reason instanceof Error ? event.reason.message : event.reason]);
  });
}

function pushConsoleEntry(method, args) {
  consoleEntries.push({
    time: new Date().toLocaleTimeString("de-DE"),
    method,
    message: args.map(formatConsoleValue).join(" ")
  });
  if (consoleEntries.length > maxConsoleEntries) consoleEntries.splice(0, consoleEntries.length - maxConsoleEntries);
}

function buildPayload(tab, state) {
  if (tab === "state") return JSON.stringify(createStateSnapshot(state), null, 2);
  if (tab === "logs") return formatLogs();
  if (tab === "storage") return JSON.stringify(getStorageSnapshot(), null, 2);
  if (tab === "env") return JSON.stringify(getEnvironmentSnapshot(), null, 2);
  return formatConsole();
}

function formatConsole() {
  if (consoleEntries.length === 0) return "Noch keine Console-Einträge.";
  return consoleEntries
    .slice(-120)
    .map((entry) => `[${entry.time}] ${entry.method.toUpperCase()}  ${entry.message}`)
    .join("\n");
}

function formatLogs() {
  const logs = readTestLogs();
  if (logs.length === 0) return "Noch keine lokalen Testlogs.";
  return logs
    .slice(-120)
    .reverse()
    .map((entry) => {
      const time = new Date(entry.timestamp).toLocaleTimeString("de-DE");
      return `[${time}] ${entry.type}\n${JSON.stringify(entry.details, null, 2)}`;
    })
    .join("\n\n");
}

function createStateSnapshot(state) {
  const player = state.player;
  const boss = state.robots?.find((robot) => robot.endboss);
  return {
    running: state.running,
    paused: state.paused,
    over: state.over,
    mode: state.endbossMode ? "endboss" : "normal",
    difficulty: state.difficulty,
    wave: state.wave,
    score: state.score,
    selectedHero: state.selectedHero,
    debugGodMode: Boolean(state.debugGodMode),
    player: player ? {
      hp: round(player.hp),
      maxHp: player.maxHp,
      x: round(player.x),
      y: round(player.y),
      dead: Boolean(player.dead),
      invincible: round(player.invincible || 0),
      blindness: round(player.blindnessTimer || 0),
      specialTimer: round(player.specialTimer || 0)
    } : null,
    boss: boss ? {
      phase: boss.endbossPhase,
      hp: round(boss.hp),
      maxHp: boss.maxHp,
      x: round(boss.x),
      y: round(boss.y),
      attackTimer: round(boss.bossAttackTimer || 0)
    } : null,
    counts: {
      robots: state.robots?.length || 0,
      bullets: state.bullets?.length || 0,
      enemyBullets: state.enemyBullets?.length || 0,
      bossLasers: state.bossLasers?.length || 0,
      pickups: state.pickups?.length || 0,
      particles: state.particles?.length || 0,
      localLogs: readTestLogs().length
    },
    multiplayer: {
      active: Boolean(state.multiplayer?.active),
      role: state.multiplayer?.role || "solo",
      playerCount: state.multiplayer?.playerCount || 1,
      remotePlayers: state.remotePlayers?.length || 0,
      roundId: state.multiplayer?.roundId || 0
    }
  };
}

function getStorageSnapshot() {
  const result = {};
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith("neon-bot-arena")) continue;
      const value = localStorage.getItem(key);
      result[key] = value && value.length > 900 ? `${value.slice(0, 900)}… (${value.length} Zeichen)` : value;
    }
  } catch {
    result.error = "localStorage nicht lesbar";
  }
  return result;
}

function getEnvironmentSnapshot() {
  return {
    url: location.href,
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    language: navigator.language,
    platform: navigator.platform,
    touchPoints: navigator.maxTouchPoints,
    localLogs: `${readTestLogs().length}/${MAX_TEST_LOG_ENTRIES}`,
    memory: performance?.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    } : "nicht verfügbar"
  };
}

function getTabTitle(tab) {
  return {
    console: "Console",
    state: "State",
    logs: "Logs",
    storage: "Storage",
    env: "Info"
  }[tab] || "Console";
}

function formatConsoleValue(value) {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function setStatus(element, text) {
  if (!element) return;
  element.textContent = text;
  window.clearTimeout(element._statusTimer);
  element._statusTimer = window.setTimeout(() => {
    element.textContent = "Bereit";
  }, 2200);
}

function getShortFile(value) {
  try {
    return new URL(value).pathname.split("/").pop() || "";
  } catch {
    return String(value || "");
  }
}

function round(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}
