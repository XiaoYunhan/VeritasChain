/**
 * VeritasChain Type Definitions
 * 
 * Central export point for all TypeScript interfaces and types.
 * All types follow strict TypeScript mode with no 'any' allowed.
 */

// Core object types
export type { EntityObject, ActionObject } from './entity.js';
export type { Statement, SVO, LogicalClause } from './statement.js';
export type { 
  TemporalModifier, 
  SpatialModifier, 
  MannerModifier, 
  DegreeModifier, 
  PurposeModifier, 
  ConditionalModifier, 
  CertaintyModifier, 
  LegalModifier 
} from './modifiers.js';

// Event types
export type { Event, EventRelationship, EventMetadata } from './event.js';

// Version control types
export type { Commit, Tree, Branch, Repository } from './commit.js';

// Confidence calculation types
export type { 
  EventChange, 
  ConfidenceFactors, 
  ConfidenceCalculation 
} from './confidence.js';