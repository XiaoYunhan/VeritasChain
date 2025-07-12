# CLAUDE.md - VeritasChain Development Instructions

## CRITICAL: Read This First

This project implements a Git-like version control system for news events with **future blockchain compatibility**. The architecture is intentionally minimal but must support future decentralization. **DO NOT** add unnecessary complexity or dependencies.

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
  properties?: Record<string, any>;
  previousVersion?: string;  // @id of previous version
}

// Unified statement structure for logical reasoning
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
  
  // Unified logical statement (可以是简单SVO或复杂逻辑结构)
  statement: Statement;
  
  // Context and modifiers (状语和定语) - STANDARDIZED
  modifiers: {
    temporal?: TemporalModifier;    // 时间状语 (when, duration, frequency)
    spatial?: SpatialModifier;      // 地点状语 (where, location)
    manner?: MannerModifier;        // 方式状语 (how, method)
    degree?: DegreeModifier;        // 程度状语 (extent, intensity)
    purpose?: PurposeModifier;      // 目的状语 (why, intention)
    condition?: ConditionalModifier; // 条件状语 (if, unless)
    certainty?: CertaintyModifier;   // 确定性定语 (probable, certain)
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
    | 'follows';        // This event happens after target
    
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
  sourceScore?: number;    // 0-1, from source.type
}

interface Source {
  name: string;
  type: 'NewsAgency' | 'Government' | 'Corporate' | 'Academic' | 'Social';
  url?: string;
}
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
  };
  
  // Logical evolution tracking (by logicalId)
  history: {
    events: { [logicalId: string]: string[] };     // Logical Event ID -> @id hashes
    entities: { [logicalId: string]: string[] };   // Logical Entity ID -> @id hashes  
    actions: { [logicalId: string]: string[] };    // Logical Action ID -> @id hashes
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

// Source factor mapping  
const SOURCE_FACTORS = {
  'Social': 0.7,
  'Corporate': 0.9,
  'NewsAgency': 1.0,
  'Government': 1.1,
  'Academic': 1.0
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
  
  // CORE FORMULA: Transparent, no magic numbers
  calculateConfidence(
    volatility: number,           // 0-1 from change history
    evidence: keyof typeof EVIDENCE_FACTORS,
    sourceType: keyof typeof SOURCE_FACTORS
  ): number {
    const V = volatility;
    const E = EVIDENCE_FACTORS[evidence] ?? 0.7;
    const S = SOURCE_FACTORS[sourceType] ?? 1.0;
    
    // Pure multiplication - completely transparent
    return Math.max(0, Math.min(1, (1 - V) * E * S));
  }
  
  // Helper for getting evidence score
  getEvidenceScore(evidence?: string): number {
    return EVIDENCE_FACTORS[evidence as keyof typeof EVIDENCE_FACTORS] ?? 0.7;
  }
  
  // Helper for getting source score
  getSourceScore(sourceType?: string): number {
    return SOURCE_FACTORS[sourceType as keyof typeof SOURCE_FACTORS] ?? 1.0;
  }
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

# Phase 2 additions (DO NOT implement now):
# ├── validation/
# │   ├── types.ts         # Type validator
# │   ├── constraints.ts   # Learned constraints
# │   └── learner.ts       # ML-based pattern learning
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

POST   /v1/events                       # Add event to staging
GET    /v1/events/:hash                 # Get event by @id hash
GET    /v1/events/logical/:id/history   # Get event version history

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

**Phase 2 (Later)**:
- Type inference from patterns
- Validation rules
- Constraint learning

## Example Implementation Pattern

```typescript
// GOOD - Transparent confidence calculation
class VeritasConfidence {
  calculate(volatility: number, evidence: string, sourceType: string): number {
    const V = volatility;
    const E = EVIDENCE_FACTORS[evidence] ?? 0.7;
    const S = SOURCE_FACTORS[sourceType] ?? 1.0;
    return (1 - V) * E * S;  // Completely transparent!
  }
}

// BAD - Over-engineered confidence
class ComplexConfidence {
  calculate(event: Event): number {
    const weight1 = 0.25;  // Where did these numbers come from?
    const weight2 = 0.20;  // Too subjective!
    // NO! Too complex, no magic weights
  }
}
```

## Blockchain Preparation Rules

1. **All IDs must be hex strings**: `0x${string}`
2. **Use bigint for numbers**: Not number type
3. **Signatures are optional now**: But structure must support them
4. **Hash everything**: Content-addressing is key
5. **No timestamps in hashes**: Use block timestamps later

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
2. **Confidence calculation** - (1 - V) × E × S formula only
3. **Pattern observation** - Record what we see, don't validate
4. **Clean architecture** - Interfaces and adapters for future flexibility

## What NOT to do in Phase 1

1. **Don't define entity types** - Let them emerge from data
2. **Don't validate relationships** - Just record them
3. **Don't create complex rules** - Keep it simple
4. **Don't optimize** - Clarity over performance