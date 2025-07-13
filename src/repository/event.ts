/**
 * Event Repository Operations
 * 
 * High-level operations for managing Event instances with automatic confidence
 * calculation, pattern observation, and version control.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Event, EventRelationship } from '../types/event.js';
import type { Statement } from '../types/statement.js';
import type { 
  TemporalModifier, 
  SpatialModifier, 
  MannerModifier, 
  DegreeModifier, 
  PurposeModifier, 
  ConditionalModifier, 
  CertaintyModifier, 
  LegalModifier 
} from '../types/modifiers.js';
import type { ConfidenceCalculation } from '../types/confidence.js';
import type { EventChange } from '../types/confidence.js';
import type { StorageAdapter } from '../adapters/interfaces.js';
import { calculateEventHash } from '../core/hash.js';
import { confidenceCalculator } from '../core/confidence.js';
import { patternObserver } from '../core/patterns.js';

export interface CreateEventParams {
  title: string;
  description?: string;
  dateOccurred: string;  // ISO 8601
  kind?: 'fact' | 'norm';  // Default: 'fact'
  
  // Unified statement (SVO or complex logical structure)
  statement: Statement;
  
  // Context modifiers
  modifiers: {
    temporal?: TemporalModifier;
    spatial?: SpatialModifier;
    manner?: MannerModifier;
    degree?: DegreeModifier;
    purpose?: PurposeModifier;
    condition?: ConditionalModifier;
    certainty?: CertaintyModifier;
    legal?: LegalModifier;  // Required for kind='norm'
  };
  
  // Relationships to other events
  relationships?: EventRelationship[];
  
  // Source and authorship
  source: {
    name: string;
    type: 'NewsAgency' | 'Government' | 'Corporate' | 'Academic' | 'Social';
    url?: string;
    legalType?: 'constitution' | 'statute' | 'regulation' | 'case-law' | 'contract' | 'policy';
  };
  author: string;
  version?: string;  // Default to '1.0' if not provided
}

export interface UpdateEventParams {
  logicalId: string;
  title?: string;
  description?: string;
  dateOccurred?: string;
  
  // Can update statement, modifiers, relationships
  statement?: Statement;
  modifiers?: {
    temporal?: TemporalModifier;
    spatial?: SpatialModifier;
    manner?: MannerModifier;
    degree?: DegreeModifier;
    purpose?: PurposeModifier;
    condition?: ConditionalModifier;
    certainty?: CertaintyModifier;
    legal?: LegalModifier;
  };
  relationships?: EventRelationship[];
  
  // Source updates
  source?: {
    name?: string;
    type?: 'NewsAgency' | 'Government' | 'Corporate' | 'Academic' | 'Social';
    url?: string;
    legalType?: 'constitution' | 'statute' | 'regulation' | 'case-law' | 'contract' | 'policy';
  };
  author?: string;
}

export class EventRepository {
  constructor(private storage: StorageAdapter) {}
  
  /**
   * Create a new event with automatic confidence calculation
   */
  async createEvent(params: CreateEventParams, commitHash: string): Promise<Event> {
    const logicalId = uuidv4();
    const now = new Date().toISOString();
    
    // Validate legal clauses have required fields
    if (params.kind === 'norm') {
      if (!params.source.legalType) {
        throw new Error('Legal clauses (kind=norm) must specify source.legalType');
      }
      if (!params.modifiers.legal?.jurisdiction) {
        throw new Error('Legal clauses (kind=norm) must specify modifiers.legal.jurisdiction');
      }
    }
    
    // Validate relationships
    if (params.relationships) {
      for (const rel of params.relationships) {
        if (!patternObserver.validateRelationshipType(rel.type)) {
          throw new Error(`Invalid relationship type: ${rel.type}`);
        }
      }
    }
    
    // Calculate confidence automatically (NEVER set manually)
    const changeHistory: EventChange[] = [{
      timestamp: now,
      commitId: commitHash,
      changeType: 'created',
      changedFields: ['*'],
      author: params.author
    }];
    
    const evidenceType = params.modifiers.certainty?.evidence ?? 'reported';
    const confidenceCalc = confidenceCalculator.calculate({
      changeHistory,
      evidenceType,
      sourceType: params.kind === 'norm' ? undefined : params.source.type,
      legalType: params.kind === 'norm' ? params.source.legalType : undefined,
      normForce: params.modifiers.legal?.normForce
    });
    
    const eventData: Omit<Event, '@id'> = {
      '@context': 'https://schema.org/',
      '@type': 'Event',
      logicalId,
      version: '1.0',
      commitHash,
      title: params.title,
      description: params.description,
      dateOccurred: params.dateOccurred,
      dateRecorded: now,
      kind: params.kind || 'fact',
      statement: params.statement,
      modifiers: params.modifiers,
      relationships: params.relationships,
      metadata: {
        source: params.source,
        author: params.author,
        version: params.version || '1.0',
        // AUTO-CALCULATED fields
        confidence: confidenceCalc.result,
        volatility: confidenceCalc.factors.volatility,
        sourceScore: params.kind === 'norm' ? undefined : confidenceCalc.factors.source,
        legalHierarchyWeight: params.kind === 'norm' ? confidenceCalc.factors.source : undefined
      }
    };
    
    const contentHash = calculateEventHash(eventData);
    const event: Event = {
      '@id': contentHash,
      ...eventData
    };
    
    // Store the event
    await this.storage.events.store(contentHash, event);
    
    // PHASE 1: Observe patterns for future learning
    if (event.statement.type === 'SVO') {
      patternObserver.observeSVO(event.statement, contentHash);
    }
    
    if (event.relationships) {
      for (const rel of event.relationships) {
        patternObserver.observeRelationship(rel, contentHash);
      }
    }
    
    return event;
  }
  
  /**
   * Update an existing event (creates new version with recalculated confidence)
   */
  async updateEvent(params: UpdateEventParams, commitHash: string, changeType: EventChange['changeType'] = 'modified'): Promise<Event> {
    // Get current latest version
    const currentEvent = await this.storage.events.getLatestVersion(params.logicalId);
    if (!currentEvent) {
      throw new Error(`Event with logicalId ${params.logicalId} not found`);
    }
    
    // Get change history for confidence calculation
    const changeHistory = await this.getChangeHistory(params.logicalId);
    
    // Add this change to history
    const now = new Date().toISOString();
    const changedFields = this.getChangedFields(currentEvent, params);
    changeHistory.push({
      timestamp: now,
      commitId: commitHash,
      changeType,
      changedFields,
      author: params.author || currentEvent.metadata.author
    });
    
    // Increment version
    const newVersion = this.incrementVersion(currentEvent.version);
    
    // Merge updates with current event
    const updatedSource = {
      ...currentEvent.metadata.source,
      ...params.source
    };
    
    const updatedModifiers = {
      ...currentEvent.modifiers,
      ...params.modifiers
    };
    
    // Recalculate confidence with new change history
    const evidenceType = updatedModifiers.certainty?.evidence ?? currentEvent.modifiers.certainty?.evidence ?? 'reported';
    const confidenceCalc = confidenceCalculator.calculate({
      changeHistory,
      evidenceType,
      sourceType: currentEvent.kind === 'norm' ? undefined : updatedSource.type,
      legalType: currentEvent.kind === 'norm' ? updatedSource.legalType : undefined,
      normForce: updatedModifiers.legal?.normForce
    });
    
    const eventData: Omit<Event, '@id'> = {
      '@context': 'https://schema.org/',
      '@type': 'Event',
      logicalId: params.logicalId,
      version: newVersion,
      previousVersion: currentEvent['@id'],
      commitHash,
      title: params.title ?? currentEvent.title,
      description: params.description ?? currentEvent.description,
      dateOccurred: params.dateOccurred ?? currentEvent.dateOccurred,
      dateRecorded: currentEvent.dateRecorded,
      dateModified: now,
      kind: currentEvent.kind,
      statement: params.statement ?? currentEvent.statement,
      modifiers: updatedModifiers,
      relationships: params.relationships ?? currentEvent.relationships,
      metadata: {
        source: updatedSource,
        author: params.author ?? currentEvent.metadata.author,
        version: newVersion,
        // AUTO-CALCULATED fields (recalculated)
        confidence: confidenceCalc.result,
        volatility: confidenceCalc.factors.volatility,
        sourceScore: currentEvent.kind === 'norm' ? undefined : confidenceCalc.factors.source,
        legalHierarchyWeight: currentEvent.kind === 'norm' ? confidenceCalc.factors.source : undefined
      }
    };
    
    const contentHash = calculateEventHash(eventData);
    const event: Event = {
      '@id': contentHash,
      ...eventData
    };
    
    await this.storage.events.store(contentHash, event);
    
    return event;
  }
  
  /**
   * Get event by ID
   */
  async getEvent(id: string): Promise<Event | null> {
    return this.storage.events.retrieve(id);
  }
  
  /**
   * Get latest version of event by logical ID
   */
  async getLatestEvent(logicalId: string): Promise<Event | null> {
    return this.storage.events.getLatestVersion(logicalId);
  }
  
  /**
   * Get all versions of an event
   */
  async getEventHistory(logicalId: string): Promise<Event[]> {
    const events = await this.storage.events.findByLogicalId(logicalId);
    return events.sort((a, b) => this.compareVersions(a.version, b.version));
  }
  
  /**
   * Get events by kind (fact vs norm)
   */
  async getEventsByKind(kind: 'fact' | 'norm'): Promise<Event[]> {
    return this.storage.events.findByKind(kind);
  }
  
  /**
   * Get events in date range
   */
  async getEventsByDateRange(start: string, end: string): Promise<Event[]> {
    return this.storage.events.findByDateRange(start, end);
  }
  
  /**
   * Get events related to a specific event
   */
  async getRelatedEvents(eventId: string): Promise<Event[]> {
    return this.storage.events.findRelated(eventId);
  }
  
  /**
   * Search events
   */
  async searchEvents(query: { 
    title?: string; 
    author?: string; 
    sourceType?: string;
    jurisdiction?: string;
    kind?: 'fact' | 'norm';
  }): Promise<Event[]> {
    let results = await this.storage.events.search(query);
    
    // Additional filtering by kind if specified
    if (query.kind) {
      results = results.filter(event => (event.kind || 'fact') === query.kind);
    }
    
    return results;
  }
  
  /**
   * Get change history for confidence calculation
   */
  async getChangeHistory(logicalId: string): Promise<EventChange[]> {
    // In a real implementation, this would be stored separately
    // For now, reconstruct from event versions
    const events = await this.getEventHistory(logicalId);
    
    const changes: EventChange[] = [];
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const changeType = i === 0 ? 'created' : 'modified';
      
      changes.push({
        timestamp: event.dateModified || event.dateRecorded,
        commitId: event.commitHash,
        changeType,
        changedFields: i === 0 ? ['*'] : this.getChangedFieldsBetweenVersions(events[i-1], event),
        author: event.metadata.author
      });
    }
    
    return changes;
  }
  
  /**
   * Calculate confidence for existing event (for debugging/verification)
   */
  async recalculateConfidence(logicalId: string): Promise<{
    currentConfidence: number;
    recalculatedConfidence: number;
    factors: ConfidenceCalculation;
  }> {
    const event = await this.getLatestEvent(logicalId);
    if (!event) {
      throw new Error(`Event with logicalId ${logicalId} not found`);
    }
    
    const changeHistory = await this.getChangeHistory(logicalId);
    const confidenceCalc = confidenceCalculator.calculateForEvent(event, changeHistory);
    
    return {
      currentConfidence: event.metadata.confidence || 0,
      recalculatedConfidence: confidenceCalc.result,
      factors: confidenceCalc
    };
  }
  
  // Private helper methods
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[parts.length - 1] += 1; // Increment patch version
    return parts.join('.');
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
  
  private getChangedFields(current: Event, update: UpdateEventParams): string[] {
    const changed: string[] = [];
    
    if (update.title && update.title !== current.title) changed.push('title');
    if (update.description && update.description !== current.description) changed.push('description');
    if (update.dateOccurred && update.dateOccurred !== current.dateOccurred) changed.push('dateOccurred');
    if (update.statement) changed.push('statement');
    if (update.modifiers) changed.push('modifiers');
    if (update.relationships) changed.push('relationships');
    if (update.source) changed.push('source');
    if (update.author && update.author !== current.metadata.author) changed.push('author');
    
    return changed;
  }
  
  private getChangedFieldsBetweenVersions(prev: Event, current: Event): string[] {
    const changed: string[] = [];
    
    if (prev.title !== current.title) changed.push('title');
    if (prev.description !== current.description) changed.push('description');
    if (prev.dateOccurred !== current.dateOccurred) changed.push('dateOccurred');
    if (JSON.stringify(prev.statement) !== JSON.stringify(current.statement)) changed.push('statement');
    if (JSON.stringify(prev.modifiers) !== JSON.stringify(current.modifiers)) changed.push('modifiers');
    if (JSON.stringify(prev.relationships) !== JSON.stringify(current.relationships)) changed.push('relationships');
    if (JSON.stringify(prev.metadata.source) !== JSON.stringify(current.metadata.source)) changed.push('source');
    if (prev.metadata.author !== current.metadata.author) changed.push('author');
    
    return changed;
  }
}