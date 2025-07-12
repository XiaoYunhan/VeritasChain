/**
 * Hash Module Unit Tests
 * 
 * Tests SHA-256 hashing utilities for deterministic content addressing.
 * 100% coverage required per CLAUDE.md.
 */

import {
  calculateHash,
  calculateEntityHash,
  calculateActionHash,
  calculateEventHash,
  calculateCommitHash,
  calculateTreeHash,
  isValidHash,
  extractHashHex
} from '../../../src/core/hash.js';

describe('Hash Module', () => {
  
  describe('calculateHash', () => {
    test('produces deterministic SHA-256 hashes', () => {
      const obj = { name: "test", value: 123 };
      const hash1 = calculateHash(obj);
      const hash2 = calculateHash(obj);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test('sorts object keys for consistency', () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };
      
      expect(calculateHash(obj1)).toBe(calculateHash(obj2));
    });

    test('produces different hashes for different content', () => {
      const obj1 = { name: "test1" };
      const obj2 = { name: "test2" };
      
      expect(calculateHash(obj1)).not.toBe(calculateHash(obj2));
    });

    test('handles nested objects consistently', () => {
      const obj = { 
        nested: { c: 3, a: 1 },
        simple: "value"
      };
      
      const hash = calculateHash(obj);
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(calculateHash(obj)).toBe(hash);
    });
  });

  describe('calculateEntityHash', () => {
    const baseEntity = {
      '@context': 'https://schema.org/',
      '@type': 'Thing' as const,
      logicalId: 'test-entity-001',
      version: '1.0',
      label: 'Test Entity',
      description: 'A test entity',
      dataType: { custom: 'TestType', description: 'Test type' },
      properties: { prop1: 'value1' }
    };

    test('produces consistent hash for same entity content', () => {
      const hash1 = calculateEntityHash(baseEntity);
      const hash2 = calculateEntityHash(baseEntity);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test('ignores excluded fields (@id, commitHash, previousVersion)', () => {
      const entityWithExtra = {
        ...baseEntity,
        '@id': 'should-be-ignored',
        commitHash: 'also-ignored',
        previousVersion: 'ignored-too'
      } as any;

      expect(calculateEntityHash(baseEntity)).toBe(calculateEntityHash(entityWithExtra));
    });

    test('produces different hash when content changes', () => {
      const modifiedEntity = { ...baseEntity, label: 'Modified Entity' };
      
      expect(calculateEntityHash(baseEntity)).not.toBe(calculateEntityHash(modifiedEntity));
    });
  });

  describe('calculateActionHash', () => {
    const baseAction = {
      '@context': 'https://schema.org/',
      '@type': 'Action' as const,
      logicalId: 'test-action-001',
      version: '1.0',
      label: 'Test Action',
      description: 'A test action',
      category: 'test',
      deonticType: 'shall' as const,
      properties: { actionProp: 'value' }
    };

    test('produces consistent hash for same action content', () => {
      const hash1 = calculateActionHash(baseAction);
      const hash2 = calculateActionHash(baseAction);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test('includes deonticType in hash calculation', () => {
      const actionWithDeontic = { ...baseAction, deonticType: 'may' as const };
      
      expect(calculateActionHash(baseAction)).not.toBe(calculateActionHash(actionWithDeontic));
    });
  });

  describe('calculateEventHash', () => {
    const baseEvent = {
      '@context': 'https://schema.org/',
      '@type': 'Event' as const,
      logicalId: 'test-event-001',
      version: '1.0',
      title: 'Test Event',
      description: 'A test event',
      dateOccurred: '2025-01-15T10:00:00Z',
      dateRecorded: '2025-01-15T10:05:00Z',
      kind: 'fact' as const,
      statement: {
        type: 'SVO' as const,
        subjectRef: 'sha256:subject123',
        verbRef: 'sha256:verb456',
        objectRef: 'sha256:object789'
      },
      modifiers: {
        temporal: { when: 'present' as const }
      },
      metadata: {
        source: { name: 'Test Source', type: 'Academic' as const },
        author: 'test@example.com',
        version: '1.0',
        // These should be excluded from hash:
        confidence: 0.85,
        volatility: 0.1,
        sourceScore: 0.9
      }
    };

    test('produces consistent hash for same event content', () => {
      const hash1 = calculateEventHash(baseEvent);
      const hash2 = calculateEventHash(baseEvent);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test('excludes calculated fields from hash', () => {
      const eventWithCalculatedFields = {
        ...baseEvent,
        metadata: {
          ...baseEvent.metadata,
          confidence: 0.95,  // Different calculated value
          volatility: 0.2,   // Different calculated value
          sourceScore: 0.8   // Different calculated value
        }
      };
      
      // Hash should be same since calculated fields are excluded
      expect(calculateEventHash(baseEvent)).toBe(calculateEventHash(eventWithCalculatedFields));
    });

    test('changes hash when core content changes', () => {
      const modifiedEvent = { ...baseEvent, title: 'Modified Event' };
      
      expect(calculateEventHash(baseEvent)).not.toBe(calculateEventHash(modifiedEvent));
    });
  });

  describe('calculateCommitHash', () => {
    const baseCommit = {
      '@context': 'https://schema.org/',
      '@type': 'Commit' as const,
      timestamp: '2025-01-15T10:00:00Z',
      parents: ['sha256:parent123'],
      tree: 'sha256:tree456',
      author: 'test@example.com',
      message: 'Test commit',
      changes: {
        events: ['sha256:event1'],
        entities: ['sha256:entity1'],
        actions: ['sha256:action1']
      },
      branch: 'main',
      tags: ['v1.0']
    };

    test('produces consistent hash for same commit content', () => {
      const hash1 = calculateCommitHash(baseCommit);
      const hash2 = calculateCommitHash(baseCommit);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test('changes hash when commit content changes', () => {
      const modifiedCommit = { ...baseCommit, message: 'Modified commit' };
      
      expect(calculateCommitHash(baseCommit)).not.toBe(calculateCommitHash(modifiedCommit));
    });
  });

  describe('calculateTreeHash', () => {
    const baseTree = {
      '@context': 'https://schema.org/',
      '@type': 'Tree' as const,
      entries: {
        events: ['sha256:event1'],
        entities: ['sha256:entity1'],
        actions: ['sha256:action1']
      },
      timestamp: '2025-01-15T10:00:00Z'
    };

    test('produces consistent hash for same tree content', () => {
      const hash1 = calculateTreeHash(baseTree);
      const hash2 = calculateTreeHash(baseTree);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });

  describe('isValidHash', () => {
    test('validates correct SHA-256 hash format', () => {
      const validHash = 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(isValidHash(validHash)).toBe(true);
    });

    test('rejects invalid hash formats', () => {
      expect(isValidHash('invalid')).toBe(false);
      expect(isValidHash('sha256:123')).toBe(false); // Too short
      expect(isValidHash('md5:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).toBe(false); // Wrong prefix
      expect(isValidHash('sha256:gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg')).toBe(false); // Invalid hex
    });
  });

  describe('extractHashHex', () => {
    test('extracts hex portion from valid hash', () => {
      const hash = 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const expected = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      expect(extractHashHex(hash)).toBe(expected);
    });

    test('throws error for invalid hash format', () => {
      expect(() => extractHashHex('invalid-hash')).toThrow('Invalid hash format');
    });
  });

  describe('Deterministic Behavior', () => {
    test('same content always produces same hash across multiple runs', () => {
      const testData = {
        complex: {
          array: [1, 2, 3],
          nested: { a: 'value', b: 42 },
          boolean: true
        },
        string: 'test'
      };

      const hashes = Array.from({ length: 10 }, () => calculateHash(testData));
      const uniqueHashes = new Set(hashes);
      
      expect(uniqueHashes.size).toBe(1); // All hashes should be identical
    });
  });
});