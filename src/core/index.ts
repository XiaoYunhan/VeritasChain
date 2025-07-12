/**
 * Core Utilities Export
 * 
 * Central export point for all core functionality:
 * hashing, confidence calculation, pattern observation, signatures
 */

// Hashing utilities
export {
  calculateHash,
  calculateEntityHash,
  calculateActionHash, 
  calculateEventHash,
  calculateCommitHash,
  calculateTreeHash,
  isValidHash,
  extractHashHex
} from './hash.js';

// Confidence calculation
export {
  ConfidenceCalculator,
  confidenceCalculator
} from './confidence.js';

// Pattern observation 
export {
  PatternObserver,
  patternObserver,
  type ObservedPattern,
  type PatternStatistics
} from './patterns.js';

// Cryptographic signatures
export {
  generateKeyPair,
  signContent,
  verifySignature,
  createIdentity,
  isValidPrivateKey,
  isValidPublicKey,
  isValidSignature,
  type KeyPair,
  type Signature
} from './sign.js';