/**
 * Local File System Storage Adapter
 * 
 * Phase 1 implementation using JSON files in .git-events/ directory.
 * Structured like Git with content-addressed storage.
 */

import { promises as fs } from 'fs';
import path from 'path';
// Remove unused import
import type { 
  StorageAdapter,
  StorageConfig,
  EntityStore,
  ActionStore,
  EventStore,
  CommitStore,
  RepositoryStore,
  ContentStore
} from './interfaces.js';
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
 * Generic local file store implementation
 */
class LocalContentStore<T> implements ContentStore<T> {
  constructor(protected baseDirectory: string, private subdirectory: string) {}
  
  private getFilePath(id: string): string {
    // Use first 2 characters as subdirectory (like Git)
    const prefix = id.slice(7, 9); // Skip "sha256:" prefix
    return path.join(this.baseDirectory, this.subdirectory, prefix, `${id}.json`);
  }
  
  async store(id: string, content: T): Promise<void> {
    const filePath = this.getFilePath(id);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
  }
  
  async forceStore(id: string, content: T): Promise<void> {
    // Always store, even if file exists (for force-evaluation mode)
    const filePath = this.getFilePath(id);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
  }
  
  async retrieve(id: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(id);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async exists(id: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(id);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async delete(id: string): Promise<void> {
    try {
      const filePath = this.getFilePath(id);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  async storeBatch(items: Array<{ id: string; content: T }>): Promise<void> {
    await Promise.all(items.map(item => this.store(item.id, item.content)));
  }
  
  async retrieveBatch(ids: string[]): Promise<Array<T | null>> {
    return Promise.all(ids.map(id => this.retrieve(id)));
  }
  
  async list(prefix?: string): Promise<string[]> {
    const baseDir = path.join(this.baseDirectory, this.subdirectory);
    const ids: string[] = [];
    
    try {
      // Walk through subdirectories
      const subdirs = await fs.readdir(baseDir);
      
      for (const subdir of subdirs) {
        const subdirPath = path.join(baseDir, subdir);
        const stat = await fs.stat(subdirPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(subdirPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const id = file.slice(0, -5); // Remove .json extension
              if (!prefix || id.startsWith(prefix)) {
                ids.push(id);
              }
            }
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    
    return ids;
  }
  
  async count(): Promise<number> {
    const ids = await this.list();
    return ids.length;
  }
}

/**
 * Local entity store with logical ID indexing
 */
class LocalEntityStore extends LocalContentStore<EntityObject> implements EntityStore {
  private logicalIdIndex = new Map<string, string[]>(); // logicalId -> [@id, @id, ...]
  
  constructor(baseDirectory: string) {
    super(baseDirectory, 'objects/entities');
  }
  
  async store(id: string, content: EntityObject): Promise<void> {
    await super.store(id, content);
    await this.updateIndex(content);
  }
  
  async forceStore(id: string, content: EntityObject): Promise<void> {
    await super.forceStore(id, content);
    await this.updateIndex(content);
  }
  
  async findByLogicalId(logicalId: string): Promise<EntityObject[]> {
    const ids = this.logicalIdIndex.get(logicalId) || [];
    const entities = await this.retrieveBatch(ids);
    return entities.filter((entity): entity is EntityObject => entity !== null);
  }
  
  async getLatestVersion(logicalId: string): Promise<EntityObject | null> {
    const entities = await this.findByLogicalId(logicalId);
    if (entities.length === 0) return null;
    
    // Sort by version and return latest
    entities.sort((a, b) => this.compareVersions(a.version, b.version));
    return entities[entities.length - 1] || null;
  }
  
  async search(query: { label?: string; type?: string }): Promise<EntityObject[]> {
    const allIds = await this.list();
    const entities = await this.retrieveBatch(allIds);
    
    return entities.filter((entity): entity is EntityObject => {
      if (!entity) return false;
      
      if (query.label && !entity.label.toLowerCase().includes(query.label.toLowerCase())) {
        return false;
      }
      
      if (query.type && entity.dataType?.custom !== query.type) {
        return false;
      }
      
      return true;
    });
  }
  
  private async updateIndex(entity: EntityObject): Promise<void> {
    const existing = this.logicalIdIndex.get(entity.logicalId) || [];
    if (!existing.includes(entity['@id'])) {
      existing.push(entity['@id']);
      this.logicalIdIndex.set(entity.logicalId, existing);
    }
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

/**
 * Local action store with category indexing
 */
class LocalActionStore extends LocalContentStore<ActionObject> implements ActionStore {
  private logicalIdIndex = new Map<string, string[]>();
  private categoryIndex = new Map<string, string[]>();
  private deonticIndex = new Map<string, string[]>();
  
  constructor(baseDirectory: string) {
    super(baseDirectory, 'objects/actions');
  }
  
  async store(id: string, content: ActionObject): Promise<void> {
    await super.store(id, content);
    await this.updateIndexes(content);
  }
  
  async forceStore(id: string, content: ActionObject): Promise<void> {
    await super.forceStore(id, content);
    await this.updateIndexes(content);
  }
  
  async findByLogicalId(logicalId: string): Promise<ActionObject[]> {
    const ids = this.logicalIdIndex.get(logicalId) || [];
    const actions = await this.retrieveBatch(ids);
    return actions.filter((action): action is ActionObject => action !== null);
  }
  
  async getLatestVersion(logicalId: string): Promise<ActionObject | null> {
    const actions = await this.findByLogicalId(logicalId);
    if (actions.length === 0) return null;
    
    // Sort by version and return latest
    actions.sort((a, b) => this.compareVersions(a.version, b.version));
    return actions[actions.length - 1];
  }
  
  async findByCategory(category: string): Promise<ActionObject[]> {
    const ids = this.categoryIndex.get(category) || [];
    const actions = await this.retrieveBatch(ids);
    return actions.filter((action): action is ActionObject => action !== null);
  }
  
  async findByDeonticType(deonticType: string): Promise<ActionObject[]> {
    const ids = this.deonticIndex.get(deonticType) || [];
    const actions = await this.retrieveBatch(ids);
    return actions.filter((action): action is ActionObject => action !== null);
  }
  
  private async updateIndexes(action: ActionObject): Promise<void> {
    // Logical ID index
    const existingLogical = this.logicalIdIndex.get(action.logicalId) || [];
    if (!existingLogical.includes(action['@id'])) {
      existingLogical.push(action['@id']);
      this.logicalIdIndex.set(action.logicalId, existingLogical);
    }
    
    // Category index
    if (action.category) {
      const existingCategory = this.categoryIndex.get(action.category) || [];
      if (!existingCategory.includes(action['@id'])) {
        existingCategory.push(action['@id']);
        this.categoryIndex.set(action.category, existingCategory);
      }
    }
    
    // Deontic type index
    if (action.deonticType) {
      const existingDeontic = this.deonticIndex.get(action.deonticType) || [];
      if (!existingDeontic.includes(action['@id'])) {
        existingDeontic.push(action['@id']);
        this.deonticIndex.set(action.deonticType, existingDeontic);
      }
    }
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

/**
 * Local event store with rich indexing
 */
class LocalEventStore extends LocalContentStore<Event> implements EventStore {
  private logicalIdIndex = new Map<string, string[]>();
  private kindIndex = new Map<'fact' | 'norm', string[]>();
  
  constructor(baseDirectory: string) {
    super(baseDirectory, 'objects/events');
  }
  
  async store(id: string, content: Event): Promise<void> {
    await super.store(id, content);
    await this.updateIndexes(content);
  }
  
  async forceStore(id: string, content: Event): Promise<void> {
    await super.forceStore(id, content);
    await this.updateIndexes(content);
  }
  
  async findByLogicalId(logicalId: string): Promise<Event[]> {
    const ids = this.logicalIdIndex.get(logicalId) || [];
    const events = await this.retrieveBatch(ids);
    return events.filter((event): event is Event => event !== null);
  }
  
  async getLatestVersion(logicalId: string): Promise<Event | null> {
    const events = await this.findByLogicalId(logicalId);
    if (events.length === 0) return null;
    
    events.sort((a, b) => this.compareVersions(a.version, b.version));
    return events[events.length - 1];
  }
  
  async findByKind(kind: 'fact' | 'norm'): Promise<Event[]> {
    const ids = this.kindIndex.get(kind) || [];
    const events = await this.retrieveBatch(ids);
    return events.filter((event): event is Event => event !== null);
  }
  
  async findByDateRange(start: string, end: string): Promise<Event[]> {
    const allIds = await this.list();
    const events = await this.retrieveBatch(allIds);
    
    return events.filter((event): event is Event => {
      if (!event) return false;
      return event.dateOccurred >= start && event.dateOccurred <= end;
    });
  }
  
  async findRelated(eventId: string): Promise<Event[]> {
    const allIds = await this.list();
    const events = await this.retrieveBatch(allIds);
    
    return events.filter((event): event is Event => {
      if (!event || event['@id'] === eventId) return false;
      
      return event.relationships?.some(rel => rel.target === eventId) || false;
    });
  }
  
  async search(query: { 
    title?: string; 
    author?: string; 
    sourceType?: string;
    jurisdiction?: string;
  }): Promise<Event[]> {
    const allIds = await this.list();
    const events = await this.retrieveBatch(allIds);
    
    return events.filter((event): event is Event => {
      if (!event) return false;
      
      if (query.title && !event.title.toLowerCase().includes(query.title.toLowerCase())) {
        return false;
      }
      
      if (query.author && event.metadata.author !== query.author) {
        return false;
      }
      
      if (query.sourceType && event.metadata.source.type !== query.sourceType) {
        return false;
      }
      
      if (query.jurisdiction && event.modifiers.legal?.jurisdiction !== query.jurisdiction) {
        return false;
      }
      
      return true;
    });
  }
  
  private async updateIndexes(event: Event): Promise<void> {
    // Logical ID index
    const existingLogical = this.logicalIdIndex.get(event.logicalId) || [];
    if (!existingLogical.includes(event['@id'])) {
      existingLogical.push(event['@id']);
      this.logicalIdIndex.set(event.logicalId, existingLogical);
    }
    
    // Kind index
    const kind = event.kind || 'fact';
    const existingKind = this.kindIndex.get(kind) || [];
    if (!existingKind.includes(event['@id'])) {
      existingKind.push(event['@id']);
      this.kindIndex.set(kind, existingKind);
    }
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

/**
 * Local commit store with Git-like operations
 */
class LocalCommitStore extends LocalContentStore<Commit> implements CommitStore {
  private branches = new Map<string, Branch>();
  private trees = new Map<string, Tree>();
  
  constructor(baseDirectory: string) {
    super(baseDirectory, 'objects/commits');
  }
  
  async getHistory(branchName: string, limit?: number): Promise<Commit[]> {
    const branch = this.branches.get(branchName);
    if (!branch) return [];
    
    const history: Commit[] = [];
    let currentCommitId = branch.head;
    
    while (currentCommitId && (!limit || history.length < limit)) {
      const commit = await this.retrieve(currentCommitId);
      if (!commit) break;
      
      history.push(commit);
      currentCommitId = commit.parents[0]; // Follow first parent for now
    }
    
    return history;
  }
  
  async findByAuthor(author: string): Promise<Commit[]> {
    const allIds = await this.list();
    const commits = await this.retrieveBatch(allIds);
    
    return commits.filter((commit): commit is Commit => 
      commit !== null && commit.author === author
    );
  }
  
  async findByDateRange(start: string, end: string): Promise<Commit[]> {
    const allIds = await this.list();
    const commits = await this.retrieveBatch(allIds);
    
    return commits.filter((commit): commit is Commit => 
      commit !== null && 
      commit.timestamp >= start && 
      commit.timestamp <= end
    );
  }
  
  async getBranches(): Promise<Branch[]> {
    return Array.from(this.branches.values());
  }
  
  async createBranch(branch: Branch): Promise<void> {
    this.branches.set(branch.name, branch);
    
    // Save to refs/heads/
    const branchPath = path.join(this.baseDirectory, 'refs', 'heads', `${branch.name}.json`);
    await fs.mkdir(path.dirname(branchPath), { recursive: true });
    await fs.writeFile(branchPath, JSON.stringify(branch, null, 2), 'utf-8');
  }
  
  async deleteBranch(name: string): Promise<void> {
    this.branches.delete(name);
    
    const branchPath = path.join(this.baseDirectory, 'refs', 'heads', `${name}.json`);
    try {
      await fs.unlink(branchPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  async storeTree(tree: Tree): Promise<void> {
    this.trees.set(tree['@id'], tree);
    
    const treePath = path.join(this.baseDirectory, 'objects', 'trees', `${tree['@id']}.json`);
    await fs.mkdir(path.dirname(treePath), { recursive: true });
    await fs.writeFile(treePath, JSON.stringify(tree, null, 2), 'utf-8');
  }
  
  async retrieveTree(id: string): Promise<Tree | null> {
    const cached = this.trees.get(id);
    if (cached) return cached;
    
    try {
      const treePath = path.join(this.baseDirectory, 'objects', 'trees', `${id}.json`);
      const content = await fs.readFile(treePath, 'utf-8');
      const tree = JSON.parse(content) as Tree;
      this.trees.set(id, tree);
      return tree;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}

/**
 * Local repository store for metadata and refs
 */
class LocalRepositoryStore implements RepositoryStore {
  constructor(private baseDirectory: string) {}
  
  async getRepository(): Promise<Repository | null> {
    try {
      const repoPath = path.join(this.baseDirectory, 'repository.json');
      const content = await fs.readFile(repoPath, 'utf-8');
      return JSON.parse(content) as Repository;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async updateRepository(repo: Repository): Promise<void> {
    const repoPath = path.join(this.baseDirectory, 'repository.json');
    await fs.writeFile(repoPath, JSON.stringify(repo, null, 2), 'utf-8');
  }
  
  async getConfig(): Promise<Record<string, unknown>> {
    try {
      const configPath = path.join(this.baseDirectory, 'config.json');
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }
  
  async setConfig(config: Record<string, unknown>): Promise<void> {
    const configPath = path.join(this.baseDirectory, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
  
  async getRef(name: string): Promise<string | null> {
    try {
      const refPath = path.join(this.baseDirectory, 'refs', name);
      const content = await fs.readFile(refPath, 'utf-8');
      return content.trim();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async setRef(name: string, commitId: string): Promise<void> {
    const refPath = path.join(this.baseDirectory, 'refs', name);
    await fs.mkdir(path.dirname(refPath), { recursive: true });
    await fs.writeFile(refPath, commitId, 'utf-8');
  }
  
  async deleteRef(name: string): Promise<void> {
    try {
      const refPath = path.join(this.baseDirectory, 'refs', name);
      await fs.unlink(refPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  async listRefs(): Promise<Record<string, string>> {
    const refs: Record<string, string> = {};
    const refsDir = path.join(this.baseDirectory, 'refs');
    
    try {
      const items = await fs.readdir(refsDir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isFile()) {
          const content = await fs.readFile(path.join(refsDir, item.name), 'utf-8');
          refs[item.name] = content.trim();
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    
    return refs;
  }
}

/**
 * Main local storage adapter implementation
 */
export class LocalStorageAdapter implements StorageAdapter {
  public readonly entities: EntityStore;
  public readonly actions: ActionStore;
  public readonly events: EventStore;
  public readonly commits: CommitStore;
  public readonly repository: RepositoryStore;
  
  constructor(private config: StorageConfig) {
    if (!config.local?.dataDirectory) {
      throw new Error('Local storage requires dataDirectory in config');
    }
    
    const baseDir = config.local.dataDirectory;
    
    this.entities = new LocalEntityStore(baseDir);
    this.actions = new LocalActionStore(baseDir);
    this.events = new LocalEventStore(baseDir);
    this.commits = new LocalCommitStore(baseDir);
    this.repository = new LocalRepositoryStore(baseDir);
  }
  
  async initialize(): Promise<void> {
    // Ensure directory structure exists
    const baseDir = this.config.local!.dataDirectory;
    await fs.mkdir(path.join(baseDir, 'objects', 'entities'), { recursive: true });
    await fs.mkdir(path.join(baseDir, 'objects', 'actions'), { recursive: true });
    await fs.mkdir(path.join(baseDir, 'objects', 'events'), { recursive: true });
    await fs.mkdir(path.join(baseDir, 'objects', 'commits'), { recursive: true });
    await fs.mkdir(path.join(baseDir, 'objects', 'trees'), { recursive: true });
    await fs.mkdir(path.join(baseDir, 'refs', 'heads'), { recursive: true });
    
    // Initialize repository if it doesn't exist
    const existingRepo = await this.repository.getRepository();
    if (!existingRepo) {
      const repo: Repository = {
        '@context': 'https://schema.org/',
        '@type': 'Dataset',
        '@id': 'veritaschain:local-repository',
        name: 'VeritasChain Local Repository',
        created: new Date().toISOString(),
        owner: 'local',
        head: '',
        currentBranch: 'main',
        config: {
          defaultBranch: 'main',
          allowForceUpdate: false,
          requireSignedCommits: false
        }
      };
      
      await this.repository.updateRepository(repo);
    }
  }
  
  async close(): Promise<void> {
    // Nothing to close for file system storage
  }
  
  async transaction<T>(operation: (stores: StorageAdapter) => Promise<T>): Promise<T> {
    // Simple transaction - just run the operation
    // In future, could implement file locking or backup/restore
    return operation(this);
  }
  
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: string }> {
    try {
      // Check if we can read/write to the data directory
      const baseDir = this.config.local!.dataDirectory;
      await fs.access(baseDir);
      
      // Check basic functionality
      const testFile = path.join(baseDir, '.health-check');
      await fs.writeFile(testFile, 'ok');
      await fs.unlink(testFile);
      
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: `Local storage error: ${(error as Error).message}` 
      };
    }
  }
  
  async getStatistics(): Promise<{
    entityCount: number;
    actionCount: number;
    eventCount: number;
    commitCount: number;
    storageSize?: number;
  }> {
    const [entityCount, actionCount, eventCount, commitCount] = await Promise.all([
      this.entities.count(),
      this.actions.count(),
      this.events.count(),
      this.commits.count()
    ]);
    
    return {
      entityCount,
      actionCount,
      eventCount,
      commitCount
    };
  }
}

/**
 * Storage factory for local file system
 */
export class LocalStorageFactory {
  static create(config: StorageConfig): LocalStorageAdapter {
    if (config.type !== 'local') {
      throw new Error(`LocalStorageFactory cannot create storage of type: ${config.type}`);
    }
    
    return new LocalStorageAdapter(config);
  }
  
  static isSupported(config: StorageConfig): boolean {
    return config.type === 'local' && !!config.local?.dataDirectory;
  }
}