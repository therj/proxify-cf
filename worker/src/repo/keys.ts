import { Key, IssuedToken } from '@proxify-cf/shared';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

import { importJWK } from 'jose';

async function getKek(envKek: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(envKek));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

async function encryptPrivateJwk(jwkString: string, kekStr: string) {
  const key = await getKek(kekStr);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(jwkString);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  
  const b64Iv = arrayBufferToBase64(iv);
  const b64Cipher = arrayBufferToBase64(cipher);
  return JSON.stringify({ iv: b64Iv, cipher: b64Cipher });
}

async function decryptPrivateJwk(encryptedPayload: string, kekStr: string) {
  let parsed;
  try {
    parsed = JSON.parse(encryptedPayload);
  } catch (e) {
    // If it's not JSON, it might just be a raw string (legacy)
    return encryptedPayload;
  }
  
  // If it's a JSON object but lacks iv/cipher, it's a legacy unencrypted JWK stored as JSON string
  if (!parsed.iv || !parsed.cipher) {
    return encryptedPayload;
  }

  const { iv, cipher } = parsed;
  const key = await getKek(kekStr);
  const ivArr = base64ToArrayBuffer(iv);
  const cipherArr = base64ToArrayBuffer(cipher);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivArr }, key, cipherArr);
  return new TextDecoder().decode(decrypted);
}

export type KeysFilters = { client_id?: string | null };

export async function getKeys(db: D1Database, filters: KeysFilters = {}): Promise<Key[]> {
  const conditions: string[] = [];
  const binds: unknown[] = [];
  let i = 1;
  if (filters.client_id) {
    conditions.push(`client_id = ?${i}`);
    binds.push(filters.client_id);
    i++;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await db
    .prepare(`SELECT * FROM keys ${where} ORDER BY created_at DESC`)
    .bind(...binds)
    .all<Key>();
  const rows = res.results;
  return Array.isArray(rows) ? rows : [];
}

export async function getKeyByKid(db: D1Database, kid: string): Promise<Key | null> {
  const res = await db.prepare('SELECT * FROM keys WHERE kid = ?1').bind(kid).all<Key>();
  const rows = res.results;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

/** If JWT was minted via admin, reject when row exists and revoked_at is set. */
export async function isIssuedTokenRevoked(db: D1Database, jti: string): Promise<boolean> {
  const res = await db.prepare('SELECT revoked_at FROM issued_tokens WHERE jti = ?1').bind(jti).all<{ revoked_at: number | null }>();
  const rows = res.results;
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows[0].revoked_at != null;
}

export async function createKey(
  db: D1Database, 
  data: { client_id: string; mode: 'client_signed' | 'server_issued' },
  kek: string
): Promise<{ key: Key; privateJwk?: any }> {
  const kid = crypto.randomUUID();
  const created_at = Date.now();

  const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
  const publicJwk = await exportJWK(publicKey);
  const privateJwk = await exportJWK(privateKey);
  
  let private_jwk_encrypted = null;
  if (data.mode === 'server_issued') {
    private_jwk_encrypted = await encryptPrivateJwk(JSON.stringify(privateJwk), kek);
  }

  await db.prepare(
    `INSERT INTO keys (kid, client_id, alg, mode, public_jwk, private_jwk_encrypted, created_at) 
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).bind(
    kid, 
    data.client_id, 
    'ES256', 
    data.mode, 
    JSON.stringify(publicJwk), 
    private_jwk_encrypted, 
    created_at
  ).run();

  const { results } = await db.prepare('SELECT * FROM keys WHERE kid = ?1').bind(kid).all<Key>();
  
  return {
    key: results[0],
    // Only return private key if it's client signed so they can download it
    privateJwk: data.mode === 'client_signed' ? privateJwk : undefined
  };
}

export async function revokeKey(db: D1Database, kid: string): Promise<void> {
  const revoked_at = Date.now();
  await db.prepare(`UPDATE keys SET revoked_at = ?1 WHERE kid = ?2`).bind(revoked_at, kid).run();
}

export type IssuedTokensFilters = { client_id?: string | null; kid?: string | null };

export async function getIssuedTokens(db: D1Database, filters: IssuedTokensFilters = {}): Promise<IssuedToken[]> {
  const conditions: string[] = [];
  const binds: unknown[] = [];
  let i = 1;
  if (filters.client_id) {
    conditions.push(`client_id = ?${i}`);
    binds.push(filters.client_id);
    i++;
  }
  if (filters.kid) {
    conditions.push(`kid = ?${i}`);
    binds.push(filters.kid);
    i++;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await db
    .prepare(`SELECT * FROM issued_tokens ${where} ORDER BY issued_at DESC`)
    .bind(...binds)
    .all<IssuedToken>();
  const rows = res.results;
  return Array.isArray(rows) ? rows : [];
}

export async function mintToken(
  db: D1Database,
  kid: string,
  client_id: string,
  label: string,
  expires_in_days: number = 30,
  kek: string
): Promise<{ token: string, issued: IssuedToken }> {
  const { results } = await db.prepare('SELECT private_jwk_encrypted FROM keys WHERE kid = ?1 AND mode = "server_issued" AND revoked_at IS NULL').bind(kid).all();
  if (results.length === 0) throw new Error("Key not found or revoked");
  
  const decryptedJwkStr = await decryptPrivateJwk(results[0].private_jwk_encrypted as string, kek);
  const privateJwk = JSON.parse(decryptedJwkStr);
  const privateKey = await importJWK(privateJwk, 'ES256');
  
  const jti = crypto.randomUUID();
  const issued_at = Date.now();
  const expires_at = issued_at + (expires_in_days * 24 * 60 * 60 * 1000);
  
  const token = await new SignJWT({ jti, client_id })
    .setProtectedHeader({ alg: 'ES256', kid })
    .setIssuedAt(Math.floor(issued_at/1000))
    .setExpirationTime(Math.floor(expires_at/1000))
    .sign(privateKey as any);
    
  await db.prepare(
    `INSERT INTO issued_tokens (jti, kid, client_id, issued_at, expires_at, label) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  ).bind(jti, kid, client_id, issued_at, expires_at, label).run();
  
  const { results: tokenResults } = await db.prepare('SELECT * FROM issued_tokens WHERE jti = ?1').bind(jti).all<IssuedToken>();
  return { token, issued: tokenResults[0] };
}

export async function getIssuedTokenByJti(db: D1Database, jti: string): Promise<IssuedToken | null> {
  const res = await db.prepare('SELECT * FROM issued_tokens WHERE jti = ?1').bind(jti).all<IssuedToken>();
  const rows = res.results;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

export async function revokeToken(db: D1Database, jti: string): Promise<void> {
  const revoked_at = Date.now();
  await db.prepare(`UPDATE issued_tokens SET revoked_at = ?1 WHERE jti = ?2`).bind(revoked_at, jti).run();
}


