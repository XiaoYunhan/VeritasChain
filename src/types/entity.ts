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
  
  // PHASE 2: Enhanced entity resolution and external linking
  aliases?: string[];  // Synonym names for entity resolution
  identifiers?: {      // Industry-standard identifiers
    isin?: string;     // International Securities Identification Number
    lei?: string;      // Legal Entity Identifier
    ticker?: string;   // Stock ticker symbol
    ein?: string;      // Employer Identification Number
    duns?: string;     // Dun & Bradstreet Number
    [key: string]: string | undefined; // Extensible for other ID types
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
  
  // PHASE 2: Verb semantic properties for validation
  valency?: 'intransitive' | 'transitive' | 'ditransitive'; // Argument structure
  inverseVerbRef?: string;  // @id of inverse verb (e.g., "owns" ↔ "ownedBy")
  
  // PHASE 1: Deontic actions for legal clauses (kind='norm')
  deonticType?: 'shall' | 'may' | 'must-not' | 'liable-for' | 'entitled-to' | 'should' | 'permitted' | 'prohibited';
  
  // Arbitrary properties (JSON object)
  properties?: Record<string, unknown>;
}