/**
 * Entity Repository Operations
 *
 * High-level operations for managing EntityObject and ActionObject instances
 * with version control, validation, and pattern observation.
 */
import type { EntityObject, ActionObject } from '../types/entity.js';
import type { StorageAdapter } from '../adapters/interfaces.js';
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
export declare class EntityRepository {
    private storage;
    constructor(storage: StorageAdapter);
    /**
     * Create a new entity with version 1.0
     */
    createEntity(params: CreateEntityParams, commitHash: string): Promise<EntityObject>;
    /**
     * Create a new action with version 1.0
     */
    createAction(params: CreateActionParams, commitHash: string): Promise<ActionObject>;
    /**
     * Update an existing entity (creates new version)
     */
    updateEntity(params: UpdateEntityParams, commitHash: string): Promise<EntityObject>;
    /**
     * Update an existing action (creates new version)
     */
    updateAction(params: UpdateActionParams, commitHash: string): Promise<ActionObject>;
    /**
     * Get entity by ID
     */
    getEntity(id: string): Promise<EntityObject | null>;
    /**
     * Get action by ID
     */
    getAction(id: string): Promise<ActionObject | null>;
    /**
     * Get latest version of entity by logical ID
     */
    getLatestEntity(logicalId: string): Promise<EntityObject | null>;
    /**
     * Get latest version of action by logical ID
     */
    getLatestAction(logicalId: string): Promise<ActionObject | null>;
    /**
     * Get all versions of an entity
     */
    getEntityHistory(logicalId: string): Promise<EntityObject[]>;
    /**
     * Get all versions of an action
     */
    getActionHistory(logicalId: string): Promise<ActionObject[]>;
    /**
     * Search entities
     */
    searchEntities(query: {
        label?: string;
        type?: string;
    }): Promise<EntityObject[]>;
    /**
     * Search actions
     */
    searchActions(query: {
        label?: string;
        category?: string;
        deonticType?: string;
    }): Promise<ActionObject[]>;
    /**
     * Validate entity or action references exist
     */
    validateReferences(subjectRef: string, verbRef: string, objectRef: string): Promise<{
        subject: EntityObject | null;
        verb: ActionObject | null;
        object: EntityObject | null;
        valid: boolean;
    }>;
    private incrementVersion;
    private compareVersions;
}
