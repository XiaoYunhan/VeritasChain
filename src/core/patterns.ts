/**
 * Pattern Observer
 * 
 * PHASE 1: Simple pattern recording for future type inference.
 * Just observes and records patterns - no validation yet.
 * 
 * PHASE 2: Will add ML-based type learning from observed patterns.
 */

import type { SVO } from '../types/statement.js';
import type { EventRelationship, MacroEvent } from '../types/event.js';

export interface ObservedPattern {
  pattern: string;
  count: number;
  firstSeen: string;  // ISO 8601 timestamp
  lastSeen: string;   // ISO 8601 timestamp
  examples: string[]; // Example @id's that match this pattern
}

export interface PatternStatistics {
  totalPatterns: number;
  mostCommonPatterns: ObservedPattern[];
  recentPatterns: ObservedPattern[];
  patternGrowth: { date: string; newPatterns: number }[];
}

export class PatternObserver {
  private svoPatterns = new Map<string, ObservedPattern>();
  private relationshipPatterns = new Map<string, ObservedPattern>();
  private entityTypePatterns = new Map<string, ObservedPattern>();
  private actionCategoryPatterns = new Map<string, ObservedPattern>();
  private macroPatterns = new Map<string, ObservedPattern>();
  private statementPatterns = new Map<string, ObservedPattern>();
  
  /**
   * Observe an SVO pattern
   * Records subject-verb-object combinations for future learning
   */
  observeSVO(svo: SVO, eventId: string): void {
    // Create pattern key (using logicalId portions for privacy)
    const pattern = `${this.extractLabel(svo.subjectRef)}-${this.extractLabel(svo.verbRef)}-${this.extractLabel(svo.objectRef)}`;
    
    this.recordPattern(this.svoPatterns, pattern, eventId);
  }
  
  /**
   * Observe relationship patterns
   */
  observeRelationship(relationship: EventRelationship, fromEventId: string): void {
    const pattern = `${relationship.type}:${relationship.strength}`;
    
    this.recordPattern(this.relationshipPatterns, pattern, fromEventId);
  }
  
  /**
   * Observe entity type patterns (for future type inference)
   */
  observeEntityType(entityRef: string, inferredType: string | undefined, contextEventId: string): void {
    if (!inferredType) return;
    
    const pattern = `entity:${inferredType}`;
    this.recordPattern(this.entityTypePatterns, pattern, contextEventId);
  }
  
  /**
   * Observe action category patterns
   */
  observeActionCategory(actionRef: string, category: string | undefined, contextEventId: string): void {
    if (!category) return;
    
    const pattern = `action:${category}`;
    this.recordPattern(this.actionCategoryPatterns, pattern, contextEventId);
  }
  
  /**
   * PHASE 2: Observe MacroEvent patterns
   * Records aggregation patterns and statement types for composite events
   */
  observeMacroEvent(macroEvent: MacroEvent): void {
    // Record aggregation patterns without validation
    const aggregationKey = `${macroEvent.aggregation || 'NONE'}-${macroEvent.components.length}`;
    this.recordPattern(this.macroPatterns, aggregationKey, macroEvent['@id']);
    
    // Also record statement type patterns
    const stmtKey = `macro-${macroEvent.statement.type}`;
    this.recordPattern(this.statementPatterns, stmtKey, macroEvent['@id']);
    
    // Record component count distribution
    const componentCountKey = `components-${macroEvent.components.length}`;
    this.recordPattern(this.macroPatterns, componentCountKey, macroEvent['@id']);
  }
  
  /**
   * Get pattern statistics for analysis
   */
  getStatistics(): PatternStatistics {
    const allPatterns = [
      ...this.svoPatterns.values(),
      ...this.relationshipPatterns.values(),
      ...this.entityTypePatterns.values(),
      ...this.actionCategoryPatterns.values(),
      ...this.macroPatterns.values(),
      ...this.statementPatterns.values()
    ];
    
    const sortedByCount = [...allPatterns].sort((a, b) => b.count - a.count);
    const sortedByRecent = [...allPatterns].sort((a, b) => 
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
    
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
  exportPatterns(): {
    svo: Record<string, ObservedPattern>;
    relationships: Record<string, ObservedPattern>;
    entityTypes: Record<string, ObservedPattern>;
    actionCategories: Record<string, ObservedPattern>;
    macro: Record<string, ObservedPattern>;
    statements: Record<string, ObservedPattern>;
  } {
    return {
      svo: Object.fromEntries(this.svoPatterns),
      relationships: Object.fromEntries(this.relationshipPatterns),
      entityTypes: Object.fromEntries(this.entityTypePatterns),
      actionCategories: Object.fromEntries(this.actionCategoryPatterns),
      macro: Object.fromEntries(this.macroPatterns),
      statements: Object.fromEntries(this.statementPatterns)
    };
  }
  
  /**
   * PHASE 2: Will validate based on learned patterns
   * For now, just basic enum validation
   */
  validateRelationshipType(relationshipType: string): boolean {
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
  private recordPattern(patternMap: Map<string, ObservedPattern>, pattern: string, exampleId: string): void {
    const now = new Date().toISOString();
    const existing = patternMap.get(pattern);
    
    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
      if (!existing.examples.includes(exampleId)) {
        existing.examples.push(exampleId);
      }
    } else {
      patternMap.set(pattern, {
        pattern,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        examples: [exampleId]
      });
    }
  }
  
  private extractLabel(ref: string): string {
    // Extract a label from reference for pattern matching
    // This is simplified - in real implementation, would look up actual labels
    return ref.slice(-8); // Use last 8 chars as identifier
  }
  
  private calculateGrowth(): { date: string; newPatterns: number }[] {
    // Simplified growth calculation
    // In real implementation, would track daily pattern additions
    const today = new Date().toISOString().split('T')[0];
    return [{ date: today, newPatterns: this.svoPatterns.size }];
  }
}

// Export singleton instance
export const patternObserver = new PatternObserver();