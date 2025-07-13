# VeritasChain

A Git-like version control system for tracking both **factual events** (news, economic, scientific) and **normative clauses** (legal, contractual) with unified logical reasoning support and transparent confidence calculation, designed with blockchain-ready architecture for future decentralization.

## Vision

Create a tamper-proof, decentralized system for tracking both factual events and normative clauses where:
- Every change is cryptographically signed and traceable
- Multiple sources can be compared and conflicts resolved
- Historical timelines can be reconstructed with full provenance
- Legal clauses and contracts can be versioned and cross-referenced
- Future migration to blockchain enables trustless collaboration and smart contract integration

## Development Roadmap

### Phase 1: Foundation + Legal Support (Weeks 1-4) ✅ **COMPLETE**
**Goal**: Local Git-like functionality with both fact and norm support

**✅ What We Built:**
- [x] TypeScript project setup with strict configuration  
- [x] SHA-256 content-addressing system (@noble/hashes)
- [x] File-based storage with `.git-events/` structure
- [x] Core utilities (hash, confidence, patterns, signatures)
- [x] Complete type system (Event, Entity, Action, Commit interfaces)
- [x] Adapter pattern with local storage implementation
- [x] Transparent confidence calculation: `confidence = (1-V) × E × S`
- [x] Pattern observation system (Phase 2 ready)
- [x] Comprehensive test suite (18 test cases, 100% pass rate)

**✅ Legal Clause Support (PHASE 1 ADDITION):**
- [x] Event `kind: 'fact' | 'norm'` discriminator
- [x] Deontic action types (`shall`, `may`, `must-not`, `liable-for`, `entitled-to`)
- [x] Legal modifiers (`jurisdiction`, `effectiveDate`, `sunsetDate`, `normForce`)
- [x] Legal relationships (`amends`, `supersedes`, `refersTo`, `dependentOn`)
- [x] Legal hierarchy weights (constitution→statute→regulation→case-law→contract→policy)
- [x] Unified confidence formula supports both fact and norm sources

**✅ Verification:**
```bash
# Verify Phase 1 completion
npm install && npm run build && npm test

# Expected: 18 tests pass, files created in .git-events/
# View parsed events: cat tests/output/test-results.json
```

**✅ Architecture Achieved:**
- **Dual ID System**: Content hash (@id) + logical grouping (logicalId)
- **Version Control**: All objects (Entity, Action, Event) are versioned
- **Unified Statements**: SVO + logical operators (AND, OR, IMPLIES, etc.)
- **Rich Modifiers**: Temporal, spatial, legal, certainty contexts
- **Blockchain Ready**: Ed25519 signatures, deterministic hashing
- **Zero External Dependencies**: Only 4 runtime deps as specified

### Phase 2: Engineering & Scale (Weeks 5-8) 🚧
**Goal**: Robust tooling, indexing, and composite event support

**Core Engineering:**
- [ ] Branch creation and switching
- [ ] Three-way merge algorithm for events
- [ ] Conflict detection and resolution
- [ ] Event diff visualization
- [ ] HTTP API with Express
- [ ] CNL template parsing for legal clauses ("X shall Y" → DeonticSVO)
- [ ] Jurisdiction + effectiveDate indexing for legal queries
- [ ] Frontend timeline visualization with amendment chains

**New: Composite Event Support (MacroEvent L2):**
- [x] **Phase 2.8**: MacroEvent type definition & API endpoints
  - Define MacroEvent interface with ComponentRef support
  - Implement flexible component referencing (logical/version)
  - Support aggregation logic (AND/OR/ORDERED_ALL/CUSTOM)
- [ ] **Phase 2.9**: Three-way merge extension for MacroEvents
  - Detect conflicts in component events
  - Prompt human resolution for complex merges
  - Update component references post-merge
- [x] **Phase 2.10**: Confidence aggregation algorithm
  - Implement `aggregateConfidence()` in `core/confidence.ts`
  - Support different aggregation strategies (min/max/custom)
  - Add confidence caching layer for performance

**Deliverable**: Production-ready version control with composite events and legal clause parsing

### Phase 3: Quality & Automation (Weeks 9-12) 📋
**Goal**: ML-driven validation and self-correction

