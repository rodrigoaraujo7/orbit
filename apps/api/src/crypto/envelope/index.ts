/**
 * Envelope encryption: MASTER_KEY wraps a per-user DEK; DEK seals secrets
 * with AES-256-GCM and AAD bound to user+credential+version.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGO = "aes-256-gcm"
const IV_LEN = 12
const KEY_LEN = 32

export function parseMasterKey(raw: string): Buffer {
  const hex = raw.trim()
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex")
  const buf = Buffer.from(hex, "base64")
  if (buf.length !== KEY_LEN) {
    throw new Error("MASTER_KEY must be 32 bytes (64 hex chars or base64)")
  }
  return buf
}

export function generateDek(): Buffer {
  return randomBytes(KEY_LEN)
}

export type Wrapped = { ciphertext: string; iv: string; tag: string }

function b64(buf: Buffer) {
  return buf.toString("base64")
}

export function wrapDek(masterKey: Buffer, dek: Buffer): Wrapped {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, masterKey, iv)
  const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()])
  return { ciphertext: b64(ciphertext), iv: b64(iv), tag: b64(cipher.getAuthTag()) }
}

export function unwrapDek(masterKey: Buffer, wrapped: Wrapped): Buffer {
  const decipher = createDecipheriv(ALGO, masterKey, Buffer.from(wrapped.iv, "base64"))
  decipher.setAuthTag(Buffer.from(wrapped.tag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(wrapped.ciphertext, "base64")),
    decipher.final(),
  ])
}

export function sealSecret(dek: Buffer, plaintext: string, aad: string): Wrapped {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, dek, iv)
  cipher.setAAD(Buffer.from(aad))
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return { ciphertext: b64(ciphertext), iv: b64(iv), tag: b64(cipher.getAuthTag()) }
}

export function openSecret(dek: Buffer, sealed: Wrapped, aad: string): string {
  const decipher = createDecipheriv(ALGO, dek, Buffer.from(sealed.iv, "base64"))
  decipher.setAAD(Buffer.from(aad))
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

export function secretAad(userId: string, credentialId: string, version: number) {
  return `${userId}:${credentialId}:${version}`
}
