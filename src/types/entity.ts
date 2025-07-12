/**
 * Entity and Action Object Definitions
 * 
 * These represent the building blocks of our SVO statements.
 * All objects are content-addressed and version-controlled.
 */

export interface EntityObject {
  "@context": "https://schema.org/";
  "@type": "Thing";
  "@id": string;  // SHA-256 hash of content (ONLY identifier)
  
  // Entity versioning (trackable via commits)
  logicalId: string;  // Logical entity identifier (UUID v4)
  version: string;    // Semantic version (1.0, 1.1, etc.)
  previousVersion?: string;  // @id of previous version
  commitHash: string;
  
  // Core properties
  label: string;      // Human-readable name
  description?: string;
  dataType?: {        // PHASE 1: Optional typing (learned later)
    custom?: string;  // Free-form type
    description?: string;
  };
  
  // Arbitrary properties (JSON object)
  properties?: Record<string, unknown>;
}

export interface ActionObject {
  "@context": "https://schema.org/";
  "@type": "Action";
  "@id": string;  // SHA-256 hash of content
  
  // Action versioning (trackable via commits)
  logicalId: string;  // Logical action identifier (UUID v4)
  version: string;    // Semantic version (1.0, 1.1, etc.)
  previousVersion?: string;  // @id of previous version
  commitHash: string;
  
  // Core properties
  label: string;      // Human-readable verb
  description?: string;
  category?: string;  // PHASE 1: Optional categorization
  
  // PHASE 1: Deontic actions for legal clauses (kind='norm')
  deonticType?: 'shall' | 'may' | 'must-not' | 'liable-for' | 'entitled-to' | 'should' | 'permitted' | 'prohibited';
  
  // Arbitrary properties (JSON object)
  properties?: Record<string, unknown>;
}