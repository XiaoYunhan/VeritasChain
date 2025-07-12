/**
 * Event and Relationship Definitions
 *
 * Core event structure supporting both factual events (news)
 * and normative clauses (legal) with unified logical reasoning.
 */
import type { Statement } from './statement.js';
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
