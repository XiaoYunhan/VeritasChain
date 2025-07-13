# CLAUDE.md - VeritasChain Development Instructions

## CRITICAL: Read This First

This project implements a Git-like version control system for both **factual events** (news, scientific, economic) and **normative clauses** (legal, contractual) with **future blockchain compatibility**. The architecture is intentionally minimal but must support future decentralization. **DO NOT** add unnecessary complexity or dependencies.

## Core Constraints

### 1. Allowed Dependencies (DO NOT ADD MORE)
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "uuid": "^9.0.0",
    "@noble/hashes": "^1.3.0",    // Blockchain-compatible hashing
    "@noble/ed25519": "^2.0.0"     // Lightweight signatures
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "nodemon": "^3.0.0",
    "ts-node": "^10.0.0"
  }
}
```

### 2. Data Structure Rules (TypeScript STRICT)

#### ID System (CRITICAL - No Confusion)
```typescript
/*
  SINGLE SOURCE OF TRUTH for identifiers:
  
  @id:       SHA-256 content hash - ONLY unique identifier for storage/retrieval
  logicalId: UUID v4 - Groups multiple versions of the same logical entity
  
  Example:
  - "Apple Inc" entity has logicalId: "550e8400-e29b-41d4-a716-446655440000"
  - Version 1.0 has @id: "abc123..." (hash of v1.0 content)  
  - Version 1.1 has @id: "def456..." (hash of v1.1 content)
  - Both versions share the same logicalId
  - history["550e8400-..."] = ["abc123...", "def456..."]
*/
```

#### Core Object Model (Version-Controlled)
```typescript
// Robust data type system with proper validation
type DataType = 
  // Built-in primitive types
  | 'string' | 'number' | 'boolean' | 'date' | 'bigint'
  
  // Array types
  | { array: DataType }
  
  // Custom types with structured schema
  | { 
      custom: string; 
      schema: JSONSchema | ZodSchema | EnumValues;
      description?: string;
    }
  
  // Structured object types  
  | { struct: Record<string, DataType> }
  
  // Reference to another entity (by @id)
  | { ref: string; entityType?: string }
  
  // Union types for flexibility
  | { union: DataType[] };

// Schema validation options
interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, any>;
  required?: string[];
  pattern?: string;      // For string validation
  minimum?: number;      // For number validation
  maximum?: number;
  enum?: any[];         // For enum validation
}

interface ZodSchema {
  zodType: string;      // e.g., "string().email()"
  serialized: string;   // Base64-encoded JSON schema definition  
  description?: string; // Human-readable description
}

interface EnumValues {
  values: string[];     // Simple enum list
  description?: string;
}

// Examples of DataType usage:
/*
  // Simple types
  "string"
  "number" 
  
  // Custom currency type
  {
    custom: "Currency",
    schema: {
      type: "object",
      properties: {
        amount: { type: "number", minimum: 0 },
        currency: { type: "string", enum: ["USD", "EUR", "GBP"] }
      },
      required: ["amount", "currency"]
    }
  }
  
  // Reference to another entity
  { ref: "abc123hash", entityType: "Company" }
  
  // Array of references
  { array: { ref: "entity", entityType: "Subsidiary" } }
  
  // Union type for flexible values
  { union: ["string", "number", { custom: "Percentage" }] }
  
  // Zod schema example (improved storage)
  {
    custom: "Email",
    schema: {
      zodType: "string().email()",
      serialized: "eyJ0eXBlIjoic3RyaW5nIiwicGF0dGVybiI6Ii4uLiJ9", // base64(jsonSchema)
      description: "Valid email address"
    }
  }
*/

// Entity as first-class versioned object  
interface EntityObject {
  "@id": string;        // SHA-256 hash of content (ONLY identifier)
  logicalId: string;    // Logical entity identifier (UUID v4)
  type: string;
  version: string;      // Semantic version
  commitHash: string;
  
  properties: Record<string, {
    value: any;
    dataType: DataType;
    commitHash?: string;  // For referenced entities
  }>;
  
  previousVersion?: string;  // @id of previous version
}

// Action as versioned object
interface ActionObject {
  "@id": string;        // SHA-256 hash of content (ONLY identifier)
  logicalId: string;    // Logical action identifier (UUID v4)  
  type: string;
  version: string;      // Semantic version
  commitHash: string;
  
  // PHASE 1: Deontic actions for legal clauses (kind='norm')
  deonticType?: 'shall' | 'may' | 'must-not' | 'liable-for' | 'entitled-to' | 'should' | 'permitted' | 'prohibited';
  
  properties?: Record<string, any>;
  previousVersion?: string;  // @id of previous version
}

// Unified statement structure for logical reasoning (Phase 1: fact + norm support)
type Statement = SVO | LogicalClause;

interface SVO {
  type: 'SVO';
  subjectRef: string;  // Hash reference to EntityObject
  verbRef: string;     // Hash reference to ActionObject
  objectRef: string;   // Hash reference to EntityObject
}