- [ ] Weak-Supervision IE for automatic Clause-IE extraction
- [ ] Statement validation (SVO + logical clauses) - learned, not hardcoded
- [ ] Multi-source confidence calibration for legal clauses
- [ ] Hohfeld rights/duties inference module
- [ ] Semantic search across fact/norm knowledge base
- [ ] Causal chain analysis and conflict resolution

**Deliverable**: Self-improving system with automated legal reasoning

### Phase 4: Legal Applications & Blockchain Prep (Weeks 13-16) 🔗
**Goal**: High-value legal use cases + blockchain architecture

**Legal Applications:**
- [ ] Compliance monitoring ("7-day effective mandatory export controls" → supply chain alerts)
- [ ] Dynamic contract execution (norm + fact events → automated settlement)
- [ ] Legal RAG/QA system ("Singapore paternity leave days?" → structured norm retrieval)
- [ ] Smart contract oracles (norm hashes on-chain, fact confidence ≥0.9 triggers execution)
- [ ] LegalBench evaluation datasets (structured clause extraction benchmarks)
- [ ] Policy impact analysis (PageRank on amends/supersedes chains)

**Blockchain Integration:**
- [ ] Ed25519 signature implementation
- [ ] Merkle tree for event batches
- [ ] IPFS integration for content storage
- [ ] Smart contract interfaces (TypeScript)
- [ ] Migration tools for existing data
- [ ] Testnet deployment guide

**Deliverable**: Production legal applications + blockchain-ready hybrid system

### Phase 5: Blockchain Migration (Months 5-6) 🚀
**Goal**: Full decentralization

- [ ] Deploy smart contracts to Polygon/Ethereum
- [ ] Implement role-based permissions on-chain
- [ ] Connect to MetaMask for signatures
- [ ] Decentralized identity (DID) support
- [ ] Multi-organization consensus
- [ ] Production deployment

**Deliverable**: Fully decentralized news tracking system

## Core Architecture Concepts

### Unified Statement System
VeritasChain supports both simple statements and complex logical reasoning through a unified type system:

```typescript
// Simple Subject-Verb-Object statements
statement: {
  type: 'SVO',
  subjectRef: "sha256:company-abc...",
  verbRef: "sha256:acquires-action...", 
  objectRef: "sha256:startup-xyz..."
}

// Complex logical clauses with operators
statement: {
  type: 'AND',
  operands: [
    { type: 'SVO', ... },
    { type: 'IMPLIES', operands: [...] }
  ]
}

// Supported operators: AND, OR, NOT, IMPLIES, IFF, XOR, 
// SUBSET, UNION, INTERSECTION, EXISTS, FORALL, GT, LT, EQ,
// BEFORE, AFTER (temporal)
```

### Object-SVO-Clause-Event Hierarchy

VeritasChain implements a mathematically elegant hierarchy mapping linguistic concepts to version-controlled objects:

| Layer | Linguistic Role | Data Structure | Version Control | Example |
|-------|-----------------|----------------|-----------------|---------|
| **Object** | Noun phrase (entity/concept) | `EntityObject` | ✅ Individual | "JPMorgan Chase" |
| **Verb/Predicate** | Action/relation | `ActionObject` | ✅ Individual | "acquires" |
| **SVO** | Simple proposition | `SVO` (leaf Statement) | Via components | "JPMorgan acquires StartupAI" |
| **Clause** | Logical compound | `LogicalClause` | Via Event | "IF acquisition THEN price > $10B" |
| **Event (L1)** | Semantic unit | `Event` (fact/norm) | ✅ Individual | News event or legal clause |
| **MacroEvent (L2)** | Event narrative | `MacroEvent` | ✅ Individual | Multi-step acquisition process |

This hierarchy follows a λ-calculus style abstraction:
```
Object → Predicate → Proposition → Formula → Event → Narrative
```

Each layer is a functor over the previous, forming a category-theoretic chain that's both intuitive and formally rigorous.

### Rich Modifier System
Events support comprehensive context through standardized modifiers:

