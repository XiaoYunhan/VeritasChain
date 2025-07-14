/**
 * Advanced Conflict Resolution System
 * 
 * Implements interactive conflict resolution with legal-specific handling,
 * confidence-based resolution strategies, and resolution history tracking.
 * 
 * Phase 2.3 implementation for enhanced conflict detection and resolution.
 */

import type { StorageAdapter } from '../adapters/interfaces.js';
import type { 
  Event, 
  EntityObject, 
  ActionObject, 
  ComponentRef 
} from '../types/index.js';
import type { 
  MergeConflict, 
  ConflictType, 
  MergeOptions 
} from './merge.js';
import { isComposite } from '../types/event.js';

export interface ConflictResolution {
  conflictId: string;
  resolution: 'ours' | 'theirs' | 'merge' | 'custom';
  resolvedValue?: any;
  reasoning: string;
  confidence: number;           // 0-1 confidence in resolution
  timestamp: string;
  method: 'auto' | 'manual' | 'ai-assisted';
  reviewer?: string;           // Who approved the resolution
}

export interface ResolutionStrategy {
  name: string;
  description: string;
  priority: number;           // Higher = more preferred
  applicableTypes: ConflictType[];
  evaluate: (conflict: MergeConflict) => Promise<ConflictResolution | null>;
}

export interface ConflictVisualization {
  conflictId: string;
  type: ConflictType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Three-way diff visualization
  comparison: {
    base?: {
      value: any;
      label: string;
      confidence?: number;
    };
    ours: {
      value: any;
      label: string;
      confidence?: number;
      author?: string;
      timestamp?: string;
    };
    theirs: {
      value: any;
      label: string;
      confidence?: number;
      author?: string;
      timestamp?: string;
    };
  };
  
  // Resolution suggestions
  suggestions: {
    strategy: string;
    reasoning: string;
    confidence: number;
    preview?: any;
  }[];
}

/**
 * Enhanced conflict resolver with legal-specific and confidence-based strategies
 */
export class AdvancedConflictResolver {
  private strategies: ResolutionStrategy[] = [];
  private resolutionHistory: Map<string, ConflictResolution[]> = new Map();

  constructor(private storage: StorageAdapter) {
    this.initializeStrategies();
  }

  /**
   * Initialize built-in resolution strategies
   */
  private initializeStrategies(): void {
    // Strategy 1: Confidence-based resolution
    this.strategies.push({
      name: 'confidence-based',
      description: 'Resolve based on confidence scores',
      priority: 80,
      applicableTypes: ['content', 'metadata', 'statement'],
      evaluate: async (conflict) => this.evaluateConfidenceBased(conflict)
    });

    // Strategy 2: Legal hierarchy resolution (for legal events)
    this.strategies.push({
      name: 'legal-hierarchy',
      description: 'Resolve based on legal source hierarchy',
      priority: 90,
      applicableTypes: ['content', 'structural', 'statement'],
      evaluate: async (conflict) => this.evaluateLegalHierarchy(conflict)
    });

    // Strategy 3: Temporal precedence (newer wins)
    this.strategies.push({
      name: 'temporal-precedence',
      description: 'Prefer more recent changes',
      priority: 60,
      applicableTypes: ['content', 'metadata'],
      evaluate: async (conflict) => this.evaluateTemporalPrecedence(conflict)
    });

    // Strategy 4: Semantic merging for descriptions
    this.strategies.push({
      name: 'semantic-merge',
      description: 'Intelligently merge text content',
      priority: 70,
      applicableTypes: ['content'],
      evaluate: async (conflict) => this.evaluateSemanticMerge(conflict)
    });

    // Strategy 5: Component version resolution
    this.strategies.push({
      name: 'component-version',
      description: 'Resolve component reference conflicts',
      priority: 85,
      applicableTypes: ['component'],
      evaluate: async (conflict) => this.evaluateComponentVersion(conflict)
    });
  }

