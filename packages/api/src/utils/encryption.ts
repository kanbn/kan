import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = process.env.BETTER_AUTH_SECRET;

if (!SECRET_KEY) {
  throw new Error("Encryption key is missing. Set BETTER_AUTH_SECRET.");
}

// Ensure the key is exactly 32 bytes
const key = crypto.createHash("sha256").update(String(SECRET_KEY)).digest();

export const encryptToken = (text: string) => {
  const iv = crypto.randomBytes(12); // 12 bytes is the recommended IV size for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // buffer concat is faster/cleaner for raw binary manipulation
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine IV + AuthTag + EncryptedData into one buffer
  // This saves space compared to storing them as separate hex strings
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // Return as URL-safe Base64 (ideal for cookies)
  return combined.toString("base64url");
};

export const decryptToken = (text: string) => {
  // Convert URL-safe Base64 back to a Buffer
  const combined = Buffer.from(text, "base64url");

  // Extract the parts based on fixed lengths
  // IV is 12 bytes (standard for GCM)
  // AuthTag is 16 bytes (standard for GCM)
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const encryptedText = combined.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // If the cookie was tampered with, this will throw an error
  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};
