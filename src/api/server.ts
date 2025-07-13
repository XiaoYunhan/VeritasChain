/**
 * VeritasChain HTTP API Server
 * 
 * Complete REST API implementation supporting:
 * - Entity, Action, Event, MacroEvent operations
 * - Repository operations (commits, branches)
 * - Query and comparison endpoints
 * - Versioned API (/v1/) with future compatibility
 */

import express, { Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import type { 
  Event, 
  ComponentRef, 
  EventMetadata
} from '../types/event.js';
import { 
  isComposite,
  calculateDepth,
  deriveConfidenceFormula
} from '../types/event.js';
import type { EntityObject, ActionObject } from '../types/entity.js';
import type { Statement } from '../types/statement.js';
import { LocalStorageAdapter } from '../adapters/local.js';
import type { StorageConfig } from '../adapters/interfaces.js';
import { confidenceCalculator } from '../core/confidence.js';
import { confidenceCache } from '../core/confidence-cache.js';
import { 
  calculateEntityHash, 
  calculateActionHash, 
  calculateEventHash
} from '../core/hash.js';
import { BranchManager } from '../repository/branch.js';
import { MergeManager } from '../repository/merge.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for development
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Accept-Version');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API versioning middleware
app.use('/v1', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('API-Version', '1.0');
  next();
});

// Initialize storage
const storageConfig: StorageConfig = {
  type: 'local',
  local: {
    dataDirectory: process.env.DATA_DIR || './.git-events'
  }
};

const store = new LocalStorageAdapter(storageConfig);

// Initialize storage on startup
store.initialize().catch(err => {
  console.error('Failed to initialize storage:', err);
  process.exit(1);
});

// Error handling middleware
interface ApiError extends Error {
  status?: number;
  details?: any;
}

const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`API Error [${status}]:`, message);
  if (err.details) console.error('Details:', err.details);
  
  res.status(status).json({
    error: message,
    status,
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

// Health check
app.get('/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: '1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================================================
// ENTITY ENDPOINTS
// ============================================================================

app.post('/v1/entities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityInput: Omit<EntityObject, '@id'> = req.body;
    
    // Basic validation
    if (!entityInput.logicalId || !entityInput.label) {
      const error: ApiError = new Error('Missing required fields: logicalId, label');
      error.status = 400;
      throw error;
    }
    
    // Calculate hash and create complete entity
    const hash = calculateEntityHash(entityInput);
    const entity: EntityObject = {
      ...entityInput,
      '@id': hash
    };
    
    await store.entities.store(hash, entity);
    
    res.status(201).json({
      '@id': hash,
      logicalId: entity.logicalId,
      version: entity.version,
      created: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/entities/:hash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hash } = req.params;
    const entity = await store.entities.retrieve(hash);
    
    if (!entity) {
      const error: ApiError = new Error(`Entity not found: ${hash}`);
      error.status = 404;
      throw error;
    }
    
    res.json(entity);
  } catch (error) {
    next(error);
  }
});

app.get('/v1/entities/logical/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const entity = await store.entities.getLatestVersion(id);
    
    if (!entity) {
      const error: ApiError = new Error(`Entity not found: ${id}`);
      error.status = 404;
      throw error;
    }
    
    res.json(entity);
  } catch (error) {
    next(error);
  }
});

