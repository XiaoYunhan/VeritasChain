/**
 * Confidence Calculation Engine
 *
 * Transparent confidence calculation using the unified formula:
 * confidence = (1 - V) × E × S
 *
 * CRITICAL: Confidence is NEVER set manually - always calculated from data
 */
// Source factor mapping (for kind='fact')
const SOURCE_FACTORS = {
    'Academic': 1.0,
    'Government': 0.95,
    'NewsAgency': 0.9,
    'Corporate': 0.8,
    'Social': 0.7
};
// PHASE 1: Legal hierarchy weights (for kind='norm' - replaces SOURCE_FACTORS)
const LEGAL_HIERARCHY_WEIGHTS = {
    'constitution': 1.0,
    'statute': 0.95,
    'regulation': 0.9,
    'case-law': 0.85,
    'contract': 0.8,
    'policy': 0.75
};
// Evidence quality factors
const EVIDENCE_FACTORS = {
    'primary': 1.0, // First-hand source
    'official': 1.0, // Official statement
    'confirmed': 0.95, // Confirmed by multiple sources
    'secondary': 0.85, // Second-hand source
    'reported': 0.8, // Reported by reliable source
    'rumored': 0.6, // Rumored/unconfirmed
    'speculated': 0.4 // Speculation
};
// Norm force multipliers (for legal clauses)
const NORM_FORCE_FACTORS = {
    'mandatory': 1.0, // Must comply
    'default': 0.7, // Default behavior
    'advisory': 0.4 // Guidance only
};
export class ConfidenceCalculator {
    // Calculate volatility from change history
    calculateVolatility(changeHistory) {
        if (changeHistory.length < 2)
            return 0;
        // Count changes per day
        const changeRates = this.getChangeRatesByDay(changeHistory);
        // Standard deviation of change rates
        const stdDev = this.standardDeviation(changeRates);
        // Normalize to 0-1 (high volatility = low confidence)
        return Math.min(stdDev / 10, 1);
    }
    // Main confidence calculation method
    calculate(params) {
        const V = this.calculateVolatility(params.changeHistory);
        const E = EVIDENCE_FACTORS[params.evidenceType] ?? 0.7;
        // PHASE 1: Use legal hierarchy for norms, source factors for facts
        const S = params.legalType
            ? (LEGAL_HIERARCHY_WEIGHTS[params.legalType] ?? 0.8)
            : (SOURCE_FACTORS[params.sourceType] ?? 1.0);
        // Apply norm force multiplier for legal clauses
        const normMultiplier = params.normForce
            ? NORM_FORCE_FACTORS[params.normForce]
            : 1.0;
        // Final calculation: (1-V) × E × S × NormForce
        const baseConfidence = (1 - V) * E * S;
        const finalConfidence = Math.max(0, Math.min(1, baseConfidence * normMultiplier));
        return {
            result: finalConfidence,
            factors: { volatility: V, evidence: E, source: S },
            formula: `(1 - ${V.toFixed(3)}) × ${E} × ${S} × ${normMultiplier} = ${finalConfidence.toFixed(3)}`,
            timestamp: new Date().toISOString(),
            breakdown: {
                volatilityReason: this.explainVolatility(params.changeHistory),
                evidenceReason: `Evidence type: ${params.evidenceType} → ${E}`,
                sourceReason: params.legalType
                    ? `Legal hierarchy: ${params.legalType} → ${S}`
                    : `Source type: ${params.sourceType} → ${S}`
            }
        };
    }
    // Calculate confidence for existing event
    calculateForEvent(event, changeHistory) {
        const evidenceType = event.modifiers.certainty?.evidence ?? 'reported';
        if (event.kind === 'norm') {
            // Legal clause - use legal hierarchy
            if (!event.metadata.source.legalType) {
                throw new Error('Norm events must specify source.legalType');
            }
            return this.calculate({
                changeHistory,
                evidenceType,
                legalType: event.metadata.source.legalType,
                normForce: event.modifiers.legal?.normForce
            });
        }
        else {
            // Fact event - use source factors
            return this.calculate({
                changeHistory,
                evidenceType,
                sourceType: event.metadata.source.type
            });
        }
    }
    // Helper methods
    getChangeRatesByDay(changes) {
        const changesByDay = new Map();
        for (const change of changes) {
            const day = change.timestamp.split('T')[0]; // Extract date
            changesByDay.set(day, (changesByDay.get(day) ?? 0) + 1);
        }
        return Array.from(changesByDay.values());
    }
    standardDeviation(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(variance);
    }
    explainVolatility(changes) {
        if (changes.length < 2) {
            return 'No change history → volatility = 0 (most stable)';
        }
        const changeRates = this.getChangeRatesByDay(changes);
        const stdDev = this.standardDeviation(changeRates);
        if (stdDev < 1)
            return `Low change frequency → volatility = ${stdDev.toFixed(3)} (stable)`;
        if (stdDev < 5)
            return `Moderate change frequency → volatility = ${Math.min(stdDev / 10, 1).toFixed(3)} (somewhat volatile)`;
        return `High change frequency → volatility = ${Math.min(stdDev / 10, 1).toFixed(3)} (highly volatile)`;
    }
}
// Export singleton instance
export const confidenceCalculator = new ConfidenceCalculator();
