import { createClient } from "npm:@supabase/supabase-js@2";
import { generateDeletionToken, ScoreDeletionError, validateDeletionPayload } from "./deletion.js";
import { ScoreValidationError, validateScorePayload } from "./validation.js";

const ALLOWED_ORIGINS = new Set([
  "https://ddmeer321.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173"
]);
const MAX_BODY_BYTES = 4_096;

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  if (!corsHeaders) return jsonResponse({ error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!["POST", "DELETE"].includes(request.method)) {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Payload too large" }, 413, corsHeaders);
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Payload too large" }, 413, corsHeaders);
    }

    const clientIp = getClientIp(request);
    const hashSecret = Deno.env.get("SCORE_HASH_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = getServiceKey();

    if (!clientIp || !hashSecret || !supabaseUrl || !serviceKey) {
      console.error("Secure score submission is missing required server configuration");
      return jsonResponse({ error: "Score service unavailable" }, 503, corsHeaders);
    }

    const clientHash = await hmacSha256(clientIp, hashSecret);
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    if (request.method === "DELETE") {
      const deletion = validateDeletionPayload(JSON.parse(rawBody));
      const deletionHash = await hmacSha256(deletion.delete_token, hashSecret);
      const { data, error } = await supabase.rpc("delete_score_secure", {
        p_score_id: deletion.score_id,
        p_delete_token_hash: deletionHash,
        p_client_hash: clientHash
      });
      if (error) {
        const rateLimited = error.message?.includes("rate limit");
        console.warn("Secure score deletion rejected", { code: error.code, rateLimited });
        return jsonResponse(
          { error: rateLimited ? "Too many deletion attempts" : "Score deletion rejected" },
          rateLimited ? 429 : 422,
          corsHeaders
        );
      }
      if (data !== true) return jsonResponse({ error: "Score not found" }, 404, corsHeaders);
      return jsonResponse({ ok: true }, 200, corsHeaders);
    }

    const score = validateScorePayload(JSON.parse(rawBody));
    const deletionToken = generateDeletionToken();
    const deletionHash = await hmacSha256(deletionToken, hashSecret);
    const { data, error } = await supabase.rpc("submit_score_secure_v2", {
      p_name: score.name,
      p_scores: score.scores,
      p_wave: score.wave,
      p_diffculty: score.diffculty,
      p_bosses: score.bosses,
      p_hero: score.hero,
      p_player_count: score.player_count,
      p_client_hash: clientHash,
      p_delete_token_hash: deletionHash
    });

    if (error) {
      const rateLimited = error.message?.includes("rate limit");
      console.warn("Secure score RPC rejected submission", {
        code: error.code,
        rateLimited
      });
      return jsonResponse(
        { error: rateLimited ? "Too many score submissions" : "Score rejected" },
        rateLimited ? 429 : 422,
        corsHeaders
      );
    }

    const scoreId = Array.isArray(data) ? data[0]?.score_id : data;
    if (typeof scoreId !== "string") {
      console.error("Secure score RPC returned no score id");
      return jsonResponse({ error: "Score service unavailable" }, 503, corsHeaders);
    }
    return jsonResponse({
      ok: true,
      deletion: {
        score_id: scoreId,
        delete_token: deletionToken
      }
    }, 200, corsHeaders);
  } catch (error) {
    if (error instanceof ScoreValidationError || error instanceof ScoreDeletionError) {
      return jsonResponse({ error: error.message }, error.status, corsHeaders);
    }
    if (error instanceof SyntaxError) {
      return jsonResponse({ error: "Invalid JSON payload" }, 400, corsHeaders);
    }
    console.error("Unexpected score submission error", error);
    return jsonResponse({ error: "Score service unavailable" }, 503, corsHeaders);
  }
});

function getCorsHeaders(origin: string) {
  if (!ALLOWED_ORIGINS.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin"
  };
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "";
}

function getServiceKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  try {
    const keySet = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return Object.values(keySet).find((value) => typeof value === "string") as string | undefined;
  } catch {
    return undefined;
  }
}

async function hmacSha256(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(payload: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
