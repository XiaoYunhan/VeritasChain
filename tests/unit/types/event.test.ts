/**
 * Unit tests for unified Event type features
 * Tests isComposite, getEventType, calculateDepth, deriveConfidenceFormula, and migrateMacroEvent
 */

import { 
  isComposite, 
  getEventType, 
  calculateDepth, 
  deriveConfidenceFormula, 
  migrateMacroEvent,
  type Event,
  type ComponentRef 
} from '../../../src/types/event.js';

describe('Unified Event Type Features', () => {
  
  // Test data
  const leafEvent: Event = {
    '@context': 'https://schema.org/',
    '@type': 'Event',
    '@id': 'sha256:leaf123',
    logicalId: 'leaf-logical-001',
    version: '1.0',
    commitHash: 'sha256:commit123',
    title: 'Test Leaf Event',
    dateOccurred: '2024-01-15T10:00:00Z',
    dateRecorded: '2024-01-15T10:00:00Z',
    statement: {
      type: 'SVO',
      subjectRef: 'sha256:subject123',
      verbRef: 'sha256:verb123',
      objectRef: 'sha256:object123'
    },
    metadata: {
      source: { name: 'Test', type: 'Academic' },
      author: 'test-author',
      version: '1.0',
      confidence: 0.85
    }
  };

  const compositeEvent: Event = {
    '@context': 'https://schema.org/',
    '@type': 'Event',
    '@id': 'sha256:composite123',
    logicalId: 'composite-logical-001',
    version: '1.0',
    commitHash: 'sha256:commit456',
    title: 'Test Composite Event',
    dateOccurred: '2024-01-15T12:00:00Z',
    dateRecorded: '2024-01-15T12:00:00Z',
    statement: {
      type: 'AND',
      operands: []
    },
    components: [
      { logicalId: 'leaf-logical-001', version: '1.0' },
      { logicalId: 'leaf-logical-002' }
    ],
    aggregation: 'ALL',
    metadata: {
      source: { name: 'Test', type: 'Academic' },
      author: 'test-author',
      version: '1.0',
      confidence: 0.75
    }
  };

  const deepCompositeEvent: Event = {
    '@context': 'https://schema.org/',
    '@type': 'Event',
    '@id': 'sha256:deep123',
    logicalId: 'deep-logical-001',
    version: '1.0',
    commitHash: 'sha256:commit789',
    title: 'Deep Composite Event',
    dateOccurred: '2024-01-15T14:00:00Z',
    dateRecorded: '2024-01-15T14:00:00Z',
    statement: {
      type: 'OR',
      operands: []
    },
    components: [
      { logicalId: 'composite-logical-001', version: '1.0' },
      { logicalId: 'leaf-logical-003', weak: true }
    ],
    aggregation: 'ANY',
    metadata: {
      source: { name: 'Test', type: 'Academic' },
      author: 'test-author',
      version: '1.0',
      confidence: 0.9
    }
  };

  describe('isComposite()', () => {
    test('should return false for leaf events', () => {
      expect(isComposite(leafEvent)).toBe(false);
    });

    test('should return true for events with components', () => {
      expect(isComposite(compositeEvent)).toBe(true);
      expect(isComposite(deepCompositeEvent)).toBe(true);
    });

    test('should return false for events with empty components array', () => {
      const emptyComponentsEvent: Event = {
        ...leafEvent,
        components: []
      };
      expect(isComposite(emptyComponentsEvent)).toBe(false);
    });

    test('should handle undefined components', () => {
      const undefinedComponentsEvent: Event = {
        ...leafEvent,
        components: undefined
      };
      expect(isComposite(undefinedComponentsEvent)).toBe(false);
    });
  });

  describe('getEventType()', () => {
    test('should return "Event" for leaf events', () => {
      expect(getEventType(leafEvent)).toBe('Event');
    });

    test('should return "CompositeEvent" for composite events', () => {
      expect(getEventType(compositeEvent)).toBe('CompositeEvent');
      expect(getEventType(deepCompositeEvent)).toBe('CompositeEvent');
    });
  });

  describe('calculateDepth()', () => {
    // Mock loader function for testing
    const mockLoader = async (logicalId: string, version?: string): Promise<Event | null> => {
      const events: Record<string, Event> = {
        'leaf-logical-001': leafEvent,
        'leaf-logical-002': leafEvent,
        'leaf-logical-003': leafEvent,
        'composite-logical-001': compositeEvent
      };
      return events[logicalId] || null;
    };

    test('should return 0 for leaf events', async () => {
      const depth = await calculateDepth(leafEvent, mockLoader);
      expect(depth).toBe(0);
    });

    test('should return 1 for composite events with only leaf components', async () => {
      const depth = await calculateDepth(compositeEvent, mockLoader);
      expect(depth).toBe(1);
    });

    test('should return 2 for nested composite events', async () => {
      const depth = await calculateDepth(deepCompositeEvent, mockLoader);
      expect(depth).toBe(2);
    });

    test('should handle missing components gracefully', async () => {
      const missingLoader = async (): Promise<Event | null> => null;
      const depth = await calculateDepth(compositeEvent, missingLoader);
      expect(depth).toBe(1); // Still counts as depth 1 even if components not found
    });

    test('should prevent infinite recursion', async () => {
      const circularEvent: Event = {
        ...compositeEvent,
        components: [{ logicalId: 'composite-logical-001' }] // Self-reference
      };
      
      const circularLoader = async (logicalId: string): Promise<Event | null> => {
        if (logicalId === 'composite-logical-001') return circularEvent;
        return null;
      };

      const depth = await calculateDepth(circularEvent, circularLoader);
      expect(depth).toBeGreaterThanOrEqual(0); // Should not hang
    });
  });

  describe('deriveConfidenceFormula()', () => {
    const mockLoader = async (logicalId: string, version?: string): Promise<Event | null> => {
      const events: Record<string, Event> = {
        'leaf-logical-001': { ...leafEvent, metadata: { ...leafEvent.metadata, confidence: 0.8 } },
        'leaf-logical-002': { ...leafEvent, metadata: { ...leafEvent.metadata, confidence: 0.9 } },
        'leaf-logical-003': { ...leafEvent, metadata: { ...leafEvent.metadata, confidence: 0.7 } },
        'composite-logical-001': compositeEvent
      };
      return events[logicalId] || null;
    };

    test('should return confidence value for leaf events', async () => {
      const formula = await deriveConfidenceFormula(leafEvent, mockLoader);
      expect(formula).toBe('0.850');
    });

    test('should return min formula for ALL aggregation', async () => {
      const formula = await deriveConfidenceFormula(compositeEvent, mockLoader);
      expect(formula).toBe('min(0.800, 0.900)');
    });

    test('should return max formula for ANY aggregation', async () => {
      const formula = await deriveConfidenceFormula(deepCompositeEvent, mockLoader);
      // Should ignore weak components
      expect(formula).toBe('max(min(0.800, 0.900))');
    });

    test('should handle ORDERED aggregation', async () => {
      const orderedEvent: Event = {
        ...compositeEvent,
        aggregation: 'ORDERED'
      };
      const formula = await deriveConfidenceFormula(orderedEvent, mockLoader);
      expect(formula).toBe('sequence(0.800 → 0.900)');
    });

    test('should handle CUSTOM aggregation', async () => {
      const customEvent: Event = {
        ...compositeEvent,
        aggregation: 'CUSTOM'
      };
      const formula = await deriveConfidenceFormula(customEvent, mockLoader);
      expect(formula).toBe('custom(0.800, 0.900)');
    });

    test('should exclude weak dependencies', async () => {
      const weakComponents: ComponentRef[] = [
        { logicalId: 'leaf-logical-001' },
        { logicalId: 'leaf-logical-002', weak: true }
      ];
      const eventWithWeak: Event = {
        ...compositeEvent,
        components: weakComponents
      };
      const formula = await deriveConfidenceFormula(eventWithWeak, mockLoader);
      expect(formula).toBe('min(0.800)'); // Only non-weak component
    });

    test('should handle missing components', async () => {
      const missingLoader = async (): Promise<Event | null> => null;
      const formula = await deriveConfidenceFormula(compositeEvent, missingLoader);
      expect(formula).toBe('0.750'); // Falls back to event's own confidence
    });
  });

  describe('migrateMacroEvent()', () => {
    test('should convert MacroEvent @type to Event', () => {
      const oldMacroEvent = {
        '@type': 'MacroEvent',
        '@id': 'sha256:old123',
        logicalId: 'old-macro-001',
        title: 'Old MacroEvent',
        aggregationLogic: 'AND',
        components: ['sha256:comp1', 'sha256:comp2']
      };

      const migrated = migrateMacroEvent(oldMacroEvent);
      
      expect(migrated['@type']).toBe('Event');
      expect(migrated.aggregation).toBe('ALL');
      expect(migrated.components).toEqual([
        { logicalId: 'sha256:comp1', version: undefined },
        { logicalId: 'sha256:comp2', version: undefined }
      ]);
      expect((migrated as any).aggregationLogic).toBeUndefined();
    });

    test('should map aggregationLogic values correctly', () => {
      const testCases = [
        { old: 'AND', new: 'ALL' },
        { old: 'OR', new: 'ANY' },
        { old: 'ORDERED_ALL', new: 'ORDERED' },
        { old: 'CUSTOM', new: 'CUSTOM' },
        { old: 'UNKNOWN', new: 'ALL' } // Default fallback
      ];

      testCases.forEach(({ old, new: expected }) => {
        const oldEvent = {
          '@type': 'MacroEvent',
          aggregationLogic: old,
          components: []
        };
        
        const migrated = migrateMacroEvent(oldEvent);
        expect(migrated.aggregation).toBe(expected);
      });
    });

    test('should handle events already in new format', () => {
      const newEvent = {
        '@type': 'Event',
        aggregation: 'ALL',
        components: [{ logicalId: 'test', version: '1.0' }]
      };

      const migrated = migrateMacroEvent(newEvent);
      expect(migrated).toEqual({
        '@type': 'Event',
        aggregation: 'ALL',
        components: [{ logicalId: 'test', version: '1.0' }]
      });
    });

    test('should preserve all other fields', () => {
      const oldEvent = {
        '@type': 'MacroEvent',
        '@id': 'sha256:preserve123',
        logicalId: 'preserve-001',
        version: '2.0',
        title: 'Preserve Test',
        description: 'Test description',
        aggregationLogic: 'OR',
        components: ['comp1'],
        metadata: { confidence: 0.8 },
        customField: 'should be preserved'
      };

      const migrated = migrateMacroEvent(oldEvent);
      
      expect(migrated['@id']).toBe('sha256:preserve123');
      expect(migrated.logicalId).toBe('preserve-001');
      expect(migrated.version).toBe('2.0');
      expect(migrated.title).toBe('Preserve Test');
      expect(migrated.description).toBe('Test description');
      expect(migrated.metadata).toEqual({ confidence: 0.8 });
      expect((migrated as any).customField).toBe('should be preserved');
    });
  });

  describe('ComponentRef validation', () => {
    test('should handle ComponentRef with all fields', () => {
      const componentRef: ComponentRef = {
        logicalId: 'test-logical-001',
        version: '1.5',
        weak: true
      };

      expect(componentRef.logicalId).toBe('test-logical-001');
      expect(componentRef.version).toBe('1.5');
      expect(componentRef.weak).toBe(true);
    });

    test('should handle ComponentRef with minimal fields', () => {
      const componentRef: ComponentRef = {
        logicalId: 'test-logical-002'
      };

      expect(componentRef.logicalId).toBe('test-logical-002');
      expect(componentRef.version).toBeUndefined();
      expect(componentRef.weak).toBeUndefined();
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle events with null/undefined metadata confidence', async () => {
      const eventWithoutConfidence: Event = {
        ...leafEvent,
        metadata: {
          ...leafEvent.metadata,
          confidence: undefined
        }
      };

      const formula = await deriveConfidenceFormula(eventWithoutConfidence, async () => null);
      expect(formula).toBe('0.000');
    });

    test('should handle deeply nested composite events', async () => {
      const level1: Event = { ...leafEvent, '@id': 'level1' };
      const level2: Event = { 
        ...compositeEvent, 
        '@id': 'level2',
        logicalId: 'level2',
        components: [{ logicalId: 'level1' }] 
      };
      const level3: Event = { 
        ...compositeEvent, 
        '@id': 'level3',
        logicalId: 'level3',
        components: [{ logicalId: 'level2' }] 
      };

      const deepLoader = async (logicalId: string): Promise<Event | null> => {
        const events: Record<string, Event> = { 'level1': level1, 'level2': level2, 'level3': level3 };
        return events[logicalId] || null;
      };

      const depth = await calculateDepth(level3, deepLoader);
      expect(depth).toBe(3);
    });
  });
});