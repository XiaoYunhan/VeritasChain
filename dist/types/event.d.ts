/**
 * Unified Event Type Definitions
 *
 * A single recursive Event type that can represent both leaf events and
 * composite events (formerly MacroEvents). Any event can reference other
 * events through the optional components array, enabling infinite narrative layers.
 */
import type { Statement } from './statement.js';
import type { TemporalModifier, SpatialModifier, MannerModifier, DegreeModifier, PurposeModifier, ConditionalModifier, CertaintyModifier, LegalModifier } from './modifiers.js';
/**
 * Component reference for recursive event composition
 */
export interface ComponentRef {
    logicalId: string;
    version?: string;
    weak?: boolean;
}
/**
 * Aggregation logic for composite events
 */
export type AggregationLogic = 'ALL' | 'ANY' | 'ORDERED' | 'CUSTOM';
/**
 * Modifier collection for events
 */
export interface Modifiers {
    temporal?: TemporalModifier;
    spatial?: SpatialModifier;
    manner?: MannerModifier;
    degree?: DegreeModifier;
    purpose?: PurposeModifier;
    condition?: ConditionalModifier;
    certainty?: CertaintyModifier;
    legal?: LegalModifier;
}
/**
 * Unified Event Interface
 *
 * Represents both atomic events (no components) and composite events (with components).
 * The presence of the components array determines whether this is a leaf or composite event.
 */
export interface Event<Stmt extends Statement = Statement> {
    "@context": "https://schema.org/";
    "@type": "Event";
    "@id": string;
    logicalId: string;
    version: string;
    previousVersion?: string;
    commitHash: string;
    title: string;
    description?: string;
    dateOccurred: string;
    dateRecorded: string;
    dateModified?: string;
    kind?: 'fact' | 'norm';
    statement: Stmt;
    modifiers?: Modifiers;
    relationships?: EventRelationship[];
    components?: ComponentRef[];
    aggregation?: AggregationLogic;
    customRuleId?: string;
    depth?: number;
    summary?: string;
    timelineSpan?: {
        start: string;
        end: string;
    };
    importance?: 1 | 2 | 3 | 4 | 5;
    metadata: EventMetadata;
    signature?: string;
    merkleRoot?: string;
}
/**
 * Helper function to determine if an event is composite
 */
export declare function isComposite(event: Event): boolean;
/**
 * Helper function to get event type for backward compatibility
 */
export declare function getEventType(event: Event): string;
/**
 * Migration helper to convert old MacroEvent format
 */
export declare function migrateMacroEvent(oldEvent: any): Event;
/**
 * Backward compatibility type alias
 * @deprecated Use Event directly
 */
export type MacroEvent = Event;
/**
 * Export for backward compatibility
 * @deprecated Import from event.ts directly
 */
export type { Event as NewsEvent };
/**
 * Event metadata including source and calculated confidence
 */
export interface EventMetadata {
    source: {
        name: string;
        type: 'NewsAgency' | 'Government' | 'Corporate' | 'Academic' | 'Social';
        url?: string;
        legalType?: 'constitution' | 'statute' | 'regulation' | 'case-law' | 'contract' | 'policy';
    };
    author: string;
    version: string;
    confidence?: number;
    volatility?: number;
    evidenceScore?: number;
    sourceScore?: number;
    legalHierarchyWeight?: number;
    lastModified?: string;
    datePublished?: string;
    tags?: string[];
    classification?: string;
    verifiedBy?: string[];
}
/**
 * Relationships between events
 */
export interface EventRelationship {
    type: 'causedBy' | 'causes' | 'enables' | 'prevents' | 'threatens' | 'derivedFrom' | 'supports' | 'contradicts' | 'updates' | 'corrects' | 'relatedTo' | 'partOf' | 'contains' | 'precedes' | 'follows' | 'amends' | 'supersedes' | 'refersTo' | 'dependentOn';
    target: string;
    strength?: number;
    confidence?: number;
    description?: string;
}
/**
 * Calculate the depth of an event (recursively)
 */
export declare function calculateDepth(event: Event, loader: (logicalId: string, version?: string) => Promise<Event | null>): Promise<number>;
/**
 * Derive confidence formula for composite events
 */
export declare function deriveConfidenceFormula(event: Event, loader: (logicalId: string, version?: string) => Promise<Event | null>): Promise<string>;
