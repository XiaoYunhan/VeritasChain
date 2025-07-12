/**
 * Entity Repository Operations
 * 
 * High-level operations for managing EntityObject and ActionObject instances
 * with version control, validation, and pattern observation.
 */

import { v4 as uuidv4 } from 'uuid';
import type { EntityObject, ActionObject } from '../types/entity.js';
import type { StorageAdapter } from '../adapters/interfaces.js';
import { calculateEntityHash, calculateActionHash } from '../core/hash.js';
import { patternObserver } from '../core/patterns.js';

export interface CreateEntityParams {
  label: string;
  description?: string;
  dataType?: {
    custom?: string;
    description?: string;
  };
  properties?: Record<string, unknown>;
}

export interface CreateActionParams {
  label: string;
  description?: string;
  category?: string;
  deonticType?: 'shall' | 'may' | 'must-not' | 'liable-for' | 'entitled-to' | 'should' | 'permitted' | 'prohibited';
  properties?: Record<string, unknown>;
}

export interface UpdateEntityParams {
  logicalId: string;
  label?: string;
  description?: string;
  dataType?: {
    custom?: string;
    description?: string;
  };
  properties?: Record<string, unknown>;
}

export interface UpdateActionParams {
  logicalId: string;
  label?: string;
  description?: string;
  category?: string;
  deonticType?: 'shall' | 'may' | 'must-not' | 'liable-for' | 'entitled-to' | 'should' | 'permitted' | 'prohibited';
  properties?: Record<string, unknown>;
}

export class EntityRepository {
  constructor(private storage: StorageAdapter) {}
  
  /**
   * Create a new entity with version 1.0
   */
  async createEntity(params: CreateEntityParams, commitHash: string): Promise<EntityObject> {
    const logicalId = uuidv4();
    
    const entityData: Omit<EntityObject, '@id'> = {
      '@context': 'https://schema.org/',
      '@type': 'Thing',
      logicalId,
      version: '1.0',
      commitHash,
      label: params.label,
      description: params.description,
      dataType: params.dataType,
      properties: params.properties
    };
    
    const contentHash = calculateEntityHash(entityData);
    const entity: EntityObject = {
      '@id': contentHash,
      ...entityData
    };
    
    // Store the entity
    await this.storage.entities.store(contentHash, entity);
    
    // PHASE 1: Observe patterns for future type inference
    if (params.dataType?.custom) {
      patternObserver.observeEntityType(contentHash, params.dataType.custom, 'creation-context');
    }
    
    return entity;
  }
  
  /**
   * Create a new action with version 1.0
   */
  async createAction(params: CreateActionParams, commitHash: string): Promise<ActionObject> {
    const logicalId = uuidv4();
    
    const actionData: Omit<ActionObject, '@id'> = {
      '@context': 'https://schema.org/',
      '@type': 'Action',
      logicalId,
      version: '1.0',
      commitHash,
      label: params.label,
      description: params.description,
      category: params.category,
      deonticType: params.deonticType,
      properties: params.properties
    };
    
    const contentHash = calculateActionHash(actionData);
    const action: ActionObject = {
      '@id': contentHash,
      ...actionData
    };
    
    // Store the action
    await this.storage.actions.store(contentHash, action);
    
    // PHASE 1: Observe patterns for future type inference
    if (params.category) {
      patternObserver.observeActionCategory(contentHash, params.category, 'creation-context');
    }
    
    return action;
  }
  
  /**
   * Update an existing entity (creates new version)
   */
  async updateEntity(params: UpdateEntityParams, commitHash: string): Promise<EntityObject> {
    // Get current latest version
    const currentEntity = await this.storage.entities.getLatestVersion(params.logicalId);
    if (!currentEntity) {
      throw new Error(`Entity with logicalId ${params.logicalId} not found`);
    }
    
    // Increment version
    const newVersion = this.incrementVersion(currentEntity.version);
    
    const entityData: Omit<EntityObject, '@id'> = {
      '@context': 'https://schema.org/',
      '@type': 'Thing',
      logicalId: params.logicalId,
      version: newVersion,
      previousVersion: currentEntity['@id'],
      commitHash,
      label: params.label ?? currentEntity.label,
      description: params.description ?? currentEntity.description,
      dataType: params.dataType ?? currentEntity.dataType,
      properties: params.properties ?? currentEntity.properties
    };
    
    const contentHash = calculateEntityHash(entityData);
    const entity: EntityObject = {
      '@id': contentHash,
      ...entityData
    };
    
    await this.storage.entities.store(contentHash, entity);
    
    return entity;
  }
  
