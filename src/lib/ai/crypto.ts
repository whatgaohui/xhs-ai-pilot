/**
 * AI Provider API Key Encryption Module
 *
 * Uses AES-256-GCM for encrypting/decrypting API keys stored in the database.
 * The encryption key is loaded from ENCRYPTION_KEY env var with a dev fallback.
 */

import crypto from "node:crypto";

// ─── Configuration ────────────────────────────────────────────────────────

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "ai-social-pilot-dev-key-2024-change-in-prod";

// Derive a 32-byte key from the ENCRYPTION_KEY string using SHA-256
function getKey(): Buffer {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag

// ─── Encrypt ──────────────────────────────────────────────────────────────

/**
 * Encrypt a plain-text API key using AES-256-GCM.
 * Returns a string in the format: `iv:authTag:ciphertext` (all base64).
 */
export function encryptApiKey(plain: string): string {
  if (!plain) return "";

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

// ─── Decrypt ──────────────────────────────────────────────────────────────

/**
 * Decrypt an encrypted API key string back to plain text.
 * Expects the format: `iv:authTag:ciphertext` (all base64).
 * Returns empty string if decryption fails or input is empty.
 */
export function decryptApiKey(encrypted: string): string {
  if (!encrypted) return "";

  try {
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      console.warn("[ai/crypto] Invalid encrypted format, returning as-is");
      return "";
    }

    const [ivB64, authTagB64, ciphertextB64] = parts;
    const key = getKey();
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.warn("[ai/crypto] Decryption failed:", err);
    return "";
  }
}

// ─── Mask ─────────────────────────────────────────────────────────────────

/**
 * Mask an API key for display purposes.
 * If key length > 8, shows first 4 chars + "****" + last 4 chars.
 * If key is empty, returns "未设置".
 */
export function maskApiKey(key: string): string {
  if (!key) return "未设置";
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}
