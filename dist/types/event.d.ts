/**
 * Event and Relationship Definitions
 *
 * Core event structure supporting both factual events (news)
 * and normative clauses (legal) with unified logical reasoning.
 */
import type { Statement, LogicalClause } from './statement.js';
import type { TemporalModifier, SpatialModifier, MannerModifier, DegreeModifier, PurposeModifier, ConditionalModifier, CertaintyModifier, LegalModifier } from './modifiers.js';
export interface EventRelationship {
    type: 'causedBy' | 'causes' | 'enables' | 'prevents' | 'threatens' | 'derivedFrom' | 'supports' | 'contradicts' | 'updates' | 'corrects' | 'clarifies' | 'relatedTo' | 'partOf' | 'contains' | 'precedes' | 'follows' | 'amends' | 'supersedes' | 'refersTo' | 'dependentOn';
    target: string;
    strength: number;
    description?: string;
}
export interface EventMetadata {
    source: {
        name: string;
        type: 'NewsAgency' | 'Government' | 'Corporate' | 'Academic' | 'Social';
        url?: string;
        legalType?: 'constitution' | 'statute' | 'regulation' | 'case-law' | 'contract' | 'policy';
    };
    author: string;
    confidence?: number;
    volatility?: number;
    sourceScore?: number;
    legalHierarchyWeight?: number;
    tags?: string[];
    classification?: string;
    verifiedBy?: string[];
}
export interface Event {
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
    metadata: EventMetadata;
}
/**
 * Component reference supporting both logical ID (latest) and version-specific modes
 */
export interface ComponentRef {
    logicalId: string;
    version?: string;
}
/**
 * Validation matrix entry for pre-merge conflict detection
 */
export interface AggregationConstraint {
    logic: 'AND' | 'OR' | 'ORDERED_ALL' | 'CUSTOM';
    requirements: string[];
    conflicts: string[];
    validationFn?: (components: Event[], macro: MacroEvent) => boolean;
}
/**
 * PHASE 2: Composite Event (L2) - MacroEvent
 *
 * Represents a higher-level narrative composed of multiple atomic events.
 * Supports aggregation logic for confidence calculation and complex
 * logical relationships between component events.
 */
export interface MacroEvent extends Omit<Event, "@type"> {
    "@type": "MacroEvent";
    components: ComponentRef[];
    aggregation?: 'AND' | 'OR' | 'ORDERED_ALL' | 'CUSTOM';
    timelineSpan?: {
        start: string;
        end: string;
    };
    customRuleId?: string;
    summary?: string;
    labels?: string[];
    importance?: 1 | 2 | 3 | 4 | 5;
    statement: LogicalClause;
}
