/**
 * Cryptographic Signature Utilities
 *
 * Ed25519 signatures using @noble/ed25519 for blockchain compatibility.
 * Signatures are optional in Phase 1 but structure supports them.
 */
export interface KeyPair {
    privateKey: string;
    publicKey: string;
}
export interface Signature {
    signature: string;
    publicKey: string;
    algorithm: 'ed25519';
    timestamp: string;
}
/**
 * Generate new Ed25519 key pair
 */
export declare function generateKeyPair(): KeyPair;
/**
 * Sign content with private key
 */
export declare function signContent(content: string, privateKeyHex: string): Promise<Signature>;
/**
 * Verify signature against content
 */
export declare function verifySignature(content: string, signature: Signature): Promise<boolean>;
/**
 * Create identity from public key (for future blockchain integration)
 */
export declare function createIdentity(publicKeyHex: string): string;
/**
 * Validate key format
 */
export declare function isValidPrivateKey(key: string): boolean;
export declare function isValidPublicKey(key: string): boolean;
export declare function isValidSignature(sig: string): boolean;
