import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM encryption for secrets stored in the database (per-entity SMTP
 * passwords). The key comes from SMTP_ENCRYPTION_KEY, falling back to
 * COOKIE_SECRET so existing deployments work without a new env var — set
 * SMTP_ENCRYPTION_KEY explicitly if COOKIE_SECRET may ever be rotated, since
 * rotating the key makes saved SMTP passwords unreadable (they must be re-entered).
 *
 * Stored format: v1:<iv b64>:<auth tag b64>:<ciphertext b64>
 */
function key(): Buffer {
  const secret = process.env.SMTP_ENCRYPTION_KEY || process.env.COOKIE_SECRET;
  if (!secret) {
    throw new Error('SMTP_ENCRYPTION_KEY (or COOKIE_SECRET) must be set to store SMTP passwords');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, data] = stored.split(':');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unrecognised secret format');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
