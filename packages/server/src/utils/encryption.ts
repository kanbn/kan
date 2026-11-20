import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// Resolved on use, not import, so code that only loads this module (OpenAPI
// generation, tests) doesn't need the secret.
const getKey = () => {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    throw new Error("Encryption key is missing. Set BETTER_AUTH_SECRET.");
  return crypto.createHash("sha256").update(secret).digest();
};

export const encryptToken = (text: string) => {
  const iv = crypto.randomBytes(12); // 12 bytes is the recommended IV size for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString("base64url");
};

export const decryptToken = (text: string) => {
  const combined = Buffer.from(text, "base64url");

  // IV is 12 bytes and the auth tag 16, both standard for GCM.
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const encryptedText = combined.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  // If the cookie was tampered with, this will throw an error
  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};
