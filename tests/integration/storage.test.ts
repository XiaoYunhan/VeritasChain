/**
 * Storage Integration Tests
 * 
 * Converts storage-integration.js to proper Jest tests.
 * Tests real file system operations with .git-events/ directory.
 */

import { LocalStorageAdapter } from '../../src/adapters/local.js';
import { EntityRepository } from '../../src/repository/entity.js';
import { EventRepository } from '../../src/repository/event.js';
import { calculateHash } from '../../src/core/hash.js';
import { rmSync, existsSync } from 'fs';
import type { EntityObject, ActionObject } from '../../src/types/entity.js';
import type { Event } from '../../src/types/event.js';

describe('Storage Integration', () => {
  let storage: LocalStorageAdapter;
  let entityRepo: EntityRepository;
  let eventRepo: EventRepository;
  const testDataDir = '.git-events-test';

  beforeAll(async () => {
    // Clean up any existing test directory
    try {
      rmSync(testDataDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, that's fine
    }

    // Initialize storage with test directory
    const storageConfig = {
      type: 'local' as const,
      local: {
        dataDirectory: testDataDir
      }
    };
    
    storage = new LocalStorageAdapter(storageConfig);
    await storage.initialize();
    
    entityRepo = new EntityRepository(storage);
    eventRepo = new EventRepository(storage);
  });

  afterAll(async () => {
    if (storage) {
      await storage.close();
    }
    
    // Clean up test directory
    try {
      rmSync(testDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Directory Structure', () => {
    test('creates proper .git-events directory structure', async () => {
      expect(existsSync(testDataDir)).toBe(true);
      expect(existsSync(`${testDataDir}/objects`)).toBe(true);
      expect(existsSync(`${testDataDir}/objects/entities`)).toBe(true);
      expect(existsSync(`${testDataDir}/objects/actions`)).toBe(true);
      expect(existsSync(`${testDataDir}/objects/events`)).toBe(true);
      expect(existsSync(`${testDataDir}/refs`)).toBe(true);
    });
  });

  describe('Entity Storage', () => {
    const testEntities = [
      {
        logicalId: 'jpmorgan-entity',
        label: 'JPMorgan Chase & Co.',
        description: 'American multinational investment bank',
        dataType: { custom: 'Corporation', description: 'Financial corporation' }
      },
      {
        logicalId: 'fintechs-entity',
        label: 'Financial Technology Companies',
        description: 'Technology companies providing financial services',
        dataType: { custom: 'Industry', description: 'Industry sector' }
      },
      {
        logicalId: 'mit-entity',
        label: 'MIT',
        description: 'Massachusetts Institute of Technology',
        dataType: { custom: 'Institution', description: 'Educational institution' }
      }
    ];

    test('stores and retrieves entities with consistent hashes', async () => {
      const createdEntities: EntityObject[] = [];

      for (const entityData of testEntities) {
        // Create predictable entity object
        const entity: Omit<EntityObject, '@id' | 'commitHash' | 'previousVersion'> = {
          '@context': 'https://schema.org/',
          '@type': 'Thing',
          logicalId: entityData.logicalId,
          version: '1.0',
          label: entityData.label,
          description: entityData.description,
          dataType: entityData.dataType,
          properties: undefined
        };

        const expectedHash = calculateHash(entity);
        
        // Store entity
        const storedEntity: EntityObject = {
          ...entity,
          '@id': expectedHash,
          commitHash: 'test-commit-001',
          previousVersion: undefined
        };

        await storage.entities.store(expectedHash, storedEntity);
        createdEntities.push(storedEntity);

        // Verify storage
        const retrieved = await storage.entities.retrieve(expectedHash);
        expect(retrieved).toEqual(storedEntity);
        expect(retrieved?.['@id']).toBe(expectedHash);
      }

      expect(createdEntities).toHaveLength(testEntities.length);
    });

    test('handles entity retrieval errors gracefully', async () => {
      const nonExistentHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
      const result = await storage.entities.retrieve(nonExistentHash);
      expect(result).toBeNull();
    });
  });

  describe('Action Storage', () => {
    const testActions = [
      {
        logicalId: 'charges-action',
        label: 'charges',
        description: 'To impose a fee or cost',
        category: 'financial'
      },
      {
        logicalId: 'announces-action',
        label: 'announces',
        description: 'To make a public declaration',
        category: 'communication'
      },
      {
        logicalId: 'discovers-action',
        label: 'discovers',
        description: 'To find or learn something new',
        category: 'research'
      }
    ];

    test('stores and retrieves actions with consistent hashes', async () => {
      const createdActions: ActionObject[] = [];

      for (const actionData of testActions) {
        const action: Omit<ActionObject, '@id' | 'commitHash' | 'previousVersion'> = {
          '@context': 'https://schema.org/',
          '@type': 'Action',
          logicalId: actionData.logicalId,
          version: '1.0',
          label: actionData.label,
          description: actionData.description,
          category: actionData.category,
          deonticType: undefined,
          properties: undefined
        };

        const expectedHash = calculateHash(action);
        
        const storedAction: ActionObject = {
          ...action,
          '@id': expectedHash,
          commitHash: 'test-commit-001',
          previousVersion: undefined
        };

        await storage.actions.store(expectedHash, storedAction);
        createdActions.push(storedAction);

        // Verify storage
        const retrieved = await storage.actions.retrieve(expectedHash);
        expect(retrieved).toEqual(storedAction);
        expect(retrieved?.category).toBe(actionData.category);
      }

      expect(createdActions).toHaveLength(testActions.length);
    });
  });

  describe('Event Storage', () => {
    let testEntity: EntityObject;
    let testAction: ActionObject;

    beforeAll(async () => {
      // Create dependencies first
      testEntity = {
        '@context': 'https://schema.org/',
        '@type': 'Thing',
        '@id': 'sha256:test-entity-hash',
        logicalId: 'test-entity',
        version: '1.0',
        commitHash: 'test-commit',
        label: 'Test Entity',
        description: 'Test entity for event tests',
        dataType: { custom: 'TestType' },
        properties: undefined
      };

      testAction = {
        '@context': 'https://schema.org/',
        '@type': 'Action',
        '@id': 'sha256:test-action-hash',
        logicalId: 'test-action',
        version: '1.0',
        commitHash: 'test-commit',
        label: 'Test Action',
        description: 'Test action for event tests',
        category: 'test',
        deonticType: undefined,
        properties: undefined
      };

      await storage.entities.store(testEntity['@id'], testEntity);
      await storage.actions.store(testAction['@id'], testAction);
    });

    test('stores and retrieves events with full structure', async () => {
      const event: Omit<Event, '@id' | 'commitHash'> = {
        '@context': 'https://schema.org/',
        '@type': 'Event',
        logicalId: 'test-event-001',
        version: '1.0',
        title: 'Test Storage Event',
        description: 'An event to test storage functionality',
        dateOccurred: '2025-01-15T10:00:00Z',
        dateRecorded: '2025-01-15T10:05:00Z',
        kind: 'fact',
        statement: {
          type: 'SVO',
          subjectRef: testEntity['@id'],
          verbRef: testAction['@id'],
          objectRef: testEntity['@id']
        },
        modifiers: {
          temporal: { when: 'present', tense: 'is testing' },
          certainty: { evidence: 'confirmed' }
        },
        relationships: [{
          type: 'relatedTo',
          target: 'sha256:related-event',
          strength: 0.8,
          description: 'Test relationship'
        }],
        metadata: {
          source: { name: 'Test Source', type: 'Academic' },
          author: 'test@example.com',
          version: '1.0',
          // Calculated fields (should be excluded from hash)
          confidence: 0.9,
          volatility: 0.1,
          sourceScore: 1.0
        }
      };

      const expectedHash = calculateHash(event);
      const storedEvent: Event = {
        ...event,
        '@id': expectedHash,
        commitHash: 'test-commit-001'
      };

      await storage.events.store(expectedHash, storedEvent);

      // Verify storage and retrieval
      const retrieved = await storage.events.retrieve(expectedHash);
      expect(retrieved).toEqual(storedEvent);
      expect(retrieved?.statement.type).toBe('SVO');
      expect(retrieved?.statement.subjectRef).toBe(testEntity['@id']);
      expect(retrieved?.statement.verbRef).toBe(testAction['@id']);
      expect(retrieved?.relationships).toHaveLength(1);
      expect(retrieved?.relationships?.[0].type).toBe('relatedTo');
    });

    test('stores legal norm events correctly', async () => {
      const normEvent: Omit<Event, '@id' | 'commitHash'> = {
        '@context': 'https://schema.org/',
        '@type': 'Event',
        logicalId: 'legal-norm-001',
        version: '1.0',
        title: 'Test Legal Clause',
        dateOccurred: '2025-01-01T00:00:00Z',
        dateRecorded: '2025-01-15T10:00:00Z',
        kind: 'norm',
        statement: {
          type: 'SVO',
          subjectRef: testEntity['@id'],
          verbRef: testAction['@id'],
          objectRef: testEntity['@id']
        },
        modifiers: {
          legal: {
            jurisdiction: 'US',
            effectiveDate: '2025-01-01T00:00:00Z',
            normForce: 'mandatory'
          },
          certainty: { evidence: 'official' }
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

      const expectedHash = calculateHash(normEvent);
      const storedEvent: Event = {
        ...normEvent,
        '@id': expectedHash,
        commitHash: 'test-commit-002'
      };

      await storage.events.store(expectedHash, storedEvent);

      const retrieved = await storage.events.retrieve(expectedHash);
      expect(retrieved?.kind).toBe('norm');
      expect(retrieved?.modifiers.legal?.jurisdiction).toBe('US');
      expect(retrieved?.modifiers.legal?.normForce).toBe('mandatory');
      expect(retrieved?.metadata.source.legalType).toBe('constitution');
    });
  });

  describe('Repository Integration', () => {
    test('EntityRepository works with storage adapter', async () => {
      const entityData = {
        logicalId: 'repo-test-entity',
        label: 'Repository Test Entity',
        description: 'Entity created through repository',
        dataType: { custom: 'TestType' }
      };

      const entity = await entityRepo.createEntity(entityData, 'test-commit-repo');
      
      expect(entity['@id']).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(entity.logicalId).toBe(entityData.logicalId);
      expect(entity.commitHash).toBe('test-commit-repo');

      // Verify it's actually stored
      const retrieved = await storage.entities.retrieve(entity['@id']);
      expect(retrieved).toEqual(entity);
    });

    test('EventRepository works with storage adapter', async () => {
      // Create dependencies first
      const entity = await entityRepo.createEntity({
        logicalId: 'event-repo-entity',
        label: 'Event Repo Entity',
        description: 'Entity for event repository test',
        dataType: { custom: 'TestType' }
      }, 'test-commit-event-repo');

      const action = await entityRepo.createAction({
        logicalId: 'event-repo-action',
        label: 'tests',
        description: 'Testing action',
        category: 'test'
      }, 'test-commit-event-repo');

      const eventData = {
        title: 'Repository Integration Test Event',
        dateOccurred: '2025-01-15T11:00:00Z',
        statement: {
          type: 'SVO' as const,
          subjectRef: entity['@id'],
          verbRef: action['@id'],
          objectRef: entity['@id']
        },
        modifiers: {
          temporal: { when: 'present' as const },
          certainty: { evidence: 'confirmed' as const }
        },
        metadata: {
          source: { name: 'Integration Test', type: 'Academic' as const },
          author: 'test@integration.com',
          version: '1.0'
        }
      };

      const event = await eventRepo.createEvent(eventData, 'test-commit-event-repo');

      expect(event['@id']).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(event.title).toBe(eventData.title);
      expect(event.statement.type).toBe('SVO');

      // Verify it's stored
      const retrieved = await storage.events.retrieve(event['@id']);
      expect(retrieved).toEqual(event);
    });
  });

  describe('Storage Persistence', () => {
    test('data persists after storage restart', async () => {
      const testEntityData = {
        logicalId: 'persistence-test',
        label: 'Persistence Test Entity',
        description: 'Entity to test data persistence',
        dataType: { custom: 'PersistenceTest' }
      };

      // Create entity
      const entity = await entityRepo.createEntity(testEntityData, 'persistence-commit');
      const entityId = entity['@id'];

      // Close and reinitialize storage
      await storage.close();
      
      const newStorageConfig = {
        type: 'local' as const,
        local: {
          dataDirectory: testDataDir
        }
      };
      
      storage = new LocalStorageAdapter(newStorageConfig);
      await storage.initialize();

      // Verify entity still exists
      const retrieved = await storage.entities.retrieve(entityId);
      expect(retrieved).toEqual(entity);
      expect(retrieved?.label).toBe(testEntityData.label);
    });
  });

  describe('Error Handling', () => {
    test('handles invalid hash formats gracefully', async () => {
      const invalidHash = 'not-a-valid-hash';
      
      await expect(storage.entities.retrieve(invalidHash)).resolves.toBeNull();
      await expect(storage.actions.retrieve(invalidHash)).resolves.toBeNull();
      await expect(storage.events.retrieve(invalidHash)).resolves.toBeNull();
    });

    test('handles storage operation failures', async () => {
      // Try to store with empty hash
      await expect(storage.entities.store('', {} as any)).rejects.toThrow();
    });
  });
});