/**
 * Storage Adapters Export
 * 
 * Central export point for all storage adapters and interfaces.
 * Supports dependency injection pattern for clean architecture.
 */

// Interfaces
export type {
  ContentStore,
  EntityStore,
  ActionStore,
  EventStore,
  CommitStore,
  RepositoryStore,
  StorageAdapter,
  StorageConfig,
  StorageFactory
} from './interfaces.js';
import type { StorageConfig, StorageAdapter } from './interfaces.js';

// Local file system implementation
export {
  LocalStorageAdapter
} from './local.js';
import { LocalStorageAdapter } from './local.js';

// Factory function for creating storage adapters
export function createStorageAdapter(config: StorageConfig): StorageAdapter {
  switch (config.type) {
    case 'local':
      return new LocalStorageAdapter(config);
    
    case 'blockchain':
      throw new Error('Blockchain storage not implemented yet (Phase 4-5)');
    
    case 'hybrid':
      throw new Error('Hybrid storage not implemented yet (Phase 4)');
    
    default:
      throw new Error(`Unsupported storage type: ${config.type}`);
  }
}