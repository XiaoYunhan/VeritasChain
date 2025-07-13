/**
 * Pre-merge Validation for MacroEvents
 * 
 * Implements constraint matrix to detect conflicts before entering
 * expensive three-way merge flow. Based on aggregation logic,
 * validates component events for common conflict patterns.
 */

import type { Event, MacroEvent, ComponentRef, AggregationConstraint } from '../types/event.js';

// Confidence threshold for validation (configurable)
const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Validation matrix defining constraints for each aggregation type
 */
const AGGREGATION_CONSTRAINTS: Record<string, AggregationConstraint> = {
  'AND': {
    logic: 'AND',
    requirements: ['All components must have confidence > threshold'],
    conflicts: ['Components with contradicts relationships', 'Prevented events'],
    validationFn: (components, macro) => {
      // Check: No contradictory relationships between components
      for (let i = 0; i < components.length; i++) {
        for (let j = i + 1; j < components.length; j++) {
          const event1 = components[i];
          const event2 = components[j];
          
          // Check if any component contradicts another
          const hasContradiction = event1.relationships?.some(rel => 
            rel.type === 'contradicts' && rel.target === event2['@id']
          ) || event2.relationships?.some(rel => 
            rel.type === 'contradicts' && rel.target === event1['@id']
          );
          
          if (hasContradiction) return false;
        }
      }
      
      // Check: All components meet confidence threshold
      return components.every(c => (c.metadata.confidence ?? 0) > CONFIDENCE_THRESHOLD);
    }
  },
  
  'OR': {
    logic: 'OR',
    requirements: ['At least one component must have confidence > threshold'],
    conflicts: ['All components prevented by external events'],
    validationFn: (components, macro) => {
      // Check: At least one component meets confidence threshold
      const hasReliableComponent = components.some(c => 
        (c.metadata.confidence ?? 0) > CONFIDENCE_THRESHOLD
      );
      
      if (!hasReliableComponent) return false;
      
      // Check: Not all components are prevented
      const allPrevented = components.every(c => 
        c.relationships?.some(rel => rel.type === 'prevents')
      );
      
      return !allPrevented;
    }
  },
  
  'ORDERED_ALL': {
    logic: 'ORDERED_ALL',
    requirements: ['Components must have strictly increasing dateOccurred', 'No temporal gaps > threshold'],
    conflicts: ['Overlapping time periods', 'Missing sequence steps'],
    validationFn: (components, macro) => {
      if (components.length < 2) return true;
      
      // Sort by occurrence date
      const sorted = [...components].sort((a, b) => 
        new Date(a.dateOccurred).getTime() - new Date(b.dateOccurred).getTime()
      );
      
      // Check: Strictly increasing timestamps (no overlaps)
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = new Date(sorted[i].dateOccurred);
        const next = new Date(sorted[i + 1].dateOccurred);
        
        if (current >= next) {
          return false; // Time overlap or reverse order
        }
        
        // Check: No excessive gaps (configurable threshold)
        const gapDays = (next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
        if (gapDays > 365) { // 1 year gap threshold
          return false; // Suspicious gap in sequence
        }
      }
      
      return true;
    }
  },
  
  'CUSTOM': {
    logic: 'CUSTOM',
    requirements: ['Custom rule script must return true'],
    conflicts: ['Custom validation failure'],
    validationFn: (components, macro) => {
      // TODO: Load and execute custom rule by macro.customRuleId
      // For now, just check basic structural validity
      return components.length > 0 && macro.customRuleId !== undefined;
    }
  }
};

/**
 * Validation result with detailed feedback
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  constraint: AggregationConstraint;
  componentCount: number;
  checkedAt: string; // ISO 8601 timestamp
}

/**
 * Pre-merge validator for MacroEvents
 */
export class MacroEventValidator {
  
  /**
   * Validate MacroEvent before merge operation
   * Returns validation result with specific error messages
   */
  async preMergeValidate(
    macro: MacroEvent, 
    getEvent: (ref: ComponentRef) => Promise<Event | null>
  ): Promise<ValidationResult> {
    
    const constraint = AGGREGATION_CONSTRAINTS[macro.aggregation || 'AND'];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Resolve component events
    const components: Event[] = [];
    for (const ref of macro.components) {
      const event = await getEvent(ref);
      if (!event) {
        errors.push(`Component not found: ${ref.logicalId}${ref.version ? `@${ref.version}` : ''}`);
        continue;
      }
      components.push(event);
    }
    
    // Basic structural validation
    if (components.length === 0) {
      errors.push('MacroEvent must have at least one valid component');
    }
    
    if (components.length > 100) {
      warnings.push('Large number of components may impact performance');
    }
    
    // Apply aggregation-specific validation
    let isValid = true;
    if (constraint.validationFn && components.length > 0) {
      try {
        isValid = constraint.validationFn(components, macro);
        if (!isValid) {
          errors.push(`Aggregation constraint violated: ${constraint.conflicts.join(', ')}`);
        }
      } catch (error) {
        errors.push(`Validation function failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        isValid = false;
      }
    }
    
    // Timeline validation
    if (macro.timelineSpan) {
      const startTime = new Date(macro.timelineSpan.start);
      const endTime = new Date(macro.timelineSpan.end);
      
      if (startTime >= endTime) {
        errors.push('Timeline span start must be before end');
      }
      
      // Check if all components fall within timeline span
      const outOfRange = components.filter(c => {
        const eventTime = new Date(c.dateOccurred);
        return eventTime < startTime || eventTime > endTime;
      });
      
      if (outOfRange.length > 0) {
        warnings.push(`${outOfRange.length} components fall outside declared timeline span`);
      }
    }
    
    return {
      isValid: errors.length === 0 && isValid,
      errors,
      warnings,
      constraint,
      componentCount: components.length,
      checkedAt: new Date().toISOString()
    };
  }
  
  /**
   * Get constraint information for a given aggregation type
   */
  getConstraint(aggregation: string): AggregationConstraint | undefined {
    return AGGREGATION_CONSTRAINTS[aggregation];
  }
  
  /**
   * List all available constraints
   */
  getAllConstraints(): Record<string, AggregationConstraint> {
    return { ...AGGREGATION_CONSTRAINTS };
  }
}

// Export singleton instance
export const macroEventValidator = new MacroEventValidator();