// Phase V1: vetkd encryption for deal notes
// AES-GCM encryption with key derived from vetkd per-user identity

const ENCRYPTED_PREFIX = "enc:v1:";

// Module-level AES key cache: principal hex string → CryptoKey
const aesKeyCache = new Map<string, CryptoKey>();

export function isEncrypted(notes: string): boolean {
  return notes.startsWith(ENCRYPTED_PREFIX);
}

export async function encryptNote(
  aesKey: CryptoKey,
  plaintext: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoded,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return ENCRYPTED_PREFIX + btoa(String.fromCharCode(...combined));
}

export async function decryptNote(
  aesKey: CryptoKey,
  encrypted: string,
): Promise<string> {
  if (!isEncrypted(encrypted)) return encrypted;
  const b64 = encrypted.slice(ENCRYPTED_PREFIX.length);
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

type VetkdActor = {
  vetkdDeriveKey: (k: Uint8Array) => Promise<Uint8Array>;
  vetkdPublicKey: () => Promise<Uint8Array>;
};

export async function getOrDeriveAesKey(
  actor: VetkdActor,
  principalBytes: Uint8Array,
): Promise<CryptoKey> {
  const principalHex = Array.from(principalBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const cached = aesKeyCache.get(principalHex);
  if (cached) return cached;

  // Dynamic import — avoids build issues if package types are incomplete
  const vetkeys = await import("@dfinity/vetkeys");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { TransportSecretKey } = vetkeys as any;

  // 1. Generate a fresh transport keypair
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const transportSecretKey = TransportSecretKey.fromSeed(seed);

  // 2. Fetch encrypted vetKey + verification key from the canister in parallel
  const [encryptedKeyBytes, verificationKeyBytes] = await Promise.all([
    actor.vetkdDeriveKey(transportSecretKey.publicKey()),
    actor.vetkdPublicKey(),
  ]);

  // 3. Deserialise, decrypt, and verify
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { DerivedPublicKey, EncryptedVetKey } = vetkeys as any;

  const verificationKey = DerivedPublicKey.deserialize(
    new Uint8Array(verificationKeyBytes as unknown as number[]),
  );
  const encryptedVetKey = EncryptedVetKey.deserialize(
    new Uint8Array(encryptedKeyBytes as unknown as number[]),
  );
  const vetKey = encryptedVetKey.decryptAndVerify(
    transportSecretKey,
    verificationKey,
    principalBytes,
  );

  // 4. Derive a 256-bit AES-GCM key from the vetKey material
  const aesKeyMaterial = vetKey.toDerivedKeyMaterial();
  const aesKey = await crypto.subtle.importKey(
    "raw",
    aesKeyMaterial.data.slice(0, 32),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  aesKeyCache.set(principalHex, aesKey);
  return aesKey;
}
