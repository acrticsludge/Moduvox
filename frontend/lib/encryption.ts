/**
 * AES-256-GCM encryption utility for sensitive data at rest.
 *
 * Uses ENCRYPTION_KEY env var (32-byte hex string).
 * GCM mode provides authenticated encryption (integrity + confidentiality).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }
  const key = Buffer.from(keyHex, "hex")
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${key.length} bytes`)
  }
  return key
}

/**
 * Encrypt a plaintext string.
 * Returns hex-encoded: iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag().toString("hex")

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

/**
 * Decrypt an encrypted string.
 * Expects hex-encoded: iv + authTag + ciphertext (colon-separated).
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey()
  const parts = encrypted.split(":")

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format")
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