interface LogicalClause {
  type: 
    // Propositional logic
    | 'AND' | 'OR' | 'NOT' | 'IMPLIES' | 'IFF' | 'XOR'
    // Set operations
    | 'SUBSET' | 'SUPERSET' | 'UNION' | 'INTERSECTION' | 'DIFFERENCE'
    // Quantifiers
    | 'EXISTS' | 'FORALL'
    // Comparison
    | 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ' | 'NEQ'
    // Temporal logic
    | 'BEFORE' | 'AFTER' | 'DURING' | 'OVERLAPS';
  
  operands: Statement[];
  variable?: string;  // For quantifiers
  domain?: Statement;
}
```

#### Event Structure (Generic for Any Domain)
```typescript
interface Event {
  "@context": "https://schema.org/";
  "@type": "Event";  // Generic event type
  "@id": string;  // SHA-256 hash of content (ONLY identifier)
  
  // Event versioning (trackable via commits)
  logicalId: string;  // Logical event identifier (UUID v4)
  version: string;    // Semantic version (1.0, 1.1, etc.)
  previousVersion?: string;  // @id of previous version
  commitHash: string;
  
  // Core content
  title: string;  // Generic title (not just news headline)
  description?: string;  // Optional detailed description
  dateOccurred: string;  // When the event actually happened (ISO 8601)
  dateRecorded: string;  // When we recorded it (ISO 8601)
  dateModified?: string;
  
  // PHASE 1: Event kind - fact (default) or norm (legal clause)
  kind?: 'fact' | 'norm';  // Default: 'fact' for existing events
  
  // Unified logical statement (can be simple SVO or complex logical structure)
  statement: Statement;
  
  // Context and modifiers - STANDARDIZED
  modifiers: {
    temporal?: TemporalModifier;    // When, duration, frequency
    spatial?: SpatialModifier;      // Where, location, scope
    manner?: MannerModifier;        // How, method, style
    degree?: DegreeModifier;        // Extent, intensity, amount
    purpose?: PurposeModifier;      // Why, intention, goal
    condition?: ConditionalModifier; // If, unless, conditional
    certainty?: CertaintyModifier;   // Confidence, evidence, reliability
    legal?: LegalModifier;          // PHASE 1: Jurisdiction, effectiveDate, normForce
  };

// STANDARDIZED MODIFIER TYPES (Prevent spelling errors)
interface TemporalModifier {
  when?: 'past' | 'present' | 'future' | 'ongoing';
  tense?: 'will' | 'did' | 'is' | 'was' | 'has been';
  duration?: string;  // ISO 8601 duration or free text
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'occasional' | 'frequent';
  phase?: 'starting' | 'preparing' | 'continuing' | 'ending' | 'completed';
  sequence?: 'before' | 'after' | 'during' | 'simultaneous';
  context?: string;   // Free text for specific temporal context
}

interface SpatialModifier {
  location?: string;           // Specific place name
  from?: string;              // Origin location
  to?: string;                // Destination location
  region?: string;            // Geographic region
  scope?: 'local' | 'regional' | 'national' | 'international' | 'global';
  coordinate?: {              // Optional GPS coordinates
    lat: number;
    lng: number;
  };
}

interface MannerModifier {
  method?: string;            // How something is done
  mechanism?: string;         // Underlying mechanism
  style?: 'formal' | 'informal' | 'aggressive' | 'diplomatic' | 'secretive' | 'public';
  intensity?: 'low' | 'medium' | 'high' | 'extreme';
  type?: string;              // Free text for manner type
  impact?: string;            // Resulting impact
}

interface DegreeModifier {
  amount?: string;            // Specific amount (e.g., "$113M", "40%")
  scale?: 'small' | 'medium' | 'large' | 'massive';
  threshold?: string;         // Comparison threshold (e.g., "below 20%")
  outcome?: string;           // Resulting outcome
  intensity?: 'minimal' | 'moderate' | 'significant' | 'extreme';
}

interface PurposeModifier {
  reason?: string;            // Primary reason
  goal?: string;              // Intended goal
  goals?: string[];           // Multiple goals
  intention?: string;         // Underlying intention
  primary?: string;           // Primary purpose
  secondary?: string;         // Secondary purpose
}

interface ConditionalModifier {
  type?: 'if' | 'unless' | 'provided that' | 'assuming' | 'possibility' | 'potential';
  condition?: string;         // Specific condition
  certainty?: number;         // 0-1 probability
  dependency?: string;        // What this depends on
}

interface CertaintyModifier {
  confidence?: number;        // 0-1 confidence level
  source?: string;           // Source of information
  reliability?: 'low' | 'medium' | 'high' | 'verified';
  probability?: number;      // 0-1 probability estimate
  evidence?: 'hearsay' | 'reported' | 'confirmed' | 'verified' | 'official';
}

// PHASE 1: Legal-specific modifiers for normative clauses (kind='norm')
interface LegalModifier {
  jurisdiction?: string;       // "US", "EU", "Singapore", "California", etc.
  effectiveDate?: string;      // ISO 8601 date when norm becomes effective
  sunsetDate?: string;         // ISO 8601 date when norm expires (optional)
  exception?: string;          // Conditions under which norm doesn't apply
  normForce?: 'mandatory' | 'default' | 'advisory';  // Strength: 1.0 / 0.7 / 0.4
}
  