```typescript
modifiers: {
  temporal: {
    when: "present" | "past" | "future",
    tense: string,
    duration?: string,
    frequency?: "once" | "daily" | "weekly" | "ongoing"
  },
  spatial: {
    location?: string,
    region?: string, 
    scope: "local" | "regional" | "national" | "global"
  },
  manner: {
    method?: string,
    style?: "formal" | "informal" | "urgent",
    intensity: "low" | "medium" | "high"
  },
  degree: {
    amount?: string,     // "$10B", "50%", etc.
    scale: "small" | "medium" | "large" | "massive",
    threshold?: string
  },
  purpose: {
    goal?: string,
    reason?: string,
    intention?: string
  },
  condition: {
    type: "definite" | "possibility" | "necessity",
    condition?: string,
    certainty?: number  // 0-1
  },
  certainty: {
    evidence: number,        // 0-1 (calculated from data quality)
    source: number,          // 0-1 (based on source type)
    reliability: "low" | "medium" | "high"
  }
}
```

### Version-Controlled Everything
Every object (Entity, Action, Event) is version-controlled with content addressing:

```typescript
// Dual ID system - no confusion
{
  "@id": "sha256:abc123...",        // Content hash (unique per version)
  "logicalId": "apple-inc-001",     // Groups all versions together
  "version": "1.2",                 // Human-readable version
  "commitHash": "sha256:def456..."  // Commit that created this version
}
```

### Transparent Confidence Calculation
Automatic confidence calculation with complete transparency:

```typescript
// NEVER set confidence manually - always calculated
confidence = (1 - volatility) × evidenceFactor × sourceFactor

// Where:
// volatility   = calculated from change frequency (0 = stable, 1 = chaotic)
// evidence     = quality of supporting data (0.7 = reported, 0.9 = confirmed, 1.0 = primary)
// source       = source reliability (Academic=1.0, NewsAgency=0.9, Social=0.7)
```

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│          (CLI / Web UI / API /v1/ endpoints)                │
├─────────────────────────────────────────────────────────────┤
│                    Repository Layer                          │
│    (Event/Entity/Action Management, Commits, Branches)      │
├─────────────────────────────────────────────────────────────┤
│                    Adapter Layer                            │
│     ┌──────────────┐              ┌──────────────┐         │
│     │ Local Store  │              │ Blockchain   │         │
│     │ (Phase 1-3)  │              │ (Phase 4-5)  │         │
│     │  JSON Files  │              │ Smart Contract│         │
│     └──────────────┘              └──────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     Core Layer                              │
│   (SHA-256, Ed25519, Confidence Calculator, Pattern Observer)│
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Dual ID System**: Content hash (@id) + logical grouping (logicalId) - no confusion
2. **Content Addressing**: All data identified by SHA-256 hash for integrity
3. **Version Control Everything**: Entities, Actions, Events all have commit history
4. **Transparent Confidence**: Auto-calculated (1-V)×E×S formula, never manual
5. **Logical Reasoning Support**: Unified statements (SVO + logical operators)
6. **Adapter Pattern**: Storage abstracted (file system → blockchain migration)
7. **Minimal Dependencies**: Only 4 runtime deps (express, uuid, @noble/hashes, @noble/ed25519)
8. **Progressive Enhancement**: Each phase adds capabilities without breaking changes

### File Structure
```
VeritasChain/
├── .git-events/              # Data storage (Git-like)
│   ├── objects/             # Content-addressed storage
│   │   ├── events/         # Event objects  
│   │   ├── entities/       # Entity objects
│   │   ├── actions/        # Action objects
│   │   └── commits/        # Commit objects
│   ├── refs/heads/         # Branch pointers
│   └── HEAD                # Current branch
├── src/
│   ├── types/              # TypeScript definitions
│   │   ├── event.ts       # Event interfaces (Statement, Modifiers)
│   │   ├── entity.ts      # EntityObject, ActionObject  
│   │   ├── commit.ts      # Commit interfaces
│   │   └── confidence.ts  # Confidence calculation types
│   ├── core/
│   │   ├── hash.ts        # SHA-256 utilities (@noble/hashes)
│   │   ├── confidence.ts  # Transparent (1-V)×E×S calculator
│   │   └── patterns.ts    # Pattern observer (Phase 2 prep)
│   ├── adapters/
│   │   ├── interfaces.ts  # Storage interfaces
│   │   └── local.ts       # File system implementation
│   ├── repository/        # Git-like operations
│   └── api/               # Express server (/v1/ endpoints)
└── tests/                 # 100% test coverage requirement
```

