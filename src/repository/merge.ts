/**
 * Three-Way Merge Algorithm
 * 
 * Implements Git-like three-way merging for VeritasChain objects:
 * - Entity merging with property-level conflict detection
 * - Action merging with deontic type validation
 * - Event merging with statement and relationship conflicts
 * - Tree-level merging with conflict resolution strategies
 * 
 * Phase 2.2 implementation with conflict detection and auto-resolution.
 */

import type { StorageAdapter } from '../adapters/interfaces.js';
import type { 
  Branch, 
  Commit, 
  Tree, 
  Repository,
  EntityObject,
  ActionObject,
  Event,
  ComponentRef,
  Statement
} from '../types/index.js';
import { isComposite } from '../types/event.js';
import { calculateCommitHash, calculateTreeHash } from '../core/hash.js';

// Merge operation types
export type MergeStrategy = 
  | 'auto'           // Automatic merge with conflict detection
  | 'ours'           // Prefer our changes
  | 'theirs'         // Prefer their changes
  | 'manual'         // Require manual resolution
  | 'recursive';     // Recursive merge (for complex histories)

export type ConflictType = 
  | 'content'        // Content differences in same object
  | 'structural'     // Different object types for same logical ID
  | 'relationship'   // Conflicting relationships between objects
  | 'statement'      // Conflicting logical statements
  | 'metadata'       // Metadata conflicts (confidence, etc.)
  | 'version'        // Version numbering conflicts
  | 'component'      // Composite event component conflicts
  | 'aggregation';   // Composite event aggregation logic conflicts

export interface MergeConflict {
  type: ConflictType;
  logicalId: string;      // Logical ID of conflicting object
  objectType: 'entity' | 'action' | 'event';
  property?: string;      // Specific property in conflict
  
  // Three-way conflict values
  base?: any;            // Common ancestor value
  ours?: any;            // Our branch value
  theirs?: any;          // Their branch value
  
  // Context information
  description: string;    // Human-readable conflict description
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoResolvable: boolean; // Can be automatically resolved
  
  // Resolution suggestions
  suggestedResolution?: 'ours' | 'theirs' | 'merge' | 'manual';
  resolutionReason?: string;
}

export interface MergeResult {
  success: boolean;
  strategy: MergeStrategy;
  
  // Merge outcome
  mergeCommit?: Commit;
  mergedTree?: Tree;
  conflicts: MergeConflict[];
  
  // Statistics
  stats: {
    objectsProcessed: number;
    conflictsDetected: number;
    conflictsResolved: number;
    conflictsRequiringManualResolution: number;
  };
  
  // Merge metadata
  baseCommit: string;     // Common ancestor
  ourCommit: string;      // Our branch HEAD
  theirCommit: string;    // Their branch HEAD
  
  message: string;        // Result message
  timestamp: string;      // When merge was performed
}

export interface MergeOptions {
  strategy?: MergeStrategy;
  author?: string;
  message?: string;
  allowEmpty?: boolean;    // Allow merge even if no changes
  skipValidation?: boolean; // Skip pre-merge validation
  
  // Conflict resolution preferences
  conflictResolution?: {
    preferOurs?: string[];     // Property names to prefer from our branch
    preferTheirs?: string[];   // Property names to prefer from their branch
    autoResolve?: boolean;     // Attempt automatic resolution
    confidenceThreshold?: number; // Min confidence for auto-resolution
  };
}

/**
 * Three-way merge implementation
 */
export class MergeManager {
  constructor(private storage: StorageAdapter) {}

  /**
   * Perform three-way merge between two branches
   */
  async mergeBranches(
    sourceBranch: string,
    targetBranch: string, 
    options: MergeOptions = {}
  ): Promise<MergeResult> {
    
    const startTime = new Date().toISOString();
    
    try {
      // Get branch information
      const [sourceInfo, targetInfo] = await Promise.all([
        this.getBranchInfo(sourceBranch),
        this.getBranchInfo(targetBranch)
      ]);
      
      if (!sourceInfo || !targetInfo) {
        return this.createErrorResult('Branch not found', sourceBranch, targetBranch, startTime);
      }

      // Find common ancestor (merge base)
      const baseCommit = await this.findMergeBase(sourceInfo.head, targetInfo.head);
      if (!baseCommit) {
        return this.createErrorResult('No common ancestor found', sourceBranch, targetBranch, startTime);
      }

      // Check if merge is necessary
      if (sourceInfo.head === targetInfo.head) {
        return this.createSuccessResult(
          'Already up to date',
          options.strategy || 'auto',
          baseCommit,
          sourceInfo.head,
          targetInfo.head,
          [],
          startTime
        );
      }

      // Check for fast-forward merge
      if (baseCommit === sourceInfo.head) {
        return this.performFastForward(sourceBranch, targetInfo.head, startTime);
      }
      
      if (baseCommit === targetInfo.head) {
        return this.createSuccessResult(
          'Already up to date (target is ancestor)',
          options.strategy || 'auto',
          baseCommit,
          sourceInfo.head,
          targetInfo.head,
          [],
          startTime
        );
      }

      // Perform three-way merge
      return await this.performThreeWayMerge(
        baseCommit,
        sourceInfo.head,
        targetInfo.head,
        sourceBranch,
        targetBranch,
        options,
        startTime
      );

    } catch (error) {
      return this.createErrorResult(
        `Merge failed: ${(error as Error).message}`,
        sourceBranch,
        targetBranch,
        startTime
      );
    }
  }

