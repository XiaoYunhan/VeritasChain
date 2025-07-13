/**
 * Unified Event Type Definitions
 * 
 * A single recursive Event type that can represent both leaf events and
 * composite events (formerly MacroEvents). Any event can reference other
 * events through the optional components array, enabling infinite narrative layers.
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

/**
 * Component reference for recursive event composition
 */
export interface ComponentRef {
  logicalId: string;              // Points to logical entity
  version?: string;               // Can lock to specific version (optional = latest)
  weak?: boolean;                 // true = soft dependency, ignore in confidence aggregation
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
  "@type": "Event";               // No longer distinguish between Event/MacroEvent
  "@id": string;                  // SHA-256 content hash
  
  // Version control
  logicalId: string;              // UUID v4 for logical grouping
  version: string;                // Semantic version
  previousVersion?: string;       // Previous version @id
  commitHash: string;             // Creating commit hash
  
  // Core content
  title: string;
  description?: string;
  dateOccurred: string;           // ISO 8601 when event happened
  dateRecorded: string;           // ISO 8601 when recorded
  dateModified?: string;          // ISO 8601 last modification
  
  // Event classification
  kind?: 'fact' | 'norm';         // Default: 'fact'
  
  // Logical statement - can be atomic or composite
  statement: Stmt;                // Leaf = SVO/LogicalClause, Composite = usually LogicalClause
  
  // Modifiers and relationships
  modifiers?: Modifiers;
  relationships?: EventRelationship[];
  
  // Composite event fields (optional)
  components?: ComponentRef[];    // Presence indicates composite event
  aggregation?: AggregationLogic; // How to combine components (default: 'ALL')
  customRuleId?: string;          // For CUSTOM aggregation logic
  depth?: number;                 // Cached expansion depth (system-managed)
  summary?: string;               // Human-readable summary for composite events
  
  // Timeline visualization (useful for composite events)
  timelineSpan?: {
    start: string;                // ISO 8601
    end: string;                  // ISO 8601
  };
  
  // Importance level (1-5, useful for filtering/ranking)
  importance?: 1 | 2 | 3 | 4 | 5;
  
  // Metadata
  metadata: EventMetadata;
  
  // Blockchain preparation
  signature?: string;
  merkleRoot?: string;
}

/**
 * Helper function to determine if an event is composite
 */
export function isComposite(event: Event): boolean {
  return !!(event.components && event.components.length > 0);
}

/**
 * Helper function to get event type for backward compatibility
 */
export function getEventType(event: Event): string {
  if (isComposite(event)) {
    return 'CompositeEvent';
  }
  return 'Event';
}

/**
 * Migration helper to convert old MacroEvent format
 */
export function migrateMacroEvent(oldEvent: any): Event {
  const newEvent: Event = {
    ...oldEvent,
    "@type": "Event"
  };
  
  // Map old field names
  if ('aggregationLogic' in oldEvent) {
    newEvent.aggregation = mapAggregationLogic(oldEvent.aggregationLogic);
    delete (newEvent as any).aggregationLogic;
  }
  
  // Convert old component format if needed
  if (oldEvent.components && typeof oldEvent.components[0] === 'string') {
    newEvent.components = oldEvent.components.map((id: string) => ({
      logicalId: id, // Will need resolution in migration script
      version: oldEvent.version || '1.0' // Use latest by default
    }));
  }
  
  return newEvent;
}

/**
 * Map old aggregation logic values to new format
 */
