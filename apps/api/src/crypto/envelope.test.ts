import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  generateDek,
  openSecret,
  parseMasterKey,
  sealSecret,
  secretAad,
  unwrapDek,
  wrapDek,
} from './envelope.ts'

describe('envelope encryption', () => {
  it('wraps a DEK and seals a secret bound to AAD', () => {
    const master = parseMasterKey(randomBytes(32).toString('hex'))
    const dek = generateDek()
    const wrapped = wrapDek(master, dek)
    expect(unwrapDek(master, wrapped).equals(dek)).toBe(true)

    const aad = secretAad('user-a', 'cred-1', 1)
    const sealed = sealSecret(dek, 'sk_live_abc', aad)
    expect(openSecret(dek, sealed, aad)).toBe('sk_live_abc')
    expect(() => openSecret(dek, sealed, secretAad('user-b', 'cred-1', 1))).toThrow()
    expect(() => openSecret(dek, sealed, secretAad('user-a', 'cred-2', 1))).toThrow()
    expect(() => unwrapDek(randomBytes(32), wrapped)).toThrow()
  })

  it('accepts a base64 master key and rejects the wrong length', () => {
    const raw = randomBytes(32)
    expect(parseMasterKey(raw.toString('base64')).equals(raw)).toBe(true)
    expect(() => parseMasterKey('not-a-key')).toThrow(/MASTER_KEY must be 32 bytes/)
  })
})
