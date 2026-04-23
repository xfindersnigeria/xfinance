import { jwtDecrypt } from 'jose';
import { cookies } from 'next/headers';
import { AppSession, EntityImpersonationPayload, GroupImpersonationPayload, UserPayload } from '../types';

// --- PAYLOAD TYPES ---
// These should match the data structure you encrypt on the backend.



// --- DECRYPTION LOGIC ---

/**
 * Converts a hex string from your .env file into a Uint8Array for the crypto library.
 */
function hexToUint8Array(hexString: string): Uint8Array {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const cleanedHexString = hexString.replace(/"/g, '');
  const bytes = new Uint8Array(cleanedHexString.length / 2);
  for (let i = 0; i < cleanedHexString.length; i += 2) {
    bytes[i / 2] = parseInt(cleanedHexString.substring(i, i + 2), 16);
  }
  return bytes;
}

// Prepare the key and cookie names from environment variables
const secretKey = hexToUint8Array(process.env.COOKIE_SECRET!);
const userCookieName = process.env.NEXT_PUBLIC_COOKIE_NAME!;
// const groupCookieName = process.env.NEXT_PUBLIC_GROUP_COOKIE_NAME!;
// const entityCookieName = process.env.NEXT_PUBLIC_ENTITY_COOKIE_NAME!;

/**
 * A generic function to decrypt an encrypted session token (JWE).
 * @param token The encrypted token string from the cookie.
 * @returns The decrypted payload.
 */
async function decrypt<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtDecrypt(token, secretKey, {
      clockTolerance: '15s',
    });
    return payload as T;
  } catch (error) {
    // It's normal for decryption to fail if the token is invalid or expired.
    // We don't need to log this as an error in production.
    return null;
  }
}

/**
 * Gets the complete current session from the request cookies, including
 * user, group, and entity impersonation data.
 *
 * This is a SERVER-SIDE function for use in Server Components, Route Handlers,
 * or `getServerSideProps`.
 *
 * @returns An AppSession object containing all session data.
 */
export async function getAppSession(): Promise<AppSession> {
  // Get all cookie values in parallel
  const cookieStore = await cookies();
  const userCookie = cookieStore.get(userCookieName)?.value;
  // const groupCookie = cookieStore.get(groupCookieName)?.value;
  // const entityCookie = cookieStore.get(entityCookieName)?.value;

  const [user] = await Promise.all([
    userCookie ? decrypt<UserPayload>(userCookie) : null,
    // groupCookie ? decrypt<GroupImpersonationPayload>(groupCookie) : null,
    // entityCookie ? decrypt<EntityImpersonationPayload>(entityCookie) : null,
  ]);

  return { user };
}