  /**
   * Resolve conflicts using advanced strategies
   */
  async resolveConflicts(
    conflicts: MergeConflict[],
    options: MergeOptions & {
      interactive?: boolean;
      autoResolveThreshold?: number; // 0-1, confidence threshold for auto-resolution
      preserveHistory?: boolean;
    }
  ): Promise<{
    resolved: (MergeConflict & { resolution: ConflictResolution })[];
    unresolved: MergeConflict[];
    visualizations: ConflictVisualization[];
  }> {
    
    const resolved: (MergeConflict & { resolution: ConflictResolution })[] = [];
    const unresolved: MergeConflict[] = [];
    const visualizations: ConflictVisualization[] = [];

    for (const conflict of conflicts) {
      // Create visualization for all conflicts
      const visualization = await this.createConflictVisualization(conflict);
      visualizations.push(visualization);

      // Attempt automatic resolution
      const resolution = await this.attemptAutoResolution(conflict, options);
      
      if (resolution && resolution.confidence >= (options.autoResolveThreshold || 0.8)) {
        // Auto-resolution successful
        resolved.push({ ...conflict, resolution });
        
        // Store in history if requested
        if (options.preserveHistory) {
          this.addToResolutionHistory(conflict.logicalId, resolution);
        }
      } else if (options.interactive) {
        // Attempt interactive resolution
        const interactiveResolution = await this.promptInteractiveResolution(
          conflict, 
          visualization, 
          resolution
        );
        
        if (interactiveResolution) {
          resolved.push({ ...conflict, resolution: interactiveResolution });
          
          if (options.preserveHistory) {
            this.addToResolutionHistory(conflict.logicalId, interactiveResolution);
          }
        } else {
          unresolved.push(conflict);
        }
      } else {
        // Cannot resolve - add to unresolved
        unresolved.push(conflict);
      }
    }

    return { resolved, unresolved, visualizations };
  }

  /**
   * Attempt automatic resolution using strategies
   */
  private async attemptAutoResolution(
    conflict: MergeConflict,
    options: MergeOptions
  ): Promise<ConflictResolution | null> {
    
    // Get applicable strategies for this conflict type
    const applicableStrategies = this.strategies
      .filter(s => s.applicableTypes.includes(conflict.type))
      .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)

