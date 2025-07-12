/**
 * Confidence Calculation Types
 *
 * Transparent confidence calculation using the unified formula:
 * confidence = (1 - V) × E × S
 *
 * Where V=volatility, E=evidence, S=source factor
 */
export interface EventChange {
    timestamp: string;
    commitId: string;
    changeType: 'created' | 'modified' | 'corrected' | 'clarified';
    changedFields: string[];
    author: string;
}
export interface ConfidenceFactors {
    volatility: number;
    evidence: number;
    source: number;
}
export interface ConfidenceCalculation {
    result: number;
    factors: ConfidenceFactors;
    formula: string;
    timestamp: string;
    breakdown: {
        volatilityReason: string;
        evidenceReason: string;
        sourceReason: string;
    };
}
