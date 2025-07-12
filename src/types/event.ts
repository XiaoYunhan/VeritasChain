/**
 * Event and Relationship Definitions
 * 
 * Core event structure supporting both factual events (news) 
 * and normative clauses (legal) with unified logical reasoning.
 */

import type { Statement } from './statement.js';
import type { 
  TemporalModifier, 
  SpatialModifier, 
  MannerModifier, 
  DegreeModifier, 
  PurposeModifier, 
  ConditionalModifier, 
  CertaintyModifier, 
  LegalModifier 
} from './modifiers.js';

// Relationship types - unified and clear
export interface EventRelationship {
  type: 
    // Causal relationships
    | 'causedBy'        // This event was caused by target
    | 'causes'          // This event causes target
    | 'enables'         // This event enables target
    | 'prevents'        // This event prevents target
    | 'threatens'       // This event threatens target
    
    // Informational relationships  
    | 'derivedFrom'     // This event was derived from target
    | 'supports'        // This event supports target
    | 'contradicts'     // This event contradicts target
    | 'updates'         // This event updates target
    | 'corrects'        // This event corrects target
    | 'clarifies'       // This event clarifies target
    
    // Structural relationships
    | 'relatedTo'       // General relationship
    | 'partOf'          // This event is part of target
    | 'contains'        // This event contains target
    | 'precedes'        // This event happens before target
    | 'follows'         // This event happens after target
    
    // PHASE 1: Legal relationships for normative clauses
    | 'amends'          // This norm amends target norm
    | 'supersedes'      // This norm replaces target norm
    | 'refersTo'        // This norm references target norm/fact
    | 'dependentOn';    // This norm depends on target norm/fact
    
  target: string;       // @id of target event
  strength: number;     // 0-1 relationship strength
  description?: string; // Human-readable description
}

export interface EventMetadata {
  source: {
    name: string;
    type: 'NewsAgency' | 'Government' | 'Corporate' | 'Academic' | 'Social';
    url?: string;
    
    // PHASE 1: Legal source hierarchy for kind='norm'
    legalType?: 'constitution' | 'statute' | 'regulation' | 'case-law' | 'contract' | 'policy';
  };
  author: string;
  
  // NEVER set these manually - always calculated
  confidence?: number;     // 0-1, = (1-V) × E × S
  volatility?: number;     // 0-1, calculated from change history
  sourceScore?: number;    // 0-1, from source.type (for kind='fact')
  legalHierarchyWeight?: number; // 0-1, for kind='norm' (replaces sourceScore)
  
  // Additional metadata
  tags?: string[];
  classification?: string;
  verifiedBy?: string[];
}

export interface Event {
  "@context": "https://schema.org/";
  "@type": "Event";  // Generic event type
  "@id": string;  // SHA-256 hash of content (ONLY identifier)
  
  // Event versioning (trackable via commits)
  logicalId: string;  // Logical event identifier (UUID v4)
  version: string;    // Semantic version (1.0, 1.1, etc.)
  previousVersion?: string;  // @id of previous version
  commitHash: string;
  
  // Core content
  title: string;  // Generic title (not just news headline)
  description?: string;  // Optional detailed description
  dateOccurred: string;  // When the event actually happened (ISO 8601)
  dateRecorded: string;  // When we recorded it (ISO 8601)
  dateModified?: string;
  
  // PHASE 1: Event kind - fact (default) or norm (legal clause)
  kind?: 'fact' | 'norm';  // Default: 'fact' for existing events
  
  // Unified logical statement (can be simple SVO or complex logical structure)
  statement: Statement;
  
  // Context and modifiers - STANDARDIZED
  modifiers: {
    temporal?: TemporalModifier;    // When, duration, frequency
    spatial?: SpatialModifier;      // Where, location, scope
    manner?: MannerModifier;        // How, method, style
    degree?: DegreeModifier;        // Extent, intensity, amount
    purpose?: PurposeModifier;      // Why, intention, goal
    condition?: ConditionalModifier; // If, unless, conditional
    certainty?: CertaintyModifier;   // Confidence, evidence, reliability
    legal?: LegalModifier;          // PHASE 1: Jurisdiction, effectiveDate, normForce
  };
  
  // Inter-event relationships
  relationships?: EventRelationship[];
  
  // Event metadata and provenance
  metadata: EventMetadata;
}