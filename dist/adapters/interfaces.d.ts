/**
 * Storage Adapter Interfaces
 *
 * Abstract interfaces for storage operations with dependency injection pattern.
 * Allows seamless migration from file system (Phase 1) to blockchain (Phase 4-5).
 */
import type { EntityObject, ActionObject, Event, Commit, Tree, Branch, Repository } from '../types/index.js';
/**
 * Generic storage interface for content-addressed objects
 */
export interface ContentStore<T> {
    store(id: string, content: T): Promise<void>;
    retrieve(id: string): Promise<T | null>;
    exists(id: string): Promise<boolean>;
    delete(id: string): Promise<void>;
    storeBatch(items: Array<{
        id: string;
        content: T;
    }>): Promise<void>;
    retrieveBatch(ids: string[]): Promise<Array<T | null>>;
    list(prefix?: string): Promise<string[]>;
    count(): Promise<number>;
}
/**
 * Entity storage operations
 */
export interface EntityStore extends ContentStore<EntityObject> {
    findByLogicalId(logicalId: string): Promise<EntityObject[]>;
    getLatestVersion(logicalId: string): Promise<EntityObject | null>;
    search(query: {
        label?: string;
        type?: string;
    }): Promise<EntityObject[]>;
}
/**
 * Action storage operations
 */
export interface ActionStore extends ContentStore<ActionObject> {
    findByLogicalId(logicalId: string): Promise<ActionObject[]>;
    getLatestVersion(logicalId: string): Promise<ActionObject | null>;
    findByCategory(category: string): Promise<ActionObject[]>;
    findByDeonticType(deonticType: string): Promise<ActionObject[]>;
}
/**
 * Event storage operations
 */
export interface EventStore extends ContentStore<Event> {
    findByLogicalId(logicalId: string): Promise<Event[]>;
    getLatestVersion(logicalId: string): Promise<Event | null>;
    findByKind(kind: 'fact' | 'norm'): Promise<Event[]>;
    findByDateRange(start: string, end: string): Promise<Event[]>;
    findRelated(eventId: string): Promise<Event[]>;
    search(query: {
        title?: string;
        author?: string;
        sourceType?: string;
        jurisdiction?: string;
    }): Promise<Event[]>;
}
/**
 * Commit and version control operations
 */
export interface CommitStore extends ContentStore<Commit> {
    getHistory(branchName: string, limit?: number): Promise<Commit[]>;
    findByAuthor(author: string): Promise<Commit[]>;
    findByDateRange(start: string, end: string): Promise<Commit[]>;
    getBranches(): Promise<Branch[]>;
    createBranch(branch: Branch): Promise<void>;
    deleteBranch(name: string): Promise<void>;
    storeTree(tree: Tree): Promise<void>;
    retrieveTree(id: string): Promise<Tree | null>;
}
/**
 * Repository metadata operations
 */
export interface RepositoryStore {
    getRepository(): Promise<Repository | null>;
    updateRepository(repo: Repository): Promise<void>;
    getConfig(): Promise<Record<string, unknown>>;
    setConfig(config: Record<string, unknown>): Promise<void>;
    getRef(name: string): Promise<string | null>;
    setRef(name: string, commitId: string): Promise<void>;
    deleteRef(name: string): Promise<void>;
    listRefs(): Promise<Record<string, string>>;
}
/**
 * Combined storage interface - dependency injection root
 */
export interface StorageAdapter {
    entities: EntityStore;
    actions: ActionStore;
    events: EventStore;
    commits: CommitStore;
    repository: RepositoryStore;
    initialize(): Promise<void>;
    close(): Promise<void>;
    transaction<T>(operation: (stores: StorageAdapter) => Promise<T>): Promise<T>;
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        details?: string;
    }>;
    getStatistics(): Promise<{
        entityCount: number;
        actionCount: number;
        eventCount: number;
        commitCount: number;
        storageSize?: number;
    }>;
}
/**
 * Storage configuration for different backends
 */
export interface StorageConfig {
    type: 'local' | 'blockchain' | 'hybrid';
    local?: {
        dataDirectory: string;
        enableCompression?: boolean;
        maxFileSize?: number;
    };
    blockchain?: {
        network: string;
        contractAddress?: string;
        ipfsGateway?: string;
        walletConfig?: Record<string, unknown>;
    };
    hybrid?: {
        localConfig: StorageConfig['local'];
        blockchainConfig: StorageConfig['blockchain'];
        syncStrategy: 'immediate' | 'batched' | 'manual';
    };
}
/**
 * Factory for creating storage adapters
 */
export interface StorageFactory {
    create(config: StorageConfig): Promise<StorageAdapter>;
    isSupported(config: StorageConfig): boolean;
}
