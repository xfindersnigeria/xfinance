// src/auth/crypto.util.ts
import { EncryptJWT, jwtDecrypt } from 'jose';
import 'dotenv/config';

/**
 * Converts a hex string to a Uint8Array.
 * @param hexString The hex string to convert.
 * @returns A Uint8Array.
 */
function hexToUint8Array(hexString: string): Uint8Array {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  // Remove quotes if they exist
  const cleanedHexString = hexString.replace(/"/g, '');
  const bytes = new Uint8Array(cleanedHexString.length / 2);
  for (let i = 0; i < cleanedHexString.length; i += 2) {
    bytes[i / 2] = parseInt(cleanedHexString.substring(i, i + 2), 16);
  }
  return bytes;
}

const secret = hexToUint8Array(process.env.COOKIE_SECRET!); // 32 bytes

export async function encryptSession(payload: any, expiresIn = '7d') {
  return await new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .encrypt(secret);
}

export async function decryptSession(
  token: string | undefined,
  // maxTokenAge?: string,
) {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, secret, {
      clockTolerance: '15s',
    });
    return payload;
  } catch (error) {
    console.error('Failed to decrypt session:', error);
    return null;
  }
}