  // UNIFIED RELATIONSHIP SYSTEM (No more field confusion)
  relationships?: EventRelationship[];

// Relationship types - unified and clear
interface EventRelationship {
  type: 
    // Causal relationships
    | 'causedBy'        // This event was caused by target
    | 'causes'          // This event causes target
    | 'enables'         // This event enables target
    | 'prevents'        // This event prevents target
    | 'threatens'       // This event threatens target
    
    // Informational relationships  
    | 'derivedFrom'     // This event info derived from target
    | 'supports'        // This event supports target's claims
    | 'contradicts'     // This event contradicts target
    | 'updates'         // This event updates target
    | 'corrects'        // This event corrects target
    
    // Contextual relationships
    | 'relatedTo'       // General relationship
    | 'partOf'          // This event is part of target
    | 'contains'        // This event contains target
    | 'precedes'        // This event happens before target
    | 'follows'         // This event happens after target
    
    // PHASE 1: Legal relationships for normative clauses
    | 'amends'          // This norm amends target norm
    | 'supersedes'      // This norm replaces target norm
    | 'refersTo'        // This norm references target norm/fact
    | 'dependentOn';    // This norm depends on target norm/fact
    
  target: string;       // @id of target event
  strength?: number;    // 0-1 relationship strength (defaults to source event confidence)
  confidence?: number;  // 0-1 confidence in relationship (defaults to relationship evidence)
  description?: string; // Optional explanation
}

// STRENGTH CALCULATION (Equally Simple)
class StrengthCalculator {
  // Default: inherit from source event confidence
  calculateDefaultStrength(sourceEventConfidence: number): number {
    return sourceEventConfidence;
  }
  
  // With relationship-specific evidence adjustment
  calculateStrength(
    sourceEventConfidence: number,
    relationshipEvidence?: keyof typeof EVIDENCE_FACTORS
  ): number {
    if (!relationshipEvidence) {
      return sourceEventConfidence;
    }
    
    const R = EVIDENCE_FACTORS[relationshipEvidence] ?? 1.0;
    return Math.max(0, Math.min(1, sourceEventConfidence * R));
  }
  
  // Helper to categorize strength values
  getStrengthLabel(strength: number): 'weak' | 'moderate' | 'strong' {
    if (strength >= 0.8) return 'strong';
    if (strength >= 0.5) return 'moderate';
    return 'weak';
  }
}

// STRENGTH GUIDELINES:
// ≥ 0.8: strong    - "direct causation", "official statement"
// 0.5-0.8: moderate - "industry consensus", "multiple reports"
// < 0.5: weak       - "speculation", "single rumor"
  
  metadata: EventMetadata;
  
  // Blockchain preparation
  signature?: string;
  merkleRoot?: string;
}

interface EventMetadata {
  source: Source;
  author: string;
  version: string;
  lastModified?: string;
  datePublished?: string;  // ISO 8601
  
  // AUTO-CALCULATED fields (never set manually)
  confidence?: number;     // 0-1, = (1-V) × E × S
  volatility?: number;     // 0-1, from change history
  evidenceScore?: number;  // 0-1, from certainty.evidence
  sourceScore?: number;    // 0-1, from source.type (for kind='fact')
  legalHierarchyWeight?: number; // 0-1, for kind='norm' (replaces sourceScore)
}

interface Source {
  name: string;
  type: 'NewsAgency' | 'Government' | 'Corporate' | 'Academic' | 'Social';
  url?: string;
  
  // PHASE 1: Legal source hierarchy for kind='norm'
  legalType?: 'constitution' | 'statute' | 'regulation' | 'case-law' | 'contract' | 'policy';
}

// UNIFIED EVENT MODEL: Events can now be composite by having components
// No separate MacroEvent interface needed - use isComposite(event) helper
// All events are now handled through the unified Event interface:

interface ComponentRef {
  logicalId: string;    // Reference to logical entity
  version?: string;     // Optional version lock (defaults to latest)
  weak?: boolean;       // If true, ignore in confidence aggregation
}

// Event interface now supports composite events via optional fields:
// - components?: ComponentRef[]     // Presence indicates composite event
// - aggregation?: 'ALL' | 'ANY' | 'ORDERED' | 'CUSTOM'
// - customRuleId?: string          // For CUSTOM aggregation logic
// - depth?: number                 // System-calculated expansion depth
// - summary?: string               // Human-readable summary

// Use isComposite(event) helper to check if event is composite

