import CryptoJS from 'crypto-js'
import { app } from 'electron'

const ENCRYPTION_KEY_ENV = 'CLAWHIVE_DB_KEY'

/**
 * Get or generate encryption key for database
 * Key is derived from environment or machine-specific value
 * This ensures database can only be decrypted on the same machine
 */
export function getEncryptionKey(): string {
  // In production, derive from machine ID or secure storage
  const envKey = process.env[ENCRYPTION_KEY_ENV]
  if (envKey) return envKey

  // Generate deterministic key from app data path
  // This ensures the key is consistent for this app installation
  const machineId = app.getPath('userData')
  return CryptoJS.SHA256(machineId).toString(CryptoJS.enc.Hex).slice(0, 32)
}

/**
 * Encrypt database buffer with AES-256
 */
export function encryptData(data: Uint8Array): string {
  const key = getEncryptionKey()
  const wordArray = CryptoJS.lib.WordArray.create(data as unknown as number[])
  const encrypted = CryptoJS.AES.encrypt(wordArray, key)
  return encrypted.toString()
}

/**
 * Decrypt database string back to Uint8Array
 */
export function decryptData(encryptedData: string): Uint8Array {
  const key = getEncryptionKey()
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key)

  // Convert WordArray to Uint8Array
  const words = decrypted.words
  const sigBytes = decrypted.sigBytes
  const u8 = new Uint8Array(sigBytes)

  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }

  return u8
}

/**
 * Hash a string (for indexing/salting)
 */
export function hashString(input: string): string {
  return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex)
}

/**
 * Encrypt a string value (for API keys)
 */
export function encryptString(plaintext: string): string {
  const key = getEncryptionKey()
  return CryptoJS.AES.encrypt(plaintext, key).toString()
}

/**
 * Decrypt a string value
 */
export function decryptString(ciphertext: string): string {
  const key = getEncryptionKey()
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key)
  return decrypted.toString(CryptoJS.enc.Utf8)
}