## Target Effect Examples

### Example 1: Multi-Source Event Tracking with Logical Reasoning

```typescript
// Bloomberg reports with SVO statement
const bloombergEvent = await repo.addEvent({
  "@id": "sha256:d4e5f67...", // Content hash (auto-generated)
  logicalId: "tech-acquisition-001",
  title: "Tech Corp Announces Acquisition",
  dateOccurred: "2025-01-15T09:00:00Z",
  dateRecorded: "2025-01-15T10:30:00Z",
  statement: {
    type: 'SVO',
    subjectRef: "sha256:tech-corp-entity...",
    verbRef: "sha256:acquires-action...",
    objectRef: "sha256:startupai-entity..."
  },
  modifiers: {
    degree: { amount: "$10B", scale: "massive" },
    certainty: { confidence: 0.95, source: "official", evidence: "confirmed" }
  },
  metadata: {
    source: { name: "Bloomberg", type: "NewsAgency" },
    author: "finance.reporter@bloomberg.com"
  }
});

// Reuters reports with logical clause (IMPLIES relationship)
const reutersEvent = await repo.addEvent({
  statement: {
    type: 'IMPLIES',
    operands: [
      { type: 'SVO', subjectRef: "sha256:tech-corp...", verbRef: "sha256:acquires...", objectRef: "sha256:startupai..." },
      { type: 'SVO', subjectRef: "sha256:deal-value...", verbRef: "sha256:equals...", objectRef: "sha256:9-8b-amount..." }
    ]
  },
  modifiers: {
    degree: { amount: "$9.8B", scale: "massive" },
    certainty: { confidence: 0.90, source: "reported", evidence: "confirmed" }
  }
});

// System calculates confidence using (1-V) × E × S formula
const confidence = calculator.calculate({
  volatility: 0.1,     // Low change frequency
  evidence: 0.9,       // High evidence quality  
  source: 0.95         // Bloomberg source factor
});
// Result: (1-0.1) × 0.9 × 0.95 = 0.77
```

### Example 2: Version-Controlled Entity Evolution

```typescript
// Track how an entity evolves over time through commits
const appleHistory = await repo.getEntityHistory("apple-inc-logical-id");

// Returns version-controlled object history
/*
Commit abc123... (Jan 1): Apple Inc (name: "Apple Inc", revenue: $365B)
  ├─> Commit def456... (Mar 15): Updated revenue to $383B
  ├─> Commit ghi789... (Jun 1): Added CEO change (Tim Cook -> John Doe)
  └─> Commit jkl012... (Dec 31): Annual report updates
*/

// Each version has different @id but same logicalId
const versions = [
  { "@id": "sha256:abc123...", logicalId: "apple-inc", version: "1.0", revenue: "$365B" },
  { "@id": "sha256:def456...", logicalId: "apple-inc", version: "1.1", revenue: "$383B" },
  { "@id": "sha256:ghi789...", logicalId: "apple-inc", version: "1.2", ceo: "John Doe" }
];

// Git-like operations work on logical entities
await repo.diff("apple-inc", "1.0", "1.2");
// Shows: revenue change, CEO change, confidence evolution
```

### Example 3: MacroEvent - Composite Event Tracking (Phase 2)