// Example MacroEvent:
/*
{
  "@type": "MacroEvent",
  "@id": "sha256:composite123...",
  "logicalId": "acquisition-process-001",
  "version": "1.0",
  "title": "Tech Corp Complete Acquisition of StartupAI",
  "statement": {
    "type": "SEQUENCE",
    "operands": [
      { "type": "SVO", "subjectRef": "tech-corp", "verbRef": "investigates", "objectRef": "startupai" },
      { "type": "SVO", "subjectRef": "board", "verbRef": "approves", "objectRef": "deal" },
      { "type": "SVO", "subjectRef": "tech-corp", "verbRef": "acquires", "objectRef": "startupai" }
    ]
  },
  "components": [
    "sha256:due-diligence-event...",
    "sha256:board-approval-event...",
    "sha256:acquisition-closing-event..."
  ],
  "aggregation": "ORDERED_ALL",
  "summary": "Multi-step acquisition from due diligence through board approval to closing",
  "modifiers": {
    "temporal": { "duration": "P30D" },  // 30-day process
    "degree": { "scale": "large", "amount": "$10B" }
  }
}

// Confidence calculation for MacroEvent:
// - AND/ORDERED_ALL: C_macro = min(C1, C2, ..., Cn)  // Weakest link
// - OR: C_macro = max(C1, C2, ..., Cn)              // Strongest evidence
// - CUSTOM: User-defined aggregation function
*/
```

#### Commit Structure
```typescript
interface Commit {
  id: string;           // SHA-256 hash
  timestamp: string;    // ISO 8601
  parents: string[];    // Parent commit IDs
  tree: string;         // Tree hash
  author: string;       // Author identifier
  message: string;      // Commit message
  
  // What changed in this commit
  changes: {
    events: string[];     // Event hashes
    entities: string[];   // Entity hashes
    actions: string[];    // Action hashes
  };
  
  // Blockchain preparation
  signature?: string;   // Author's signature
  nonce?: number;      // For future PoW
}

// Repository structure (supports full git-like operations)
interface Repository {
  // Content-addressed storage (by @id hash)
  objects: {
    events: { [hash: string]: Event };
    entities: { [hash: string]: EntityObject };
    actions: { [hash: string]: ActionObject };
    commits: { [hash: string]: Commit };
    macroEvents?: { [hash: string]: MacroEvent };  // PHASE 2: Composite events
  };
  
  // Logical evolution tracking (by logicalId)
  history: {
    events: { [logicalId: string]: string[] };     // Logical Event ID -> @id hashes
    entities: { [logicalId: string]: string[] };   // Logical Entity ID -> @id hashes  
    actions: { [logicalId: string]: string[] };    // Logical Action ID -> @id hashes
    macroEvents?: { [logicalId: string]: string[] }; // PHASE 2: MacroEvent versions
  };
  
  // Git-like references
  refs: {
    heads: { [branchName: string]: string };     // Branch -> commit hash
    tags: { [tagName: string]: string };         // Tags -> commit hash
    remotes?: { [remoteName: string]: { [branchName: string]: string } };
  };
  
  // Working directory state
  HEAD: string;  // Current branch name
  staging: {
    events: Event[];
    entities: EntityObject[];
    actions: ActionObject[];
  };
  
  // Merge and diff support
  mergeState?: {
    base: string;      // Base commit hash
    ours: string;      // Our branch commit hash
    theirs: string;    // Their branch commit hash
    conflicts: ConflictInfo[];
  };
}
```

### 3. Implementation Rules

#### DO:
- Use TypeScript with strict mode
- Define all types explicitly (no `any`)
- Use async/await for all I/O operations
- Store data as JSON files in .git-events/ directory
- Use SHA-256 for content hashing (future: Keccak-256)
- Create interfaces before implementations
- Keep functions pure when possible
- Write adapter pattern for storage

#### DO NOT:
- Add any database (no SQLite, PostgreSQL, MongoDB)
- Add any message queue (no Kafka, RabbitMQ)
- Add any external services (no Redis, Elasticsearch)
- Implement authentication (keep it simple)
- Add GraphQL or any complex API layer
- Use any AI/ML libraries
- Add real-time features (no WebSockets, SSE)
- Implement complex merge strategies
- Use classes when interfaces + functions suffice

### 4. Architecture Pattern (STRICT)

```typescript
// ALWAYS use this pattern for future blockchain compatibility

// 1. Define interfaces for all object types (all trackable via commits)
interface ObjectStore {
  // Entity operations
  addEntity(entity: EntityObject): Promise<string>;
  getEntity(hash: string): Promise<EntityObject | null>;
  getEntityHistory(entityId: string): Promise<string[]>;
  
  // Action operations  
  addAction(action: ActionObject): Promise<string>;
  getAction(hash: string): Promise<ActionObject | null>;
  getActionHistory(actionId: string): Promise<string[]>;
  
  // Event operations
  addEvent(event: Event): Promise<string>;
  getEvent(hash: string): Promise<Event | null>;
  getEventHistory(eventId: string): Promise<string[]>;
  
  // PHASE 2: MacroEvent operations
  addMacroEvent?(macroEvent: MacroEvent): Promise<string>;
  getMacroEvent?(hash: string): Promise<MacroEvent | null>;
  getMacroEventHistory?(macroEventId: string): Promise<string[]>;
  
