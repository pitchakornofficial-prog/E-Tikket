export const SESSION_COOKIE_NAME = "e-tikket-session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export type StaffRole = "ADMIN" | "ORGANIZER";

export interface StaffSession {
  sub: string;
  role: StaffRole;
  iat: number;
  exp: number;
  jti: string;
}

const textEncoder = new TextEncoder();

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || textEncoder.encode(secret).byteLength < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters");
  }
  return secret;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid session token encoding");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toOwnedArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  if (textEncoder.encode(secret).byteLength < 32) throw new Error("Session secret is too short");
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(
  user: { id: string; role: StaffRole },
  secret: string,
  nowMs = Date.now(),
): Promise<string> {
  const iat = Math.floor(nowMs / 1000);
  const claims: StaffSession = {
    sub: user.id,
    role: user.role,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
    jti: encodeBase64Url(crypto.getRandomValues(new Uint8Array(16))),
  };
  const payload = encodeBase64Url(textEncoder.encode(JSON.stringify(claims)));
  const key = await importSigningKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)));
  return `${payload}.${encodeBase64Url(signature)}`;
}

function isStaffSession(value: unknown, nowMs: number): value is StaffSession {
  if (!value || typeof value !== "object") return false;
  const claims = value as Record<string, unknown>;
  const now = Math.floor(nowMs / 1000);
  return (
    typeof claims.sub === "string" &&
    claims.sub.length > 0 &&
    claims.sub.length <= 128 &&
    (claims.role === "ADMIN" || claims.role === "ORGANIZER") &&
    Number.isInteger(claims.iat) &&
    Number.isInteger(claims.exp) &&
    (claims.iat as number) <= now + 60 &&
    (claims.exp as number) > now &&
    (claims.exp as number) - (claims.iat as number) === SESSION_TTL_SECONDS &&
    typeof claims.jti === "string" &&
    /^[A-Za-z0-9_-]{22}$/.test(claims.jti) &&
    Object.keys(claims).length === 5
  );
}

export async function validateSessionToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): Promise<StaffSession | null> {
  if (token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const [payload, encodedSignature] = parts;
    const signature = decodeBase64Url(encodedSignature);
    const key = await importSigningKey(secret);
    const isAuthentic = await crypto.subtle.verify(
      "HMAC",
      key,
      toOwnedArrayBuffer(signature),
      textEncoder.encode(payload),
    );
    if (!isAuthentic) return null;

    const claims = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decodeBase64Url(payload)));
    return isStaffSession(claims, nowMs) ? claims : null;
  } catch {
    return null;
  }
}

export function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === SESSION_COOKIE_NAME) {
      return cookie.slice(separator + 1).trim() || null;
    }
  }
  return null;
}

export async function getSession(request: Request, nowMs = Date.now()): Promise<StaffSession | null> {
  const token = readSessionCookie(request);
  if (!token) return null;
  return validateSessionToken(token, getSessionSecret(), nowMs);
}
