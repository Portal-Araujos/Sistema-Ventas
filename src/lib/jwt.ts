export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  const encodedSecret = secret ? new TextEncoder().encode(secret) : null;
  if (!encodedSecret || encodedSecret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 bytes.");
  }
  return encodedSecret;
}