  // Commit operations
  commit(message: string, changes: Commit['changes']): Promise<Commit>;
  getCommit(hash: string): Promise<Commit | null>;
  
  // Git-like operations
  createBranch(name: string, fromCommit?: string): Promise<void>;
  switchBranch(name: string): Promise<void>;
  mergeBranch(branchName: string): Promise<Commit>;
  diff(commit1: string, commit2: string): Promise<DiffResult>;
  log(branch?: string, limit?: number): Promise<Commit[]>;
}

// 2. Implement adapter
class LocalObjectStore implements ObjectStore {
  // File system implementation
  // Store in .git-events/objects/{events,entities,actions,commits}/
}

// 3. Use dependency injection
function createRepository(store: ObjectStore): Repository {
  return {
    async addEntity(entity: EntityObject) {
      const hash = await store.addEntity(entity);
      // Track entity version history
      await store.trackEntityVersion(entity.id, hash);
      // Record patterns for future learning
      patternObserver.observeEntity(entity);
      return hash;
    },
    
    async addAction(action: ActionObject) {
      const hash = await store.addAction(action);
      // Track action version history
      await store.trackActionVersion(action.id, hash);
      // Record patterns for future learning
      patternObserver.observeAction(action);
      return hash;
    },
    
    async addEvent(event: Event) {
      // Validate all referenced objects exist
      await validateReferences(event.statement, store);
      const hash = await store.addEvent(event);
      // Track event version history
      await store.trackEventVersion(event.id, hash);
      // Record patterns for future learning  
      patternObserver.observeEvent(event);
      return hash;
    },
    
    // Git-like operations
    async createBranch(name: string, fromCommit?: string) {
      return store.createBranch(name, fromCommit);
    },
    
    async mergeBranch(branchName: string) {
      return store.mergeBranch(branchName);
    },
    
    async diff(commit1: string, commit2: string) {
      return store.diff(commit1, commit2);
    }
  };
}
```

### 6. Confidence Calculation (EXTREMELY SIMPLE & TRANSPARENT)

```typescript
// EXTREME SIMPLICITY: confidence = (1 - V) × E × S
// NO WEIGHTS, NO PARAMETERS, PURE MULTIPLICATION

// Evidence factor mapping
const EVIDENCE_FACTORS = {
  'hearsay': 0.6,
  'reported': 0.8, 
  'confirmed': 1.0,
  'verified': 1.0,
  'official': 1.0
} as const;

// Source factor mapping (for kind='fact')
const SOURCE_FACTORS = {
  'Social': 0.7,
  'Corporate': 0.9,
  'NewsAgency': 1.0,
  'Government': 1.1,
  'Academic': 1.0
} as const;

// PHASE 1: Legal hierarchy weights (for kind='norm' - replaces SOURCE_FACTORS)
const LEGAL_HIERARCHY_WEIGHTS = {
  'constitution': 1.0,
  'statute': 0.95,
  'regulation': 0.9,
  'case-law': 0.85,
  'contract': 0.8,
  'policy': 0.75
} as const;

class ConfidenceCalculator {
  // Calculate volatility from change history
  calculateVolatility(changeHistory: EventChange[]): number {
    if (changeHistory.length < 2) return 0;
    
    // Count changes per day
    const changeRates = this.getChangeRatesByDay(changeHistory);
    
    // Standard deviation of change rates
    const stdDev = this.standardDeviation(changeRates);
    
    // Normalize to 0-1 (K=10 default threshold)
    return Math.min(stdDev / 10, 1);
  }
  
  // CORE FORMULA: Transparent, no magic numbers (supports both fact and norm)
  calculateConfidence(
    volatility: number,           // 0-1 from change history
    evidence: keyof typeof EVIDENCE_FACTORS,
    sourceType?: keyof typeof SOURCE_FACTORS,     // For kind='fact'
    legalType?: keyof typeof LEGAL_HIERARCHY_WEIGHTS  // For kind='norm' (PHASE 1)
  ): number {
    const V = volatility;
    const E = EVIDENCE_FACTORS[evidence] ?? 0.7;
    
    // PHASE 1: Use legal hierarchy for norms, source factors for facts
    const S = legalType 
      ? (LEGAL_HIERARCHY_WEIGHTS[legalType] ?? 0.8)
      : (SOURCE_FACTORS[sourceType as keyof typeof SOURCE_FACTORS] ?? 1.0);
    
    // Pure multiplication - completely transparent
    return Math.max(0, Math.min(1, (1 - V) * E * S));
  }
  
  // Helper for getting evidence score
  getEvidenceScore(evidence?: string): number {
    return EVIDENCE_FACTORS[evidence as keyof typeof EVIDENCE_FACTORS] ?? 0.7;
  }
  
  // PHASE 1: Calculate norm force strength for legal relationships
  getNormForceStrength(normForce?: 'mandatory' | 'default' | 'advisory'): number {
    switch (normForce) {
      case 'mandatory': return 1.0;
      case 'default': return 0.7;
      case 'advisory': return 0.4;
      default: return 0.7; // Default to 'default'
    }
  }
  
