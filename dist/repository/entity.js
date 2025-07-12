/**
 * Entity Repository Operations
 *
 * High-level operations for managing EntityObject and ActionObject instances
 * with version control, validation, and pattern observation.
 */
import { v4 as uuidv4 } from 'uuid';
import { calculateEntityHash, calculateActionHash } from '../core/hash.js';
import { patternObserver } from '../core/patterns.js';
export class EntityRepository {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Create a new entity with version 1.0
     */
    async createEntity(params, commitHash) {
        const logicalId = uuidv4();
        const entityData = {
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
        const entity = {
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
    async createAction(params, commitHash) {
        const logicalId = uuidv4();
        const actionData = {
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
        const action = {
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
    async updateEntity(params, commitHash) {
        // Get current latest version
        const currentEntity = await this.storage.entities.getLatestVersion(params.logicalId);
        if (!currentEntity) {
            throw new Error(`Entity with logicalId ${params.logicalId} not found`);
        }
        // Increment version
        const newVersion = this.incrementVersion(currentEntity.version);
        const entityData = {
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
        const entity = {
            '@id': contentHash,
            ...entityData
        };
        await this.storage.entities.store(contentHash, entity);
        return entity;
    }
    /**
     * Update an existing action (creates new version)
     */
    async updateAction(params, commitHash) {
        // Get current latest version
        const currentAction = await this.storage.actions.getLatestVersion(params.logicalId);
        if (!currentAction) {
            throw new Error(`Action with logicalId ${params.logicalId} not found`);
        }
        // Increment version
        const newVersion = this.incrementVersion(currentAction.version);
        const actionData = {
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
        const action = {
            '@id': contentHash,
            ...actionData
        };
        await this.storage.actions.store(contentHash, action);
        return action;
    }
    /**
     * Get entity by ID
     */
    async getEntity(id) {
        return this.storage.entities.retrieve(id);
    }
    /**
     * Get action by ID
     */
    async getAction(id) {
        return this.storage.actions.retrieve(id);
    }
    /**
     * Get latest version of entity by logical ID
     */
    async getLatestEntity(logicalId) {
        return this.storage.entities.getLatestVersion(logicalId);
    }
    /**
     * Get latest version of action by logical ID
     */
    async getLatestAction(logicalId) {
        return this.storage.actions.getLatestVersion(logicalId);
    }
    /**
     * Get all versions of an entity
     */
    async getEntityHistory(logicalId) {
        const entities = await this.storage.entities.findByLogicalId(logicalId);
        return entities.sort((a, b) => this.compareVersions(a.version, b.version));
    }
    /**
     * Get all versions of an action
     */
    async getActionHistory(logicalId) {
        const actions = await this.storage.actions.findByLogicalId(logicalId);
        return actions.sort((a, b) => this.compareVersions(a.version, b.version));
    }
    /**
     * Search entities
     */
    async searchEntities(query) {
        return this.storage.entities.search(query);
    }
    /**
     * Search actions
     */
    async searchActions(query) {
        const results = [];
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
            results.push(...allActions.filter((action) => action !== null &&
                action.label.toLowerCase().includes(query.label.toLowerCase())));
        }
        // Remove duplicates
        const uniqueResults = new Map();
        for (const action of results) {
            uniqueResults.set(action['@id'], action);
        }
        return Array.from(uniqueResults.values());
    }
    /**
     * Validate entity or action references exist
     */
    async validateReferences(subjectRef, verbRef, objectRef) {
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
    incrementVersion(version) {
        const parts = version.split('.').map(Number);
        parts[parts.length - 1] += 1; // Increment patch version
        return parts.join('.');
    }
    compareVersions(a, b) {
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
