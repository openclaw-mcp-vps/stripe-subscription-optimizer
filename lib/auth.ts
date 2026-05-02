import crypto from "node:crypto";

export const ACCESS_COOKIE_NAME = "sso_access";
export const STRIPE_KEY_COOKIE_NAME = "sso_stripe_key";

const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;
const STRIPE_KEY_TTL_SECONDS = 60 * 60 * 24 * 14;

interface AccessTokenPayload {
  sid: string;
  iat: number;
  exp: number;
}

interface StripeKeyPayload {
  sk: string;
  iat: number;
  exp: number;
}

function getSigningSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  return "change-me-before-production-cookie-signing-secret";
}

function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.padEnd(Math.ceil(input.length / 4) * 4, "=").replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(padded, "base64");
}

function hmac(input: string): string {
  return base64UrlEncode(crypto.createHmac("sha256", getSigningSecret()).update(input).digest());
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function signPayload(payload: object): string {
  const data = base64UrlEncode(JSON.stringify(payload));
  const signature = hmac(data);
  return `${data}.${signature}`;
}

function verifySignedPayload<T>(token: string): T | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) {
    return null;
  }

  const expected = hmac(data);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  const payload = safeJsonParse<T>(base64UrlDecode(data).toString("utf8"));
  return payload;
}

function getAesKey(): Buffer {
  return crypto.createHash("sha256").update(getSigningSecret()).digest();
}

function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getAesKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${base64UrlEncode(iv)}.${base64UrlEncode(encrypted)}.${base64UrlEncode(authTag)}`;
}

function decrypt(encryptedToken: string): string | null {
  const [ivPart, cipherPart, tagPart] = encryptedToken.split(".");
  if (!ivPart || !cipherPart || !tagPart) {
    return null;
  }

  try {
    const iv = base64UrlDecode(ivPart);
    const encrypted = base64UrlDecode(cipherPart);
    const authTag = base64UrlDecode(tagPart);

    const decipher = crypto.createDecipheriv("aes-256-gcm", getAesKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function createAccessCookieToken(sessionId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sid: sessionId,
    iat: now,
    exp: now + ACCESS_TTL_SECONDS
  };

  return signPayload(payload);
}

export function verifyAccessCookieToken(token: string | undefined): AccessTokenPayload | null {
  if (!token) {
    return null;
  }

  const payload = verifySignedPayload<AccessTokenPayload>(token);
  if (!payload) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return null;
  }

  return payload;
}

export function createStripeKeyCookieToken(stripeSecretKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: StripeKeyPayload = {
    sk: stripeSecretKey,
    iat: now,
    exp: now + STRIPE_KEY_TTL_SECONDS
  };

  return encrypt(JSON.stringify(payload));
}

export function verifyStripeKeyCookieToken(token: string | undefined): string | null {
  if (!token) {
    return null;
  }

  const decrypted = decrypt(token);
  if (!decrypted) {
    return null;
  }

  const payload = safeJsonParse<StripeKeyPayload>(decrypted);
  if (!payload) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return null;
  }

  return payload.sk;
}