```typescript
// Create individual events for a multi-step acquisition process
const dueDiligenceEvent = await repo.addEvent({
  title: "Tech Corp Begins Due Diligence on StartupAI",
  statement: { type: 'SVO', subjectRef: "tech-corp", verbRef: "investigates", objectRef: "startupai" },
  dateOccurred: "2025-01-10T09:00:00Z"
});

const boardApprovalEvent = await repo.addEvent({
  title: "Tech Corp Board Approves StartupAI Acquisition",
  statement: { type: 'SVO', subjectRef: "board", verbRef: "approves", objectRef: "acquisition-deal" },
  dateOccurred: "2025-01-12T14:00:00Z"
});

const closingEvent = await repo.addEvent({
  title: "Tech Corp Completes StartupAI Acquisition",
  statement: { type: 'SVO', subjectRef: "tech-corp", verbRef: "acquires", objectRef: "startupai" },
  dateOccurred: "2025-01-15T16:00:00Z"
});

// Create a MacroEvent to represent the entire acquisition process
const acquisitionMacro = await repo.addMacroEvent({
  "@type": "MacroEvent",
  title: "Tech Corp's Complete Acquisition of StartupAI",
  statement: {
    type: 'SEQUENCE',  // Events must occur in order
    operands: [
      { type: 'SVO', subjectRef: "tech-corp", verbRef: "investigates", objectRef: "startupai" },
      { type: 'SVO', subjectRef: "board", verbRef: "approves", objectRef: "acquisition-deal" },
      { type: 'SVO', subjectRef: "tech-corp", verbRef: "acquires", objectRef: "startupai" }
    ]
  },
  components: [
    dueDiligenceEvent['@id'],
    boardApprovalEvent['@id'],
    closingEvent['@id']
  ],
  aggregation: 'ORDERED_ALL',
  summary: "Multi-step acquisition process from due diligence to closing",
  modifiers: {
    temporal: { duration: "P5D" },  // 5-day process
    degree: { scale: "large" }
  }
});

// Confidence aggregation (min for ORDERED_ALL - weakest link)
// If events have confidences [0.9, 0.95, 0.85], macro confidence = 0.85
const macroConfidence = calculator.aggregateConfidence(
  [0.9, 0.95, 0.85],
  'ORDERED_ALL'  // Uses min() for sequential dependencies
);
```

### Example 4: Blockchain Verification (Future)

```typescript
// In Phase 5, same API but with blockchain backend
const event = await repo.addEvent({...});

// Automatically:
// 1. Signs with user's wallet
// 2. Uploads to IPFS
// 3. Records hash on blockchain
// 4. Returns transaction receipt

console.log(event.proof);
// {
//   signature: "0x1234...",
//   ipfsHash: "QmXoypiz...",
//   txHash: "0xabcd...",
//   blockNumber: 12345678n
// }
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- TypeScript 5+
- Git (for version comparison)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd VeritasChain

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Start development
npm run dev
```

### Quick Start

```typescript
import { Repository } from './src';

// Initialize a new repository
const repo = await Repository.init('./my-events-data');

// Create version-controlled entities first
const mitEntity = await repo.createEntity({
  logicalId: "mit-institution",
  label: "MIT",
  dataType: { custom: "Institution", description: "Educational institution" },
  properties: {
    fullName: "Massachusetts Institute of Technology",
    location: "Cambridge, MA",
    type: "University"
  }
});

// Create an action
const announcesAction = await repo.createAction({
  logicalId: "announces-action",
  label: "announces",
  category: "communication"
});

// Add your first event with proper structure
const event = await repo.addEvent({
  title: "MIT Announces Scientific Breakthrough",
  dateOccurred: "2025-01-15T14:00:00Z",
  statement: {
    type: 'SVO',
    subjectRef: mitEntity['@id'],
    verbRef: announcesAction['@id'],
    objectRef: "sha256:superconductor-discovery..."  // Reference to discovery entity
  },
  modifiers: {
    temporal: { when: "present", tense: "announces" },
    certainty: { 
      evidence: 0.95,    // High evidence quality
      source: 1.0,       // Direct from source
      // Volatility calculated automatically from change history
    }
  },
  metadata: {
    source: { name: "MIT News", type: "Academic", url: "https://news.mit.edu/..." },
    author: "pr@mit.edu"
  }
});

// Commit with transparent tracking
const commit = await repo.commit("Add superconductor announcement");
console.log(`Committed: ${commit.id}`);
// Confidence auto-calculated: (1-0.0) × 0.95 × 1.0 = 0.95
```

## Technical Stack

