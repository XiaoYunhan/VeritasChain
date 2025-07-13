/**
 * Statement Definitions
 *
 * Unified type system supporting both simple SVO statements
 * and complex logical reasoning structures.
 */
export interface SVO {
    type: 'SVO';
    subjectRef: string;
    verbRef: string;
    objectRef: string;
    canonicalHash?: string;
}
export interface LogicalClause {
    type: 'AND' | 'OR' | 'NOT' | 'IMPLIES' | 'IFF' | 'XOR' | 'SUBSET' | 'UNION' | 'INTERSECTION' | 'EXISTS' | 'FORALL' | 'GT' | 'LT' | 'EQ' | 'BEFORE' | 'AFTER' | 'SEQUENCE';
    operands: Statement[];
    variable?: string;
    domain?: Statement;
    depth?: number;
}
export type Statement = SVO | LogicalClause;
/**
 * PHASE 2: SVO utilities for canonicalization and hashing
 */
export interface SVOCanonical {
    subjectHash: string;
    verbHash: string;
    objectHash: string;
    isPassive: boolean;
}
/**
 * SVO utility functions for deduplication and normalization
 */
export declare class SVOUtils {
    /**
     * Generate fixed 32-byte hash for SVO deduplication
     */
    static hashSVO(svo: SVO): string;
    /**
     * Canonicalize SVO by converting passive to active voice
     * Example: "StartupAI is acquired by TechCorp" → "TechCorp acquires StartupAI"
     */
    static canonicalizeSVO(svo: SVO, getInverseVerb?: (verbRef: string) => string | null): SVOCanonical;
    /**
     * Check if two SVOs are semantically equivalent (after canonicalization)
     */
    static areEquivalent(svo1: SVO, svo2: SVO): boolean;
}
/**
 * PHASE 2: Logical clause complexity control
 */
export declare class ClauseUtils {
    /**
     * Calculate nesting depth of logical clause
     */
    static calculateDepth(clause: LogicalClause): number;
    /**
     * Flatten nested clauses for UI rendering
     */
    static flatten(statement: Statement): Statement[];
    /**
     * Validate clause complexity and suggest decomposition
     */
    static validateComplexity(clause: LogicalClause): {
        valid: boolean;
        warnings: string[];
    };
}