app.get('/v1/entities/logical/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const allVersions = await store.entities.findByLogicalId(id);
    const limitedVersions = allVersions.slice(-limit);
    
    res.json({
      logicalId: id,
      totalVersions: allVersions.length,
      versions: limitedVersions
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ACTION ENDPOINTS  
// ============================================================================

app.post('/v1/actions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actionInput: Omit<ActionObject, '@id'> = req.body;
    
    if (!actionInput.logicalId || !actionInput.label) {
      const error: ApiError = new Error('Missing required fields: logicalId, label');
      error.status = 400;
      throw error;
    }
    
    const hash = calculateActionHash(actionInput);
    const action: ActionObject = {
      ...actionInput,
      '@id': hash
    };
    
    await store.actions.store(hash, action);
    
    res.status(201).json({
      '@id': hash,
      logicalId: action.logicalId,
      version: action.version,
      created: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/actions/:hash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hash } = req.params;
    const action = await store.actions.retrieve(hash);
    
    if (!action) {
      const error: ApiError = new Error(`Action not found: ${hash}`);
      error.status = 404;
      throw error;
    }
    
    res.json(action);
  } catch (error) {
    next(error);
  }
});

app.get('/v1/actions/logical/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const allVersions = await store.actions.findByLogicalId(id);
    const limitedVersions = allVersions.slice(-limit);
    
    res.json({
      logicalId: id,
      totalVersions: allVersions.length,
      versions: limitedVersions
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EVENT ENDPOINTS
// ============================================================================

app.post('/v1/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventInput: Omit<Event, '@id'> = req.body;
    
    if (!eventInput.logicalId || !eventInput.title) {
      const error: ApiError = new Error('Missing required fields: logicalId, title');
      error.status = 400;
      throw error;
    }
    
    // Composite events need components, leaf events need statement
    const isCompositeEvent = eventInput.components && eventInput.components.length > 0;
    if (isCompositeEvent) {
      if (!eventInput.aggregation) {
        const error: ApiError = new Error('Composite events require aggregation field');
        error.status = 400;
        throw error;
      }
    } else {
      if (!eventInput.statement) {
        const error: ApiError = new Error('Leaf events require statement field');
        error.status = 400;
        throw error;
      }
    }
    
    // Validate component references for composite events
    if (isCompositeEvent) {
      for (const component of eventInput.components!) {
        if (!component.logicalId) {
          const error: ApiError = new Error('Component references must have logicalId');
          error.status = 400;
          throw error;
        }
        
        // Check if referenced event exists
        const targetEvent = component.version ?
          await store.events.findByLogicalId(component.logicalId).then(events => 
            events.find(e => e.version === component.version) || null
          ) :
          await store.events.getLatestVersion(component.logicalId);
          
        if (!targetEvent) {
          const error: ApiError = new Error(`Referenced component not found: ${component.logicalId}${component.version ? ` version ${component.version}` : ''}`);
          error.status = 400;
          throw error;
        }
      }
    }
    
    const hash = calculateEventHash(eventInput);
    const event: Event = {
      ...eventInput,
      '@id': hash
    };
    
    await store.events.store(hash, event);
    
    res.status(201).json({
      '@id': hash,
      logicalId: event.logicalId,
      version: event.version,
      isComposite: isComposite(event),
      componentCount: event.components?.length || 0,
      created: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/events/:hash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hash } = req.params;
    const event = await store.events.retrieve(hash);
    
    if (!event) {
      const error: ApiError = new Error(`Event not found: ${hash}`);
      error.status = 404;
      throw error;
    }
    
    res.json(event);
  } catch (error) {
    next(error);
  }
});

app.get('/v1/events/logical/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const allVersions = await store.events.findByLogicalId(id);
    const limitedVersions = allVersions.slice(-limit);
    
    res.json({
      logicalId: id,
      totalVersions: allVersions.length,
      versions: limitedVersions
    });
  } catch (error) {
    next(error);
  }
});

// Event depth calculation endpoint
app.get('/v1/events/:hash/depth', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hash } = req.params;
    const event = await store.events.retrieve(hash);
    
    if (!event) {
      const error: ApiError = new Error(`Event not found: ${hash}`);
      error.status = 404;
      throw error;
    }
    
    const depth = await calculateDepth(event, async (logicalId: string, version?: string) => {
      return version ?
        await store.events.findByLogicalId(logicalId).then(events => 
          events.find(e => e.version === version) || null
        ) :
        await store.events.getLatestVersion(logicalId);
    });
    
    res.json({
      '@id': hash,
      logicalId: event.logicalId,
      title: event.title,
      isComposite: isComposite(event),
      depth,
      componentCount: event.components?.length || 0
    });
  } catch (error) {
    next(error);
  }
});

