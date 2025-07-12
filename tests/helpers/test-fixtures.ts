/**
 * Test Fixtures and Helpers
 * 
 * Provides consistent test data and utilities for all test suites.
 */

import type { EntityObject, ActionObject } from '../../src/types/entity.js';
import type { Event } from '../../src/types/event.js';
import type { EventChange } from '../../src/types/confidence.js';
import { calculateHash } from '../../src/core/hash.js';

// Standard test commit hash for predictable testing
export const TEST_COMMIT_HASH = 'sha256:test-commit-001-predictable-hash-for-testing-purposes-only-00000';

// Predictable entity fixtures
export const createTestEntity = (overrides: Partial<EntityObject> = {}): EntityObject => {
  const base: Omit<EntityObject, '@id'> = {
    '@context': 'https://schema.org/',
    '@type': 'Thing',
    logicalId: 'test-entity-001',
    version: '1.0',
    commitHash: TEST_COMMIT_HASH,
    label: 'Test Entity',
    description: 'A test entity for unit tests',
    dataType: { custom: 'TestType', description: 'Test entity type' },
    properties: undefined,
    previousVersion: undefined,
    ...overrides
  };
  
  const hash = calculateHash(base);
  return { ...base, '@id': hash };
};

export const createTestAction = (overrides: Partial<ActionObject> = {}): ActionObject => {
  const base: Omit<ActionObject, '@id'> = {
    '@context': 'https://schema.org/',
    '@type': 'Action',
    logicalId: 'test-action-001',
    version: '1.0',
    commitHash: TEST_COMMIT_HASH,
    label: 'test action',
    description: 'A test action for unit tests',
    category: 'test',
    deonticType: undefined,
    properties: undefined,
    previousVersion: undefined,
    ...overrides
  };
  
  const hash = calculateHash(base);
  return { ...base, '@id': hash };
};

export const createTestEvent = (
  subjectEntity: EntityObject,
  action: ActionObject,
  objectEntity: EntityObject,
  overrides: Partial<Event> = {}
): Event => {
  const base: Omit<Event, '@id'> = {
    '@context': 'https://schema.org/',
    '@type': 'Event',
    logicalId: 'test-event-001',
    version: '1.0',
    commitHash: TEST_COMMIT_HASH,
    title: 'Test Event',
    description: 'A test event for unit tests',
    dateOccurred: '2025-01-15T10:00:00Z',
    dateRecorded: '2025-01-15T10:05:00Z',
    kind: 'fact',
    statement: {
      type: 'SVO',
      subjectRef: subjectEntity['@id'],
      verbRef: action['@id'],
      objectRef: objectEntity['@id']
    },
    modifiers: {
      temporal: { when: 'present', tense: 'is testing' },
      certainty: { evidence: 'confirmed' }
    },
    metadata: {
      source: { name: 'Test Source', type: 'Academic' },
      author: 'test@example.com',
      version: '1.0'
    },
    previousVersion: undefined,
    ...overrides
  };
  
  const hash = calculateHash(base);
  return { ...base, '@id': hash };
};

// Specific domain fixtures
export const NEWS_ENTITIES = {
  jpmorgan: createTestEntity({
    logicalId: 'jpmorgan-entity',
    label: 'JPMorgan Chase & Co.',
    description: 'American multinational investment bank',
    dataType: { custom: 'Corporation', description: 'Financial corporation' }
  }),
  
  fintechs: createTestEntity({
    logicalId: 'fintechs-entity', 
    label: 'Financial Technology Companies',
    description: 'Technology companies providing financial services',
    dataType: { custom: 'Industry', description: 'Industry sector' }
  }),
  
  mit: createTestEntity({
    logicalId: 'mit-entity',
    label: 'MIT',
    description: 'Massachusetts Institute of Technology', 
    dataType: { custom: 'Institution', description: 'Educational institution' }
  })
};

export const NEWS_ACTIONS = {
  charges: createTestAction({
    logicalId: 'charges-action',
    label: 'charges',
    description: 'To impose a fee or cost',
    category: 'financial'
  }),
  
  announces: createTestAction({
    logicalId: 'announces-action',
    label: 'announces', 
    description: 'To make a public declaration',
    category: 'communication'
  }),
  
  discovers: createTestAction({
    logicalId: 'discovers-action',
    label: 'discovers',
    description: 'To find or learn something new',
    category: 'research'
  })
};

// Legal fixtures
export const LEGAL_ENTITIES = {
  singapore: createTestEntity({
    logicalId: 'singapore-gov',
    label: 'Singapore Government',
    description: 'Government of Singapore',
    dataType: { custom: 'Government', description: 'National government' }
  }),
  
  employee: createTestEntity({
    logicalId: 'employee-entity',
    label: 'Employee',
    description: 'Working individual',
    dataType: { custom: 'Person', description: 'Individual person' }
  })
};

export const LEGAL_ACTIONS = {
  shall: createTestAction({
    logicalId: 'shall-action',
    label: 'shall',
    description: 'Legal obligation',
    category: 'legal',
    deonticType: 'shall'
  }),
  
  may: createTestAction({
    logicalId: 'may-action',
    label: 'may',
    description: 'Legal permission',
    category: 'legal', 
    deonticType: 'may'
  })
};

