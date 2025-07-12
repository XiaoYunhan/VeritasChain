/**
 * Core Functionality Tests
 * 
 * Tests for the core utilities: hashing, confidence calculation, patterns
 */

import { calculateHash, isValidHash } from '../src/core/hash.js';
import { confidenceCalculator } from '../src/core/confidence.js';
import { patternObserver } from '../src/core/patterns.js';

describe('Hash Utilities', () => {
  test('should calculate deterministic SHA-256 hashes', () => {
    const data = { test: 'data', number: 42 };
    const hash1 = calculateHash(data);
    const hash2 = calculateHash(data);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(isValidHash(hash1)).toBe(true);
  });
  
  test('should produce different hashes for different data', () => {
    const data1 = { test: 'data1' };
    const data2 = { test: 'data2' };
    
    const hash1 = calculateHash(data1);
    const hash2 = calculateHash(data2);
    
    expect(hash1).not.toBe(hash2);
  });
  
  test('should validate hash format', () => {
    expect(isValidHash('sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')).toBe(true);
    expect(isValidHash('invalid-hash')).toBe(false);
    expect(isValidHash('sha256:invalid')).toBe(false);
  });
});

describe('Confidence Calculator', () => {
  test('should calculate confidence with (1-V) × E × S formula', () => {
    const result = confidenceCalculator.calculate({
      changeHistory: [],
      evidenceType: 'official',
      sourceType: 'Academic'
    });
    
    // No changes = 0 volatility, official = 1.0 evidence, Academic = 1.0 source
    // Expected: (1-0) × 1.0 × 1.0 = 1.0
    expect(result.result).toBe(1.0);
    expect(result.factors.volatility).toBe(0);
    expect(result.factors.evidence).toBe(1.0);
    expect(result.factors.source).toBe(1.0);
  });
  
  test('should handle different source types', () => {
    const academic = confidenceCalculator.calculate({
      changeHistory: [],
      evidenceType: 'reported',
      sourceType: 'Academic'
    });
    
    const social = confidenceCalculator.calculate({
      changeHistory: [],
      evidenceType: 'reported',
      sourceType: 'Social'
    });
    
    expect(academic.result).toBeGreaterThan(social.result);
  });
  
  test('should handle legal hierarchy for norms', () => {
    const constitution = confidenceCalculator.calculate({
      changeHistory: [],
      evidenceType: 'official',
      legalType: 'constitution'
    });
    
    const contract = confidenceCalculator.calculate({
      changeHistory: [],
      evidenceType: 'official',
      legalType: 'contract'
    });
    
    expect(constitution.result).toBeGreaterThan(contract.result);
  });
});

describe('Pattern Observer', () => {
  test('should validate relationship types', () => {
    expect(patternObserver.validateRelationshipType('causes')).toBe(true);
    expect(patternObserver.validateRelationshipType('threatens')).toBe(true);
    expect(patternObserver.validateRelationshipType('amends')).toBe(true); // Legal relationship
    expect(patternObserver.validateRelationshipType('invalid-type')).toBe(false);
  });
  
  test('should observe SVO patterns', () => {
    const svo = {
      type: 'SVO' as const,
      subjectRef: 'sha256:subject123...',
      verbRef: 'sha256:verb456...',
      objectRef: 'sha256:object789...'
    };
    
    patternObserver.observeSVO(svo, 'test-event-id');
    
    const stats = patternObserver.getStatistics();
    expect(stats.totalPatterns).toBeGreaterThan(0);
  });
});