/**
 * Confidence Calculation Engine
 * 
 * Transparent confidence calculation using the unified formula:
 * confidence = (1 - V) × E × S
 * 
 * CRITICAL: Confidence is NEVER set manually - always calculated from data
 */

import type { 
  EventChange, 
  ConfidenceFactors, 
  ConfidenceCalculation 
} from '../types/confidence.js';
import type { Event, MacroEvent } from '../types/event.js';

// Source factor mapping (for kind='fact')
const SOURCE_FACTORS = {
  'Academic': 1.0,
  'Government': 0.95,
  'NewsAgency': 0.9,
  'Corporate': 0.8,
  'Social': 0.7
} as const;

// PHASE 1: Legal hierarchy weights (for kind='norm' - replaces SOURCE_FACTORS)
const LEGAL_HIERARCHY_WEIGHTS = {
  'constitution': 1.0,
  'statute': 0.95,
  'regulation': 0.9,
  'case-law': 0.85,
  'contract': 0.8,
  'policy': 0.75
} as const;

// Evidence quality factors
const EVIDENCE_FACTORS = {
  'primary': 1.0,      // First-hand source
  'official': 1.0,     // Official statement
  'confirmed': 0.95,   // Confirmed by multiple sources
  'secondary': 0.85,   // Second-hand source
  'reported': 0.8,     // Reported by reliable source
  'rumored': 0.6,      // Rumored/unconfirmed
  'speculated': 0.4    // Speculation
} as const;

// Norm force multipliers (for legal clauses)
const NORM_FORCE_FACTORS = {
  'mandatory': 1.0,    // Must comply
  'default': 0.7,      // Default behavior
  'advisory': 0.4      // Guidance only
} as const;

export class ConfidenceCalculator {
  /**
   * Map new aggregation logic to old format for backward compatibility
   */
  private mapAggregationLogic(logic: string): 'AND' | 'OR' | 'CUSTOM' | 'ORDERED_ALL' {
    const mapping: Record<string, 'AND' | 'OR' | 'CUSTOM' | 'ORDERED_ALL'> = {
      'ALL': 'AND',
      'ANY': 'OR',
      'ORDERED': 'ORDERED_ALL',
      'CUSTOM': 'CUSTOM',
      // Backward compatibility
      'AND': 'AND',
      'OR': 'OR',
      'ORDERED_ALL': 'ORDERED_ALL'
    };
    return mapping[logic] || 'AND';
  }

  // Calculate volatility from change history
  calculateVolatility(changeHistory: EventChange[]): number {
    if (changeHistory.length < 2) return 0;
    
    // Count changes per day
    const changeRates = this.getChangeRatesByDay(changeHistory);
    
    // Standard deviation of change rates
    const stdDev = this.standardDeviation(changeRates);
    
    // Normalize to 0-1 (high volatility = low confidence)
    return Math.min(stdDev / 10, 1);
  }
  
  // Main confidence calculation method
  calculate(params: {
    changeHistory: EventChange[];
    evidenceType: keyof typeof EVIDENCE_FACTORS;
    sourceType?: keyof typeof SOURCE_FACTORS;     // For kind='fact'
    legalType?: keyof typeof LEGAL_HIERARCHY_WEIGHTS  // For kind='norm' (PHASE 1)
    normForce?: keyof typeof NORM_FORCE_FACTORS;  // For legal clauses
  }): ConfidenceCalculation {
    
    const V = this.calculateVolatility(params.changeHistory);
    const E = EVIDENCE_FACTORS[params.evidenceType] ?? 0.7;
    
    // PHASE 1: Use legal hierarchy for norms, source factors for facts
    const S = params.legalType 
      ? (LEGAL_HIERARCHY_WEIGHTS[params.legalType] ?? 0.8)
      : (SOURCE_FACTORS[params.sourceType as keyof typeof SOURCE_FACTORS] ?? 1.0);
      
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
  calculateForEvent(event: Event, changeHistory: EventChange[]): ConfidenceCalculation {
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
    } else {
      // Fact event - use source factors
      return this.calculate({
        changeHistory,
        evidenceType,
        sourceType: event.metadata.source.type
      });
    }
  }
  