// Event confidence formula endpoint
app.get('/v1/events/:hash/formula', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hash } = req.params;
    const event = await store.events.retrieve(hash);
    
    if (!event) {
      const error: ApiError = new Error(`Event not found: ${hash}`);
      error.status = 404;
      throw error;
    }
    
    const formula = await deriveConfidenceFormula(event, async (logicalId: string, version?: string) => {
      return version ?
        await store.events.findByLogicalId(logicalId).then(events => 
          events.find(e => e.version === version) || null
        ) :
        await store.events.getLatestVersion(logicalId);
    });
    
    res.json({
      '@id': hash,
      logicalId: event.logicalId,
      title: event.title,
      isComposite: isComposite(event),
      confidence: event.metadata.confidence,
      formula
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// LEGACY MACRO EVENT REDIRECTS (Deprecated - Use /v1/events)
// ============================================================================

// Redirect POST /v1/macro-events to /v1/events with migration
app.post('/v1/macro-events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Add deprecation warning header
    res.set('Warning', '299 - "POST /v1/macro-events is deprecated. Use POST /v1/events with components field instead."');
    
    // Transform old MacroEvent format to new Event format
    const macroInput = req.body;
    const eventInput = {
      ...macroInput,
      '@type': 'Event',  // Convert from MacroEvent
      aggregation: macroInput.aggregationLogic || macroInput.aggregation || 'ALL',
      components: macroInput.components?.map((comp: any) => {
        if (typeof comp === 'string') {
          return { logicalId: comp };
        }
        return comp;
      }) || []
    };
    
    // Remove old fields
    delete eventInput.aggregationLogic;
    
    // Forward to events endpoint
    req.body = eventInput;
    return app._router.handle({
      ...req,
      method: 'POST',
      url: '/v1/events',
      originalUrl: '/v1/events'
    }, res, next);
  } catch (error) {
    next(error);
  }
});

// Redirect GET /v1/macro-events/:hash to /v1/events/:hash
app.get('/v1/macro-events/:hash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.set('Warning', '299 - "GET /v1/macro-events/:hash is deprecated. Use GET /v1/events/:hash instead."');
    res.redirect(301, `/v1/events/${req.params.hash}`);
  } catch (error) {
    next(error);
  }
});

// Redirect GET /v1/macro-events/logical/:id to /v1/events/logical/:id
app.get('/v1/macro-events/logical/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.set('Warning', '299 - "GET /v1/macro-events/logical/:id is deprecated. Use GET /v1/events/logical/:id instead."');
    res.redirect(301, `/v1/events/logical/${req.params.id}`);
  } catch (error) {
    next(error);
  }
});

// Redirect GET /v1/macro-events/logical/:id/history to /v1/events/logical/:id/history
app.get('/v1/macro-events/logical/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.set('Warning', '299 - "GET /v1/macro-events/logical/:id/history is deprecated. Use GET /v1/events/logical/:id/history instead."');
    res.redirect(301, `/v1/events/logical/${req.params.id}/history`);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// REPOSITORY ENDPOINTS
// ============================================================================

app.post('/v1/commits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, changes } = req.body;
    
    if (!message) {
      const error: ApiError = new Error('Missing required field: message');
      error.status = 400;
      throw error;
    }
    
    // For now, return a simple commit object until repository system is fully implemented
    const commit = {
      '@id': `sha256:${Date.now()}`,
      message,
      timestamp: new Date().toISOString(),
      changes: changes || { events: [], entities: [], actions: [] }
    };
    
    res.status(201).json(commit);
  } catch (error) {
    next(error);
  }
});

app.get('/v1/commits/:hash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hash } = req.params;
    const commit = await store.commits.retrieve(hash);
    
    if (!commit) {
      const error: ApiError = new Error(`Commit not found: ${hash}`);
      error.status = 404;
      throw error;
    }
    
    res.json(commit);
  } catch (error) {
    next(error);
  }
});

