/**
 * Statement Visitor Pattern
 * 
 * Provides unified traversal API for Object→SVO→Clause→Event→MacroEvent hierarchy.
 * Supports confidence aggregation, entity extraction, visualization, and more.
 */

import type { EntityObject, ActionObject } from '../types/entity.js';
import type { Statement, SVO, LogicalClause } from '../types/statement.js';
import type { Event, MacroEvent } from '../types/event.js';

/**
 * Repository interface for object resolution
 */
export interface Repository {
  getEntity(id: string): Promise<EntityObject | null>;
  getAction(id: string): Promise<ActionObject | null>;
  getEvent(id: string): Promise<Event | null>;
  getMacroEvent?(id: string): Promise<MacroEvent | null>;
}

/**
 * Visitor interface - each layer gets a hook
 */
export interface StatementVisitor<R> {
  visitEntity?(entity: EntityObject): Promise<R> | R;
  visitAction?(action: ActionObject): Promise<R> | R;
  visitSVO?(svo: SVO): Promise<R> | R;
  visitClause?(clause: LogicalClause): Promise<R> | R;
  visitEvent?(event: Event): Promise<R> | R;
  visitMacroEvent?(macro: MacroEvent): Promise<R> | R;
}

/**
 * Traversal options
 */
export interface TraversalOptions {
  maxDepth?: number;         // Prevent infinite recursion
  includeComponents?: boolean; // For MacroEvents, traverse components
  lazy?: boolean;            // Use generators for large structures
  parallel?: boolean;        // Process operands in parallel
}

/**
 * Traversal result with metadata
 */
export interface TraversalResult<R> {
  result: R;
  nodesVisited: number;
  maxDepthReached: number;
  errors: string[];
  duration: number; // milliseconds
}

/**
 * Main traversal engine
 */
export class StatementTraverser {
  private repo: Repository;
  
  constructor(repo: Repository) {
    this.repo = repo;
  }
  
  /**
   * Traverse any statement or event structure with visitor pattern
   */
  async traverse<R>(
    root: Statement | Event | MacroEvent | string, // Can pass @id string
    visitor: StatementVisitor<R>,
    options: TraversalOptions = {}
  ): Promise<TraversalResult<R>> {
    
    const startTime = Date.now();
    const state = {
      nodesVisited: 0,
      maxDepthReached: 0,
      errors: [] as string[],
      currentDepth: 0,
      maxDepth: options.maxDepth || 10
    };
    
    try {
      // Resolve root if it's an ID string
      let resolvedRoot: Statement | Event | MacroEvent;
      if (typeof root === 'string') {
        const event = await this.repo.getEvent(root);
        if (event) {
          resolvedRoot = event;
        } else if (this.repo.getMacroEvent) {
          const macro = await this.repo.getMacroEvent(root);
          if (macro) {
            resolvedRoot = macro;
          } else {
            throw new Error(`Could not resolve root ID: ${root}`);
          }
        } else {
          throw new Error(`Could not resolve root ID: ${root}`);
        }
      } else {
        resolvedRoot = root;
      }
      
      const result = await this.traverseInternal(resolvedRoot, visitor, options, state);
      
      return {
        result,
        nodesVisited: state.nodesVisited,
        maxDepthReached: state.maxDepthReached,
        errors: state.errors,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        result: undefined as any,
        nodesVisited: state.nodesVisited,
        maxDepthReached: state.maxDepthReached,
        errors: [...state.errors, error instanceof Error ? error.message : 'Unknown error'],
        duration: Date.now() - startTime
      };
    }
  }
  
  /**
   * Generator version for lazy evaluation of large structures
   */
  async* traverseLazy<R>(
    root: Statement | Event | MacroEvent,
    visitor: StatementVisitor<R>,
    options: TraversalOptions = {}
  ): AsyncGenerator<{ node: any; result: R; depth: number }, void, unknown> {
    
    const state = {
      nodesVisited: 0,
      maxDepthReached: 0,
      errors: [] as string[],
      currentDepth: 0,
      maxDepth: options.maxDepth || 10
    };
    
    yield* this.traverseInternalLazy(root, visitor, options, state);
  }
  
