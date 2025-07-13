/**
 * Statement Definitions
 * 
 * Unified type system supporting both simple SVO statements 
 * and complex logical reasoning structures.
 */

export interface SVO {
  type: 'SVO';
  subjectRef: string;  // @id reference to EntityObject
  verbRef: string;     // @id reference to ActionObject  
  objectRef: string;   // @id reference to EntityObject
  
  // PHASE 2: Canonicalization for deduplication
  canonicalHash?: string;  // Pre-computed hash from SVOUtils.hashSVO()
}

export interface LogicalClause {
  type: 'AND' | 'OR' | 'NOT' | 'IMPLIES' | 'IFF' | 'XOR' 
       | 'SUBSET' | 'UNION' | 'INTERSECTION' 
       | 'EXISTS' | 'FORALL'
       | 'GT' | 'LT' | 'EQ'
       | 'BEFORE' | 'AFTER'   // Temporal operators
       | 'SEQUENCE';          // PHASE 2: For MacroEvent ordering
  
  operands: Statement[];
  variable?: string;  // For quantifiers
  domain?: Statement;
  
  // PHASE 2: Complexity control
  depth?: number;     // Nesting level for warning on >3 layers
}

// Unified statement type - can be simple SVO or complex logical structure
export type Statement = SVO | LogicalClause;

/**
 * PHASE 2: SVO utilities for canonicalization and hashing
 */
export interface SVOCanonical {
  subjectHash: string;  // Canonical subject hash
  verbHash: string;     // Canonical verb hash  
  objectHash: string;   // Canonical object hash
  isPassive: boolean;   // Whether this was converted from passive voice
}

/**
 * SVO utility functions for deduplication and normalization
 */
export class SVOUtils {
  /**
   * Generate fixed 32-byte hash for SVO deduplication
   */
  static hashSVO(svo: SVO): string {
    // Simple concatenation hash - in production would use proper content hashing
    const content = `${svo.subjectRef}|${svo.verbRef}|${svo.objectRef}`;
    // TODO: Implement actual SHA-256 hash
    return `svo-hash:${content.slice(-32)}`;
  }
  
  /**
   * Canonicalize SVO by converting passive to active voice
   * Example: "StartupAI is acquired by TechCorp" → "TechCorp acquires StartupAI"
   */
  static canonicalizeSVO(svo: SVO, getInverseVerb?: (verbRef: string) => string | null): SVOCanonical {
    // For now, just return as-is. In production, would implement voice detection
    return {
      subjectHash: svo.subjectRef,
      verbHash: svo.verbRef,
      objectHash: svo.objectRef,
      isPassive: false
    };
  }
  
  /**
   * Check if two SVOs are semantically equivalent (after canonicalization)
   */
  static areEquivalent(svo1: SVO, svo2: SVO): boolean {
    const canon1 = this.canonicalizeSVO(svo1);
    const canon2 = this.canonicalizeSVO(svo2);
    
    return canon1.subjectHash === canon2.subjectHash &&
           canon1.verbHash === canon2.verbHash &&
           canon1.objectHash === canon2.objectHash;
  }
}

/**
 * PHASE 2: Logical clause complexity control
 */
export class ClauseUtils {
  /**
   * Calculate nesting depth of logical clause
   */
  static calculateDepth(clause: LogicalClause): number {
    if (clause.operands.length === 0) return 1;
    
    let maxChildDepth = 0;
    for (const operand of clause.operands) {
      if (operand.type !== 'SVO') {
        const childDepth = this.calculateDepth(operand as LogicalClause);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    }
    
    return maxChildDepth + 1;
  }
  
  /**
   * Flatten nested clauses for UI rendering
   */
  static flatten(statement: Statement): Statement[] {
    const result: Statement[] = [];
    
    if (statement.type === 'SVO') {
      result.push(statement);
    } else {
      result.push(statement);
      for (const operand of statement.operands) {
        result.push(...this.flatten(operand));
      }
    }
    
    return result;
  }
  
  /**
   * Validate clause complexity and suggest decomposition
   */
  static validateComplexity(clause: LogicalClause): { valid: boolean; warnings: string[] } {
    const depth = this.calculateDepth(clause);
    const warnings: string[] = [];
    
    if (depth > 3) {
      warnings.push(`High nesting depth (${depth}). Consider decomposing into simpler clauses.`);
    }
    
    if (clause.operands.length > 5) {
      warnings.push(`Many operands (${clause.operands.length}). Consider grouping with intermediate clauses.`);
    }
    
    return {
      valid: depth <= 5, // Hard limit
      warnings
    };
  }
}