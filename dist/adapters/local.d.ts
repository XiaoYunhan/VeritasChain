/**
 * Local File System Storage Adapter
 *
 * Phase 1 implementation using JSON files in .git-events/ directory.
 * Structured like Git with content-addressed storage.
 */
import type { StorageAdapter, StorageConfig, EntityStore, ActionStore, EventStore, CommitStore, RepositoryStore } from './interfaces.js';
/**
 * Main local storage adapter implementation
 */
export declare class LocalStorageAdapter implements StorageAdapter {
    private config;
    readonly entities: EntityStore;
    readonly actions: ActionStore;
    readonly events: EventStore;
    readonly commits: CommitStore;
    readonly repository: RepositoryStore;
    constructor(config: StorageConfig);
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
 * Storage factory for local file system
 */
export declare class LocalStorageFactory {
    static create(config: StorageConfig): LocalStorageAdapter;
    static isSupported(config: StorageConfig): boolean;
}
