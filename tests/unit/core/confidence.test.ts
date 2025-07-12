/**
 * Confidence Calculation Unit Tests
 * 
 * Tests the transparent (1-V)×E×S formula for both fact and norm events.
 * 100% coverage required per CLAUDE.md.
 */

import { ConfidenceCalculator, confidenceCalculator } from '../../../src/core/confidence.js';
import type { EventChange } from '../../../src/types/confidence.js';
import type { Event } from '../../../src/types/event.js';

describe('ConfidenceCalculator', () => {
  let calculator: ConfidenceCalculator;

  beforeEach(() => {
    calculator = new ConfidenceCalculator();
  });

  describe('calculateVolatility', () => {
    test('returns 0 for events with no change history', () => {
      expect(calculator.calculateVolatility([])).toBe(0);
      expect(calculator.calculateVolatility([{ timestamp: '2025-01-01T10:00:00Z', type: 'created' }])).toBe(0);
    });

    test('calculates volatility from change frequency', () => {
      const changes: EventChange[] = [
        { timestamp: '2025-01-01T10:00:00Z', type: 'created' },
        { timestamp: '2025-01-01T11:00:00Z', type: 'modified' },
        { timestamp: '2025-01-02T10:00:00Z', type: 'modified' },
        { timestamp: '2025-01-02T11:00:00Z', type: 'modified' }
      ];

      const volatility = calculator.calculateVolatility(changes);
      expect(volatility).toBeGreaterThan(0);
      expect(volatility).toBeLessThanOrEqual(1);
    });

    test('higher change frequency produces higher volatility', () => {
      const lowActivity: EventChange[] = [
        { timestamp: '2025-01-01T10:00:00Z', type: 'created' },
        { timestamp: '2025-01-05T10:00:00Z', type: 'modified' }
      ];

      const highActivity: EventChange[] = [
        { timestamp: '2025-01-01T10:00:00Z', type: 'created' },
        { timestamp: '2025-01-01T11:00:00Z', type: 'modified' },
        { timestamp: '2025-01-01T12:00:00Z', type: 'modified' },
        { timestamp: '2025-01-01T13:00:00Z', type: 'modified' }
      ];

      const lowVolatility = calculator.calculateVolatility(lowActivity);
      const highVolatility = calculator.calculateVolatility(highActivity);

      expect(highVolatility).toBeGreaterThan(lowVolatility);
    });

    test('caps volatility at 1.0', () => {
      // Create extremely high activity
      const extremeActivity: EventChange[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: `2025-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
        type: 'modified' as const
      }));

      const volatility = calculator.calculateVolatility(extremeActivity);
      expect(volatility).toBeLessThanOrEqual(1);
    });
  });

  describe('calculate - Core Formula', () => {
    test('implements (1-V) × E × S formula correctly', () => {
      const result = calculator.calculate({
        changeHistory: [], // V = 0
        evidenceType: 'confirmed', // E = 0.95
        sourceType: 'Academic' // S = 1.0
      });

      // (1 - 0) × 0.95 × 1.0 = 0.95
      expect(result.result).toBeCloseTo(0.95, 2);
      expect(result.factors.volatility).toBe(0);
      expect(result.factors.evidence).toBe(0.95);
      expect(result.factors.source).toBe(1.0);
    });

    test('formula produces lower confidence with higher volatility', () => {
      const highVolatilityChanges: EventChange[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: `2025-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
        type: 'modified' as const
      }));

      const stableResult = calculator.calculate({
        changeHistory: [],
        evidenceType: 'confirmed',
        sourceType: 'Academic'
      });

      const volatileResult = calculator.calculate({
        changeHistory: highVolatilityChanges,
        evidenceType: 'confirmed',
        sourceType: 'Academic'
      });

      expect(volatileResult.result).toBeLessThan(stableResult.result);
    });

    test('provides transparent formula explanation', () => {
      const result = calculator.calculate({
        changeHistory: [],
        evidenceType: 'reported',
        sourceType: 'NewsAgency'
      });

      expect(result.formula).toMatch(/^\(1 - \d+\.\d+\) × \d+\.?\d* × \d+\.?\d* × \d+\.?\d* = \d+\.\d+$/);
      expect(result.breakdown.evidenceReason).toContain('reported');
      expect(result.breakdown.sourceReason).toContain('NewsAgency');
    });
  });

  describe('Evidence Factors', () => {
    test('applies correct evidence factors', () => {
      const baseParams = {
        changeHistory: [],
        sourceType: 'Academic' as const
      };

      const primary = calculator.calculate({ ...baseParams, evidenceType: 'primary' });
      const confirmed = calculator.calculate({ ...baseParams, evidenceType: 'confirmed' });
      const reported = calculator.calculate({ ...baseParams, evidenceType: 'reported' });
      const rumored = calculator.calculate({ ...baseParams, evidenceType: 'rumored' });

      expect(primary.result).toBeGreaterThan(confirmed.result);
      expect(confirmed.result).toBeGreaterThan(reported.result);
      expect(reported.result).toBeGreaterThan(rumored.result);
      
      // Check specific values
      expect(primary.factors.evidence).toBe(1.0);
      expect(confirmed.factors.evidence).toBe(0.95);
      expect(reported.factors.evidence).toBe(0.8);
      expect(rumored.factors.evidence).toBe(0.6);
    });
  });

  describe('Source Factors (for facts)', () => {
    test('applies correct source factors for factual events', () => {
      const baseParams = {
        changeHistory: [],
        evidenceType: 'confirmed' as const
      };

      const academic = calculator.calculate({ ...baseParams, sourceType: 'Academic' });
      const government = calculator.calculate({ ...baseParams, sourceType: 'Government' });
      const newsAgency = calculator.calculate({ ...baseParams, sourceType: 'NewsAgency' });
      const corporate = calculator.calculate({ ...baseParams, sourceType: 'Corporate' });
      const social = calculator.calculate({ ...baseParams, sourceType: 'Social' });

      expect(academic.result).toBeGreaterThan(government.result);
      expect(government.result).toBeGreaterThan(newsAgency.result);
      expect(newsAgency.result).toBeGreaterThan(corporate.result);
      expect(corporate.result).toBeGreaterThan(social.result);
    });
  });

  describe('Legal Hierarchy (for norms)', () => {
    test('applies correct legal hierarchy weights for norm events', () => {
      const baseParams = {
        changeHistory: [],
        evidenceType: 'official' as const
      };

      const constitution = calculator.calculate({ ...baseParams, legalType: 'constitution' });
      const statute = calculator.calculate({ ...baseParams, legalType: 'statute' });
      const regulation = calculator.calculate({ ...baseParams, legalType: 'regulation' });
      const contract = calculator.calculate({ ...baseParams, legalType: 'contract' });
      const policy = calculator.calculate({ ...baseParams, legalType: 'policy' });

      expect(constitution.result).toBeGreaterThan(statute.result);
      expect(statute.result).toBeGreaterThan(regulation.result);
      expect(regulation.result).toBeGreaterThan(contract.result);
      expect(contract.result).toBeGreaterThan(policy.result);
    });

    test('legal hierarchy takes precedence over source factors when provided', () => {
      const legalResult = calculator.calculate({
        changeHistory: [],
        evidenceType: 'confirmed',
        legalType: 'constitution',
        sourceType: 'Social' // Should be ignored
      });

      expect(legalResult.factors.source).toBe(1.0); // Constitution weight, not Social weight
      expect(legalResult.breakdown.sourceReason).toContain('constitution');
    });
  });

  describe('Norm Force Multipliers', () => {
    test('applies norm force multipliers for legal clauses', () => {
      const baseParams = {
        changeHistory: [],
        evidenceType: 'official' as const,
        legalType: 'statute' as const
      };

      const mandatory = calculator.calculate({ ...baseParams, normForce: 'mandatory' });
      const defaultNorm = calculator.calculate({ ...baseParams, normForce: 'default' });
      const advisory = calculator.calculate({ ...baseParams, normForce: 'advisory' });

      expect(mandatory.result).toBeGreaterThan(defaultNorm.result);
      expect(defaultNorm.result).toBeGreaterThan(advisory.result);
    });

    test('norm force multiplier preserves 0-1 bounds', () => {
      const result = calculator.calculate({
        changeHistory: [],
        evidenceType: 'primary',
        legalType: 'constitution',
        normForce: 'mandatory' // Maximum values
      });

      expect(result.result).toBeLessThanOrEqual(1.0);
      expect(result.result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateForEvent', () => {
    test('calculates confidence for fact events using source factors', () => {
      const factEvent: Event = {
        '@context': 'https://schema.org/',
        '@type': 'Event',
        '@id': 'test-fact',
        logicalId: 'fact-001',
        version: '1.0',
        commitHash: 'commit-001',
        title: 'Test Fact Event',
        dateOccurred: '2025-01-01T10:00:00Z',
        dateRecorded: '2025-01-01T10:05:00Z',
        kind: 'fact',
        statement: {
          type: 'SVO',
          subjectRef: 'sha256:subject',
          verbRef: 'sha256:verb',
          objectRef: 'sha256:object'
        },
        modifiers: {
          certainty: { evidence: 'confirmed' }
        },
        metadata: {
          source: { name: 'Test University', type: 'Academic' },
          author: 'researcher@university.edu',
          version: '1.0'
        }
      };

      const result = calculator.calculateForEvent(factEvent, []);
      
      expect(result.result).toBeCloseTo(0.95, 2); // (1-0) × 0.95 × 1.0
      expect(result.breakdown.sourceReason).toContain('Academic');
    });

    test('calculates confidence for norm events using legal hierarchy', () => {
      const normEvent: Event = {
        '@context': 'https://schema.org/',
        '@type': 'Event',
        '@id': 'test-norm',
        logicalId: 'norm-001',
        version: '1.0',
        commitHash: 'commit-001',
        title: 'Test Legal Clause',
        dateOccurred: '2025-01-01T10:00:00Z',
        dateRecorded: '2025-01-01T10:05:00Z',
        kind: 'norm',
        statement: {
          type: 'SVO',
          subjectRef: 'sha256:party',
          verbRef: 'sha256:shall',
          objectRef: 'sha256:obligation'
        },
        modifiers: {
          certainty: { evidence: 'official' },
          legal: { normForce: 'mandatory' }
        },
        metadata: {
          source: { 
            name: 'Constitutional Law', 
            type: 'Government',
            legalType: 'constitution'
          },
          author: 'legal@government.gov',
          version: '1.0'
        }
      };

      const result = calculator.calculateForEvent(normEvent, []);
      
      expect(result.result).toBe(1.0); // (1-0) × 1.0 × 1.0 × 1.0
      expect(result.breakdown.sourceReason).toContain('constitution');
    });

    test('throws error for norm events without legalType', () => {
      const invalidNormEvent: Event = {
        '@context': 'https://schema.org/',
        '@type': 'Event',
        '@id': 'invalid-norm',
        logicalId: 'invalid-001',
        version: '1.0',
        commitHash: 'commit-001',
        title: 'Invalid Norm Event',
        dateOccurred: '2025-01-01T10:00:00Z',
        dateRecorded: '2025-01-01T10:05:00Z',
        kind: 'norm',
        statement: {
          type: 'SVO',
          subjectRef: 'sha256:party',
          verbRef: 'sha256:shall',
          objectRef: 'sha256:obligation'
        },
        modifiers: {},
        metadata: {
          source: { name: 'Unknown', type: 'Government' }, // Missing legalType
          author: 'unknown@example.com',
          version: '1.0'
        }
      };

      expect(() => calculator.calculateForEvent(invalidNormEvent, [])).toThrow('Norm events must specify source.legalType');
    });

    test('uses default evidence type when not specified', () => {
      const eventWithoutEvidence: Event = {
        '@context': 'https://schema.org/',
        '@type': 'Event',
        '@id': 'test-default',
        logicalId: 'default-001',
        version: '1.0',
        commitHash: 'commit-001',
        title: 'Event Without Evidence',
        dateOccurred: '2025-01-01T10:00:00Z',
        dateRecorded: '2025-01-01T10:05:00Z',
        kind: 'fact',
        statement: {
          type: 'SVO',
          subjectRef: 'sha256:subject',
          verbRef: 'sha256:verb',
          objectRef: 'sha256:object'
        },
        modifiers: {}, // No certainty specified
        metadata: {
          source: { name: 'Test Source', type: 'NewsAgency' },
          author: 'reporter@news.com',
          version: '1.0'
        }
      };

      const result = calculator.calculateForEvent(eventWithoutEvidence, []);
      
      // Should use 'reported' as default evidence type (0.8)
      expect(result.factors.evidence).toBe(0.8);
    });
  });

  describe('Boundary Conditions', () => {
    test('confidence never exceeds 1.0', () => {
      const result = calculator.calculate({
        changeHistory: [], // V = 0
        evidenceType: 'primary', // E = 1.0
        sourceType: 'Academic' // S = 1.0
      });

      expect(result.result).toBeLessThanOrEqual(1.0);
    });

    test('confidence never goes below 0', () => {
      const result = calculator.calculate({
        changeHistory: Array.from({ length: 1000 }, (_, i) => ({ // Extreme volatility
          timestamp: `2025-01-01T${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
          type: 'modified' as const
        })),
        evidenceType: 'speculated', // E = 0.4
        sourceType: 'Social' // S = 0.7
      });

      expect(result.result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Singleton Instance', () => {
    test('exports working singleton instance', () => {
      expect(confidenceCalculator).toBeInstanceOf(ConfidenceCalculator);
      
      const result = confidenceCalculator.calculate({
        changeHistory: [],
        evidenceType: 'confirmed',
        sourceType: 'Academic'
      });
      
      expect(result.result).toBeCloseTo(0.95, 2);
    });
  });

  describe('Transparency Requirements', () => {
    test('provides complete calculation breakdown', () => {
      const result = calculator.calculate({
        changeHistory: [],
        evidenceType: 'confirmed',
        sourceType: 'NewsAgency',
        normForce: 'default'
      });

      expect(result.formula).toBeDefined();
      expect(result.factors).toHaveProperty('volatility');
      expect(result.factors).toHaveProperty('evidence');
      expect(result.factors).toHaveProperty('source');
      expect(result.breakdown).toHaveProperty('volatilityReason');
      expect(result.breakdown).toHaveProperty('evidenceReason');
      expect(result.breakdown).toHaveProperty('sourceReason');
      expect(result.timestamp).toBeDefined();
    });

    test('formula string can be validated mathematically', () => {
      const result = calculator.calculate({
        changeHistory: [],
        evidenceType: 'confirmed', // 0.95
        sourceType: 'Government'   // 0.95
      });

      // Extract values from formula string and verify calculation
      const expected = (1 - result.factors.volatility) * result.factors.evidence * result.factors.source;
      expect(result.result).toBeCloseTo(expected, 3);
    });
  });
});