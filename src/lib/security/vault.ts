/**
 * Cryptographic Secret Vault (AES-256-GCM).
 * 
 * Encrypts sensitive user credentials (API keys, OAuth access/refresh tokens, webhook secrets)
 * at rest before persisting to disk. Transparently handles legacy plaintext values.
 */

import crypto from 'crypto';

const ENCRYPTION_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';

export class CryptoVault {
  private static getDerivedKey(): Buffer {
    const rawSecret =
      process.env.VAULT_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      'open-source-ai-virtual-assistant-default-vault-key-v1';
    return crypto.scryptSync(rawSecret, 'va_salt_v1', 32);
  }

  /**
   * Encrypts a plaintext string using AES-256-GCM.
   * If already encrypted with enc:v1:, returns as-is.
   */
  public static encrypt(plaintext?: string | null): string | undefined {
    if (!plaintext) return undefined;
    if (plaintext.startsWith(ENCRYPTION_PREFIX)) return plaintext;

    const key = this.getDerivedKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts an AES-256-GCM encrypted string.
   * If the value does not have the enc:v1: prefix, returns it as-is for backward compatibility.
   */
  public static decrypt(ciphertext?: string | null): string | undefined {
    if (!ciphertext) return undefined;
    if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) return ciphertext;

    try {
      const payload = ciphertext.slice(ENCRYPTION_PREFIX.length);
      const [ivHex, authTagHex, encryptedHex] = payload.split(':');
      if (!ivHex || !authTagHex || !encryptedHex) return undefined;

      const key = this.getDerivedKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return undefined;
    }
  }

  public static isEncrypted(value?: string | null): boolean {
    return Boolean(value && value.startsWith(ENCRYPTION_PREFIX));
  }
}
