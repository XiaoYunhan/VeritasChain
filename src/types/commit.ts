/**
 * Commit and Version Control Definitions
 * 
 * Git-like commit structure for tracking changes to events,
 * entities, and actions with blockchain-ready architecture.
 */

export interface Commit {
  "@context": "https://schema.org/";
  "@type": "UpdateAction";
  "@id": string;           // SHA-256 hash of commit content
  
  // Git-like commit metadata
  timestamp: string;       // ISO 8601 when commit was created
  parents: string[];       // Parent commit @id's (for merges)
  tree: string;           // Tree hash representing state
  author: string;         // Author identifier
  message: string;        // Commit message
  
  // Changes in this commit
  changes: {
    events?: string[];      // Event @id's modified/added
    entities?: string[];    // Entity @id's modified/added  
    actions?: string[];     // Action @id's modified/added
  };
  
  // Blockchain preparation
  signature?: string;     // Author's cryptographic signature
  nonce?: number;        // For future Proof-of-Work
  
  // Additional metadata
  branch?: string;       // Branch name (e.g., "main")
  tags?: string[];       // Associated tags
}

export interface Tree {
  "@context": "https://schema.org/";
  "@type": "Collection";
  "@id": string;         // SHA-256 hash of tree content
  
  // Tree entries - content-addressed references
  entries: {
    events: Record<string, string>;      // logicalId -> current @id
    entities: Record<string, string>;    // logicalId -> current @id
    actions: Record<string, string>;     // logicalId -> current @id
    macroEvents?: Record<string, string>; // logicalId -> current @id (Phase 2)
  };
  
  // Tree metadata
  timestamp: string;     // When this tree was created
  parentTree?: string;   // Previous tree @id
}

export interface Branch {
  name: string;          // Branch name
  head: string;          // Current commit @id
  created: string;       // ISO 8601 creation timestamp
  author: string;        // Creator
  description?: string;  // Branch description
}

export interface Repository {
  "@context": "https://schema.org/";
  "@type": "Dataset";
  "@id": string;         // Repository identifier
  
  // Repository metadata
  name: string;
  description?: string;
  created: string;       // ISO 8601 creation timestamp
  owner: string;         // Repository owner
  
  // Current state
  head: string;          // Current commit @id
  currentBranch: string; // Current branch name
  
  // Configuration
  config: {
    defaultBranch: string;
    allowForceUpdate: boolean;
    requireSignedCommits: boolean;
  };
}