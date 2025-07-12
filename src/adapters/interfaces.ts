/**
 * Storage Adapter Interfaces
 * 
 * Abstract interfaces for storage operations with dependency injection pattern.
 * Allows seamless migration from file system (Phase 1) to blockchain (Phase 4-5).
 */

import type { 
  EntityObject, 
  ActionObject, 
  Event, 
  Commit, 
  Tree, 
  Branch, 
  Repository 
} from '../types/index.js';

/**
 * Generic storage interface for content-addressed objects
 */
export interface ContentStore<T> {
  // Core CRUD operations
  store(id: string, content: T): Promise<void>;
  retrieve(id: string): Promise<T | null>;
  exists(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
  
  // Batch operations for efficiency
  storeBatch(items: Array<{ id: string; content: T }>): Promise<void>;
  retrieveBatch(ids: string[]): Promise<Array<T | null>>;
  
  // Query operations
  list(prefix?: string): Promise<string[]>;
  count(): Promise<number>;
}

/**
 * Entity storage operations
 */
export interface EntityStore extends ContentStore<EntityObject> {
  // Find by logical ID (across all versions)
  findByLogicalId(logicalId: string): Promise<EntityObject[]>;
  getLatestVersion(logicalId: string): Promise<EntityObject | null>;
  
  // Search operations (Phase 2)
  search(query: { label?: string; type?: string }): Promise<EntityObject[]>;
}

/**
 * Action storage operations
 */
export interface ActionStore extends ContentStore<ActionObject> {
  // Find by logical ID (across all versions)
  findByLogicalId(logicalId: string): Promise<ActionObject[]>;
  getLatestVersion(logicalId: string): Promise<ActionObject | null>;
  
  // Search by category or deontic type
  findByCategory(category: string): Promise<ActionObject[]>;
  findByDeonticType(deonticType: string): Promise<ActionObject[]>;
}

/**
 * Event storage operations
 */
export interface EventStore extends ContentStore<Event> {
  // Find by logical ID (across all versions)
  findByLogicalId(logicalId: string): Promise<Event[]>;
  getLatestVersion(logicalId: string): Promise<Event | null>;
  
  // Query by kind (fact vs norm)
  findByKind(kind: 'fact' | 'norm'): Promise<Event[]>;
  
  // Query by date range
  findByDateRange(start: string, end: string): Promise<Event[]>;
  
  // Query by relationships
  findRelated(eventId: string): Promise<Event[]>;
  
  // Search operations (Phase 2)
  search(query: { 
    title?: string; 
    author?: string; 
    sourceType?: string;
    jurisdiction?: string;  // For legal clauses
  }): Promise<Event[]>;
}

/**
 * Commit and version control operations
 */
export interface CommitStore extends ContentStore<Commit> {
  // Get commit history
  getHistory(branchName: string, limit?: number): Promise<Commit[]>;
  
  // Find commits by author or date
  findByAuthor(author: string): Promise<Commit[]>;
  findByDateRange(start: string, end: string): Promise<Commit[]>;
  
  // Branch operations
  getBranches(): Promise<Branch[]>;
  createBranch(branch: Branch): Promise<void>;
  deleteBranch(name: string): Promise<void>;
  
  // Tree operations
  storeTree(tree: Tree): Promise<void>;
  retrieveTree(id: string): Promise<Tree | null>;
}

/**
 * Repository metadata operations
 */
export interface RepositoryStore {
  // Repository metadata
  getRepository(): Promise<Repository | null>;
  updateRepository(repo: Repository): Promise<void>;
  
  // Configuration
  getConfig(): Promise<Record<string, unknown>>;
  setConfig(config: Record<string, unknown>): Promise<void>;
  
  // Refs management (current branch, tags, etc.)
  getRef(name: string): Promise<string | null>;
  setRef(name: string, commitId: string): Promise<void>;
  deleteRef(name: string): Promise<void>;
  listRefs(): Promise<Record<string, string>>;
}

/**
 * Combined storage interface - dependency injection root
 */
export interface StorageAdapter {
  // Object stores
  entities: EntityStore;
  actions: ActionStore;
  events: EventStore;
  commits: CommitStore;
  repository: RepositoryStore;
  
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;
  
  // Transaction support (for future blockchain)
  transaction<T>(operation: (stores: StorageAdapter) => Promise<T>): Promise<T>;
  
  // Health and diagnostics
  healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: string }>;
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
  
  // Local file system config
  local?: {
    dataDirectory: string;
    enableCompression?: boolean;
    maxFileSize?: number;
  };
  
  // Blockchain config (Phase 4-5)
  blockchain?: {
    network: string;
    contractAddress?: string;
    ipfsGateway?: string;
    walletConfig?: Record<string, unknown>;
  };
  
  // Hybrid config (Phase 4)
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