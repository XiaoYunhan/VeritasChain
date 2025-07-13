/**
 * Statement Definitions
 *
 * Unified type system supporting both simple SVO statements
 * and complex logical reasoning structures.
 */
/**
 * SVO utility functions for deduplication and normalization
 */
export class SVOUtils {
    /**
     * Generate fixed 32-byte hash for SVO deduplication
     */
    static hashSVO(svo) {
        // Simple concatenation hash - in production would use proper content hashing
        const content = `${svo.subjectRef}|${svo.verbRef}|${svo.objectRef}`;
        // TODO: Implement actual SHA-256 hash
        return `svo-hash:${content.slice(-32)}`;
    }
    /**
     * Canonicalize SVO by converting passive to active voice
     * Example: "StartupAI is acquired by TechCorp" → "TechCorp acquires StartupAI"
     */
    static canonicalizeSVO(svo, getInverseVerb) {
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
    static areEquivalent(svo1, svo2) {
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
    static calculateDepth(clause) {
        if (clause.operands.length === 0)
            return 1;
        let maxChildDepth = 0;
        for (const operand of clause.operands) {
            if (operand.type !== 'SVO') {
                const childDepth = this.calculateDepth(operand);
                maxChildDepth = Math.max(maxChildDepth, childDepth);
            }
        }
        return maxChildDepth + 1;
    }
    /**
     * Flatten nested clauses for UI rendering
     */
    static flatten(statement) {
        const result = [];
        if (statement.type === 'SVO') {
            result.push(statement);
        }
        else {
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
    static validateComplexity(clause) {
        const depth = this.calculateDepth(clause);
        const warnings = [];
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
