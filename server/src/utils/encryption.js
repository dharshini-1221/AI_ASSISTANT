
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

const getEncryptionKey = () => {
  const key = process.env.DATA_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "DATA_ENCRYPTION_KEY is missing from environment variables"
    );
  }

  const keyBuffer = Buffer.from(key, "hex");

  if (keyBuffer.length !== 32) {
    throw new Error(
      "DATA_ENCRYPTION_KEY must be a 32-byte hexadecimal key"
    );
  }

  return keyBuffer;
};

const encrypt = (value) => {
  if (value === null || value === undefined || value === "") {
    return value;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "enc",
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
};

const decrypt = (value) => {
  if (value === null || value === undefined || value === "") {
    return value;
  }

  // Preserve legacy plaintext records during migration
  if (!value.startsWith("enc:")) {
    return value;
  }

  const parts = value.split(":");

  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format");
  }

  const [, ivHex, authTagHex, encryptedHex] = parts;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

module.exports = {
  encrypt,
  decrypt,
};
