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
}
export interface LogicalClause {
    type: 'AND' | 'OR' | 'NOT' | 'IMPLIES' | 'IFF' | 'XOR' | 'SUBSET' | 'UNION' | 'INTERSECTION' | 'EXISTS' | 'FORALL' | 'GT' | 'LT' | 'EQ' | 'BEFORE' | 'AFTER';
    operands: Statement[];
    variable?: string;
    domain?: Statement;
}
export type Statement = SVO | LogicalClause;
