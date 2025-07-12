/**
 * Pattern Observer
 *
 * PHASE 1: Simple pattern recording for future type inference.
 * Just observes and records patterns - no validation yet.
 *
 * PHASE 2: Will add ML-based type learning from observed patterns.
 */
import type { SVO } from '../types/statement.js';
import type { EventRelationship } from '../types/event.js';
export interface ObservedPattern {
    pattern: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
    examples: string[];
}
export interface PatternStatistics {
    totalPatterns: number;
    mostCommonPatterns: ObservedPattern[];
    recentPatterns: ObservedPattern[];
    patternGrowth: {
        date: string;
        newPatterns: number;
    }[];
}
export declare class PatternObserver {
    private svoPatterns;
    private relationshipPatterns;
    private entityTypePatterns;
    private actionCategoryPatterns;
    /**
     * Observe an SVO pattern
     * Records subject-verb-object combinations for future learning
     */
    observeSVO(svo: SVO, eventId: string): void;
    /**
     * Observe relationship patterns
     */
    observeRelationship(relationship: EventRelationship, fromEventId: string): void;
    /**
     * Observe entity type patterns (for future type inference)
     */
    observeEntityType(entityRef: string, inferredType: string | undefined, contextEventId: string): void;
    /**
     * Observe action category patterns
     */
    observeActionCategory(actionRef: string, category: string | undefined, contextEventId: string): void;
    /**
     * Get pattern statistics for analysis
     */
    getStatistics(): PatternStatistics;
    /**
     * Export patterns for analysis (PHASE 2 prep)
     */
    exportPatterns(): {
        svo: Record<string, ObservedPattern>;
        relationships: Record<string, ObservedPattern>;
        entityTypes: Record<string, ObservedPattern>;
        actionCategories: Record<string, ObservedPattern>;
    };
    /**
     * PHASE 2: Will validate based on learned patterns
     * For now, just basic enum validation
     */
    validateRelationshipType(relationshipType: string): boolean;
    private recordPattern;
    private extractLabel;
    private calculateGrowth;
}
export declare const patternObserver: PatternObserver;
