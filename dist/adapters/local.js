/**
 * Local File System Storage Adapter
 *
 * Phase 1 implementation using JSON files in .git-events/ directory.
 * Structured like Git with content-addressed storage.
 */
import { promises as fs } from 'fs';
import path from 'path';
/**
 * Generic local file store implementation
 */
class LocalContentStore {
    baseDirectory;
    subdirectory;
    constructor(baseDirectory, subdirectory) {
        this.baseDirectory = baseDirectory;
        this.subdirectory = subdirectory;
    }
    getFilePath(id) {
        // Use first 2 characters as subdirectory (like Git)
        const prefix = id.slice(7, 9); // Skip "sha256:" prefix
        return path.join(this.baseDirectory, this.subdirectory, prefix, `${id}.json`);
    }
    async store(id, content) {
        const filePath = this.getFilePath(id);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
    }
    async forceStore(id, content) {
        // Always store, even if file exists (for force-evaluation mode)
        const filePath = this.getFilePath(id);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
    }
    async retrieve(id) {
        try {
            const filePath = this.getFilePath(id);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    async exists(id) {
        try {
            const filePath = this.getFilePath(id);
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async delete(id) {
        try {
            const filePath = this.getFilePath(id);
            await fs.unlink(filePath);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    async storeBatch(items) {
        await Promise.all(items.map(item => this.store(item.id, item.content)));
    }
    async retrieveBatch(ids) {
        return Promise.all(ids.map(id => this.retrieve(id)));
    }
    async list(prefix) {
        const baseDir = path.join(this.baseDirectory, this.subdirectory);
        const ids = [];
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
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        return ids;
    }
    async count() {
        const ids = await this.list();
        return ids.length;
    }
}
/**
 * Local entity store with logical ID indexing
 */
class LocalEntityStore extends LocalContentStore {
    logicalIdIndex = new Map(); // logicalId -> [@id, @id, ...]
    constructor(baseDirectory) {
        super(baseDirectory, 'objects/entities');
    }
    async store(id, content) {
        await super.store(id, content);
        await this.updateIndex(content);
    }
    async forceStore(id, content) {
        await super.forceStore(id, content);
        await this.updateIndex(content);
    }
    async findByLogicalId(logicalId) {
        const ids = this.logicalIdIndex.get(logicalId) || [];
        const entities = await this.retrieveBatch(ids);
        return entities.filter((entity) => entity !== null);
    }
    async getLatestVersion(logicalId) {
        const entities = await this.findByLogicalId(logicalId);
        if (entities.length === 0)
            return null;
        // Sort by version and return latest
        entities.sort((a, b) => this.compareVersions(a.version, b.version));
        return entities[entities.length - 1] || null;
    }
    async search(query) {
        const allIds = await this.list();
        const entities = await this.retrieveBatch(allIds);
        return entities.filter((entity) => {
            if (!entity)
                return false;
            if (query.label && !entity.label.toLowerCase().includes(query.label.toLowerCase())) {
                return false;
            }
            if (query.type && entity.dataType?.custom !== query.type) {
                return false;
            }
            return true;
        });
    }
    async updateIndex(entity) {
        const existing = this.logicalIdIndex.get(entity.logicalId) || [];
        if (!existing.includes(entity['@id'])) {
            existing.push(entity['@id']);
            this.logicalIdIndex.set(entity.logicalId, existing);
        }
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
/**
 * Local action store with category indexing
 */
class LocalActionStore extends LocalContentStore {
    logicalIdIndex = new Map();
    categoryIndex = new Map();
    deonticIndex = new Map();
    constructor(baseDirectory) {
        super(baseDirectory, 'objects/actions');
    }
    async store(id, content) {
        await super.store(id, content);
        await this.updateIndexes(content);
    }
    async forceStore(id, content) {
        await super.forceStore(id, content);
        await this.updateIndexes(content);
    }
    async findByLogicalId(logicalId) {
        const ids = this.logicalIdIndex.get(logicalId) || [];
        const actions = await this.retrieveBatch(ids);
        return actions.filter((action) => action !== null);
    }
    async getLatestVersion(logicalId) {
        const actions = await this.findByLogicalId(logicalId);
        if (actions.length === 0)
            return null;
        // Sort by version and return latest
        actions.sort((a, b) => this.compareVersions(a.version, b.version));
        return actions[actions.length - 1];
    }
    async findByCategory(category) {
        const ids = this.categoryIndex.get(category) || [];
        const actions = await this.retrieveBatch(ids);
        return actions.filter((action) => action !== null);
    }
    async findByDeonticType(deonticType) {
        const ids = this.deonticIndex.get(deonticType) || [];
        const actions = await this.retrieveBatch(ids);
        return actions.filter((action) => action !== null);
    }
    async updateIndexes(action) {
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
/**
 * Local event store with rich indexing
 */
class LocalEventStore extends LocalContentStore {
    logicalIdIndex = new Map();
    kindIndex = new Map();
    constructor(baseDirectory) {
        super(baseDirectory, 'objects/events');
    }
    async store(id, content) {
        await super.store(id, content);
        await this.updateIndexes(content);
    }
    async forceStore(id, content) {
        await super.forceStore(id, content);
        await this.updateIndexes(content);
    }
    async findByLogicalId(logicalId) {
        const ids = this.logicalIdIndex.get(logicalId) || [];
        const events = await this.retrieveBatch(ids);
        return events.filter((event) => event !== null);
    }
    async getLatestVersion(logicalId) {
        const events = await this.findByLogicalId(logicalId);
        if (events.length === 0)
            return null;
        events.sort((a, b) => this.compareVersions(a.version, b.version));
        return events[events.length - 1];
    }
    async findByKind(kind) {
        const ids = this.kindIndex.get(kind) || [];
        const events = await this.retrieveBatch(ids);
        return events.filter((event) => event !== null);
    }
    async findByDateRange(start, end) {
        const allIds = await this.list();
        const events = await this.retrieveBatch(allIds);
        return events.filter((event) => {
            if (!event)
                return false;
            return event.dateOccurred >= start && event.dateOccurred <= end;
        });
    }
    async findRelated(eventId) {
        const allIds = await this.list();
        const events = await this.retrieveBatch(allIds);
        return events.filter((event) => {
            if (!event || event['@id'] === eventId)
                return false;
            return event.relationships?.some(rel => rel.target === eventId) || false;
        });
    }
    async search(query) {
        const allIds = await this.list();
        const events = await this.retrieveBatch(allIds);
        return events.filter((event) => {
            if (!event)
                return false;
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
    async updateIndexes(event) {
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
/**
 * Local MacroEvent store with component indexing (Phase 2)
 */
class LocalMacroEventStore extends LocalContentStore {
    logicalIdIndex = new Map();
    aggregationIndex = new Map();
    componentIndex = new Map(); // componentId -> macroEventIds
    constructor(baseDirectory) {
        super(baseDirectory, 'objects/macro-events');
    }
    async store(id, content) {
        await super.store(id, content);
        await this.updateIndexes(content);
    }
    async forceStore(id, content) {
        await super.forceStore(id, content);
        await this.updateIndexes(content);
    }
    async findByLogicalId(logicalId) {
        const ids = this.logicalIdIndex.get(logicalId) || [];
        const macroEvents = await this.retrieveBatch(ids);
        return macroEvents.filter((macro) => macro !== null);
    }
    async getLatestVersion(logicalId) {
        const macroEvents = await this.findByLogicalId(logicalId);
        if (macroEvents.length === 0)
            return null;
        macroEvents.sort((a, b) => this.compareVersions(a.version, b.version));
        return macroEvents[macroEvents.length - 1];
    }
    async findByAggregation(aggregation) {
        const ids = this.aggregationIndex.get(aggregation) || [];
        const macroEvents = await this.retrieveBatch(ids);
        return macroEvents.filter((macro) => macro !== null);
    }
    async findByComponent(componentId) {
        const ids = this.componentIndex.get(componentId) || [];
        const macroEvents = await this.retrieveBatch(ids);
        return macroEvents.filter((macro) => macro !== null);
    }
    async search(query) {
        const allIds = await this.list();
        const macroEvents = await this.retrieveBatch(allIds);
        return macroEvents.filter((macro) => {
            if (!macro)
                return false;
            if (query.title && !macro.title.toLowerCase().includes(query.title.toLowerCase())) {
                return false;
            }
            if (query.aggregation && macro.aggregation !== query.aggregation) {
                return false;
            }
            if (query.importance && macro.importance !== query.importance) {
                return false;
            }
            return true;
        });
    }
    async updateIndexes(macro) {
        // Logical ID index
        const existingLogical = this.logicalIdIndex.get(macro.logicalId) || [];
        if (!existingLogical.includes(macro['@id'])) {
            existingLogical.push(macro['@id']);
            this.logicalIdIndex.set(macro.logicalId, existingLogical);
        }
        // Aggregation index
        if (macro.aggregation) {
            const existingAggregation = this.aggregationIndex.get(macro.aggregation) || [];
            if (!existingAggregation.includes(macro['@id'])) {
                existingAggregation.push(macro['@id']);
                this.aggregationIndex.set(macro.aggregation, existingAggregation);
            }
        }
        // Component index - for each component, add this macro
        if (macro.components) {
            for (const componentRef of macro.components) {
                const componentKey = `${componentRef.logicalId}${componentRef.version ? ':' + componentRef.version : ''}`;
                const existingComponent = this.componentIndex.get(componentKey) || [];
                if (!existingComponent.includes(macro['@id'])) {
                    existingComponent.push(macro['@id']);
                    this.componentIndex.set(componentKey, existingComponent);
                }
            }
        }
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
/**
 * Local commit store with Git-like operations
 */
class LocalCommitStore extends LocalContentStore {
    branches = new Map();
    trees = new Map();
    constructor(baseDirectory) {
        super(baseDirectory, 'objects/commits');
        // Load existing branches on initialization
        this.loadBranches();
    }
    async loadBranches() {
        try {
            const branchesDir = path.join(this.baseDirectory, 'refs', 'heads');
            const files = await fs.readdir(branchesDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const branchPath = path.join(branchesDir, file);
                    const content = await fs.readFile(branchPath, 'utf-8');
                    const branch = JSON.parse(content);
                    this.branches.set(branch.name, branch);
                }
            }
        }
        catch (error) {
            // Ignore if branches directory doesn't exist yet
            if (error.code !== 'ENOENT') {
                console.warn('Failed to load branches:', error);
            }
        }
    }
    async getHistory(branchName, limit) {
        const branch = this.branches.get(branchName);
        if (!branch)
            return [];
        const history = [];
        let currentCommitId = branch.head;
        while (currentCommitId && (!limit || history.length < limit)) {
            const commit = await this.retrieve(currentCommitId);
            if (!commit)
                break;
            history.push(commit);
            currentCommitId = commit.parents[0]; // Follow first parent for now
        }
        return history;
    }
    async findByAuthor(author) {
        const allIds = await this.list();
        const commits = await this.retrieveBatch(allIds);
        return commits.filter((commit) => commit !== null && commit.author === author);
    }
    async findByDateRange(start, end) {
        const allIds = await this.list();
        const commits = await this.retrieveBatch(allIds);
        return commits.filter((commit) => commit !== null &&
            commit.timestamp >= start &&
            commit.timestamp <= end);
    }
    async getBranches() {
        return Array.from(this.branches.values());
    }
    async createBranch(branch) {
        this.branches.set(branch.name, branch);
        // Save to refs/heads/
        const branchPath = path.join(this.baseDirectory, 'refs', 'heads', `${branch.name}.json`);
        await fs.mkdir(path.dirname(branchPath), { recursive: true });
        await fs.writeFile(branchPath, JSON.stringify(branch, null, 2), 'utf-8');
    }
    async deleteBranch(name) {
        this.branches.delete(name);
        const branchPath = path.join(this.baseDirectory, 'refs', 'heads', `${name}.json`);
        try {
            await fs.unlink(branchPath);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    async switchBranch(branchName) {
        // Check if branch exists
        const branch = this.branches.get(branchName);
        if (!branch) {
            throw new Error(`Branch '${branchName}' does not exist`);
        }
        // Update HEAD to point to branch's head commit
        const headPath = path.join(this.baseDirectory, 'HEAD');
        await fs.writeFile(headPath, `ref: refs/heads/${branchName}`, 'utf-8');
        // Update current branch reference
        const currentBranchPath = path.join(this.baseDirectory, 'refs', 'current-branch');
        await fs.mkdir(path.dirname(currentBranchPath), { recursive: true });
        await fs.writeFile(currentBranchPath, branchName, 'utf-8');
    }
    async storeTree(tree) {
        this.trees.set(tree['@id'], tree);
        const treePath = path.join(this.baseDirectory, 'objects', 'trees', `${tree['@id']}.json`);
        await fs.mkdir(path.dirname(treePath), { recursive: true });
        await fs.writeFile(treePath, JSON.stringify(tree, null, 2), 'utf-8');
    }
    async retrieveTree(id) {
        const cached = this.trees.get(id);
        if (cached)
            return cached;
        try {
            const treePath = path.join(this.baseDirectory, 'objects', 'trees', `${id}.json`);
            const content = await fs.readFile(treePath, 'utf-8');
            const tree = JSON.parse(content);
            this.trees.set(id, tree);
            return tree;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
}
/**
 * Local repository store for metadata and refs
 */
class LocalRepositoryStore {
    baseDirectory;
    constructor(baseDirectory) {
        this.baseDirectory = baseDirectory;
    }
    async getRepository() {
        try {
            const repoPath = path.join(this.baseDirectory, 'repository.json');
            const content = await fs.readFile(repoPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    async updateRepository(repo) {
        const repoPath = path.join(this.baseDirectory, 'repository.json');
        await fs.writeFile(repoPath, JSON.stringify(repo, null, 2), 'utf-8');
    }
    async getConfig() {
        try {
            const configPath = path.join(this.baseDirectory, 'config.json');
            const content = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return {};
            }
            throw error;
        }
    }
    async setConfig(config) {
        const configPath = path.join(this.baseDirectory, 'config.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }
    async getRef(name) {
        try {
            const refPath = path.join(this.baseDirectory, 'refs', name);
            const content = await fs.readFile(refPath, 'utf-8');
            return content.trim();
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    async setRef(name, commitId) {
        const refPath = path.join(this.baseDirectory, 'refs', name);
        await fs.mkdir(path.dirname(refPath), { recursive: true });
        await fs.writeFile(refPath, commitId, 'utf-8');
    }
    async deleteRef(name) {
        try {
            const refPath = path.join(this.baseDirectory, 'refs', name);
            await fs.unlink(refPath);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    async listRefs() {
        const refs = {};
        const refsDir = path.join(this.baseDirectory, 'refs');
        try {
            const items = await fs.readdir(refsDir, { withFileTypes: true });
            for (const item of items) {
                if (item.isFile()) {
                    const content = await fs.readFile(path.join(refsDir, item.name), 'utf-8');
                    refs[item.name] = content.trim();
                }
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        return refs;
    }
}
/**
 * Main local storage adapter implementation
 */
export class LocalStorageAdapter {
    config;
    entities;
    actions;
    events;
    macroEvents; // Phase 2 addition
    commits;
    repository;
    constructor(config) {
        this.config = config;
        if (!config.local?.dataDirectory) {
            throw new Error('Local storage requires dataDirectory in config');
        }
        const baseDir = config.local.dataDirectory;
        this.entities = new LocalEntityStore(baseDir);
        this.actions = new LocalActionStore(baseDir);
        this.events = new LocalEventStore(baseDir);
        this.macroEvents = new LocalMacroEventStore(baseDir); // Phase 2 addition
        this.commits = new LocalCommitStore(baseDir);
        this.repository = new LocalRepositoryStore(baseDir);
    }
    async initialize() {
        // Ensure directory structure exists
        const baseDir = this.config.local.dataDirectory;
        await fs.mkdir(path.join(baseDir, 'objects', 'entities'), { recursive: true });
        await fs.mkdir(path.join(baseDir, 'objects', 'actions'), { recursive: true });
        await fs.mkdir(path.join(baseDir, 'objects', 'events'), { recursive: true });
        await fs.mkdir(path.join(baseDir, 'objects', 'macro-events'), { recursive: true }); // Phase 2 addition
        await fs.mkdir(path.join(baseDir, 'objects', 'commits'), { recursive: true });
        await fs.mkdir(path.join(baseDir, 'objects', 'trees'), { recursive: true });
        await fs.mkdir(path.join(baseDir, 'refs', 'heads'), { recursive: true });
        // Initialize repository if it doesn't exist
        const existingRepo = await this.repository.getRepository();
        if (!existingRepo) {
            const repo = {
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
            // Create initial 'main' branch
            const mainBranch = {
                name: 'main',
                head: '', // Will be updated when first commit is made
                created: new Date().toISOString(),
                author: 'system',
                description: 'Default main branch'
            };
            await this.commits.createBranch(mainBranch);
        }
    }
    async close() {
        // Nothing to close for file system storage
    }
    async transaction(operation) {
        // Simple transaction - just run the operation
        // In future, could implement file locking or backup/restore
        return operation(this);
    }
    async healthCheck() {
        try {
            // Check if we can read/write to the data directory
            const baseDir = this.config.local.dataDirectory;
            await fs.access(baseDir);
            // Check basic functionality
            const testFile = path.join(baseDir, '.health-check');
            await fs.writeFile(testFile, 'ok');
            await fs.unlink(testFile);
            return { status: 'healthy' };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: `Local storage error: ${error.message}`
            };
        }
    }
    async getStatistics() {
        const [entityCount, actionCount, eventCount, macroEventCount, commitCount] = await Promise.all([
            this.entities.count(),
            this.actions.count(),
            this.events.count(),
            this.macroEvents.count(), // Phase 2 addition
            this.commits.count()
        ]);
        return {
            entityCount,
            actionCount,
            eventCount,
            macroEventCount,
            commitCount
        };
    }
}
/**
 * Storage factory for local file system
 */
export class LocalStorageFactory {
    static create(config) {
        if (config.type !== 'local') {
            throw new Error(`LocalStorageFactory cannot create storage of type: ${config.type}`);
        }
        return new LocalStorageAdapter(config);
    }
    static isSupported(config) {
        return config.type === 'local' && !!config.local?.dataDirectory;
    }
}
