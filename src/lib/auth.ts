import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export async function signJwt(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifyJwt(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export async function getAuth(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export function generateLoanNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
  return "LN-" + year + "-" + random;
}
