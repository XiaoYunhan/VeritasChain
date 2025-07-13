/**
 * Confidence Calculation Engine
 *
 * Transparent confidence calculation using the unified formula:
 * confidence = (1 - V) × E × S
 *
 * CRITICAL: Confidence is NEVER set manually - always calculated from data
 */
import type { EventChange, ConfidenceCalculation } from '../types/confidence.js';
import type { Event, MacroEvent } from '../types/event.js';
declare const SOURCE_FACTORS: {
    readonly Academic: 1;
    readonly Government: 0.95;
    readonly NewsAgency: 0.9;
    readonly Corporate: 0.8;
    readonly Social: 0.7;
};
declare const LEGAL_HIERARCHY_WEIGHTS: {
    readonly constitution: 1;
    readonly statute: 0.95;
    readonly regulation: 0.9;
    readonly 'case-law': 0.85;
    readonly contract: 0.8;
    readonly policy: 0.75;
};
declare const EVIDENCE_FACTORS: {
    readonly primary: 1;
    readonly official: 1;
    readonly confirmed: 0.95;
    readonly secondary: 0.85;
    readonly reported: 0.8;
    readonly rumored: 0.6;
    readonly speculated: 0.4;
};
declare const NORM_FORCE_FACTORS: {
    readonly mandatory: 1;
    readonly default: 0.7;
    readonly advisory: 0.4;
};
export declare class ConfidenceCalculator {
    /**
     * Map new aggregation logic to old format for backward compatibility
     */
    private mapAggregationLogic;
    calculateVolatility(changeHistory: EventChange[]): number;
    calculate(params: {
        changeHistory: EventChange[];
        evidenceType: keyof typeof EVIDENCE_FACTORS;
        sourceType?: keyof typeof SOURCE_FACTORS;
        legalType?: keyof typeof LEGAL_HIERARCHY_WEIGHTS;
        normForce?: keyof typeof NORM_FORCE_FACTORS;
    }): ConfidenceCalculation;
    calculateForEvent(event: Event, changeHistory: EventChange[]): ConfidenceCalculation;
    /**
     * PHASE 2: Aggregate confidence for MacroEvents with caching
     *
     * Calculates composite confidence based on component confidences
     * and the specified aggregation logic. Uses cache when available.
     */
    aggregateConfidenceForMacro(macro: MacroEvent, componentHashes: string[], commitHash: string, getComponentConfidence: (hash: string) => Promise<number>, cache?: any): Promise<ConfidenceCalculation>;
    /**
     * PHASE 2: Aggregate confidence for MacroEvents (non-cached version)
     *
     * Calculates composite confidence based on component confidences
     * and the specified aggregation logic.
     */
    aggregateConfidence(componentConfidences: number[], aggregation: 'AND' | 'OR' | 'ORDERED_ALL' | 'CUSTOM', customAggregator?: (confidences: number[]) => number): ConfidenceCalculation;
    private getChangeRatesByDay;
    private standardDeviation;
    private explainVolatility;
}
export declare const confidenceCalculator: ConfidenceCalculator;
export {};
