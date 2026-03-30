// Type declarations for @dfinity/vetkeys
declare module "@dfinity/vetkeys" {
  export class TransportSecretKey {
    static fromBytes(bytes: Uint8Array): TransportSecretKey;
    static random(): TransportSecretKey;
    publicKeyBytes(): Uint8Array;
  }

  // biome-ignore lint/complexity/noStaticOnlyClass: external library type stub
  export class DerivedPublicKey {
    static fromBytes(bytes: Uint8Array): DerivedPublicKey;
    static deserialize(bytes: Uint8Array): DerivedPublicKey;
  }

  export class EncryptedVetKey {
    static fromBytes(bytes: Uint8Array): EncryptedVetKey;
    // biome-ignore lint/complexity/noStaticOnlyClass: external library type stub
    static deserialize(bytes: Uint8Array): EncryptedVetKey;
    decryptAndVerify(
      transportSecretKey: TransportSecretKey,
      verificationKey: DerivedPublicKey,
      derivationId: Uint8Array,
    ): VetKey;
  }

  export interface VetKey {
    asDerivedKeyMaterial(): Promise<DerivedKeyMaterial>;
  }

  export interface DerivedKeyMaterial {
    getCryptoKey(): CryptoKey;
  }
}