  /**
   * Core three-way merge logic
   */
  private async performThreeWayMerge(
    baseCommit: string,
    ourCommit: string,
    theirCommit: string,
    sourceBranch: string,
    targetBranch: string,
    options: MergeOptions,
    startTime: string
  ): Promise<MergeResult> {
    
    // Get trees for three-way comparison
    const [baseTree, ourTree, theirTree] = await Promise.all([
      this.getCommitTree(baseCommit),
      this.getCommitTree(ourCommit),
      this.getCommitTree(theirCommit)
    ]);

    if (!baseTree || !ourTree || !theirTree) {
      return this.createErrorResult('Failed to load commit trees', sourceBranch, targetBranch, startTime);
    }

    // Detect conflicts and merge objects
    const mergeContext = await this.analyzeChanges(baseTree, ourTree, theirTree);
    const conflicts = await this.detectConflicts(mergeContext, options);
    
    // Attempt conflict resolution
    const resolvedConflicts = await this.resolveConflicts(conflicts, options);
    const remainingConflicts = resolvedConflicts.filter(c => !c.autoResolvable);

    // Check if manual resolution is required
    if (remainingConflicts.length > 0 && options.strategy !== 'auto') {
      return this.createConflictResult(
        resolvedConflicts,
        baseCommit,
        ourCommit,
        theirCommit,
        startTime
      );
    }

    // Create merged tree
    const mergedTree = await this.createMergedTree(mergeContext, resolvedConflicts, options);
    
    // Create merge commit
    const mergeCommit = await this.createMergeCommit(
      mergedTree,
      ourCommit,
      theirCommit,
      sourceBranch,
      targetBranch,
      options,
      resolvedConflicts
    );

    // Update target branch to point to merge commit
    await this.updateBranchHead(targetBranch, mergeCommit['@id']);

    return this.createSuccessResult(
      `Merged ${sourceBranch} into ${targetBranch}`,
      options.strategy || 'auto',
      baseCommit,
      ourCommit,
      theirCommit,
      resolvedConflicts,
      startTime,
      mergeCommit
    );
  }

  /**
   * Find common ancestor between two commits
   */
  private async findMergeBase(commit1: string, commit2: string): Promise<string | null> {
    // Simple implementation: traverse parents until common commit found
    // TODO: Implement proper merge-base algorithm for complex histories
    
    const visited = new Set<string>();
    const queue1 = [commit1];
    const queue2 = [commit2];

    // BFS to find first common ancestor
    while (queue1.length > 0 || queue2.length > 0) {
      // Check commits from first branch
      for (let i = 0; i < queue1.length; i++) {
        const commitId = queue1.shift()!;
        if (visited.has(commitId)) {
          return commitId; // Found common ancestor
        }
        visited.add(commitId);
        
        const commit = await this.storage.commits.retrieve(commitId);
        if (commit && commit.parents) {
          queue1.push(...commit.parents);
        }
      }
      
      // Check commits from second branch
      for (let i = 0; i < queue2.length; i++) {
        const commitId = queue2.shift()!;
        if (visited.has(commitId)) {
          return commitId; // Found common ancestor
        }
        visited.add(commitId);
        
        const commit = await this.storage.commits.retrieve(commitId);
        if (commit && commit.parents) {
          queue2.push(...commit.parents);
        }
      }
    }

    return null; // No common ancestor found
  }

