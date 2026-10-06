import crypto from "crypto";

/**
 * Generate a cryptographically secure random token (hex-encoded).
 * Default length: 32 bytes (64 hex characters).
 */
export function generateSecureToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Compute SHA-256 hash of a string token (hex-encoded, 64 characters).
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Compute SHA-256 hash of a binary buffer or Uint8Array.
 */
export function hashBuffer(buffer: Uint8Array | Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
