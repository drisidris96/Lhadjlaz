import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.SESSION_SECRET;
if (!SECRET || SECRET.length < 16) {
  throw new Error(
    "SESSION_SECRET environment variable must be set (>= 16 chars). Refusing to start with weak/missing secret.",
  );
}
const KEY: string = SECRET;

export type AdminSession = {
  isAdmin: true;
  username: string;
  iat: number;
};

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function hmac(payload: string): string {
  return b64url(createHmac("sha256", KEY).update(payload).digest());
}

export function signSession(session: Omit<AdminSession, "iat">): string {
  const full: AdminSession = { ...session, iat: Date.now() };
  const payload = b64url(Buffer.from(JSON.stringify(full), "utf8"));
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined | null): AdminSession | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(fromB64url(payload).toString("utf8")) as AdminSession;
    if (!decoded || decoded.isAdmin !== true || typeof decoded.iat !== "number") {
      return null;
    }
    if (Date.now() - decoded.iat > MAX_AGE_MS) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_MAX_AGE_MS = MAX_AGE_MS;