  /**
   * Analyze changes between three trees
   */
  private async analyzeChanges(baseTree: Tree, ourTree: Tree, theirTree: Tree) {
    const changes = {
      entities: new Map<string, { base?: string; ours?: string; theirs?: string }>(),
      actions: new Map<string, { base?: string; ours?: string; theirs?: string }>(),
      events: new Map<string, { base?: string; ours?: string; theirs?: string }>()
    };

    // Collect all logical IDs from all trees
    // Note: MacroEvents are now unified with Events, so no separate processing needed
    const allLogicalIds = {
      entities: new Set([
        ...Object.keys(baseTree.entries.entities),
        ...Object.keys(ourTree.entries.entities), 
        ...Object.keys(theirTree.entries.entities)
      ]),
      actions: new Set([
        ...Object.keys(baseTree.entries.actions),
        ...Object.keys(ourTree.entries.actions),
        ...Object.keys(theirTree.entries.actions)
      ]),
      events: new Set([
        ...Object.keys(baseTree.entries.events),
        ...Object.keys(ourTree.entries.events),
        ...Object.keys(theirTree.entries.events),
        // Include any legacy macroEvents in the events processing
        ...Object.keys(baseTree.entries.macroEvents || {}),
        ...Object.keys(ourTree.entries.macroEvents || {}),
        ...Object.keys(theirTree.entries.macroEvents || {})
      ])
    };

    // Analyze changes for each object type
    for (const logicalId of allLogicalIds.entities) {
      changes.entities.set(logicalId, {
        base: baseTree.entries.entities[logicalId],
        ours: ourTree.entries.entities[logicalId],
        theirs: theirTree.entries.entities[logicalId]
      });
    }

    for (const logicalId of allLogicalIds.actions) {
      changes.actions.set(logicalId, {
        base: baseTree.entries.actions[logicalId],
        ours: ourTree.entries.actions[logicalId],
        theirs: theirTree.entries.actions[logicalId]
      });
    }

    for (const logicalId of allLogicalIds.events) {
      changes.events.set(logicalId, {
        base: baseTree.entries.events[logicalId] || baseTree.entries.macroEvents?.[logicalId],
        ours: ourTree.entries.events[logicalId] || ourTree.entries.macroEvents?.[logicalId],
        theirs: theirTree.entries.events[logicalId] || theirTree.entries.macroEvents?.[logicalId]
      });
    }

    return changes;
  }

  /**
   * Detect conflicts in merged objects
   */
  private async detectConflicts(
    mergeContext: any,
    options: MergeOptions
  ): Promise<MergeConflict[]> {
    const conflicts: MergeConflict[] = [];

    // Check entity conflicts
    for (const [logicalId, versions] of mergeContext.entities) {
      const entityConflicts = await this.detectEntityConflicts(logicalId, versions);
      conflicts.push(...entityConflicts);
    }

    // Check action conflicts  
    for (const [logicalId, versions] of mergeContext.actions) {
      const actionConflicts = await this.detectActionConflicts(logicalId, versions);
      conflicts.push(...actionConflicts);
    }

    // Check event conflicts
    for (const [logicalId, versions] of mergeContext.events) {
      const eventConflicts = await this.detectEventConflicts(logicalId, versions);
      conflicts.push(...eventConflicts);
    }

    // Note: Composite event conflicts are now handled in the event conflicts section above
    // since MacroEvents are now unified with Events

    return conflicts;
  }

  /**
   * Detect conflicts in entity objects
   */
  private async detectEntityConflicts(
    logicalId: string,
    versions: { base?: string; ours?: string; theirs?: string }
  ): Promise<MergeConflict[]> {
    const conflicts: MergeConflict[] = [];

    // If only one side changed, no conflict
    if (!versions.ours || !versions.theirs) {
      return conflicts;
    }

    // If both sides have same hash, no conflict
    if (versions.ours === versions.theirs) {
      return conflicts;
    }

    // Load entity objects for comparison
    const [baseEntity, ourEntity, theirEntity] = await Promise.all([
      versions.base ? this.storage.entities.retrieve(versions.base) : null,
      this.storage.entities.retrieve(versions.ours),
      this.storage.entities.retrieve(versions.theirs)
    ]);

    if (!ourEntity || !theirEntity) {
      return conflicts; // Cannot compare if objects don't exist
    }

    // Compare properties for conflicts
    const propertyConflicts = this.compareEntityProperties(
      logicalId,
      baseEntity,
      ourEntity,
      theirEntity
    );
    
    conflicts.push(...propertyConflicts);

    return conflicts;
  }

