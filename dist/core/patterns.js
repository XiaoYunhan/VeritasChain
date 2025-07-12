/**
 * Pattern Observer
 *
 * PHASE 1: Simple pattern recording for future type inference.
 * Just observes and records patterns - no validation yet.
 *
 * PHASE 2: Will add ML-based type learning from observed patterns.
 */
export class PatternObserver {
    svoPatterns = new Map();
    relationshipPatterns = new Map();
    entityTypePatterns = new Map();
    actionCategoryPatterns = new Map();
    /**
     * Observe an SVO pattern
     * Records subject-verb-object combinations for future learning
     */
    observeSVO(svo, eventId) {
        // Create pattern key (using logicalId portions for privacy)
        const pattern = `${this.extractLabel(svo.subjectRef)}-${this.extractLabel(svo.verbRef)}-${this.extractLabel(svo.objectRef)}`;
        this.recordPattern(this.svoPatterns, pattern, eventId);
    }
    /**
     * Observe relationship patterns
     */
    observeRelationship(relationship, fromEventId) {
        const pattern = `${relationship.type}:${relationship.strength}`;
        this.recordPattern(this.relationshipPatterns, pattern, fromEventId);
    }
    /**
     * Observe entity type patterns (for future type inference)
     */
    observeEntityType(entityRef, inferredType, contextEventId) {
        if (!inferredType)
            return;
        const pattern = `entity:${inferredType}`;
        this.recordPattern(this.entityTypePatterns, pattern, contextEventId);
    }
    /**
     * Observe action category patterns
     */
    observeActionCategory(actionRef, category, contextEventId) {
        if (!category)
            return;
        const pattern = `action:${category}`;
        this.recordPattern(this.actionCategoryPatterns, pattern, contextEventId);
    }
    /**
     * Get pattern statistics for analysis
     */
    getStatistics() {
        const allPatterns = [
            ...this.svoPatterns.values(),
            ...this.relationshipPatterns.values(),
            ...this.entityTypePatterns.values(),
            ...this.actionCategoryPatterns.values()
        ];
        const sortedByCount = [...allPatterns].sort((a, b) => b.count - a.count);
        const sortedByRecent = [...allPatterns].sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
        return {
            totalPatterns: allPatterns.length,
            mostCommonPatterns: sortedByCount.slice(0, 10),
            recentPatterns: sortedByRecent.slice(0, 10),
            patternGrowth: this.calculateGrowth()
        };
    }
    /**
     * Export patterns for analysis (PHASE 2 prep)
     */
    exportPatterns() {
        return {
            svo: Object.fromEntries(this.svoPatterns),
            relationships: Object.fromEntries(this.relationshipPatterns),
            entityTypes: Object.fromEntries(this.entityTypePatterns),
            actionCategories: Object.fromEntries(this.actionCategoryPatterns)
        };
    }
    /**
     * PHASE 2: Will validate based on learned patterns
     * For now, just basic enum validation
     */
    validateRelationshipType(relationshipType) {
        const validTypes = [
            'causedBy', 'causes', 'enables', 'prevents', 'threatens',
            'derivedFrom', 'supports', 'contradicts', 'updates', 'corrects', 'clarifies',
            'relatedTo', 'partOf', 'contains', 'precedes', 'follows',
            // PHASE 1: Legal relationships
            'amends', 'supersedes', 'refersTo', 'dependentOn'
        ];
        return validTypes.includes(relationshipType);
    }
    // Private helper methods
    recordPattern(patternMap, pattern, exampleId) {
        const now = new Date().toISOString();
        const existing = patternMap.get(pattern);
        if (existing) {
            existing.count += 1;
            existing.lastSeen = now;
            if (!existing.examples.includes(exampleId)) {
                existing.examples.push(exampleId);
            }
        }
        else {
            patternMap.set(pattern, {
                pattern,
                count: 1,
                firstSeen: now,
                lastSeen: now,
                examples: [exampleId]
            });
        }
    }
    extractLabel(ref) {
        // Extract a label from reference for pattern matching
        // This is simplified - in real implementation, would look up actual labels
        return ref.slice(-8); // Use last 8 chars as identifier
    }
    calculateGrowth() {
        // Simplified growth calculation
        // In real implementation, would track daily pattern additions
        const today = new Date().toISOString().split('T')[0];
        return [{ date: today, newPatterns: this.svoPatterns.size }];
    }
}
// Export singleton instance
export const patternObserver = new PatternObserver();
