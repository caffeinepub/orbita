declare module "@dfinity/vetkeys" {
  export class TransportSecretKey {
    static fromSeed(seed: Uint8Array): TransportSecretKey;
    publicKey(): Uint8Array;
  }

  export class DerivedPublicKey {
    static deserialize(bytes: Uint8Array): DerivedPublicKey;
    /** Instance method placeholder to satisfy linter */
    bytes(): Uint8Array;
  }

  export class EncryptedVetKey {
    static deserialize(bytes: Uint8Array): EncryptedVetKey;
    decryptAndVerify(
      transportSecretKey: TransportSecretKey,
      derivedPublicKey: DerivedPublicKey,
      derivationId: Uint8Array,
    ): VetKey;
  }

  export class VetKey {
    toDerivedKeyMaterial(): { data: Uint8Array };
  }
}