  // Helper for getting source score
  getSourceScore(sourceType?: string): number {
    return SOURCE_FACTORS[sourceType as keyof typeof SOURCE_FACTORS] ?? 1.0;
  }
  
  // PHASE 2: Aggregate confidence for MacroEvents
  aggregateConfidence(
    componentConfidences: number[],
    aggregationLogic: 'AND' | 'OR' | 'SEQUENCE' | 'CUSTOM',
    customAggregator?: (confidences: number[]) => number
  ): number {
    if (componentConfidences.length === 0) return 0;
    
    switch (aggregationLogic) {
      case 'AND':
      case 'SEQUENCE':
        // Weakest link principle - all components must be reliable
        return Math.min(...componentConfidences);
        
      case 'OR':
        // Strongest evidence principle - any reliable component suffices
        return Math.max(...componentConfidences);
        
      case 'CUSTOM':
        if (!customAggregator) {
          throw new Error('Custom aggregator function required for CUSTOM logic');
        }
        return Math.max(0, Math.min(1, customAggregator(componentConfidences)));
        
      default:
        // Default to average (should not reach here)
        const sum = componentConfidences.reduce((a, b) => a + b, 0);
        return sum / componentConfidences.length;
    }
  }
  
  // Example usage for MacroEvent:
  // const childConfidences = await Promise.all(
  //   macroEvent.components.map(id => getEventConfidence(id))
  // );
  // const macroConfidence = calculator.aggregateConfidence(
  //   childConfidences,
  //   macroEvent.aggregationLogic || 'AND'
  // );
}

// AUTO-CALCULATION: Never manually set confidence
// Formula explanation:
// - High volatility (frequent changes) → Low confidence
// - Strong evidence (official sources) → High confidence  
// - Authoritative sources (government) → High confidence
// - Pure multiplication = fully explainable results
```

### 5. Type Validation Rules (PHASE 2 - NOT NOW)

```typescript
// ⚠️ DO NOT IMPLEMENT IN PHASE 1
// First collect data, observe patterns, then add validation

// Phase 1: Just record patterns
class PatternObserver {
  observe(svo: SVO): void {
    // Only record, no validation
    const pattern = `${svo.subject.label}-${svo.verb.id}-${svo.object.label}`;
    this.patterns.set(pattern, (this.patterns.get(pattern) || 0) + 1);
  }
  
  // PHASE 2: Observe MacroEvent patterns
  observeMacroEvent(macroEvent: MacroEvent): void {
    // Record aggregation patterns without validation
    const key = `${macroEvent.aggregationLogic}-${macroEvent.components.length}`;
    this.macroPatterns.set(key, (this.macroPatterns.get(key) || 0) + 1);
    
    // Also record statement type patterns
    const stmtKey = `macro-${macroEvent.statement.type}`;
    this.statementPatterns.set(stmtKey, (this.statementPatterns.get(stmtKey) || 0) + 1);
  }
}

// Phase 2 (future): Add validation based on observed patterns
// const validator = new TypeValidator();  // NOT YET
```

### 6. File Structure (EXACT)
```
VeritasChain/
├── .git-events/           # Data storage
│   ├── objects/          # Content-addressed storage
│   │   ├── events/      # Event objects
│   │   ├── entities/    # Entity objects
│   │   ├── actions/     # Action objects
│   │   └── commits/     # Commit objects
│   ├── refs/             # Branch pointers
│   │   └── heads/        # Branch files
│   ├── history/          # Version tracking
│   │   ├── entities/    # Entity version chains
│   │   └── actions/     # Action version chains
│   └── HEAD              # Current branch
├── src/
│   ├── types/            # TypeScript definitions
│   │   ├── core.ts      # Core types (DataType, JSONSchema, etc.)
│   │   ├── modifiers.ts # Standardized modifier enums
│   │   ├── entity.ts    # Entity interfaces
│   │   ├── action.ts    # Action interfaces
│   │   ├── statement.ts # Statement types (SVO, LogicalClause)
│   │   ├── event.ts     # Event interfaces
│   │   ├── relationships.ts # EventRelationship types
│   │   ├── commit.ts    # Commit interfaces
│   │   └── index.ts     # Re-exports
│   ├── core/
│   │   ├── hash.ts      # Hashing utilities
│   │   ├── sign.ts      # Signature utilities
│   │   ├── merkle.ts    # Merkle tree (future blockchain)
│   │   ├── confidence.ts # Volatility-based confidence
│   │   └── patterns.ts  # Pattern observer (Phase 2 prep)
│   ├── adapters/
│   │   ├── interfaces.ts # Storage interfaces
│   │   └── local.ts     # File system implementation
│   ├── repository/
│   │   ├── entity.ts    # Entity operations
│   │   ├── action.ts    # Action operations
│   │   ├── event.ts     # Event operations
│   │   ├── commit.ts    # Commit operations
│   │   ├── branch.ts    # Branch management
│   │   └── merge.ts     # Simple 3-way merge
│   ├── api/
│   │   └── server.ts    # Express server
│   └── index.ts         # Entry point
├── test/
├── tsconfig.json
├── package.json
└── README.md

