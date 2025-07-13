/**
 * Cryptographic Hashing Utilities
 *
 * SHA-256 content addressing using @noble/hashes for blockchain compatibility.
 * All content is deterministically hashed for integrity verification.
 */
/**
 * Calculate SHA-256 hash of any serializable content
 * Returns format: "sha256:64-character-hex"
 */
export declare function calculateHash(content: unknown): string;
/**
 * Calculate hash specifically for EntityObject content
 * Excludes @id, version metadata to hash only essential content
 */
export declare function calculateEntityHash(entity: Omit<import('../types/entity.js').EntityObject, '@id' | 'commitHash' | 'previousVersion'>): string;
/**
 * Calculate hash specifically for ActionObject content
 */
export declare function calculateActionHash(action: Omit<import('../types/entity.js').ActionObject, '@id' | 'commitHash' | 'previousVersion'>): string;
/**
 * Calculate hash specifically for Event content
 * Excludes calculated fields (confidence, volatility, etc.)
 */
export declare function calculateEventHash(event: Omit<import('../types/event.js').Event, '@id' | 'commitHash' | 'previousVersion'>): string;
/**
 * Calculate hash for Commit content
 */
export declare function calculateCommitHash(commit: Omit<import('../types/commit.js').Commit, '@id'>): string;
/**
 * Calculate hash for MacroEvent content (Phase 2)
 */
export declare function calculateMacroEventHash(macro: Omit<import('../types/event.js').MacroEvent, '@id' | 'commitHash' | 'previousVersion'>): string;
/**
 * Calculate hash for Tree content
 */
export declare function calculateTreeHash(tree: Omit<import('../types/commit.js').Tree, '@id'>): string;
/**
 * Validate hash format
 */
export declare function isValidHash(hash: string): boolean;
/**
 * Extract hex portion from hash
 */
export declare function extractHashHex(hash: string): string;