function mapAggregationLogic(old: string): AggregationLogic {
  const mapping: Record<string, AggregationLogic> = {
    'AND': 'ALL',
    'OR': 'ANY',
    'ORDERED_ALL': 'ORDERED',
    'CUSTOM': 'CUSTOM'
  };
  return mapping[old] || 'ALL';
}

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
    
    // Legal source hierarchy for kind='norm'
    legalType?: 'constitution' | 'statute' | 'regulation' | 'case-law' | 'contract' | 'policy';
  };
  author: string;
  version: string;
  
  // NEVER set these manually - always calculated
  confidence?: number;     // 0-1, = (1-V) × E × S
  volatility?: number;     // 0-1, calculated from change history
  evidenceScore?: number;  // 0-1, from certainty.evidence
  sourceScore?: number;    // 0-1, from source.type (for kind='fact')
  legalHierarchyWeight?: number; // 0-1, for kind='norm' (replaces sourceScore)
  
  // Additional metadata
  lastModified?: string;
  datePublished?: string;  // ISO 8601
  tags?: string[];
  classification?: string;
  verifiedBy?: string[];
}

/**
 * Relationships between events
 */
export interface EventRelationship {
  type: 
    // Causal relationships
    | 'causedBy'        // This event was caused by target
    | 'causes'          // This event causes target
    | 'enables'         // This event enables target
    | 'prevents'        // This event prevents target
    | 'threatens'       // This event threatens target
    
    // Informational relationships  
    | 'derivedFrom'     // This event info derived from target
    | 'supports'        // This event supports target's claims
    | 'contradicts'     // This event contradicts target
    | 'updates'         // This event updates target
    | 'corrects'        // This event corrects target
    
    // Contextual relationships
    | 'relatedTo'       // General relationship
    | 'partOf'          // This event is part of target
    | 'contains'        // This event contains target
    | 'precedes'        // This event happens before target
    | 'follows'         // This event happens after target
    
    // Legal relationships for normative clauses
    | 'amends'          // This norm amends target norm
    | 'supersedes'      // This norm replaces target norm
    | 'refersTo'        // This norm references target norm/fact
    | 'dependentOn';    // This norm depends on target norm/fact
    
  target: string;       // @id of target event
  strength?: number;    // 0-1 relationship strength (defaults to source event confidence)
  confidence?: number;  // 0-1 confidence in relationship (defaults to relationship evidence)
  description?: string; // Optional explanation
}

/**
 * Calculate the depth of an event (recursively)
 */
export async function calculateDepth(
  event: Event,
  loader: (logicalId: string, version?: string) => Promise<Event | null>
): Promise<number> {
  if (!isComposite(event)) {
    return 0; // Leaf event
  }

  let maxDepth = 0;
  const visited = new Set<string>();
  
  for (const component of event.components || []) {
    // Prevent infinite recursion
    const key = `${component.logicalId}${component.version ? `@${component.version}` : ''}`;
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);
    
    const childEvent = await loader(component.logicalId, component.version);
    if (childEvent) {
      const childDepth = await calculateDepth(childEvent, loader);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  }
  
  return maxDepth + 1;
}

/**
 * Derive confidence formula for composite events
 */
export async function deriveConfidenceFormula(
  event: Event,
  loader: (logicalId: string, version?: string) => Promise<Event | null>
): Promise<string> {
  if (!isComposite(event)) {
    return `${event.metadata.confidence?.toFixed(3) || '0.000'}`;
  }

  const componentFormulas: string[] = [];
  
  for (const component of event.components || []) {
    const childEvent = await loader(component.logicalId, component.version);
    if (childEvent) {
      if (component.weak) {
        // Weak dependencies don't contribute to formula
        continue;
      }
      
      const childFormula = await deriveConfidenceFormula(childEvent, loader);
      componentFormulas.push(childFormula);
    }
  }
  
  if (componentFormulas.length === 0) {
    return `${event.metadata.confidence?.toFixed(3) || '0.000'}`;
  }
  
  // Format based on aggregation logic
  switch (event.aggregation || 'ALL') {
    case 'ALL':
      return `min(${componentFormulas.join(', ')})`;
    case 'ANY':
      return `max(${componentFormulas.join(', ')})`;
    case 'ORDERED':
      return `sequence(${componentFormulas.join(' → ')})`;
    case 'CUSTOM':
      return `custom(${componentFormulas.join(', ')})`;
    default:
      return `all(${componentFormulas.join(', ')})`;
  }
}