```

### 7. API Endpoints (Versioned & Consistent)
```
# API Versioning: All endpoints prefixed with /v1/
# Accept-Version: 1.0 header support for future compatibility

# Object operations
POST   /v1/entities                     # Add entity to staging
GET    /v1/entities/:hash               # Get entity by @id hash
GET    /v1/entities/logical/:id         # Get latest version by logicalId
GET    /v1/entities/logical/:id/history # Get all versions by logicalId

POST   /v1/actions                      # Add action to staging  
GET    /v1/actions/:hash                # Get action by @id hash
GET    /v1/actions/logical/:id/history  # Get action version history

# Unified Event operations (supports both leaf and composite events)
POST   /v1/events                       # Add Event (leaf or composite) to staging
GET    /v1/events/:hash                 # Get Event by @id hash
GET    /v1/events/:hash/depth          # Get recursive depth for composite events
GET    /v1/events/:hash/formula        # Get confidence aggregation formula
GET    /v1/events/logical/:id          # Get latest Event version
GET    /v1/events/logical/:id/history  # Get Event version history

# Legacy MacroEvent redirects (deprecated)
POST   /v1/macro-events                # Redirects to /v1/events with transformation
GET    /v1/macro-events/:hash          # Redirects to /v1/events/:hash (301)
GET    /v1/macro-events/logical/:id    # Redirects to /v1/events/logical/:id (301)

# Repository operations (consistent naming)
POST   /v1/commits                      # Create commit
GET    /v1/commits/:hash                # Get specific commit
GET    /v1/commits                      # List commits (?limit=10&since=hash)

GET    /v1/branches                     # List branches  
POST   /v1/branches                     # Create branch
PUT    /v1/branches/:name/checkout      # Switch to branch
POST   /v1/branches/:name/merge         # Merge branch

# Comparison operations (unified naming)
GET    /v1/compare/commits/:hash1...:hash2    # Compare two commits
GET    /v1/compare/branches/:name1...:name2   # Compare two branches
GET    /v1/compare/entities/:hash1...:hash2   # Compare entity versions

# Query operations (with pagination & defaults)
GET    /v1/query/timeline              # Query timeline (?limit=50&since&until)
GET    /v1/query/entities              # Search entities (?type&q&limit=50)  
GET    /v1/query/relationships         # Query relationships (?type&target&limit=50)

# Health and metadata
GET    /v1/health                      # API health check
GET    /v1/metadata                    # Repository metadata
```

## API Design Principles
1. **Versioning**: All endpoints use `/v1/` prefix for future compatibility
2. **Consistent Naming**: All comparison operations under `/compare/`  
3. **Dual Access**: Objects accessible by @id hash OR logicalId
4. **Pagination**: Query endpoints support `?limit&since` parameters with defaults:
   - **Default limit**: 50 items per request
   - **Maximum limit**: 500 items per request  
   - **Offset support**: `?since=hash` for cursor-based pagination
5. **Clear Semantics**: `PUT /checkout` vs `POST /merge` for different operations

### 8. Type Safety Requirements

Always define types first:
```typescript
// GOOD - Types first
interface CreateEventParams {
  headline: string;
  svo: SVO;
  metadata: EventMetadata;
}

async function createEvent(params: CreateEventParams): Promise<NewsEvent> {
  // Implementation
}

// BAD - No explicit types
async function createEvent(headline, svo, metadata) {
  // NO! Missing types
}
```

## Implementation Order

1. **Phase 1.1**: Core types (core.ts, entity.ts, action.ts, statement.ts)
2. **Phase 1.2**: Event and commit types (event.ts, commit.ts)
3. **Phase 1.3**: Core utilities (hash.ts, confidence.ts)
4. **Phase 1.4**: Pattern observer (patterns.ts - just recording)
5. **Phase 1.5**: Storage adapter (local.ts with multi-object support)
6. **Phase 1.6**: Repository operations (entity, action, event, commit)
7. **Phase 1.7**: HTTP API with all endpoints
8. **Phase 1.8**: Tests

**Phase 2 (Engineering & Composite Events)**:

**Core Engineering Tasks:**
1. **Phase 2.1**: Branch creation and switching
2. **Phase 2.2**: Three-way merge algorithm for events
3. **Phase 2.3**: Conflict detection and resolution
4. **Phase 2.4**: Event diff visualization
5. **Phase 2.5**: HTTP API with Express
6. **Phase 2.6**: CNL template parsing ("X shall Y" → DeonticSVO)
7. **Phase 2.7**: Query indexing (jurisdiction, effectiveDate)

**MacroEvent Tasks (NEW):**
8. **Phase 2-A**: MacroEvent type definition & API
   - Update `types/event.ts` with MacroEvent interface
   - Implement `POST /v1/macro-events` endpoint
   - Add storage adapter methods for MacroEvents
9. **Phase 2-B**: Three-way merge extension for MacroEvents
   - Detect conflicts in component event references
   - Prompt human resolution for complex merges
   - Update component references post-merge
10. **Phase 2-C**: Confidence aggregation algorithm
    - Extend `core/confidence.ts` with `aggregateConfidence()`
    - Support AND/OR/SEQUENCE/CUSTOM aggregation
    - Maintain calculation transparency

**Implementation Order for MacroEvents:**
2-A → 2-C → 2-B (types first, then aggregation, then merge handling)

**Phase 3 (Later)**:
- Type inference from patterns (including MacroEvent patterns)
- Validation rules based on observed data
- Constraint learning from real usage

## Example Implementation Pattern

```typescript
// Use the single ConfidenceCalculator class defined above (lines 621-672)
// All confidence calculation follows the unified (1-V) × E × S formula
// No duplicate confidence implementations - refer to the complete class above
```

## Blockchain Preparation Rules

1. **All IDs must be hex strings**: `0x${string}`
2. **Use bigint for numbers**: Not number type
3. **Signatures are optional now**: But structure must support them
4. **Hash everything**: Content-addressing is key
5. **No timestamps in hashes**: Use block timestamps later

## CI/Pre-commit Validation

### Hash Format Validation
Add this to pre-commit hooks to ensure data integrity:

```typescript
// src/utils/hashLint.ts
export function assertSha256(id: string, context: string) {
  if (!/^sha256:[0-9a-f]{64}$/.test(id)) {
    throw new Error(`[${context}] invalid SHA-256: ${id}`);
  }
}

