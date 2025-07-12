/**
 * Pattern Observer Unit Tests
 * 
 * Tests pattern recording for future ML-based type inference (Phase 2).
 * 100% coverage required per CLAUDE.md.
 */

import { PatternObserver, patternObserver } from '../../../src/core/patterns.js';
import type { SVO } from '../../../src/types/statement.js';
import type { EventRelationship } from '../../../src/types/event.js';

describe('PatternObserver', () => {
  let observer: PatternObserver;

  beforeEach(() => {
    observer = new PatternObserver();
  });

  describe('observeSVO', () => {
    test('records SVO patterns correctly', () => {
      const svo: SVO = {
        type: 'SVO',
        subjectRef: 'sha256:apple-company',
        verbRef: 'sha256:acquires-action',
        objectRef: 'sha256:startup-entity'
      };

      observer.observeSVO(svo, 'event-001');

      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(1);
      expect(stats.mostCommonPatterns[0].pattern).toContain('company-action-entity');
      expect(stats.mostCommonPatterns[0].count).toBe(1);
      expect(stats.mostCommonPatterns[0].examples).toContain('event-001');
    });

    test('increments count for repeated patterns', () => {
      const svo: SVO = {
        type: 'SVO',
        subjectRef: 'sha256:company-ref',
        verbRef: 'sha256:reports-verb',
        objectRef: 'sha256:earnings-obj'
      };

      observer.observeSVO(svo, 'event-001');
      observer.observeSVO(svo, 'event-002');
      observer.observeSVO(svo, 'event-003');

      const stats = observer.getStatistics();
      expect(stats.mostCommonPatterns[0].count).toBe(3);
      expect(stats.mostCommonPatterns[0].examples).toHaveLength(3);
    });

    test('does not duplicate example IDs', () => {
      const svo: SVO = {
        type: 'SVO',
        subjectRef: 'sha256:same-subject',
        verbRef: 'sha256:same-verb',
        objectRef: 'sha256:same-object'
      };

      observer.observeSVO(svo, 'event-001');
      observer.observeSVO(svo, 'event-001'); // Same event ID
      observer.observeSVO(svo, 'event-001'); // Same event ID

      const stats = observer.getStatistics();
      expect(stats.mostCommonPatterns[0].count).toBe(3);
      expect(stats.mostCommonPatterns[0].examples).toHaveLength(1); // Only one unique ID
      expect(stats.mostCommonPatterns[0].examples[0]).toBe('event-001');
    });
  });

  describe('observeRelationship', () => {
    test('records relationship patterns', () => {
      const relationship: EventRelationship = {
        type: 'causes',
        target: 'sha256:target-event',
        strength: 0.9
      };

      observer.observeRelationship(relationship, 'source-event-001');

      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(1);
      expect(stats.mostCommonPatterns[0].pattern).toBe('causes:0.9');
    });

    test('groups relationships by type and strength', () => {
      const causesStrong: EventRelationship = {
        type: 'causes',
        target: 'sha256:target1',
        strength: 0.9
      };

      const causesWeak: EventRelationship = {
        type: 'causes',
        target: 'sha256:target2',
        strength: 0.3
      };

      const threatens: EventRelationship = {
        type: 'threatens',
        target: 'sha256:target3',
        strength: 0.8
      };

      observer.observeRelationship(causesStrong, 'event-001');
      observer.observeRelationship(causesWeak, 'event-002');
      observer.observeRelationship(threatens, 'event-003');

      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(3);
      
      const patterns = stats.mostCommonPatterns.map(p => p.pattern);
      expect(patterns).toContain('causes:0.9');
      expect(patterns).toContain('causes:0.3');
      expect(patterns).toContain('threatens:0.8');
    });

    test('handles relationships without strength', () => {
      const relationship: EventRelationship = {
        type: 'relatedTo',
        target: 'sha256:target-event'
        // No strength property
      };

      observer.observeRelationship(relationship, 'source-event');

      const stats = observer.getStatistics();
      expect(stats.mostCommonPatterns[0].pattern).toBe('relatedTo:undefined');
    });
  });

  describe('observeEntityType', () => {
    test('records entity type patterns', () => {
      observer.observeEntityType('sha256:entity-ref', 'Corporation', 'context-event-001');

      const stats = observer.getStatistics();
      expect(stats.mostCommonPatterns[0].pattern).toBe('entity:Corporation');
      expect(stats.mostCommonPatterns[0].examples).toContain('context-event-001');
    });

    test('ignores undefined entity types', () => {
      observer.observeEntityType('sha256:entity-ref', undefined, 'context-event');

      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(0);
    });

    test('tracks multiple entity types', () => {
      observer.observeEntityType('sha256:entity1', 'Corporation', 'event-001');
      observer.observeEntityType('sha256:entity2', 'Person', 'event-002');
      observer.observeEntityType('sha256:entity3', 'Corporation', 'event-003');

      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(2);
      
      const corporationPattern = stats.mostCommonPatterns.find(p => p.pattern === 'entity:Corporation');
      expect(corporationPattern?.count).toBe(2);
    });
  });

  describe('observeActionCategory', () => {
    test('records action category patterns', () => {
      observer.observeActionCategory('sha256:action-ref', 'financial', 'context-event-001');

      const stats = observer.getStatistics();
      expect(stats.mostCommonPatterns[0].pattern).toBe('action:financial');
    });

    test('ignores undefined action categories', () => {
      observer.observeActionCategory('sha256:action-ref', undefined, 'context-event');

      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(0);
    });

    test('tracks category frequency', () => {
      observer.observeActionCategory('sha256:action1', 'financial', 'event-001');
      observer.observeActionCategory('sha256:action2', 'legal', 'event-002');
      observer.observeActionCategory('sha256:action3', 'financial', 'event-003');
      observer.observeActionCategory('sha256:action4', 'communication', 'event-004');

      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(3);
      
      const sortedPatterns = stats.mostCommonPatterns;
      expect(sortedPatterns[0].pattern).toBe('action:financial');
      expect(sortedPatterns[0].count).toBe(2);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      // Add some test patterns
      observer.observeSVO({
        type: 'SVO',
        subjectRef: 'sha256:company1',
        verbRef: 'sha256:acquires',
        objectRef: 'sha256:startup1'
      }, 'event-001');

      observer.observeRelationship({
        type: 'causes',
        target: 'sha256:target',
        strength: 0.8
      }, 'event-002');

      observer.observeEntityType('sha256:entity', 'Corporation', 'event-003');
    });

    test('returns correct total pattern count', () => {
      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(3);
    });

    test('sorts patterns by count (most common first)', () => {
      // Add more instances of one pattern
      observer.observeEntityType('sha256:entity2', 'Corporation', 'event-004');
      observer.observeEntityType('sha256:entity3', 'Corporation', 'event-005');

      const stats = observer.getStatistics();
      expect(stats.mostCommonPatterns[0].pattern).toBe('entity:Corporation');
      expect(stats.mostCommonPatterns[0].count).toBe(3);
    });

    test('sorts patterns by recency', () => {
      // Add a new pattern (should be most recent)
      observer.observeActionCategory('sha256:new-action', 'recent-category', 'event-new');

      const stats = observer.getStatistics();
      expect(stats.recentPatterns[0].pattern).toBe('action:recent-category');
    });

    test('limits results to top 10', () => {
      // Add many patterns
      for (let i = 0; i < 15; i++) {
        observer.observeEntityType(`sha256:entity${i}`, `Type${i}`, `event-${i}`);
      }

      const stats = observer.getStatistics();
      expect(stats.mostCommonPatterns.length).toBeLessThanOrEqual(10);
      expect(stats.recentPatterns.length).toBeLessThanOrEqual(10);
    });

    test('calculates pattern growth', () => {
      const stats = observer.getStatistics();
      expect(stats.patternGrowth).toBeDefined();
      expect(stats.patternGrowth.length).toBeGreaterThan(0);
      expect(stats.patternGrowth[0]).toHaveProperty('date');
      expect(stats.patternGrowth[0]).toHaveProperty('newPatterns');
    });
  });

  describe('exportPatterns', () => {
    test('exports all pattern categories', () => {
      observer.observeSVO({
        type: 'SVO',
        subjectRef: 'sha256:subj',
        verbRef: 'sha256:verb',
        objectRef: 'sha256:obj'
      }, 'event-001');

      observer.observeRelationship({
        type: 'causes',
        target: 'sha256:target'
      }, 'event-002');

      observer.observeEntityType('sha256:entity', 'Corporation', 'event-003');
      observer.observeActionCategory('sha256:action', 'financial', 'event-004');

      const exported = observer.exportPatterns();
      
      expect(exported).toHaveProperty('svo');
      expect(exported).toHaveProperty('relationships');
      expect(exported).toHaveProperty('entityTypes');
      expect(exported).toHaveProperty('actionCategories');
      
      expect(Object.keys(exported.svo)).toHaveLength(1);
      expect(Object.keys(exported.relationships)).toHaveLength(1);
      expect(Object.keys(exported.entityTypes)).toHaveLength(1);
      expect(Object.keys(exported.actionCategories)).toHaveLength(1);
    });

    test('exported patterns contain all required fields', () => {
      observer.observeSVO({
        type: 'SVO',
        subjectRef: 'sha256:test-subj',
        verbRef: 'sha256:test-verb',
        objectRef: 'sha256:test-obj'
      }, 'test-event');

      const exported = observer.exportPatterns();
      const svoPattern = Object.values(exported.svo)[0];

      expect(svoPattern).toHaveProperty('pattern');
      expect(svoPattern).toHaveProperty('count');
      expect(svoPattern).toHaveProperty('firstSeen');
      expect(svoPattern).toHaveProperty('lastSeen');
      expect(svoPattern).toHaveProperty('examples');
      
      expect(typeof svoPattern.firstSeen).toBe('string');
      expect(typeof svoPattern.lastSeen).toBe('string');
      expect(Array.isArray(svoPattern.examples)).toBe(true);
    });
  });

  describe('validateRelationshipType', () => {
    test('validates known relationship types', () => {
      expect(observer.validateRelationshipType('causes')).toBe(true);
      expect(observer.validateRelationshipType('enables')).toBe(true);
      expect(observer.validateRelationshipType('contradicts')).toBe(true);
      expect(observer.validateRelationshipType('amends')).toBe(true); // Legal relationship
      expect(observer.validateRelationshipType('supersedes')).toBe(true); // Legal relationship
    });

    test('rejects invalid relationship types', () => {
      expect(observer.validateRelationshipType('invalid-type')).toBe(false);
      expect(observer.validateRelationshipType('')).toBe(false);
      expect(observer.validateRelationshipType('random-string')).toBe(false);
    });

    test('includes all required relationship types from CLAUDE.md', () => {
      const requiredTypes = [
        // Causal relationships
        'causedBy', 'causes', 'enables', 'prevents', 'threatens',
        // Informational relationships
        'derivedFrom', 'supports', 'contradicts', 'updates', 'corrects',
        // Contextual relationships
        'relatedTo', 'partOf', 'contains', 'precedes', 'follows',
        // Legal relationships (Phase 1)
        'amends', 'supersedes', 'refersTo', 'dependentOn'
      ];

      requiredTypes.forEach(type => {
        expect(observer.validateRelationshipType(type)).toBe(true);
      });
    });
  });

  describe('Pattern Timestamps', () => {
    test('records firstSeen and lastSeen timestamps', () => {
      const svo: SVO = {
        type: 'SVO',
        subjectRef: 'sha256:time-test',
        verbRef: 'sha256:time-verb',
        objectRef: 'sha256:time-obj'
      };

      const beforeTime = new Date().toISOString();
      observer.observeSVO(svo, 'time-event-1');
      const afterTime = new Date().toISOString();

      const stats = observer.getStatistics();
      const pattern = stats.mostCommonPatterns[0];
      
      expect(pattern.firstSeen).toBeGreaterThanOrEqual(beforeTime);
      expect(pattern.firstSeen).toBeLessThanOrEqual(afterTime);
      expect(pattern.lastSeen).toBe(pattern.firstSeen); // First observation
    });

    test('updates lastSeen on repeated observations', () => {
      const svo: SVO = {
        type: 'SVO',
        subjectRef: 'sha256:update-test',
        verbRef: 'sha256:update-verb',
        objectRef: 'sha256:update-obj'
      };

      observer.observeSVO(svo, 'update-event-1');
      const firstStats = observer.getStatistics();
      const firstLastSeen = firstStats.mostCommonPatterns[0].lastSeen;

      // Wait a bit and observe again
      setTimeout(() => {
        observer.observeSVO(svo, 'update-event-2');
        const secondStats = observer.getStatistics();
        const secondLastSeen = secondStats.mostCommonPatterns[0].lastSeen;
        
        expect(secondLastSeen).toBeGreaterThan(firstLastSeen);
      }, 10);
    });
  });

  describe('Singleton Instance', () => {
    test('exports working singleton instance', () => {
      expect(patternObserver).toBeInstanceOf(PatternObserver);
      
      patternObserver.observeSVO({
        type: 'SVO',
        subjectRef: 'sha256:singleton-test',
        verbRef: 'sha256:singleton-verb',
        objectRef: 'sha256:singleton-obj'
      }, 'singleton-event');

      const stats = patternObserver.getStatistics();
      expect(stats.totalPatterns).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty pattern maps gracefully', () => {
      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(0);
      expect(stats.mostCommonPatterns).toHaveLength(0);
      expect(stats.recentPatterns).toHaveLength(0);
      expect(stats.patternGrowth).toBeDefined();
    });

    test('handles patterns with special characters', () => {
      observer.observeEntityType('sha256:special-entity', 'Type/With-Special:Characters', 'event-special');
      
      const stats = observer.getStatistics();
      expect(stats.mostCommonPatterns[0].pattern).toBe('entity:Type/With-Special:Characters');
    });

    test('extractLabel handles short references', () => {
      const svo: SVO = {
        type: 'SVO',
        subjectRef: 'short',  // Less than 8 characters
        verbRef: 'sha256:verb',
        objectRef: 'sha256:obj'
      };

      observer.observeSVO(svo, 'short-ref-event');
      
      const stats = observer.getStatistics();
      expect(stats.totalPatterns).toBe(1); // Should still work
    });
  });
});