// server/src/utils/encryption.ts
import crypto from 'crypto';

/**
 * Get the encryption key from environment variables
 * The key must be 32 bytes (256 bits) for AES-256
 * If provided as a string, it will be hashed to 32 bytes
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.error("FATAL ERROR: ENCRYPTION_KEY is not defined in .env file.");
    console.error("Generate one using: openssl rand -base64 32");
    process.exit(1);
  }

  // If the key is exactly 32 bytes, use it directly
  // Otherwise, hash it to get a consistent 32-byte key
  if (key.length === 32) {
    return Buffer.from(key, 'utf8');
  }

  // Hash the key to ensure it's exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
};

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES

/**
 * Encrypts a string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all base64 encoded)
 * @throws Error if encryption fails
 */
export const encrypt = (plaintext: string | null | undefined): string | null => {
  // Handle null/undefined/empty strings
  if (!plaintext || plaintext.trim() === '') {
    return null;
  }

  try {
    // Generate a random IV (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:encryptedData (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts a string that was encrypted with encrypt()
 * @param encryptedData - The encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted string or null if input is invalid
 * @throws Error if decryption fails
 */
export const decrypt = (encryptedData: string | null | undefined): string | null => {
  // Handle null/undefined/empty strings
  if (!encryptedData || encryptedData.trim() === '') {
    return null;
  }

  try {
    // Split the encrypted data into components
    const parts = encryptedData.split(':');
    
    // Should have exactly 3 parts: iv, authTag, encryptedData
    if (parts.length !== 3) {
      // If it doesn't have 3 parts, it might be unencrypted (for migration purposes)
      // Try to return as-is, but log a warning
      console.warn('Encrypted data format invalid - might be unencrypted legacy data');
      return encryptedData;
    }

    const [ivBase64, authTagBase64, encrypted] = parts;
    
    // Decode from base64
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // If decryption fails, it might be unencrypted legacy data
    // Try to return as-is for backward compatibility during migration
    console.warn('Decryption failed - returning original value (might be unencrypted legacy data)');
    return encryptedData;
  }
};

/**
 * Check if a string appears to be encrypted (has the expected format)
 * @param data - The string to check
 * @returns true if it appears to be encrypted
 */
export const isEncrypted = (data: string | null | undefined): boolean => {
  if (!data || data.trim() === '') {
    return false;
  }
  
  // Encrypted data should have format: iv:authTag:encryptedData
  const parts = data.split(':');
  return parts.length === 3;
};

