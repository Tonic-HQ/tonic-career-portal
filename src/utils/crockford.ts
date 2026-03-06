/**
 * Crockford Base32 encoding for short, URL-safe portal IDs.
 * Alphabet: 0123456789abcdefghjkmnpqrstvwxyz (no i/l/o/u to avoid confusion)
 * 5 random bytes → 8 chars → ~1 trillion possible IDs
 */

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

// Decode map: handles uppercase, lowercase, and common confusions (I→1, L→1, O→0)
const DECODE_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  DECODE_MAP[ALPHABET[i]] = i;
  DECODE_MAP[ALPHABET[i].toUpperCase()] = i;
}
DECODE_MAP['I'] = 1; DECODE_MAP['i'] = 1;
DECODE_MAP['L'] = 1; DECODE_MAP['l'] = 1;
DECODE_MAP['O'] = 0; DECODE_MAP['o'] = 0;

export function encodeCrockford(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += ALPHABET[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return output;
}

export function decodeCrockford(str: string): Uint8Array {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of str) {
    const decoded = DECODE_MAP[char];
    if (decoded === undefined) continue; // skip invalid chars (hyphens, etc.)
    value = (value << 5) | decoded;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

/** Generate a random 8-char Crockford Base32 ID (5 random bytes = ~1T possibilities) */
export function generatePortalId(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return encodeCrockford(bytes);
}

/** Validate that a string looks like a Crockford Base32 portal ID */
export function isValidPortalId(str: string): boolean {
  return /^[0-9a-hjkmnp-tv-z]{6,12}$/i.test(str);
}