### Current (Phase 1) - Minimal Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",           // API server
    "uuid": "^9.0.0",               // LogicalId generation
    "@noble/hashes": "^1.3.0",      // SHA-256 (blockchain-compatible)
    "@noble/ed25519": "^2.0.0"      // Signatures (blockchain-ready)
  }
}
```

**Core Technologies:**
- **Language**: TypeScript 5+ with strict mode (no `any` allowed)
- **Storage**: File system (JSON) with `.git-events/` structure
- **Hashing**: SHA-256 content addressing (@noble/hashes)
- **Event Types**: Both `kind='fact'` (news/events) and `kind='norm'` (legal clauses)
- **Confidence**: Auto-calculated (1-V)×E×S for both facts and norms
- **ID System**: Dual IDs - @id (content hash) + logicalId (UUID grouping)
- **Statements**: Unified SVO + logical operators + deontic actions
- **Legal Support**: Jurisdiction, effectiveDate, normForce, legal hierarchy weights
- **Versioning**: All objects (Entity/Action/Event) are version-controlled
- **API**: Express.js with `/v1/` versioned endpoints
- **Testing**: Jest with ts-jest (100% coverage requirement)

### Phase 2-3 Additions
- **Pattern Learning**: ML-based type inference from observed data
- **Validation**: Gradual constraints based on learned patterns (not hardcoded)
- **Search**: Semantic search across version-controlled objects
- **Confidence Evolution**: Track confidence changes over entity lifetime

### Future (Phases 4-5) - Blockchain Migration
- **Blockchain**: Ethereum/Polygon smart contracts
- **Storage**: Hybrid (IPFS for content + blockchain for proofs)
- **Identity**: Ethereum addresses / DIDs with MetaMask integration
- **Consensus**: Multi-organization validation
- **Migration**: Seamless transition from local to decentralized storage

## Design Philosophy

### Start Simple, Learn from Data
Rather than imposing a rigid type system upfront, the system observes patterns in real data (both factual events and legal clauses):

1. **Phase 1**: Record both facts and norms, minimal validation (basic enums only)
2. **Phase 2**: Identify patterns in legal reasoning and factual relationships
3. **Phase 3**: Enforce learned constraints for both domains

### Confidence Through Transparency
Confidence uses a simple multiplication formula: `(1 - Volatility) × Evidence × Source`. This ensures transparency and removes arbitrary weights.

```typescript
// Transparent and explainable: confidence = (1 - V) × E × S
const confidence = (1 - volatility) * evidenceFactor * sourceFactor;

// Where:
// V = volatility (0-1, from change frequency analysis)
// E = evidence quality (0-1, based on supporting data)
// S = source reliability (0-1):
//     For facts: based on source type (Academic=1.0, NewsAgency=0.9, Social=0.7)
//     For norms: based on legal hierarchy (Constitution=1.0, Statute=0.95, Contract=0.8)

// Example calculations:
// Fact: confidence = (1 - 0.1) * 0.9 * 0.95 = 0.77 (Academic source)
// Norm: confidence = (1 - 0.05) * 1.0 * 0.95 = 0.90 (Statute source)
```

## Design Decisions

### Why TypeScript?
- Type safety without rigidity (optional types in Phase 1)
- Excellent blockchain tooling (ethers.js, web3.js)
- Gradual type adoption as patterns emerge
- Direct mapping to future Solidity types

### Why File System First?
- Simplicity and transparency
- Easy debugging and inspection  
- No external dependencies
- Natural fit for Git-like operations

### Why Multiplication-Based Confidence?
- **Extreme Simplicity**: confidence = (1 - V) × E × S - no weights, no parameters
- **Complete Transparency**: Each factor (V, E, S) is independently calculable and explainable
- **Auto-Calculation**: System computes volatility from change history, never manual
- **Intuitive**: Low volatility + high evidence + reliable source = high confidence
- **Blockchain Ready**: Deterministic calculation suitable for smart contracts

### Why Learn Types from Data?
- Real-world patterns are complex
- Premature constraints limit flexibility
- Data-driven validation is more accurate
- Natural evolution as system matures

### Why Blockchain Later?
- Prove concept without complexity
- Allow iteration on data structures
- Build community before decentralizing
- Reduce initial costs

## Contributing

See [CLAUDE.md](./CLAUDE.md) for comprehensive development instructions.

### Critical Rules (Zero Tolerance)
1. **NO EXTERNAL DATABASES** - Only file system (.git-events/)
2. **NO NEW DEPENDENCIES** - Stick to the 4 allowed runtime deps
3. **EVERYTHING TYPED** - TypeScript strict mode, no `any` allowed
4. **NEVER SET CONFIDENCE MANUALLY** - Always auto-calculate (1-V)×E×S
5. **DUAL ID SYSTEM** - @id (content hash) + logicalId (UUID grouping)

### Implementation Requirements
- **Phase 1 Focus**: Git-like operations, pattern observation (no validation)
- **Type Safety**: Define interfaces before implementations
- **Adapter Pattern**: Storage abstracted for future blockchain migration
- **Content Addressing**: All objects identified by SHA-256 hash
- **Version Control**: Entities, Actions, Events tracked through commits
- **Test Coverage**: 100% required for core modules

### Development Workflow
```bash
# Setup
npm install
npm run build
npm test

