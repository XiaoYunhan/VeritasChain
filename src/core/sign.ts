/**
 * Cryptographic Signature Utilities
 * 
 * Ed25519 signatures using @noble/ed25519 for blockchain compatibility.
 * Signatures are optional in Phase 1 but structure supports them.
 */

import { sign, verify, getPublicKey } from '@noble/ed25519';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export interface KeyPair {
  privateKey: string;  // Hex string
  publicKey: string;   // Hex string
}

export interface Signature {
  signature: string;   // Hex string
  publicKey: string;   // Hex string
  algorithm: 'ed25519';
  timestamp: string;   // ISO 8601
}

/**
 * Generate new Ed25519 key pair
 */
export function generateKeyPair(): KeyPair {
  // Generate random 32-byte private key
  const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const privateKey = bytesToHex(privateKeyBytes);
  
  // Derive public key
  const publicKeyBytes = getPublicKey(privateKeyBytes);
  const publicKey = bytesToHex(publicKeyBytes);
  
  return { privateKey, publicKey };
}

/**
 * Sign content with private key
 */
export async function signContent(content: string, privateKeyHex: string): Promise<Signature> {
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);
  const privateKeyBytes = hexToBytes(privateKeyHex);
  
  const signatureBytes = await sign(contentBytes, privateKeyBytes);
  const publicKeyBytes = getPublicKey(privateKeyBytes);
  
  return {
    signature: bytesToHex(signatureBytes),
    publicKey: bytesToHex(publicKeyBytes),
    algorithm: 'ed25519',
    timestamp: new Date().toISOString()
  };
}

/**
 * Verify signature against content
 */
export async function verifySignature(content: string, signature: Signature): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    const signatureBytes = hexToBytes(signature.signature);
    const publicKeyBytes = hexToBytes(signature.publicKey);
    
    return await verify(signatureBytes, contentBytes, publicKeyBytes);
  } catch (error) {
    console.warn('Signature verification failed:', error);
    return false;
  }
}

/**
 * Create identity from public key (for future blockchain integration)
 */
export function createIdentity(publicKeyHex: string): string {
  // In blockchain, this would be the wallet address
  // For now, just return the public key with prefix
  return `veritaschain:${publicKeyHex}`;
}

/**
 * Validate key format
 */
export function isValidPrivateKey(key: string): boolean {
  return /^[a-f0-9]{64}$/i.test(key);
}

export function isValidPublicKey(key: string): boolean {
  return /^[a-f0-9]{64}$/i.test(key);
}

export function isValidSignature(sig: string): boolean {
  return /^[a-f0-9]{128}$/i.test(sig);
}