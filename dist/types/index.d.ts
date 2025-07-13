/**
 * VeritasChain Type Definitions
 *
 * Central export point for all TypeScript interfaces and types.
 * All types follow strict TypeScript mode with no 'any' allowed.
 */
export type { EntityObject, ActionObject } from './entity.js';
export type { Statement, SVO, LogicalClause } from './statement.js';
export type { TemporalModifier, SpatialModifier, MannerModifier, DegreeModifier, PurposeModifier, ConditionalModifier, CertaintyModifier, LegalModifier } from './modifiers.js';
export type { Event, ComponentRef, EventRelationship, EventMetadata, AggregationLogic, Modifiers, MacroEvent } from './event.js';
export { isComposite, getEventType, migrateMacroEvent } from './event.js';
export type { Commit, Tree, Branch, Repository } from './commit.js';
export type { EventChange, ConfidenceFactors, ConfidenceCalculation } from './confidence.js';
