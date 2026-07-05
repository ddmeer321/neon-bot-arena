export class ScoreDeletionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ScoreDeletionError";
    this.status = status;
  }
}

export function generateDeletionToken(fillRandom = (bytes) => crypto.getRandomValues(bytes)) {
  const bytes = new Uint8Array(32);
  fillRandom(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateDeletionPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ScoreDeletionError("Invalid deletion payload");
  }
  const scoreId = String(payload.score_id || "").trim().toLowerCase();
  const deleteToken = String(payload.delete_token || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(scoreId)) {
    throw new ScoreDeletionError("Invalid score id");
  }
  if (!/^[0-9a-f]{64}$/.test(deleteToken)) {
    throw new ScoreDeletionError("Invalid deletion token");
  }
  return { score_id: scoreId, delete_token: deleteToken };
}
