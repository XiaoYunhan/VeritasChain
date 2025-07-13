/**
 * Storage Adapters Export
 *
 * Central export point for all storage adapters and interfaces.
 * Supports dependency injection pattern for clean architecture.
 */
export type { ContentStore, EntityStore, ActionStore, EventStore, CommitStore, RepositoryStore, StorageAdapter, StorageConfig, StorageFactory } from './interfaces.js';
import type { StorageConfig, StorageAdapter } from './interfaces.js';
export { LocalStorageAdapter } from './local.js';
export declare function createStorageAdapter(config: StorageConfig): StorageAdapter;