# Development
npm run dev       # Start with nodemon
npm run lint      # Type checking
npm test -- --watch  # Continuous testing
```

## Testing

### Test Architecture
```
tests/
├── sample-runner.js     # Executable test suite (18 test cases)
└── output/              # Test results directory
    ├── test-results.json    # Structured parsed events + test results
    └── test-summary.txt     # Human-readable overview
```

### Running Tests
```bash
# Full test suite (lazy mode - reuses existing objects)
npm test

# Force mode - clean and regenerate all objects
npm run test:force

# Quick compilation verification only
npm run test:quick
```

**Two Test Modes:**
- **Lazy mode (default)**: `npm test` - Reuses existing objects with same hash (faster)
- **Force mode**: `npm run test:force` - Cleans .git-events/ and regenerates everything (slower but fresh)

**When to use force mode:**
- Switching between test languages (English ↔ Chinese labels)
- Updating test entity/action definitions
- Debugging hash consistency issues
- Ensuring clean state for CI/CD
- After `git clone` (since .git-events/ is not tracked)

**Examples:**
```bash
# After git clone - initialize storage
npm run test:force

# Regular development - reuse existing storage
npm test

# Verify created files
find .git-events -name "*.json" | head -3 | xargs cat
```

### Test Coverage
- **News Events** (9 examples): JPMorgan fees, US-India trade, Kraft Heinz restructuring, etc.
- **Legal Clauses** (2 examples): Singapore paternity leave, contract delivery clause
- **Complex Logic** (4 examples): NOT, BEFORE, nested IMPLIES, GT/LT operators
- **Core Functions** (5 tests): Hashing, confidence calculation, relationships, logical operators

### How News Text Becomes Structured Events

The test suite demonstrates how raw news text is parsed into our structured format:

**Original News:**
> "JPMorgan Chase & Co. has told financial-technology companies that it will start charging fees amounting to hundreds of millions of dollars for access to their customers' bank account information – a move that threatens to upend the industry's business models."

**Parsed Structure (in test-results.json):**
```json
{
  "@type": "Event",
  "kind": "fact",
  "title": "JPMorgan Charges Fintechs for Data Access",
  "statement": {
    "type": "SVO",
    "subjectRef": "sha256:e5f6789abc...",  // -> JPMorgan entity
    "verbRef": "sha256:f6789abc345...",    // -> "charges" action
    "objectRef": "sha256:789abc456d..."    // -> Fintechs entity
  },
  "modifiers": {
    "temporal": { "when": "future", "tense": "will" },
    "degree": { "amount": "hundreds of millions USD" },
    "purpose": { "reason": "customer data access fees" }
  },
  "relationships": [{
    "type": "threatens",
    "target": "sha256:abc456789de...",
    "description": "May upend industry business models"
  }],
  "metadata": {
    "confidence": 0.9,  // Auto-calculated: (1-V)×E×S
    "source": { "type": "NewsAgency", "name": "Financial Times" }
  }
}
```

### Test Output Files

**test-results.json** contains:
- Full parsed event structures showing how text becomes data
- Test execution details (pass/fail, duration)
- Confidence calculations with formulas
- Relationship validations

**test-summary.txt** contains:
- Test execution overview (18 tests, 100% pass rate)
- Category breakdown (news, legal, logic, core)
- Performance metrics

See [SAMPLE.md](./SAMPLE.md) for complete examples of all supported event types.

## License

MIT License - See LICENSE file for details

## Future Vision

By 2026, this system will enable:
- **Trustless Journalism**: No single authority controls the narrative
- **Transparent Corrections**: All edits tracked and signed
- **Global Collaboration**: Newsrooms worldwide contributing equally
- **Historical Integrity**: Immutable record of how stories evolved
- **Decentralized Truth**: Consensus-based fact verification

Join us in building the future of transparent, accountable journalism.