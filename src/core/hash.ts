/**
 * Cryptographic Hashing Utilities
 * 
 * SHA-256 content addressing using @noble/hashes for blockchain compatibility.
 * All content is deterministically hashed for integrity verification.
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Calculate SHA-256 hash of any serializable content
 * Returns format: "sha256:64-character-hex"
 */
export function calculateHash(content: unknown): string {
  // Deterministic JSON serialization (sorted keys)
  const serialized = JSON.stringify(content, Object.keys(content as Record<string, unknown>).sort());
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);
  const hashBytes = sha256(data);
  const hashHex = bytesToHex(hashBytes);
  return `sha256:${hashHex}`;
}

/**
 * Calculate hash specifically for EntityObject content
 * Excludes @id, version metadata to hash only essential content
 */
export function calculateEntityHash(entity: Omit<import('../types/entity.js').EntityObject, '@id' | 'commitHash' | 'previousVersion'>): string {
  const contentForHashing = {
    '@context': entity['@context'],
    '@type': entity['@type'], 
    logicalId: entity.logicalId,
    version: entity.version,
    label: entity.label,
    description: entity.description,
    dataType: entity.dataType,
    properties: entity.properties
  };
  
  return calculateHash(contentForHashing);
}

/**
 * Calculate hash specifically for ActionObject content
 */
export function calculateActionHash(action: Omit<import('../types/entity.js').ActionObject, '@id' | 'commitHash' | 'previousVersion'>): string {
  const contentForHashing = {
    '@context': action['@context'],
    '@type': action['@type'],
    logicalId: action.logicalId,
    version: action.version,
    label: action.label,
    description: action.description,
    category: action.category,
    deonticType: action.deonticType,
    properties: action.properties
  };
  
  return calculateHash(contentForHashing);
}

/**
 * Calculate hash specifically for Event content
 * Excludes calculated fields (confidence, volatility, etc.)
 */
export function calculateEventHash(event: Omit<import('../types/event.js').Event, '@id' | 'commitHash' | 'previousVersion'>): string {
  // Remove calculated fields from metadata
  const { confidence, volatility, sourceScore, legalHierarchyWeight, ...cleanMetadata } = event.metadata;
  
  const contentForHashing = {
    '@context': event['@context'],
    '@type': event['@type'],
    logicalId: event.logicalId,
    version: event.version,
    title: event.title,
    description: event.description,
    dateOccurred: event.dateOccurred,
    dateRecorded: event.dateRecorded,
    dateModified: event.dateModified,
    kind: event.kind,
    statement: event.statement,
    modifiers: event.modifiers,
    relationships: event.relationships,
    metadata: cleanMetadata
  };
  
  return calculateHash(contentForHashing);
}

/**
 * Calculate hash for Commit content
 */
export function calculateCommitHash(commit: Omit<import('../types/commit.js').Commit, '@id'>): string {
  const contentForHashing = {
    '@context': commit['@context'],
    '@type': commit['@type'],
    timestamp: commit.timestamp,
    parents: commit.parents,
    tree: commit.tree,
    author: commit.author,
    message: commit.message,
    changes: commit.changes,
    signature: commit.signature,
    nonce: commit.nonce,
    branch: commit.branch,
    tags: commit.tags
  };
  
  return calculateHash(contentForHashing);
}

/**
 * Calculate hash for Tree content
 */
export function calculateTreeHash(tree: Omit<import('../types/commit.js').Tree, '@id'>): string {
  const contentForHashing = {
    '@context': tree['@context'],
    '@type': tree['@type'],
    entries: tree.entries,
    timestamp: tree.timestamp,
    parentTree: tree.parentTree
  };
  
  return calculateHash(contentForHashing);
}

/**
 * Validate hash format
 */
export function isValidHash(hash: string): boolean {
  return /^sha256:[a-f0-9]{64}$/.test(hash);
}

/**
 * Extract hex portion from hash
 */
export function extractHashHex(hash: string): string {
  if (!isValidHash(hash)) {
    throw new Error(`Invalid hash format: ${hash}`);
  }
  return hash.slice(7); // Remove "sha256:" prefix
}