// Change history fixtures for volatility testing
export const createChangeHistory = (changeCount: number, daysSpread: number = 1): EventChange[] => {
  const changes: EventChange[] = [];
  const startDate = new Date('2025-01-01T10:00:00Z');
  
  for (let i = 0; i < changeCount; i++) {
    const dayOffset = Math.floor((i / changeCount) * daysSpread);
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(10 + (i % 8)); // Spread across hours
    
    changes.push({
      timestamp: date.toISOString(),
      type: i === 0 ? 'created' : 'modified'
    });
  }
  
  return changes;
};

// Pattern fixtures for pattern observer tests
export const PATTERN_FIXTURES = {
  svo: {
    type: 'SVO' as const,
    subjectRef: 'sha256:pattern-subject',
    verbRef: 'sha256:pattern-verb', 
    objectRef: 'sha256:pattern-object'
  },
  
  relationship: {
    type: 'causes' as const,
    target: 'sha256:pattern-target',
    strength: 0.8,
    description: 'Pattern test relationship'
  }
};

// Complex event fixtures for testing logical operators
export const createLogicalEvent = (logicalType: 'AND' | 'OR' | 'IMPLIES' | 'NOT'): Event => {
  const entity = createTestEntity({ logicalId: 'logic-entity' });
  const action = createTestAction({ logicalId: 'logic-action' });
  
  return createTestEvent(entity, action, entity, {
    logicalId: `logic-${logicalType.toLowerCase()}-event`,
    title: `Test ${logicalType} Logic Event`,
    statement: {
      type: logicalType,
      operands: [
        {
          type: 'SVO',
          subjectRef: entity['@id'],
          verbRef: action['@id'],
          objectRef: entity['@id']
        },
        {
          type: 'SVO', 
          subjectRef: entity['@id'],
          verbRef: action['@id'],
          objectRef: entity['@id']
        }
      ]
    }
  });
};

// Test data validation helpers
export const validateTestEntity = (entity: EntityObject): boolean => {
  return (
    entity['@id'].startsWith('sha256:') &&
    entity['@context'] === 'https://schema.org/' &&
    entity['@type'] === 'Thing' &&
    typeof entity.logicalId === 'string' &&
    typeof entity.label === 'string'
  );
};

export const validateTestAction = (action: ActionObject): boolean => {
  return (
    action['@id'].startsWith('sha256:') &&
    action['@context'] === 'https://schema.org/' &&
    action['@type'] === 'Action' &&
    typeof action.logicalId === 'string' &&
    typeof action.label === 'string'
  );
};

export const validateTestEvent = (event: Event): boolean => {
  return (
    event['@id'].startsWith('sha256:') &&
    event['@context'] === 'https://schema.org/' &&
    event['@type'] === 'Event' &&
    typeof event.logicalId === 'string' &&
    typeof event.title === 'string' &&
    ['fact', 'norm'].includes(event.kind || 'fact')
  );
};

// Predictable hash testing
export const EXPECTED_HASHES = {
  // These hashes are deterministic based on the fixture content
  testEntity: calculateHash(createTestEntity()),
  testAction: calculateHash(createTestAction()),
  jpmorgan: calculateHash(NEWS_ENTITIES.jpmorgan),
  chargesAction: calculateHash(NEWS_ACTIONS.charges)
};

// Mock storage adapter for unit tests
export class MockStorageAdapter {
  private entities = new Map<string, EntityObject>();
  private actions = new Map<string, ActionObject>();
  private events = new Map<string, Event>();
  
  async initialize(): Promise<void> {
    // Mock initialization
  }
  
  async close(): Promise<void> {
    // Mock cleanup
  }
  
  entities = {
    store: async (hash: string, entity: EntityObject): Promise<void> => {
      this.entities.set(hash, entity);
    },
    
    retrieve: async (hash: string): Promise<EntityObject | null> => {
      return this.entities.get(hash) || null;
    },
    
    list: async (): Promise<string[]> => {
      return Array.from(this.entities.keys());
    }
  };
  
  actions = {
    store: async (hash: string, action: ActionObject): Promise<void> => {
      this.actions.set(hash, action);
    },
    
    retrieve: async (hash: string): Promise<ActionObject | null> => {
      return this.actions.get(hash) || null;
    },
    
    list: async (): Promise<string[]> => {
      return Array.from(this.actions.keys());
    }
  };
  
  events = {
    store: async (hash: string, event: Event): Promise<void> => {
      this.events.set(hash, event);
    },
    
    retrieve: async (hash: string): Promise<Event | null> => {
      return this.events.get(hash) || null;
    },
    
    list: async (): Promise<string[]> => {
      return Array.from(this.events.keys());
    }
  };
}

// Jest custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidHash(): R;
      toBeValidEntity(): R;
      toBeValidAction(): R;
      toBeValidEvent(): R;
    }
  }
}

export const customMatchers = {
  toBeValidHash(received: string) {
    const pass = /^sha256:[a-f0-9]{64}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid SHA-256 hash`,
      pass
    };
  },
  
  toBeValidEntity(received: EntityObject) {
    const pass = validateTestEntity(received);
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid entity`,
      pass
    };
  },
  
  toBeValidAction(received: ActionObject) {
    const pass = validateTestAction(received);
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid action`,
      pass
    };
  },
  
  toBeValidEvent(received: Event) {
    const pass = validateTestEvent(received);
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid event`,
      pass
    };
  }
};