// Pre-commit validation
function validateDataFiles() {
  // Check all @id, commitHash, target fields
  const hashPattern = /^sha256:[0-9a-f]{64}$/;
  
  // Validate in SAMPLE.md, test files, etc.
  const invalidHashes = findHashReferences().filter(hash => !hashPattern.test(hash));
  
  if (invalidHashes.length > 0) {
    throw new Error(`Invalid hash formats found: ${invalidHashes.join(', ')}`);
  }
}
```

### Relationship Type Validation
```typescript
const validRelationshipTypes = [
  'causedBy', 'causes', 'enables', 'prevents', 'threatens',
  'derivedFrom', 'supports', 'contradicts', 'updates', 'corrects',
  'relatedTo', 'partOf', 'contains', 'precedes', 'follows',
  // PHASE 1: Legal relationships
  'amends', 'supersedes', 'refersTo', 'dependentOn'
];

function validateRelationshipTypes(relationships: EventRelationship[]) {
  relationships.forEach(rel => {
    if (!validRelationshipTypes.includes(rel.type)) {
      throw new Error(`Invalid relationship type: ${rel.type}`);
    }
  });
}

// PHASE 1: Validate legal modifiers for norm events
function validateLegalEvent(event: Event) {
  if (event.kind === 'norm') {
    // Require legal modifiers
    if (!event.modifiers.legal) {
      throw new Error('Norm events must have legal modifiers');
    }
    
    // Validate legal source type
    if (!event.metadata.source.legalType) {
      throw new Error('Norm events must specify source.legalType');
    }
    
    // Validate deontic actions
    if (event.statement.type === 'SVO') {
      // Check if action has deontic type for legal statements
      // (Optional but recommended for clarity)
    }
  }
}

// Validate norm force values
const validNormForces = ['mandatory', 'default', 'advisory'];
function validateNormForce(normForce?: string) {
  if (normForce && !validNormForces.includes(normForce)) {
    throw new Error(`Invalid normForce: ${normForce}`);
  }
}
```

## Final Warnings

1. **NO EXTERNAL DATABASES** - Use only the file system
2. **NO STREAMING** - Simple request/response only
3. **CONFIDENCE = (1 - V) × E × S** - Single transparent formula, no weights
4. **NO TYPE VALIDATION YET** - Just observe patterns in Phase 1
5. **USE OPTIONAL TYPES** - Don't force entity/verb types early
6. **TRACK CHANGES** - Every modification affects volatility
7. **TYPE EVERYTHING** - No implicit any
8. **PURE FUNCTIONS** - Easier to test and migrate

Remember: This is a foundation for a decentralized system. Every decision should consider:
- "How will this work on a blockchain?"
- "Is the confidence calculation transparent?"
- "Are we learning from data, not imposing structure?"

## Phase 1 Focus

1. **Core Git operations** - init, add, commit, branch, merge
2. **Dual event support** - Both fact (news) and norm (legal clause) events  
3. **Confidence calculation** - (1 - V) × E × S formula for both fact and norm
4. **Pattern observation** - Record what we see, don't validate
5. **Clean architecture** - Interfaces and adapters for future flexibility

## What NOT to do in Phase 1

1. **Don't define entity types** - Let them emerge from data
2. **Don't validate relationships** - Just record them (except basic enum validation)
3. **Don't create complex legal reasoning** - Simple deontic actions only
4. **Don't build advanced applications** - Save compliance monitoring, smart contracts for Phase 4
5. **Don't optimize** - Clarity over performance