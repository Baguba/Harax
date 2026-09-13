import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "harax_session";
const SESSION_TTL_DAYS = 30;

export type Role = "STUDENT" | "LECTURER" | "ADMIN" | "SUPERADMIN";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  coverUrl: string | null;
  department: string | null;
  year: string | null;
  bio: string | null;
  verified: boolean;
  provider: string;
  createdAt: Date;
}

const ROLE_RANK: Record<Role, number> = {
  STUDENT: 0,
  LECTURER: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

export function hasRole(user: SessionUser, min: Role): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[min];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Creates a session row + sets the http-only cookie. Returns the raw token. */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token: sha256(token), userId, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token: sha256(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/** Resolves the current user from the session cookie (also validates expiry + ban). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const hashed = sha256(token);
  const session = await db.session.findUnique({
    where: { token: hashed },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.user.banned) return null;
  return sanitizeUser(session.user);
}

export function sanitizeUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  department: string | null;
  year: string | null;
  bio: string | null;
  verified: boolean;
  provider: string;
  createdAt: Date;
}): SessionUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role as Role) ?? "STUDENT",
    avatarUrl: u.avatarUrl,
    coverUrl: u.coverUrl,
    department: u.department,
    year: u.year,
    bio: u.bio,
    verified: u.verified,
    provider: u.provider,
    createdAt: u.createdAt,
  };
}

/** For the socket service: raw token → user. */
export async function getUserByToken(token: string): Promise<SessionUser | null> {
  if (!token || typeof token !== "string") return null;
  const session = await db.session.findUnique({
    where: { token: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.banned) return null;
  return sanitizeUser(session.user);
}

export function isValidTokenShape(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}