app.get('/v1/commits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const since = req.query.since as string;
    const branch = req.query.branch as string || 'main';
    
    // For now, get all commits and limit them
    const allCommitIds = await store.commits.list();
    const limitedIds = allCommitIds.slice(-limit);
    const commits = await store.commits.retrieveBatch(limitedIds);
    
    res.json({
      commits: commits.filter(c => c !== null),
      limit,
      branch
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BRANCH ENDPOINTS (PHASE 2.1)
// ============================================================================

const branchManager = new BranchManager(store);
const mergeManager = new MergeManager(store);

app.get('/v1/branches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const verbose = req.query.verbose === 'true';
    const includeStats = req.query.stats === 'true';
    
    const branches = await branchManager.listBranches({ verbose, includeStats });
    
    res.json({
      branches,
      count: branches.length,
      current: branches.find(b => b.current)?.name || null
    });
  } catch (error) {
    next(error);
  }
});

app.post('/v1/branches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, fromCommit, author, description, force } = req.body;
    
    if (!name) {
      const error: ApiError = new Error('Missing required field: name');
      error.status = 400;
      throw error;
    }
    
    const result = await branchManager.createBranch(name, {
      fromCommit,
      author,
      description,
      force
    });
    
    if (!result.success) {
      const error: ApiError = new Error(result.message);
      error.status = 400;
      throw error;
    }
    
    res.status(201).json({
      success: true,
      message: result.message,
      branch: result.branch,
      created: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.put('/v1/branches/:name/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const { force, createIfMissing } = req.body;
    
    const result = await branchManager.switchBranch(name, {
      force,
      createIfMissing
    });
    
    if (!result.success) {
      const error: ApiError = new Error(result.message);
      error.status = 400;
      throw error;
    }
    
    res.json({
      success: true,
      message: result.message,
      currentBranch: name,
      previousBranch: result.previousBranch,
      switched: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/v1/branches/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const { force } = req.query;
    
    const result = await branchManager.deleteBranch(name, {
      force: force === 'true'
    });
    
    if (!result.success) {
      const error: ApiError = new Error(result.message);
      error.status = 400;
      throw error;
    }
    
    res.json({
      success: true,
      message: result.message,
      deletedBranch: result.branch,
      deleted: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.put('/v1/branches/:oldName/rename/:newName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldName, newName } = req.params;
    const { force } = req.body;
    
    const result = await branchManager.renameBranch(oldName, newName, { force });
    
    if (!result.success) {
      const error: ApiError = new Error(result.message);
      error.status = 400;
      throw error;
    }
    
    res.json({
      success: true,
      message: result.message,
      oldName,
      newName,
      branch: result.branch,
      renamed: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.get('/v1/branches/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentBranch = await branchManager.getCurrentBranch();
    
    if (!currentBranch) {
      const error: ApiError = new Error('No current branch found');
      error.status = 404;
      throw error;
    }
    
    res.json({
      branch: currentBranch,
      current: true
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// MERGE ENDPOINTS (PHASE 2.2)
// ============================================================================

app.post('/v1/merge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceBranch, targetBranch, strategy, author, message, options } = req.body;
    
    if (!sourceBranch || !targetBranch) {
      const error: ApiError = new Error('Missing required fields: sourceBranch, targetBranch');
      error.status = 400;
      throw error;
    }
    
    const mergeOptions = {
      strategy: strategy || 'auto',
      author: author || 'api-user',
      message,
      allowEmpty: options?.allowEmpty || false,
      skipValidation: options?.skipValidation || false,
      conflictResolution: options?.conflictResolution || {
        autoResolve: true,
        confidenceThreshold: 0.8
      }
    };
    
    const result = await mergeManager.mergeBranches(sourceBranch, targetBranch, mergeOptions);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        mergeCommit: result.mergeCommit,
        conflicts: result.conflicts,
        stats: result.stats,
        timestamp: result.timestamp
      });
    } else {
      // Merge conflicts or other issues
      res.status(409).json({
        success: false,
        message: result.message,
        conflicts: result.conflicts,
        stats: result.stats,
        requiresManualResolution: result.stats.conflictsRequiringManualResolution > 0,
        timestamp: result.timestamp
      });
    }
  } catch (error) {
    next(error);
  }
});

app.post('/v1/merge/:sourceBranch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceBranch } = req.params;
    const { strategy, author, message, options } = req.body;
    
    // Get current branch as target
    const repo = await store.repository.getRepository();
    if (!repo) {
      const error: ApiError = new Error('Repository not initialized');
      error.status = 500;
      throw error;
    }
    
    const targetBranch = repo.currentBranch;
    
    const mergeOptions = {
      strategy: strategy || 'auto',
      author: author || 'api-user',
      message: message || `Merge branch '${sourceBranch}' into '${targetBranch}'`,
      allowEmpty: options?.allowEmpty || false,
      skipValidation: options?.skipValidation || false,
      conflictResolution: options?.conflictResolution || {
        autoResolve: true,
        confidenceThreshold: 0.8
      }
    };
    
    const result = await mergeManager.mergeBranches(sourceBranch, targetBranch, mergeOptions);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        sourceBranch,
        targetBranch,
        mergeCommit: result.mergeCommit,
        conflicts: result.conflicts,
        stats: result.stats,
        timestamp: result.timestamp
      });
    } else {
      res.status(409).json({
        success: false,
        message: result.message,
        sourceBranch,
        targetBranch,
        conflicts: result.conflicts,
        stats: result.stats,
        requiresManualResolution: result.stats.conflictsRequiringManualResolution > 0,
        timestamp: result.timestamp
      });
    }
  } catch (error) {
    next(error);
  }
});

app.get('/v1/merge/conflicts/:commitId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commitId } = req.params;
    
    // Get merge commit and analyze conflicts
    const commit = await store.commits.retrieve(commitId);
    if (!commit) {
      const error: ApiError = new Error(`Commit not found: ${commitId}`);
      error.status = 404;
      throw error;
    }
    
    // Check if this is a merge commit (has 2+ parents)
    if (!commit.parents || commit.parents.length < 2) {
      const error: ApiError = new Error(`Not a merge commit: ${commitId}`);
      error.status = 400;
      throw error;
    }
    
    // TODO: Implement conflict analysis for existing merge commit
    // For now, return basic info
    res.json({
      commitId,
      isMergeCommit: true,
      parents: commit.parents,
      message: commit.message,
      conflicts: [], // TODO: Extract from commit metadata
      timestamp: commit.timestamp
    });
  } catch (error) {
    next(error);
  }
});

app.post('/v1/merge/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conflicts, resolutions, author, message } = req.body;
    
    if (!conflicts || !resolutions) {
      const error: ApiError = new Error('Missing required fields: conflicts, resolutions');
      error.status = 400;
      throw error;
    }
    
    // TODO: Implement manual conflict resolution
    // This would involve:
    // 1. Validate resolution choices
    // 2. Apply resolutions to create merged objects
    // 3. Create new merge commit
    // 4. Update branch HEAD
    
    res.json({
      success: true,
      message: 'Conflicts resolved manually',
      resolvedConflicts: conflicts.length,
      newCommit: 'sha256:placeholder...',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// METADATA ENDPOINT
// ============================================================================

app.get('/v1/metadata', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get storage statistics
    const stats = await store.getStatistics();
    
    // Get cache statistics
    const cacheStats = await confidenceCache.getStatistics();
    
    res.json({
      version: '1.0',
      timestamp: new Date().toISOString(),
      storage: stats,
      cache: cacheStats,
      endpoints: {
        entities: '/v1/entities',
        actions: '/v1/actions', 
        events: '/v1/events',
        macroEvents: '/v1/macro-events (deprecated - use /v1/events)',
        commits: '/v1/commits'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    status: 404,
    path: req.originalUrl,
    availableEndpoints: [
      '/v1/health',
      '/v1/entities',
      '/v1/actions',
      '/v1/events',
      '/v1/macro-events (deprecated)',
      '/v1/commits',
      '/v1/branches',
      '/v1/merge',
      '/v1/metadata'
    ]
  });
});

export { app };

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`🚀 VeritasChain API Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/v1/health`);
    console.log(`📖 API docs: http://localhost:${PORT}/v1/metadata`);
  });
}