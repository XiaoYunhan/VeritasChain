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

#### Core Object Model (Version-Controlled)
```typescript
// Flexible data type system
type DataType = 
  | 'string' | 'number' | 'boolean' | 'date' | 'bigint'
  | { custom: string; schema?: any }
  | { struct: Record<string, DataType> }
  | { ref: string };

// Entity as first-class versioned object
interface EntityObject {
  id: string;
  type: string;
  commitHash: string;
  
  properties: Record<string, {
    value: any;
    dataType: DataType;
    commitHash?: string;  // For referenced entities
  }>;
  
  previousVersion?: string;
}

// Action as versioned object
interface ActionObject {
  id: string;
  type: string;
  commitHash: string;
  properties?: Record<string, any>;
  previousVersion?: string;
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
  "@id": string;  // SHA-256 hash of content
  
  // Event versioning (trackable via commits)
  id: string;  // Logical event ID (can have multiple versions)
  version: string;
  previousVersion?: string;
  commitHash: string;
  
  // Core content
  title: string;  // Generic title (not just news headline)
  description?: string;  // Optional detailed description
  dateOccurred: string;  // When the event actually happened (ISO 8601)
  dateRecorded: string;  // When we recorded it (ISO 8601)
  dateModified?: string;
  
  // Unified logical statement (可以是简单SVO或复杂逻辑结构)
  statement: Statement;
  
  // Context and modifiers (状语和定语)
  modifiers: {
    temporal?: TemporalModifier;    // 时间状语 (when, duration, frequency)
    spatial?: SpatialModifier;      // 地点状语 (where, location)
    manner?: MannerModifier;        // 方式状语 (how, method)
    degree?: DegreeModifier;        // 程度状语 (extent, intensity)
    purpose?: PurposeModifier;      // 目的状语 (why, intention)
    condition?: ConditionalModifier; // 条件状语 (if, unless)
    certainty?: CertaintyModifier;   // 确定性定语 (probable, certain)
  };
  
  // Relationships
  relatedEvents?: string[];  // Event hashes
  derivedFrom?: string[];    // Source event hashes
  causedBy?: string[];       // Causal predecessors
  causes?: string[];         // Causal consequences
  
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
  
  // Calculated fields (never set manually)
  confidence?: number;     // 0-1, based on volatility
  volatility?: number;     // 0-1, change frequency
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
  // Content-addressed storage
  objects: {
    events: { [hash: string]: Event };
    entities: { [hash: string]: EntityObject };
    actions: { [hash: string]: ActionObject };
    commits: { [hash: string]: Commit };
  };
  
  // Version tracking for ALL object types
  history: {
    events: { [eventId: string]: string[] };     // Event ID -> commit hashes
    entities: { [entityId: string]: string[] };  // Entity ID -> commit hashes  
    actions: { [actionId: string]: string[] };   // Action ID -> commit hashes
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

### 6. Confidence Calculation (REQUIRED)

```typescript
// Confidence = 1 - Volatility (simple and intuitive)
class ConfidenceCalculator {
  // Track changes over time
  calculateVolatility(eventId: string, changeHistory: EventChange[]): number {
    if (changeHistory.length < 2) return 0;
    
    // Count changes per time window
    const changeRates = this.getChangeRatesByDay(changeHistory);
    
    // Calculate standard deviation
    const stdDev = this.standardDeviation(changeRates);
    
    // Normalize to 0-1
    return Math.min(stdDev / 10, 1);
  }
  
  // Simple confidence based on volatility
  calculateConfidence(volatility: number, sourceType: string): number {
    // Base confidence
    let confidence = 1 - volatility;
    
    // Simple source adjustment
    const sourceFactors = {
      'NewsAgency': 1.0,
      'Government': 1.1,
      'Corporate': 0.9,
      'Social': 0.7
    };
    
    return confidence * (sourceFactors[sourceType] || 1.0);
  }
}

// NEVER manually set confidence values
// ALWAYS calculate from change history
```

### 7. Type Validation Rules (PHASE 2 - NOT NOW)

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

### 5. File Structure (EXACT)
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
│   │   ├── core.ts      # Core types (DataType, etc.)
│   │   ├── entity.ts    # Entity interfaces
│   │   ├── action.ts    # Action interfaces
│   │   ├── statement.ts # Statement types (SVO, LogicalClause)
│   │   ├── event.ts     # Event interfaces
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

### 6. API Endpoints (MINIMAL)
```
# Object operations
POST   /entities                  # Add entity to staging
GET    /entities/:hash            # Get entity by hash
GET    /entities/:id/history      # Get entity version history

POST   /actions                   # Add action to staging
GET    /actions/:hash             # Get action by hash

POST   /events                    # Add event to staging
GET    /events/:hash              # Get event by hash

# Repository operations
POST   /commits                   # Create commit
GET    /commits/:id               # Get specific commit
GET    /branches                  # List branches
POST   /branches                  # Create branch
PUT    /branches/:name            # Switch branch
POST   /branches/:name/merge      # Merge branch
GET    /log                       # Get commit history
GET    /diff                      # Compare branches

# Query operations
GET    /query/timeline            # Query event timeline
GET    /query/entities            # Search entities
```

### 7. Type Safety Requirements

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
// GOOD - Simple confidence based on volatility
class SimpleConfidence {
  calculate(changeHistory: Change[]): number {
    const volatility = this.calculateVolatility(changeHistory);
    return 1 - volatility;  // That's it!
  }
}

// BAD - Over-engineered confidence
class ComplexConfidence {
  calculate(event: Event): number {
    const weight1 = 0.25;  // Where did these numbers come from?
    const weight2 = 0.20;  // Too subjective!
    // NO! Too complex
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
3. **CONFIDENCE = 1 - VOLATILITY** - Simple formula, no complex weights
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
2. **Simple confidence** - Based only on change frequency
3. **Pattern observation** - Record what we see, don't validate
4. **Clean architecture** - Interfaces and adapters for future flexibility

## What NOT to do in Phase 1

1. **Don't define entity types** - Let them emerge from data
2. **Don't validate relationships** - Just record them
3. **Don't create complex rules** - Keep it simple
4. **Don't optimize** - Clarity over performance