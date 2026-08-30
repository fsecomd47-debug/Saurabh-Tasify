import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";

const KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/**
 * Hash a password with scrypt (node:crypto — no native deps).
 * Format: scrypt$N$r$p$salt$hash  (params embedded for future upgrades)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(
    Buffer.from(password.normalize("NFKC"), "utf8"),
    salt,
    KEYLEN,
    { N: SCRYPT_PARAMS.N, r: SCRYPT_PARAMS.r, p: SCRYPT_PARAMS.p, maxmem: SCRYPT_PARAMS.maxmem }
  );
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [, N, r, p, salt, hash] = parts;
    const derived = scryptSync(
      Buffer.from(password.normalize("NFKC"), "utf8"),
      salt,
      Buffer.from(hash, "hex").length,
      { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT_PARAMS.maxmem }
    );
    const expected = Buffer.from(hash, "hex");
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Opaque token: raw value returned once for the client; only its SHA-256 is stored. */
export function generateToken(bytes = 32): { token: string; tokenHash: string } {
  const token = randomBytes(bytes).toString("base64url");
  return { token, tokenHash: sha256(token) };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