  /**
   * Compare entity properties to detect conflicts
   */
  private compareEntityProperties(
    logicalId: string,
    base: EntityObject | null,
    ours: EntityObject,
    theirs: EntityObject
  ): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Check label conflicts
    if (ours.label !== theirs.label) {
      conflicts.push({
        type: 'content',
        logicalId,
        objectType: 'entity',
        property: 'label',
        base: base?.label,
        ours: ours.label,
        theirs: theirs.label,
        description: `Label conflict: "${ours.label}" vs "${theirs.label}"`,
        severity: 'medium',
        autoResolvable: false,
        suggestedResolution: 'manual'
      });
    }

    // Check description conflicts
    if (ours.description !== theirs.description) {
      conflicts.push({
        type: 'content',
        logicalId,
        objectType: 'entity',
        property: 'description',
        base: base?.description,
        ours: ours.description,
        theirs: theirs.description,
        description: `Description conflict for entity ${logicalId}`,
        severity: 'low',
        autoResolvable: true,
        suggestedResolution: 'merge',
        resolutionReason: 'Descriptions can often be merged or the longer one preferred'
      });
    }

    // Check dataType conflicts (critical)
    if (JSON.stringify(ours.dataType) !== JSON.stringify(theirs.dataType)) {
      conflicts.push({
        type: 'structural',
        logicalId,
        objectType: 'entity',
        property: 'dataType',
        base: base?.dataType,
        ours: ours.dataType,
        theirs: theirs.dataType,
        description: `Data type conflict: incompatible type definitions`,
        severity: 'critical',
        autoResolvable: false,
        suggestedResolution: 'manual'
      });
    }

