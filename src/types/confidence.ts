/**
 * Confidence Calculation Types
 * 
 * Transparent confidence calculation using the unified formula:
 * confidence = (1 - V) × E × S
 * 
 * Where V=volatility, E=evidence, S=source factor
 */

export interface EventChange {
  timestamp: string;     // ISO 8601 when change occurred
  commitId: string;      // Commit that made this change
  changeType: 'created' | 'modified' | 'corrected' | 'clarified';
  changedFields: string[]; // Which fields were modified
  author: string;        // Who made the change
}

export interface ConfidenceFactors {
  volatility: number;    // 0-1, calculated from change history
  evidence: number;      // 0-1, based on evidence quality
  source: number;        // 0-1, based on source type or legal hierarchy
}

export interface ConfidenceCalculation {
  result: number;        // Final confidence value (0-1)
  factors: ConfidenceFactors;
  formula: string;       // Human-readable formula explanation
  timestamp: string;     // When calculation was performed
  
  // Detailed breakdown
  breakdown: {
    volatilityReason: string;   // Why this volatility score
    evidenceReason: string;     // Why this evidence score  
    sourceReason: string;       // Why this source score
  };
}