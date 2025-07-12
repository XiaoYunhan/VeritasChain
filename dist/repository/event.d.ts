/**
 * Event Repository Operations
 *
 * High-level operations for managing Event instances with automatic confidence
 * calculation, pattern observation, and version control.
 */
import type { Event, EventRelationship } from '../types/event.js';
import type { Statement } from '../types/statement.js';
import type { TemporalModifier, SpatialModifier, MannerModifier, DegreeModifier, PurposeModifier, ConditionalModifier, CertaintyModifier, LegalModifier } from '../types/modifiers.js';
import type { EventChange } from '../types/confidence.js';
import type { StorageAdapter } from '../adapters/interfaces.js';
export interface CreateEventParams {
    title: string;
    description?: string;
    dateOccurred: string;
    kind?: 'fact' | 'norm';
    statement: Statement;
    modifiers: {
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
    source: {
        name: string;
        type: 'NewsAgency' | 'Government' | 'Corporate' | 'Academic' | 'Social';
        url?: string;
        legalType?: 'constitution' | 'statute' | 'regulation' | 'case-law' | 'contract' | 'policy';
    };
    author: string;
}
export interface UpdateEventParams {
    logicalId: string;
    title?: string;
    description?: string;
    dateOccurred?: string;
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
    source?: {
        name?: string;
        type?: 'NewsAgency' | 'Government' | 'Corporate' | 'Academic' | 'Social';
        url?: string;
        legalType?: 'constitution' | 'statute' | 'regulation' | 'case-law' | 'contract' | 'policy';
    };
    author?: string;
}
export declare class EventRepository {
    private storage;
    constructor(storage: StorageAdapter);
    /**
     * Create a new event with automatic confidence calculation
     */
    createEvent(params: CreateEventParams, commitHash: string): Promise<Event>;
    /**
     * Update an existing event (creates new version with recalculated confidence)
     */
    updateEvent(params: UpdateEventParams, commitHash: string, changeType?: EventChange['changeType']): Promise<Event>;
    /**
     * Get event by ID
     */
    getEvent(id: string): Promise<Event | null>;
    /**
     * Get latest version of event by logical ID
     */
    getLatestEvent(logicalId: string): Promise<Event | null>;
    /**
     * Get all versions of an event
     */
    getEventHistory(logicalId: string): Promise<Event[]>;
    /**
     * Get events by kind (fact vs norm)
     */
    getEventsByKind(kind: 'fact' | 'norm'): Promise<Event[]>;
    /**
     * Get events in date range
     */
    getEventsByDateRange(start: string, end: string): Promise<Event[]>;
    /**
     * Get events related to a specific event
     */
    getRelatedEvents(eventId: string): Promise<Event[]>;
    /**
     * Search events
     */
    searchEvents(query: {
        title?: string;
        author?: string;
        sourceType?: string;
        jurisdiction?: string;
        kind?: 'fact' | 'norm';
    }): Promise<Event[]>;
    /**
     * Get change history for confidence calculation
     */
    getChangeHistory(logicalId: string): Promise<EventChange[]>;
    /**
     * Calculate confidence for existing event (for debugging/verification)
     */
    recalculateConfidence(logicalId: string): Promise<{
        currentConfidence: number;
        recalculatedConfidence: number;
        factors: any;
    }>;
    private incrementVersion;
    private compareVersions;
    private getChangedFields;
    private getChangedFieldsBetweenVersions;
}