    // Try each strategy until one succeeds
    for (const strategy of applicableStrategies) {
      try {
        const resolution = await strategy.evaluate(conflict);
        if (resolution && resolution.confidence > 0.5) {
          return resolution;
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.name} failed for conflict ${conflict.logicalId}:`, error);
      }
    }

    return null;
  }

  /**
   * Confidence-based resolution strategy
   */
  private async evaluateConfidenceBased(conflict: MergeConflict): Promise<ConflictResolution | null> {
    // Load objects to get confidence scores
    const [ourObject, theirObject] = await Promise.all([
      this.loadObject(conflict.ours, conflict.objectType),
      this.loadObject(conflict.theirs, conflict.objectType)
    ]);

    if (!ourObject || !theirObject) return null;

    const ourConfidence = this.extractConfidence(ourObject);
    const theirConfidence = this.extractConfidence(theirObject);

    if (Math.abs(ourConfidence - theirConfidence) < 0.1) {
      return null; // Confidence too similar, cannot decide
    }

    const preferOurs = ourConfidence > theirConfidence;
    
    return {
      conflictId: `${conflict.logicalId}-${conflict.property}`,
      resolution: preferOurs ? 'ours' : 'theirs',
      reasoning: `Higher confidence: ${preferOurs ? ourConfidence : theirConfidence} vs ${preferOurs ? theirConfidence : ourConfidence}`,
      confidence: Math.abs(ourConfidence - theirConfidence),
      timestamp: new Date().toISOString(),
      method: 'auto'
    };
  }

  /**
   * Legal hierarchy resolution strategy
   */
  private async evaluateLegalHierarchy(conflict: MergeConflict): Promise<ConflictResolution | null> {
    if (conflict.objectType !== 'event') return null;

    const [ourEvent, theirEvent] = await Promise.all([
      this.loadObject(conflict.ours, 'event') as Promise<Event | null>,
      this.loadObject(conflict.theirs, 'event') as Promise<Event | null>
    ]);

    if (!ourEvent || !theirEvent || ourEvent.kind !== 'norm' || theirEvent.kind !== 'norm') {
      return null; // Only applies to legal norms
    }

    const legalHierarchy = {
      'constitution': 6,
      'statute': 5,
      'regulation': 4,
      'case-law': 3,
      'contract': 2,
      'policy': 1
    };

    const ourRank = legalHierarchy[ourEvent.metadata.source.legalType as keyof typeof legalHierarchy] || 0;
    const theirRank = legalHierarchy[theirEvent.metadata.source.legalType as keyof typeof legalHierarchy] || 0;

    if (ourRank === theirRank) return null; // Same hierarchy level

    const preferOurs = ourRank > theirRank;
    
    return {
      conflictId: `${conflict.logicalId}-${conflict.property}`,
      resolution: preferOurs ? 'ours' : 'theirs',
      reasoning: `Legal hierarchy: ${preferOurs ? ourEvent.metadata.source.legalType : theirEvent.metadata.source.legalType} takes precedence`,
      confidence: Math.abs(ourRank - theirRank) / 6, // Normalize to 0-1
      timestamp: new Date().toISOString(),
      method: 'auto'
    };
  }

  /**
   * Temporal precedence resolution strategy
   */
  private async evaluateTemporalPrecedence(conflict: MergeConflict): Promise<ConflictResolution | null> {
    const [ourObject, theirObject] = await Promise.all([
      this.loadObject(conflict.ours, conflict.objectType),
      this.loadObject(conflict.theirs, conflict.objectType)
    ]);

    if (!ourObject || !theirObject) return null;

    const ourTime = this.extractTimestamp(ourObject);
    const theirTime = this.extractTimestamp(theirObject);

    if (!ourTime || !theirTime) return null;

    const timeDiff = Math.abs(new Date(ourTime).getTime() - new Date(theirTime).getTime());
    
    // Only prefer newer if difference is significant (> 1 hour)
    if (timeDiff < 3600000) return null;

    const preferOurs = new Date(ourTime) > new Date(theirTime);
    
    return {
      conflictId: `${conflict.logicalId}-${conflict.property}`,
      resolution: preferOurs ? 'ours' : 'theirs',
      reasoning: `Temporal precedence: more recent change from ${preferOurs ? ourTime : theirTime}`,
      confidence: 0.6, // Medium confidence for temporal resolution
      timestamp: new Date().toISOString(),
      method: 'auto'
    };
  }

  /**
   * Semantic merging for text content
   */
  private async evaluateSemanticMerge(conflict: MergeConflict): Promise<ConflictResolution | null> {
    if (conflict.property !== 'description' && conflict.property !== 'title') {
      return null; // Only applies to text fields
    }

    const ourText = conflict.ours as string;
    const theirText = conflict.theirs as string;
    const baseText = conflict.base as string;

    if (typeof ourText !== 'string' || typeof theirText !== 'string') {
      return null;
    }

    // Simple semantic merge: prefer longer, more descriptive text
    let mergedText: string;
    let reasoning: string;

    if (ourText.length > theirText.length * 1.5) {
      mergedText = ourText;
      reasoning = 'Our version is significantly more detailed';
    } else if (theirText.length > ourText.length * 1.5) {
      mergedText = theirText;
      reasoning = 'Their version is significantly more detailed';
    } else if (baseText && ourText.includes(baseText) && theirText.includes(baseText)) {
      // Both extend the base - try to merge
      mergedText = this.mergeTextContent(baseText, ourText, theirText);
      reasoning = 'Merged complementary additions to base text';
    } else {
      return null; // Cannot determine good merge
    }

    return {
      conflictId: `${conflict.logicalId}-${conflict.property}`,
      resolution: 'custom',
      resolvedValue: mergedText,
      reasoning,
      confidence: 0.7,
      timestamp: new Date().toISOString(),
      method: 'auto'
    };
  }

  /**
   * Component version resolution strategy
   */
  private async evaluateComponentVersion(conflict: MergeConflict): Promise<ConflictResolution | null> {
    if (conflict.type !== 'component') return null;

    const ourComponent = conflict.ours as ComponentRef;
    const theirComponent = conflict.theirs as ComponentRef;

    if (!ourComponent || !theirComponent || ourComponent.logicalId !== theirComponent.logicalId) {
      return null;
    }

    // Prefer latest version (no version specified)
    if (!ourComponent.version && theirComponent.version) {
      return {
        conflictId: `${conflict.logicalId}-${conflict.property}`,
        resolution: 'ours',
        reasoning: 'Prefer latest version over pinned version',
        confidence: 0.8,
        timestamp: new Date().toISOString(),
        method: 'auto'
      };
    }

    if (ourComponent.version && !theirComponent.version) {
      return {
        conflictId: `${conflict.logicalId}-${conflict.property}`,
        resolution: 'theirs',
        reasoning: 'Prefer latest version over pinned version',
        confidence: 0.8,
        timestamp: new Date().toISOString(),
        method: 'auto'
      };
    }

    // Both have versions - prefer higher version number
    if (ourComponent.version && theirComponent.version) {
      const ourVersion = this.parseVersion(ourComponent.version);
      const theirVersion = this.parseVersion(theirComponent.version);
      
      if (ourVersion && theirVersion) {
        const comparison = this.compareVersions(ourVersion, theirVersion);
        if (comparison !== 0) {
          return {
            conflictId: `${conflict.logicalId}-${conflict.property}`,
            resolution: comparison > 0 ? 'ours' : 'theirs',
            reasoning: `Prefer higher version: ${comparison > 0 ? ourComponent.version : theirComponent.version}`,
            confidence: 0.9,
            timestamp: new Date().toISOString(),
            method: 'auto'
          };
        }
      }
    }

    return null;
  }

  /**
   * Create visual representation of conflict for user review
   */
  private async createConflictVisualization(conflict: MergeConflict): Promise<ConflictVisualization> {
    const [baseObject, ourObject, theirObject] = await Promise.all([
      conflict.base ? this.loadObject(conflict.base, conflict.objectType) : null,
      this.loadObject(conflict.ours, conflict.objectType),
      this.loadObject(conflict.theirs, conflict.objectType)
    ]);

    return {
      conflictId: `${conflict.logicalId}-${conflict.property}`,
      type: conflict.type,
      title: `${conflict.objectType} conflict: ${conflict.property}`,
      description: conflict.description,
      severity: conflict.severity,
      comparison: {
        base: baseObject ? {
          value: this.extractProperty(baseObject, conflict.property),
          label: 'Base (Common Ancestor)',
          confidence: this.extractConfidence(baseObject)
        } : undefined,
        ours: {
          value: this.extractProperty(ourObject, conflict.property),
          label: 'Our Changes',
          confidence: this.extractConfidence(ourObject),
          author: this.extractAuthor(ourObject),
          timestamp: this.extractTimestamp(ourObject)
        },
        theirs: {
          value: this.extractProperty(theirObject, conflict.property),
          label: 'Their Changes',
          confidence: this.extractConfidence(theirObject),
          author: this.extractAuthor(theirObject),
          timestamp: this.extractTimestamp(theirObject)
        }
      },
      suggestions: [] // Will be populated by resolution strategies
    };
  }

  /**
   * Interactive conflict resolution (CLI-based for now)
   */
  private async promptInteractiveResolution(
    conflict: MergeConflict,
    visualization: ConflictVisualization,
    autoResolution?: ConflictResolution | null
  ): Promise<ConflictResolution | null> {
    // For now, return null - in a real implementation, this would prompt the user
    // In the future, this could integrate with a CLI prompt or web UI
    console.log('Interactive resolution not implemented - would prompt user for:', {
      conflict: visualization,
      autoSuggestion: autoResolution
    });
    
    return null;
  }

  // Helper methods for extracting data from objects
  private async loadObject(hash: any, type: string): Promise<any> {
    if (typeof hash !== 'string') return hash;
    
    switch (type) {
      case 'entity':
        return await this.storage.entities.retrieve(hash);
      case 'action':
        return await this.storage.actions.retrieve(hash);
      case 'event':
        return await this.storage.events.retrieve(hash);
      default:
        return null;
    }
  }

  private extractConfidence(obj: any): number {
    return obj?.metadata?.confidence || 0.5;
  }

  private extractTimestamp(obj: any): string | null {
    return obj?.dateModified || obj?.dateRecorded || obj?.timestamp || null;
  }

  private extractAuthor(obj: any): string | null {
    return obj?.metadata?.author || obj?.author || null;
  }

  private extractProperty(obj: any, property?: string): any {
    if (!property) return obj;
    
    // Handle nested properties like 'properties.name'
    const parts = property.split('.');
    let value = obj;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  private mergeTextContent(base: string, ours: string, theirs: string): string {
    // Simple text merge - in practice, this could use more sophisticated algorithms
    const ourAdditions = ours.replace(base, '').trim();
    const theirAdditions = theirs.replace(base, '').trim();
    
    if (ourAdditions && theirAdditions) {
      return `${base} ${ourAdditions} ${theirAdditions}`.trim();
    }
    
    return ours.length > theirs.length ? ours : theirs;
  }

  private parseVersion(version: string): number[] | null {
    const parts = version.split('.').map(p => parseInt(p, 10));
    return parts.every(p => !isNaN(p)) ? parts : null;
  }

  private compareVersions(v1: number[], v2: number[]): number {
    const maxLength = Math.max(v1.length, v2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const a = v1[i] || 0;
      const b = v2[i] || 0;
      
      if (a > b) return 1;
      if (a < b) return -1;
    }
    
    return 0;
  }

  private addToResolutionHistory(logicalId: string, resolution: ConflictResolution): void {
    if (!this.resolutionHistory.has(logicalId)) {
      this.resolutionHistory.set(logicalId, []);
    }
    this.resolutionHistory.get(logicalId)!.push(resolution);
  }

  /**
   * Get resolution history for learning and analysis
   */
  getResolutionHistory(logicalId?: string): Map<string, ConflictResolution[]> {
    if (logicalId) {
      const history = this.resolutionHistory.get(logicalId);
      return history ? new Map([[logicalId, history]]) : new Map();
    }
    return new Map(this.resolutionHistory);
  }

  /**
   * Export resolution statistics for analysis
   */
  getResolutionStatistics(): {
    totalConflicts: number;
    resolvedByMethod: Record<string, number>;
    averageConfidence: number;
    conflictsByType: Record<ConflictType, number>;
  } {
    const allResolutions = Array.from(this.resolutionHistory.values()).flat();
    
    const resolvedByMethod: Record<string, number> = {};
    const conflictsByType: Record<ConflictType, number> = {} as any;
    let totalConfidence = 0;

    for (const resolution of allResolutions) {
      resolvedByMethod[resolution.method] = (resolvedByMethod[resolution.method] || 0) + 1;
      totalConfidence += resolution.confidence;
    }

    return {
      totalConflicts: allResolutions.length,
      resolvedByMethod,
      averageConfidence: allResolutions.length > 0 ? totalConfidence / allResolutions.length : 0,
      conflictsByType // Would need to track this during resolution
    };
  }
}

/**
 * Convenience function for advanced conflict resolution
 */
export async function resolveConflictsAdvanced(
  storage: StorageAdapter,
  conflicts: MergeConflict[],
  options: MergeOptions & {
    interactive?: boolean;
    autoResolveThreshold?: number;
    preserveHistory?: boolean;
  } = {}
) {
  const resolver = new AdvancedConflictResolver(storage);
  return resolver.resolveConflicts(conflicts, options);
}