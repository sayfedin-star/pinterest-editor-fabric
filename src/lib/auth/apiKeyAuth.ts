import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// Configuration
const KEY_PREFIX = 'pingen_';
const KEY_LENGTH_BYTES = 32; // 32 bytes = 64 hex chars

export interface GeneratedApiKey {
    key: string;       // The full key to show the user ONCE (e.g. pingen_abc123...)
    hash: string;      // The hash to store in the DB
    prefix: string;    // The first 10 chars of the key for display/identification
}

/**
 * Generates a new cryptographically secure API key
 */
export function generateApiKey(): GeneratedApiKey {
    // Generate random bytes
    const buffer = randomBytes(KEY_LENGTH_BYTES);
    const randomHexString = buffer.toString('hex');
    
    // Combine with prefix
    const key = `${KEY_PREFIX}${randomHexString}`;
    
    // Generate hash
    const hash = hashApiKey(key);
    
    // Extract prefix (e.g. "pingen_abc")
    const prefix = key.substring(0, 10);

    return { key, hash, prefix };
}

/**
 * Hashes an API key using SHA-256
 * We use SHA-256 because API keys are high-entropy random strings, 
 * making them resistant to rainbow table attacks without slow salt/hashing schemes like bcrypt.
 * This allows for faster API authentication verification.
 */
export function hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

/**
 * Verifies an API key against a stored hash using timing-safe comparison
 */
export function verifyApiKey(inputKey: string, storedHash: string): boolean {
    const inputHash = hashApiKey(inputKey);
    const inputBuffer = Buffer.from(inputHash);
    const storedBuffer = Buffer.from(storedHash);

    // Ensure buffers are same length before comparing
    if (inputBuffer.length !== storedBuffer.length) {
        return false;
    }

    return timingSafeEqual(inputBuffer, storedBuffer);
}
