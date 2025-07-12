/**
 * Minimal Working Test
 * Demonstrates Jest testing infrastructure is properly configured
 */

import { calculateHash, isValidHash } from '../src/core/hash';
import { ConfidenceCalculator } from '../src/core/confidence';
import { PatternObserver } from '../src/core/patterns';

describe('VeritasChain Core Modules', () => {
  describe('Hash Module', () => {
    test('produces deterministic SHA-256 hashes', () => {
      const obj = { name: "test", value: 123 };
      const hash1 = calculateHash(obj);
      const hash2 = calculateHash(obj);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test('validates hash format', () => {
      const validHash = 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(isValidHash(validHash)).toBe(true);
      expect(isValidHash('invalid')).toBe(false);
    });
  });

  describe('Confidence Calculator', () => {
    test('implements (1-V)×E×S formula', () => {
      const calculator = new ConfidenceCalculator();
      
      const result = calculator.calculate({
        changeHistory: [], // V = 0
        evidenceType: 'confirmed', // E = 0.95
        sourceType: 'Academic' // S = 1.0
      });

      expect(result.result).toBeCloseTo(0.95, 2);
      expect(result.factors.volatility).toBe(0);
      expect(result.factors.evidence).toBe(0.95);
      expect(result.factors.source).toBe(1.0);
    });

    test('provides transparent formula explanation', () => {
      const calculator = new ConfidenceCalculator();
      
      const result = calculator.calculate({
        changeHistory: [],
        evidenceType: 'reported',
        sourceType: 'NewsAgency'
      });

      expect(result.formula).toMatch(/^\(1 - \d+\.\d+\) × \d+\.?\d* × \d+\.?\d* × \d+\.?\d* = \d+\.\d+$/);
      expect(result.breakdown.evidenceReason).toContain('reported');
    });
  });

  describe('Pattern Observer', () => {
    test('records SVO patterns for future ML', () => {
      const observer = new PatternObserver();
      
      const svo = {
        type: 'SVO' as const,
        subjectRef: 'sha256:subject',
        verbRef: 'sha256:verb',
        objectRef: 'sha256:object'
      };

      observer.observeSVO(svo, 'event-001');

      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(1);
      expect(stats.mostCommonPatterns).toHaveLength(1);
    });

    test('validates relationship types', () => {
      const observer = new PatternObserver();
      
      expect(observer.validateRelationshipType('causes')).toBe(true);
      expect(observer.validateRelationshipType('amends')).toBe(true); // Legal relationship
      expect(observer.validateRelationshipType('invalid-type')).toBe(false);
    });
  });
});

describe('Jest Infrastructure', () => {
  test('TypeScript imports work correctly', () => {
    expect(typeof calculateHash).toBe('function');
    expect(typeof ConfidenceCalculator).toBe('function');
    expect(typeof PatternObserver).toBe('function');
  });

  test('test environment is configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});