  /**
   * Update an existing action (creates new version)
   */
  async updateAction(params: UpdateActionParams, commitHash: string): Promise<ActionObject> {
    // Get current latest version
    const currentAction = await this.storage.actions.getLatestVersion(params.logicalId);
    if (!currentAction) {
      throw new Error(`Action with logicalId ${params.logicalId} not found`);
    }
    
    // Increment version
    const newVersion = this.incrementVersion(currentAction.version);
    
    const actionData: Omit<ActionObject, '@id'> = {
      '@context': 'https://schema.org/',
      '@type': 'Action',
      logicalId: params.logicalId,
      version: newVersion,
      previousVersion: currentAction['@id'],
      commitHash,
      label: params.label ?? currentAction.label,
      description: params.description ?? currentAction.description,
      category: params.category ?? currentAction.category,
      deonticType: params.deonticType ?? currentAction.deonticType,
      properties: params.properties ?? currentAction.properties
    };
    
    const contentHash = calculateActionHash(actionData);
    const action: ActionObject = {
      '@id': contentHash,
      ...actionData
    };
    
    await this.storage.actions.store(contentHash, action);
    
    return action;
  }
  
  /**
   * Get entity by ID
   */
  async getEntity(id: string): Promise<EntityObject | null> {
    return this.storage.entities.retrieve(id);
  }
  
  /**
   * Get action by ID
   */
  async getAction(id: string): Promise<ActionObject | null> {
    return this.storage.actions.retrieve(id);
  }
  
  /**
   * Get latest version of entity by logical ID
   */
  async getLatestEntity(logicalId: string): Promise<EntityObject | null> {
    return this.storage.entities.getLatestVersion(logicalId);
  }
  
  /**
   * Get latest version of action by logical ID
   */
  async getLatestAction(logicalId: string): Promise<ActionObject | null> {
    return this.storage.actions.getLatestVersion(logicalId);
  }
  
  /**
   * Get all versions of an entity
   */
  async getEntityHistory(logicalId: string): Promise<EntityObject[]> {
    const entities = await this.storage.entities.findByLogicalId(logicalId);
    return entities.sort((a, b) => this.compareVersions(a.version, b.version));
  }
  
  /**
   * Get all versions of an action
   */
  async getActionHistory(logicalId: string): Promise<ActionObject[]> {
    const actions = await this.storage.actions.findByLogicalId(logicalId);
    return actions.sort((a, b) => this.compareVersions(a.version, b.version));
  }
  
  /**
   * Search entities
   */
  async searchEntities(query: { label?: string; type?: string }): Promise<EntityObject[]> {
    return this.storage.entities.search(query);
  }
  
  /**
   * Search actions
   */
  async searchActions(query: { 
    label?: string; 
    category?: string; 
    deonticType?: string 
  }): Promise<ActionObject[]> {
    const results: ActionObject[] = [];
    
    if (query.category) {
      const byCategory = await this.storage.actions.findByCategory(query.category);
      results.push(...byCategory);
    }
    
    if (query.deonticType) {
      const byDeontic = await this.storage.actions.findByDeonticType(query.deonticType);
      results.push(...byDeontic);
    }
    
    if (query.label && results.length === 0) {
      // Simple label search - would be improved in Phase 2
      const allIds = await this.storage.actions.list();
      const allActions = await this.storage.actions.retrieveBatch(allIds);
      
      results.push(...allActions.filter((action): action is ActionObject => 
        action !== null && 
        action.label.toLowerCase().includes(query.label!.toLowerCase())
      ));
    }
    
    // Remove duplicates
    const uniqueResults = new Map<string, ActionObject>();
    for (const action of results) {
      uniqueResults.set(action['@id'], action);
    }
    
    return Array.from(uniqueResults.values());
  }
  
  /**
   * Validate entity or action references exist
   */
  async validateReferences(subjectRef: string, verbRef: string, objectRef: string): Promise<{
    subject: EntityObject | null;
    verb: ActionObject | null;
    object: EntityObject | null;
    valid: boolean;
  }> {
    const [subject, verb, object] = await Promise.all([
      this.storage.entities.retrieve(subjectRef),
      this.storage.actions.retrieve(verbRef),
      this.storage.entities.retrieve(objectRef)
    ]);
    
    return {
      subject,
      verb,
      object,
      valid: subject !== null && verb !== null && object !== null
    };
  }
  
  // Private helper methods
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[parts.length - 1] += 1; // Increment patch version
    return parts.join('.');
  }
  
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }
    
    return 0;
  }
}