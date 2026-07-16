export const CHAOS_EVENT_DURATION = 60;
export const CHAOS_BLINDNESS_RADIUS = 235;
export const CHAOS_METEOR_DAMAGE = 24;
export const CHAOS_METEOR_GROUND_TIME = 2;
export const CHAOS_RESPAWN_PROTECTION = 1;

// Add future chaos events here. The HUD and random selection use this registry automatically.
export const CHAOS_EVENTS = Object.freeze([
  Object.freeze({ id: "broken-map", labelKey: "chaos.event.brokenMap" }),
  Object.freeze({ id: "blindness", labelKey: "chaos.event.blindness" }),
  Object.freeze({ id: "meteor", labelKey: "chaos.event.meteor" }),
  Object.freeze({ id: "mirror", labelKey: "chaos.event.mirror" }),
  Object.freeze({ id: "respawn", labelKey: "chaos.event.respawn" })
]);

export function getChaosEvent(eventId) {
  return CHAOS_EVENTS.find((event) => event.id === eventId) || null;
}

export function chooseChaosEvent(previousId = null, random = Math.random) {
  const choices = CHAOS_EVENTS.length > 1
    ? CHAOS_EVENTS.filter((event) => event.id !== previousId)
    : CHAOS_EVENTS;
  const roll = Math.max(0, Math.min(0.999999, Number(random()) || 0));
  return choices[Math.floor(roll * choices.length)] || choices[0] || null;
}

export function startChaosRun(state, random = Math.random) {
  state.chaosEventId = null;
  state.chaosEventTimer = 0;
  if (state.gameMode !== "chaos") return null;
  const event = chooseChaosEvent(null, random);
  state.chaosEventId = event?.id || null;
  state.chaosEventTimer = CHAOS_EVENT_DURATION;
  return event;
}

export function updateChaosRun(state, dt, random = Math.random) {
  if (state.gameMode !== "chaos") return { event: null, changed: false };
  state.chaosEventTimer = Math.max(0, Number(state.chaosEventTimer) || 0) - Math.max(0, Number(dt) || 0);
  if (state.chaosEventTimer > 0 && getChaosEvent(state.chaosEventId)) {
    return { event: getChaosEvent(state.chaosEventId), changed: false };
  }
  const event = chooseChaosEvent(state.chaosEventId, random);
  state.chaosEventId = event?.id || null;
  state.chaosEventTimer = CHAOS_EVENT_DURATION;
  return { event, changed: true };
}

export function isChaosEventActive(state, eventId) {
  return state?.gameMode === "chaos" && state?.chaosEventId === eventId;
}

export function getChaosRespawnHealth(maxHp) {
  return Math.max(1, Math.round(Math.max(1, Number(maxHp) || 1) * 0.25));
}

export function isPointOnActiveBrokenTile(point, tile) {
  if (!point || !tile || (Number(tile.activationDelay) || 0) > 0) return false;
  return point.x > tile.x && point.x < tile.x + tile.width
    && point.y > tile.y && point.y < tile.y + tile.height;
}

export function formatChaosTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function createSeededRandom(seed) {
  let value = (Math.round(Number(seed) || 0) >>> 0) || 0x6d2b79f5;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