  /**
   * PHASE 2: Aggregate confidence for MacroEvents with caching
   * 
   * Calculates composite confidence based on component confidences
   * and the specified aggregation logic. Uses cache when available.
   */
  async aggregateConfidenceForMacro(
    macro: MacroEvent,
    componentHashes: string[],
    commitHash: string,
    getComponentConfidence: (hash: string) => Promise<number>,
    cache?: any // ConfidenceCache instance - optional to avoid circular deps
  ): Promise<ConfidenceCalculation> {
    // Check cache first if provided
    if (cache) {
      const cached = await cache.get(macro['@id'], commitHash, componentHashes);
      if (cached) {
        return cached.calculation;
      }
    }
    
    // Cache miss or no cache - calculate confidence
    const componentConfidences = await Promise.all(
      componentHashes.map(hash => getComponentConfidence(hash))
    );
    
    const calculation = this.aggregateConfidence(
      componentConfidences,
      this.mapAggregationLogic(macro.aggregation || 'ALL'),
      undefined // TODO: Load custom aggregator by macro.customRuleId
    );
    
    // Store in cache if provided
    if (cache) {
      await cache.set(
        macro['@id'],
        commitHash,
        componentHashes,
        calculation.result,
        calculation
      );
    }
    
    return calculation;
  }

  /**
   * PHASE 2: Aggregate confidence for MacroEvents (non-cached version)
   * 
   * Calculates composite confidence based on component confidences
   * and the specified aggregation logic.
   */
  aggregateConfidence(
    componentConfidences: number[],
    aggregation: 'AND' | 'OR' | 'ORDERED_ALL' | 'CUSTOM',
    customAggregator?: (confidences: number[]) => number
  ): ConfidenceCalculation {
    if (componentConfidences.length === 0) {
      return {
        result: 0,
        factors: { volatility: 0, evidence: 0, source: 0 },
        formula: 'No components → confidence = 0',
        timestamp: new Date().toISOString(),
        breakdown: {
          volatilityReason: 'No components to aggregate',
          evidenceReason: 'N/A',
          sourceReason: 'N/A'
        }
      };
    }
    
    let result: number;
    let formula: string;
    
    switch (aggregation) {
      case 'AND':
      case 'ORDERED_ALL':
        // Weakest link principle - all components must be reliable
        result = Math.min(...componentConfidences);
        formula = `min(${componentConfidences.map(c => c.toFixed(3)).join(', ')}) = ${result.toFixed(3)}`;
        break;
        
      case 'OR':
        // Strongest evidence principle - any reliable component suffices
        result = Math.max(...componentConfidences);
        formula = `max(${componentConfidences.map(c => c.toFixed(3)).join(', ')}) = ${result.toFixed(3)}`;
        break;
        
      case 'CUSTOM':
        if (!customAggregator) {
          throw new Error('Custom aggregator function required for CUSTOM logic');
        }
        result = Math.max(0, Math.min(1, customAggregator(componentConfidences)));
        formula = `custom(${componentConfidences.map(c => c.toFixed(3)).join(', ')}) = ${result.toFixed(3)}`;
        break;
        
      default:
        // Default to average (should not reach here)
        const sum = componentConfidences.reduce((a, b) => a + b, 0);
        result = sum / componentConfidences.length;
        formula = `avg(${componentConfidences.map(c => c.toFixed(3)).join(', ')}) = ${result.toFixed(3)}`;
    }
    
    return {
      result,
      factors: {
        volatility: 0, // Not applicable for aggregation
        evidence: result, // Aggregated confidence serves as evidence
        source: 1.0 // Source factor is handled at component level
      },
      formula: `MacroEvent[${aggregation}]: ${formula}`,
      timestamp: new Date().toISOString(),
      breakdown: {
        volatilityReason: 'Volatility calculated at component level',
        evidenceReason: `Aggregation logic: ${aggregation}`,
        sourceReason: `${componentConfidences.length} components aggregated`
      }
    };
  }
  
  // Helper methods
  private getChangeRatesByDay(changes: EventChange[]): number[] {
    const changesByDay = new Map<string, number>();
    
    for (const change of changes) {
      const day = change.timestamp.split('T')[0]; // Extract date
      changesByDay.set(day, (changesByDay.get(day) ?? 0) + 1);
    }
    
    return Array.from(changesByDay.values());
  }
  
  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(variance);
  }
  
  private explainVolatility(changes: EventChange[]): string {
    if (changes.length < 2) {
      return 'No change history → volatility = 0 (most stable)';
    }
    
    const changeRates = this.getChangeRatesByDay(changes);
    const stdDev = this.standardDeviation(changeRates);
    
    if (stdDev < 1) return `Low change frequency → volatility = ${stdDev.toFixed(3)} (stable)`;
    if (stdDev < 5) return `Moderate change frequency → volatility = ${Math.min(stdDev/10, 1).toFixed(3)} (somewhat volatile)`;
    return `High change frequency → volatility = ${Math.min(stdDev/10, 1).toFixed(3)} (highly volatile)`;
  }
}

// Export singleton instance
export const confidenceCalculator = new ConfidenceCalculator();