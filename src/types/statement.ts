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
}

export interface LogicalClause {
  type: 'AND' | 'OR' | 'NOT' | 'IMPLIES' | 'IFF' | 'XOR' 
       | 'SUBSET' | 'UNION' | 'INTERSECTION' 
       | 'EXISTS' | 'FORALL'
       | 'GT' | 'LT' | 'EQ'
       | 'BEFORE' | 'AFTER';  // Temporal operators
  
  operands: Statement[];
  variable?: string;  // For quantifiers
  domain?: Statement;
}

// Unified statement type - can be simple SVO or complex logical structure
export type Statement = SVO | LogicalClause;