    // Check properties object conflicts
    if (ours.properties && theirs.properties) {
      const propertyKeys = new Set([
        ...Object.keys(ours.properties),
        ...Object.keys(theirs.properties)
      ]);

      for (const key of propertyKeys) {
        const ourValue = ours.properties[key];
        const theirValue = theirs.properties[key];

        if (JSON.stringify(ourValue) !== JSON.stringify(theirValue)) {
          conflicts.push({
            type: 'content',
            logicalId,
            objectType: 'entity',
            property: `properties.${key}`,
            base: base?.properties?.[key],
            ours: ourValue,
            theirs: theirValue,
            description: `Property conflict: ${key}`,
            severity: 'medium',
            autoResolvable: false,
            suggestedResolution: 'manual'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect conflicts in action objects (similar to entities)
   */
  private async detectActionConflicts(
    logicalId: string,
    versions: { base?: string; ours?: string; theirs?: string }
  ): Promise<MergeConflict[]> {
    // Similar implementation to detectEntityConflicts
    // Focus on deonticType conflicts which are critical for legal actions
    return []; // Simplified for now
  }

  /**
   * Detect conflicts in event objects (including composite events)
   */
  private async detectEventConflicts(
    logicalId: string,
    versions: { base?: string; ours?: string; theirs?: string }
  ): Promise<MergeConflict[]> {
    const conflicts: MergeConflict[] = [];

    // If only one side changed, no conflict
    if (!versions.ours || !versions.theirs) {
      return conflicts;
    }

    // If both sides have same hash, no conflict
    if (versions.ours === versions.theirs) {
      return conflicts;
    }

    // Load Event objects for comparison
    const [baseEvent, ourEvent, theirEvent] = await Promise.all([
      versions.base ? this.storage.events.retrieve(versions.base) : null,
      this.storage.events.retrieve(versions.ours),
      this.storage.events.retrieve(versions.theirs)
    ]);

    if (!ourEvent || !theirEvent) {
      return conflicts; // Cannot compare if objects don't exist
    }

    // Check if either event is composite and handle accordingly
    const ourIsComposite = isComposite(ourEvent);
    const theirIsComposite = isComposite(theirEvent);
    
    // Detect structural change from leaf to composite or vice versa
    if (ourIsComposite !== theirIsComposite) {
      conflicts.push({
        type: 'structural',
        logicalId,
        objectType: 'event',
        base: baseEvent ? isComposite(baseEvent) : undefined,
        ours: ourIsComposite,
        theirs: theirIsComposite,
        description: `Event structure conflict: ${ourIsComposite ? 'composite' : 'leaf'} vs ${theirIsComposite ? 'composite' : 'leaf'}`,
        severity: 'critical',
        autoResolvable: false,
        suggestedResolution: 'manual',
        resolutionReason: 'Structural change from leaf to composite event requires manual resolution'
      });
    }

    // Handle composite event specific conflicts
    if (ourIsComposite && theirIsComposite) {
      const compositeConflicts = this.compareCompositeEventProperties(
        logicalId,
        baseEvent,
        ourEvent,
        theirEvent
      );
      conflicts.push(...compositeConflicts);
    }

    // Common event property conflicts (title, statement, relationships, etc.)
    const commonConflicts = this.compareCommonEventProperties(
      logicalId,
      baseEvent,
      ourEvent,
      theirEvent
    );
    conflicts.push(...commonConflicts);

    return conflicts;
  }


  /**
   * Compare composite event properties to detect conflicts
   */
  private compareCompositeEventProperties(
    logicalId: string,
    base: Event | null,
    ours: Event,
    theirs: Event
  ): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Check aggregation logic conflicts (critical)
    if (ours.aggregation !== theirs.aggregation) {
      conflicts.push({
        type: 'aggregation',
        logicalId,
        objectType: 'event',
        property: 'aggregation',
        base: base?.aggregation,
        ours: ours.aggregation,
        theirs: theirs.aggregation,
        description: `Aggregation logic conflict: ${ours.aggregation} vs ${theirs.aggregation}`,
        severity: 'critical',
        autoResolvable: false,
        suggestedResolution: 'manual',
        resolutionReason: 'Aggregation logic changes affect confidence calculation'
      });
    }

    // Check component reference conflicts
    const componentConflicts = this.compareComponentReferences(
      logicalId,
      base?.components || [],
      ours.components || [],
      theirs.components || []
    );
    conflicts.push(...componentConflicts);

    // Check timeline span conflicts
    if (ours.timelineSpan && theirs.timelineSpan) {
      if (JSON.stringify(ours.timelineSpan) !== JSON.stringify(theirs.timelineSpan)) {
        conflicts.push({
          type: 'content',
          logicalId,
          objectType: 'event',
          property: 'timelineSpan',
          base: base?.timelineSpan,
          ours: ours.timelineSpan,
          theirs: theirs.timelineSpan,
          description: `Timeline span conflict for composite event ${logicalId}`,
          severity: 'medium',
          autoResolvable: true,
          suggestedResolution: 'merge',
          resolutionReason: 'Timeline spans can be merged using union of start/end dates'
        });
      }
    }

    // Check custom rule conflicts
    if (ours.customRuleId !== theirs.customRuleId) {
      conflicts.push({
        type: 'content',
        logicalId,
        objectType: 'event',
        property: 'customRuleId',
        base: base?.customRuleId,
        ours: ours.customRuleId,
        theirs: theirs.customRuleId,
        description: `Custom rule conflict: ${ours.customRuleId} vs ${theirs.customRuleId}`,
        severity: 'high',
        autoResolvable: false,
        suggestedResolution: 'manual',
        resolutionReason: 'Custom rules affect validation logic'
      });
    }

    // Check importance level conflicts
    if (ours.importance !== theirs.importance) {
      conflicts.push({
        type: 'metadata',
        logicalId,
        objectType: 'event',
        property: 'importance',
        base: base?.importance,
        ours: ours.importance,
        theirs: theirs.importance,
        description: `Importance level conflict: ${ours.importance} vs ${theirs.importance}`,
        severity: 'low',
        autoResolvable: true,
        suggestedResolution: 'ours', // Default to higher importance
        resolutionReason: 'Importance levels can be resolved by taking the higher value'
      });
    }

    return conflicts;
  }

  /**
   * Compare common event properties (applicable to both leaf and composite events)
   */
  private compareCommonEventProperties(
    logicalId: string,
    base: Event | null,
    ours: Event,
    theirs: Event
  ): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Check title conflicts
    if (ours.title !== theirs.title) {
      conflicts.push({
        type: 'content',
        logicalId,
        objectType: 'event',
        property: 'title',
        base: base?.title,
        ours: ours.title,
        theirs: theirs.title,
        description: `Event title conflict: "${ours.title}" vs "${theirs.title}"`,
        severity: 'medium',
        autoResolvable: false,
        suggestedResolution: 'manual',
        resolutionReason: 'Title changes may reflect different interpretations'
      });
    }

    // Check statement conflicts (for leaf events)
    if (!isComposite(ours) && !isComposite(theirs)) {
      if (JSON.stringify(ours.statement) !== JSON.stringify(theirs.statement)) {
        conflicts.push({
          type: 'statement',
          logicalId,
          objectType: 'event',
          property: 'statement',
          base: base?.statement,
          ours: ours.statement,
          theirs: theirs.statement,
          description: `Event statement conflict`,
          severity: 'critical',
          autoResolvable: false,
          suggestedResolution: 'manual',
          resolutionReason: 'Statement changes affect logical meaning'
        });
      }
    }

    // Check relationship conflicts
    if (JSON.stringify(ours.relationships) !== JSON.stringify(theirs.relationships)) {
      conflicts.push({
        type: 'relationship',
        logicalId,
        objectType: 'event',
        property: 'relationships',
        base: base?.relationships,
        ours: ours.relationships,
        theirs: theirs.relationships,
        description: `Event relationships conflict`,
        severity: 'medium',
        autoResolvable: true,
        suggestedResolution: 'merge',
        resolutionReason: 'Relationships can be merged if non-conflicting'
      });
    }

    return conflicts;
  }

  /**
   * Compare component references for conflicts
   */
  private compareComponentReferences(
    logicalId: string,
    base: ComponentRef[],
    ours: ComponentRef[],
    theirs: ComponentRef[]
  ): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Create maps for easy comparison
    const baseMap = new Map(base.map(c => [c.logicalId, c]));
    const oursMap = new Map(ours.map(c => [c.logicalId, c]));
    const theirsMap = new Map(theirs.map(c => [c.logicalId, c]));

    // Get all component logical IDs
    const allComponentIds = new Set([
      ...baseMap.keys(),
      ...oursMap.keys(),
      ...theirsMap.keys()
    ]);

    for (const componentId of allComponentIds) {
      const baseComponent = baseMap.get(componentId);
      const ourComponent = oursMap.get(componentId);
      const theirComponent = theirsMap.get(componentId);

      // Check for component addition/removal conflicts
      if (ourComponent && theirComponent) {
        // Both sides have the component - check for version conflicts
        if (JSON.stringify(ourComponent) !== JSON.stringify(theirComponent)) {
          conflicts.push({
            type: 'component',
            logicalId,
            objectType: 'event',
            property: `components[${componentId}]`,
            base: baseComponent,
            ours: ourComponent,
            theirs: theirComponent,
            description: `Component reference conflict for ${componentId}`,
            severity: 'medium',
            autoResolvable: this.canAutoResolveComponentRef(ourComponent, theirComponent),
            suggestedResolution: this.suggestComponentRefResolution(ourComponent, theirComponent),
            resolutionReason: 'Component references can be resolved based on version preference'
          });
        }
      } else if (ourComponent && !theirComponent && baseComponent) {
        // We removed component, they kept it
        conflicts.push({
          type: 'component',
          logicalId,
          objectType: 'event',
          property: `components[${componentId}]`,
          base: baseComponent,
          ours: undefined,
          theirs: undefined, // They implicitly kept base version
          description: `Component removal conflict for ${componentId}`,
          severity: 'medium',
          autoResolvable: false,
          suggestedResolution: 'manual'
        });
      } else if (!ourComponent && theirComponent && baseComponent) {
        // They removed component, we kept it
        conflicts.push({
          type: 'component',
          logicalId,
          objectType: 'event',
          property: `components[${componentId}]`,
          base: baseComponent,
          ours: undefined, // We implicitly kept base version
          theirs: undefined,
          description: `Component removal conflict for ${componentId}`,
          severity: 'medium',
          autoResolvable: false,
          suggestedResolution: 'manual'
        });
      }
    }

    return conflicts;
  }

  /**
   * Determine if component reference conflict can be auto-resolved
   */
  private canAutoResolveComponentRef(ours: ComponentRef, theirs: ComponentRef): boolean {
    // Auto-resolve if only version differs and one is using latest
    if (ours.logicalId === theirs.logicalId) {
      // If one side uses latest (no version) and other uses specific version, prefer latest
      if (!ours.version && theirs.version) return true;
      if (ours.version && !theirs.version) return true;
      
      // If both use versions, cannot auto-resolve
      return false;
    }
    
    return false;
  }

  /**
   * Suggest resolution for component reference conflicts
   */
  private suggestComponentRefResolution(ours: ComponentRef, theirs: ComponentRef): 'ours' | 'theirs' | 'merge' | 'manual' {
    if (ours.logicalId === theirs.logicalId) {
      // Same component, different versions
      if (!ours.version && theirs.version) return 'ours'; // Prefer latest
      if (ours.version && !theirs.version) return 'theirs'; // Prefer latest
    }
    
    return 'manual';
  }

  /**
   * Attempt to resolve conflicts automatically
   */
  private async resolveConflicts(
    conflicts: MergeConflict[],
    options: MergeOptions
  ): Promise<MergeConflict[]> {
    
    for (const conflict of conflicts) {
      if (conflict.autoResolvable && options.conflictResolution?.autoResolve !== false) {
        // Apply automatic resolution based on conflict type
        switch (conflict.suggestedResolution) {
          case 'ours':
            conflict.autoResolvable = true;
            break;
          case 'theirs':
            conflict.autoResolvable = true;
            break;
          case 'merge':
            // Attempt intelligent merging based on conflict type
            conflict.autoResolvable = await this.attemptIntelligentMerge(conflict);
            break;
        }
      }
    }

    return conflicts;
  }

  /**
   * Attempt intelligent auto-merge for specific conflict types
   */
  private async attemptIntelligentMerge(conflict: MergeConflict): Promise<boolean> {
    switch (conflict.type) {
      case 'content':
        // Description merging
        if (conflict.property === 'description') {
          return true; // Can merge descriptions
        }
        // Timeline span merging for composite events
        if (conflict.property === 'timelineSpan' && conflict.objectType === 'event') {
          return true; // Can merge timeline spans using union
        }
        break;
        
      case 'metadata':
        // Importance level resolution for composite events
        if (conflict.property === 'importance' && conflict.objectType === 'event') {
          return true; // Can resolve by taking higher importance
        }
        break;
        
      case 'component':
        // Component reference resolution for composite events
        if (conflict.objectType === 'event') {
          // Check if we can auto-resolve based on version preferences
          return this.canAutoResolveComponentRef(conflict.ours as ComponentRef, conflict.theirs as ComponentRef);
        }
        break;
    }
    
    return false;
  }

  /**
   * Create merged tree from resolved conflicts
   */
  private async createMergedTree(
    mergeContext: any,
    conflicts: MergeConflict[],
    options: MergeOptions
  ): Promise<Tree> {
    
    const mergedEntries = {
      entities: {} as Record<string, string>,
      actions: {} as Record<string, string>,
      events: {} as Record<string, string>,
      macroEvents: {} as Record<string, string>
    };

    // Merge entities
    for (const [logicalId, versions] of mergeContext.entities) {
      const resolvedVersion = this.resolveVersion(logicalId, versions, conflicts, 'entity');
      if (resolvedVersion) {
        mergedEntries.entities[logicalId] = resolvedVersion;
      }
    }

    // Merge actions
    for (const [logicalId, versions] of mergeContext.actions) {
      const resolvedVersion = this.resolveVersion(logicalId, versions, conflicts, 'action');
      if (resolvedVersion) {
        mergedEntries.actions[logicalId] = resolvedVersion;
      }
    }

    // Merge events
    for (const [logicalId, versions] of mergeContext.events) {
      const resolvedVersion = this.resolveVersion(logicalId, versions, conflicts, 'event');
      if (resolvedVersion) {
        mergedEntries.events[logicalId] = resolvedVersion;
      }
    }

    // Note: Composite events are now merged as part of unified Events above

    // Create merged tree
    const mergedTree: Omit<Tree, '@id'> = {
      '@context': 'https://schema.org/',
      '@type': 'Collection',
      entries: mergedEntries,
      timestamp: new Date().toISOString(),
      parentTree: undefined // Will be set based on strategy
    };

    const treeHash = calculateTreeHash(mergedTree);
    const tree: Tree = { ...mergedTree, '@id': treeHash };

    await this.storage.commits.storeTree(tree);
    return tree;
  }

  /**
   * Resolve which version to use for a logical ID
   */
  private resolveVersion(
    logicalId: string,
    versions: { base?: string; ours?: string; theirs?: string },
    conflicts: MergeConflict[],
    objectType: string
  ): string | null {
    
    // Check if this object has unresolved conflicts
    const hasConflict = conflicts.some(c => 
      c.logicalId === logicalId && 
      c.objectType === objectType && 
      !c.autoResolvable
    );

    if (hasConflict) {
      return null; // Cannot resolve - requires manual intervention
    }

    // Use simple resolution strategy
    if (versions.ours && versions.theirs) {
      // Both sides changed - prefer ours for now (could be configurable)
      return versions.ours;
    }

    // Only one side changed
    return versions.ours || versions.theirs || versions.base || null;
  }

  /**
   * Create merge commit
   */
  private async createMergeCommit(
    mergedTree: Tree,
    ourCommit: string,
    theirCommit: string,
    sourceBranch: string,
    targetBranch: string,
    options: MergeOptions,
    conflicts: MergeConflict[]
  ): Promise<Commit> {
    
    const message = options.message || 
      `Merge branch '${sourceBranch}' into '${targetBranch}'`;

    const commit: Omit<Commit, '@id'> = {
      '@context': 'https://schema.org/',
      '@type': 'UpdateAction',
      timestamp: new Date().toISOString(),
      parents: [ourCommit, theirCommit], // Merge commit has two parents
      tree: mergedTree['@id'],
      author: options.author || 'system',
      message,
      changes: {
        events: [], // TODO: Calculate actual changes
        entities: [],
        actions: []
      },
      branch: targetBranch
    };

    const commitHash = calculateCommitHash(commit);
    const fullCommit: Commit = { ...commit, '@id': commitHash };

    await this.storage.commits.store(commitHash, fullCommit);
    return fullCommit;
  }

  // Helper methods for getting branch/tree information
  private async getBranchInfo(branchName: string) {
    const branches = await this.storage.commits.getBranches();
    return branches.find(b => b.name === branchName);
  }

  private async getCommitTree(commitId: string): Promise<Tree | null> {
    const commit = await this.storage.commits.retrieve(commitId);
    if (!commit) return null;
    return await this.storage.commits.retrieveTree(commit.tree);
  }

  private async updateBranchHead(branchName: string, commitId: string): Promise<void> {
    const branches = await this.storage.commits.getBranches();
    const branch = branches.find(b => b.name === branchName);
    if (branch) {
      branch.head = commitId;
      await this.storage.commits.createBranch(branch); // Update existing branch
    }
  }

  private async performFastForward(
    branchName: string,
    targetCommit: string,
    startTime: string
  ): Promise<MergeResult> {
    await this.updateBranchHead(branchName, targetCommit);
    return this.createSuccessResult(
      'Fast-forward merge',
      'auto',
      targetCommit,
      targetCommit,
      targetCommit,
      [],
      startTime
    );
  }

  // Result creation helpers
  private createSuccessResult(
    message: string,
    strategy: MergeStrategy,
    baseCommit: string,
    ourCommit: string,
    theirCommit: string,
    conflicts: MergeConflict[],
    startTime: string,
    mergeCommit?: Commit
  ): MergeResult {
    return {
      success: true,
      strategy,
      mergeCommit,
      conflicts,
      stats: {
        objectsProcessed: 0,
        conflictsDetected: conflicts.length,
        conflictsResolved: conflicts.filter(c => c.autoResolvable).length,
        conflictsRequiringManualResolution: conflicts.filter(c => !c.autoResolvable).length
      },
      baseCommit,
      ourCommit,
      theirCommit,
      message,
      timestamp: startTime
    };
  }

  private createErrorResult(
    message: string,
    sourceBranch: string,
    targetBranch: string,
    startTime: string
  ): MergeResult {
    return {
      success: false,
      strategy: 'auto',
      conflicts: [],
      stats: {
        objectsProcessed: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        conflictsRequiringManualResolution: 0
      },
      baseCommit: '',
      ourCommit: '',
      theirCommit: '',
      message,
      timestamp: startTime
    };
  }

  private createConflictResult(
    conflicts: MergeConflict[],
    baseCommit: string,
    ourCommit: string,
    theirCommit: string,
    startTime: string
  ): MergeResult {
    return {
      success: false,
      strategy: 'manual',
      conflicts,
      stats: {
        objectsProcessed: conflicts.length,
        conflictsDetected: conflicts.length,
        conflictsResolved: conflicts.filter(c => c.autoResolvable).length,
        conflictsRequiringManualResolution: conflicts.filter(c => !c.autoResolvable).length
      },
      baseCommit,
      ourCommit,
      theirCommit,
      message: `Merge conflicts detected: ${conflicts.filter(c => !c.autoResolvable).length} require manual resolution`,
      timestamp: startTime
    };
  }
}

/**
 * Convenience functions for merge operations
 */
export async function mergeBranches(
  storage: StorageAdapter,
  sourceBranch: string,
  targetBranch: string,
  options?: MergeOptions
): Promise<MergeResult> {
  const manager = new MergeManager(storage);
  return manager.mergeBranches(sourceBranch, targetBranch, options);
}

export async function mergeIntoCurrentBranch(
  storage: StorageAdapter,
  sourceBranch: string,
  options?: MergeOptions
): Promise<MergeResult> {
  const repo = await storage.repository.getRepository();
  if (!repo) {
    throw new Error('Repository not initialized');
  }
  
  const manager = new MergeManager(storage);
  return manager.mergeBranches(sourceBranch, repo.currentBranch, options);
}