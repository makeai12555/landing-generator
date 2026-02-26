/**
 * Session management using Web Crypto API (Edge-compatible, no dependencies)
 * Cookie format: base64url(payload).base64url(hmac_signature)
 */

export const SESSION_COOKIE_NAME = "cf_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

interface SessionPayload {
  username: string;
  iat: number; // issued at (unix seconds)
  exp: number; // expires (unix seconds)
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is required");

  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(username: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    username,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  };

  const encoder = new TextEncoder();
  const payloadStr = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await getKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadStr));
  const signatureStr = base64UrlEncode(new Uint8Array(signature));

  return `${payloadStr}.${signatureStr}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadStr, signatureStr] = parts;
    const key = await getKey();
    const encoder = new TextEncoder();

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signatureStr),
      encoder.encode(payloadStr)
    );
    if (!valid) return null;

    const payload: SessionPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadStr))
    );

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