  // Internal traversal implementation
  private async traverseInternal<R>(
    node: Statement | Event | MacroEvent,
    visitor: StatementVisitor<R>,
    options: TraversalOptions,
    state: any
  ): Promise<R> {
    
    state.nodesVisited++;
    state.maxDepthReached = Math.max(state.maxDepthReached, state.currentDepth);
    
    if (state.currentDepth >= state.maxDepth) {
      throw new Error(`Maximum traversal depth (${state.maxDepth}) exceeded`);
    }
    
    // Determine node type and call appropriate visitor
    if (this.isEvent(node)) {
      if (visitor.visitEvent) {
        const result = await visitor.visitEvent(node);
        
        // Optionally traverse statement
        if (node.statement) {
          state.currentDepth++;
          await this.traverseInternal(node.statement, visitor, options, state);
          state.currentDepth--;
        }
        
        return result;
      }
    } else if (this.isMacroEvent(node)) {
      if (visitor.visitMacroEvent) {
        const result = await visitor.visitMacroEvent(node);
        
        // Traverse components if requested
        if (options.includeComponents && node.components) {
          for (const componentRef of node.components) {
            try {
              const event = await this.repo.getEvent(componentRef.logicalId);
              if (event) {
                state.currentDepth++;
                await this.traverseInternal(event, visitor, options, state);
                state.currentDepth--;
              }
            } catch (error) {
              state.errors.push(`Failed to resolve component ${componentRef.logicalId}: ${error}`);
            }
          }
        }
        
        // Traverse statement
        if (node.statement) {
          state.currentDepth++;
          await this.traverseInternal(node.statement, visitor, options, state);
          state.currentDepth--;
        }
        
        return result;
      }
    } else if (this.isSVO(node)) {
      if (visitor.visitSVO) {
        const result = await visitor.visitSVO(node);
        
        // Optionally visit referenced entities/actions
        if (visitor.visitEntity) {
          const subject = await this.repo.getEntity(node.subjectRef);
          const object = await this.repo.getEntity(node.objectRef);
          if (subject) await visitor.visitEntity(subject);
          if (object) await visitor.visitEntity(object);
        }
        
        if (visitor.visitAction) {
          const action = await this.repo.getAction(node.verbRef);
          if (action) await visitor.visitAction(action);
        }
        
        return result;
      }
    } else if (this.isLogicalClause(node)) {
      if (visitor.visitClause) {
        const result = await visitor.visitClause(node);
        
        // Traverse operands
        if (options.parallel && node.operands.length > 1) {
          // Parallel traversal for independent operands
          state.currentDepth++;
          await Promise.all(
            node.operands.map(operand => 
              this.traverseInternal(operand, visitor, options, { ...state })
            )
          );
          state.currentDepth--;
        } else {
          // Sequential traversal
          for (const operand of node.operands) {
            state.currentDepth++;
            await this.traverseInternal(operand, visitor, options, state);
            state.currentDepth--;
          }
        }
        
        return result;
      }
    }
    
    // No visitor method found, return default
    return undefined as any;
  }
  
  private async* traverseInternalLazy<R>(
    node: Statement | Event | MacroEvent,
    visitor: StatementVisitor<R>,
    options: TraversalOptions,
    state: any
  ): AsyncGenerator<{ node: any; result: R; depth: number }, void, unknown> {
    
    state.nodesVisited++;
    state.currentDepth++;
    
    if (state.currentDepth >= state.maxDepth) {
      return;
    }
    
    let result: R | undefined;
    
    if (this.isEvent(node) && visitor.visitEvent) {
      result = await visitor.visitEvent(node);
      yield { node, result, depth: state.currentDepth };
      
      if (node.statement) {
        yield* this.traverseInternalLazy(node.statement, visitor, options, state);
      }
    } else if (this.isMacroEvent(node) && visitor.visitMacroEvent) {
      result = await visitor.visitMacroEvent(node);
      yield { node, result, depth: state.currentDepth };
      
      if (options.includeComponents && node.components) {
        for (const componentRef of node.components) {
          const event = await this.repo.getEvent(componentRef.logicalId);
          if (event) {
            yield* this.traverseInternalLazy(event, visitor, options, state);
          }
        }
      }
      
      if (node.statement) {
        yield* this.traverseInternalLazy(node.statement, visitor, options, state);
      }
    }
    // ... other node types similar to traverseInternal
    
    state.currentDepth--;
  }
  
  // Type guards
  private isEvent(node: any): node is Event {
    return node && node['@type'] === 'Event';
  }
  
  private isMacroEvent(node: any): node is MacroEvent {
    return node && node['@type'] === 'MacroEvent';
  }
  
  private isSVO(node: any): node is SVO {
    return node && node.type === 'SVO';
  }
  
  private isLogicalClause(node: any): node is LogicalClause {
    return node && node.type !== 'SVO' && node.operands;
  }
}

/**
 * Predefined visitors for common use cases
 */
export class CommonVisitors {
  
  /**
   * Collect all subject entities in a statement/event tree
   */
  static createSubjectCollector(): StatementVisitor<string[]> {
    const subjects: string[] = [];
    
    return {
      visitSVO: (svo) => {
        if (!subjects.includes(svo.subjectRef)) {
          subjects.push(svo.subjectRef);
        }
        return subjects;
      }
    };
  }
  
  /**
   * Calculate total confidence score for complex statements
   */
  static createConfidenceCalculator(
    getEventConfidence: (event: Event) => number
  ): StatementVisitor<number> {
    
    return {
      visitEvent: (event) => getEventConfidence(event),
      visitMacroEvent: (macro) => getEventConfidence(macro as any), // Type coercion for now
      visitSVO: () => 1.0, // Default confidence for atomic statements
      visitClause: (clause) => {
        // This would be called after operands are processed
        // Actual aggregation logic would be implemented here
        return 0.8; // Placeholder
      }
    };
  }
  
  /**
   * Extract all entity references for indexing
   */
  static createEntityExtractor(): StatementVisitor<Set<string>> {
    const entities = new Set<string>();
    
    return {
      visitSVO: (svo) => {
        entities.add(svo.subjectRef);
        entities.add(svo.objectRef);
        return entities;
      },
      visitEntity: (entity) => {
        entities.add(entity['@id']);
        return entities;
      }
    };
  }
}

// Example usage:
/*
const traverser = new StatementTraverser(repo);

// Collect all subjects in a MacroEvent
const subjectCollector = CommonVisitors.createSubjectCollector();
const result = await traverser.traverse(
  macroEvent, 
  subjectCollector,
  { includeComponents: true }
);

console.log('Subjects found:', result.result);
console.log('Performance:', {
  nodesVisited: result.nodesVisited,
  duration: result.duration
});
*/