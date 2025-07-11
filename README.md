# VeritasChain

A Git-like version control system for tracking news events and socio-economic data with logical reasoning support, designed with blockchain-ready architecture for future decentralization.

## Vision

Create a tamper-proof, decentralized system for tracking news events where:
- Every change is cryptographically signed and traceable
- Multiple sources can be compared and conflicts resolved
- Historical timelines can be reconstructed with full provenance
- Future migration to blockchain enables trustless collaboration

## Development Roadmap

### Phase 1: Foundation (Weeks 1-4) ✅
**Goal**: Local Git-like functionality with TypeScript

- [ ] TypeScript project setup with strict configuration
- [ ] Core type definitions (flexible, no strict validation)
- [ ] SHA-256 content-addressing system
- [ ] File-based storage with `.git-events/` structure
- [ ] Basic CLI: init, add, commit, log
- [ ] Volatility-based confidence calculation
- [ ] Pattern observation (no validation)
- [ ] 100% test coverage for core modules

**Deliverable**: Working local repository with Git-like operations and simple confidence metrics

### Phase 2: Advanced Features (Weeks 5-8) 🚧
**Goal**: Branch management and pattern learning

- [ ] Branch creation and switching
- [ ] Three-way merge algorithm for events
- [ ] Conflict detection and resolution
- [ ] Event diff visualization
- [ ] HTTP API with Express
- [ ] Pattern analysis from collected data
- [ ] Initial type inference (not enforcement)

**Deliverable**: Full version control with branching and data-driven insights

### Phase 3: Intelligence Layer (Weeks 9-12) 📋
**Goal**: Smart features based on learned patterns

- [ ] Type validation based on observed patterns
- [ ] SVO relationship constraints (learned, not hardcoded)
- [ ] Entity recognition and linking
- [ ] Temporal and spatial modifiers
- [ ] Semantic search across events
- [ ] Truth discovery for conflicting sources

**Deliverable**: Intelligent system that understands data patterns

### Phase 4: Decentralization Prep (Weeks 13-16) 🔗
**Goal**: Blockchain-ready architecture

- [ ] Ed25519 signature implementation
- [ ] Merkle tree for event batches
- [ ] IPFS integration for content storage
- [ ] Smart contract interfaces (TypeScript)
- [ ] Migration tools for existing data
- [ ] Testnet deployment guide

**Deliverable**: Hybrid system ready for blockchain migration

### Phase 5: Blockchain Migration (Months 5-6) 🚀
**Goal**: Full decentralization

- [ ] Deploy smart contracts to Polygon/Ethereum
- [ ] Implement role-based permissions on-chain
- [ ] Connect to MetaMask for signatures
- [ ] Decentralized identity (DID) support
- [ ] Multi-organization consensus
- [ ] Production deployment

**Deliverable**: Fully decentralized news tracking system

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│                  (CLI / Web UI / API)                       │
├─────────────────────────────────────────────────────────────┤
│                    Repository Layer                          │
│         (Event Management, Commits, Branches)               │
├─────────────────────────────────────────────────────────────┤
│                    Adapter Layer                            │
│     ┌──────────────┐              ┌──────────────┐         │
│     │ Local Store  │              │ Blockchain   │         │
│     │ (Phase 1-3)  │              │ (Phase 4-5)  │         │
│     └──────────────┘              └──────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     Core Layer                              │
│      (Hashing, Signatures, Merkle Trees, Types)            │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Adapter Pattern**: Storage is abstracted behind interfaces
2. **Content Addressing**: All data identified by cryptographic hash
3. **Immutability**: Events and commits are never modified
4. **Cryptographic Integrity**: Optional now, mandatory for blockchain
5. **Progressive Enhancement**: Each phase adds capabilities

## Target Effect Examples

### Example 1: Multi-Source News Tracking

```typescript
// Bloomberg reports
const bloombergEvent = await repo.addEvent({
  headline: "Tech Corp Announces $10B Acquisition",
  content: {
    svo: {
      subject: { id: "Q95", type: "Company", label: "Tech Corp" },
      verb: { id: "acquires", label: "acquires" },
      object: { id: "Q123", type: "Company", label: "StartupAI" }
    }
  },
  metadata: { source: "Bloomberg", confidence: 0.95 }
});

// Reuters reports slightly different
const reutersEvent = await repo.addEvent({
  headline: "Tech Corp to Acquire StartupAI for $9.8B",
  content: {
    svo: {
      subject: { id: "Q95", type: "Company", label: "Tech Corp" },
      verb: { id: "acquires", label: "acquires" },
      object: { id: "Q123", type: "Company", label: "StartupAI" }
    }
  },
  metadata: { source: "Reuters", confidence: 0.90 }
});

// System detects similarity and suggests merge
const conflicts = await repo.detectConflicts(bloombergEvent, reutersEvent);
// Output: { field: "acquisition_value", values: ["$10B", "$9.8B"] }
```

### Example 2: Historical Timeline Reconstruction

```typescript
// Query: Show evolution of Ukraine conflict reporting
const timeline = await repo.queryTimeline({
  topic: "Ukraine",
  dateRange: { start: "2024-01-01", end: "2024-12-31" },
  sources: ["Reuters", "AP", "Bloomberg"]
});

// Returns commit graph showing how story evolved
/*
Initial Report (Jan 1) ─┬─> Reuters Update (Jan 2)
                       ├─> AP Confirmation (Jan 2)
                       └─> Bloomberg Analysis (Jan 3)
                              └─> Merged Consensus (Jan 4)
*/
```

### Example 3: Blockchain Verification (Future)

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
const repo = await Repository.init('./my-news-data');

// Add your first event
const event = await repo.addEvent({
  headline: "Breaking: Major Scientific Discovery",
  content: {
    svo: {
      subject: { id: "Q1", type: "Institution", label: "MIT" },
      verb: { id: "announces", label: "announces" },
      object: { id: "Q2", type: "Discovery", label: "Room-temperature superconductor" }
    }
  },
  metadata: {
    source: "MIT News",
    confidence: 1.0,
    author: "pr@mit.edu"
  }
});

// Commit the change
const commit = await repo.commit("Add superconductor announcement");
console.log(`Committed: ${commit.id}`);
```

## Technical Stack

### Current (Phase 1)
- **Language**: TypeScript with strict mode
- **Storage**: File system (JSON)
- **Hashing**: SHA-256 (@noble/hashes)
- **Confidence**: Simple volatility-based calculation
- **Patterns**: Observation only, no validation
- **API**: Express.js (minimal)
- **Testing**: Jest with ts-jest

### Phase 2-3 Additions
- **Type System**: Learned from observed patterns
- **Validation**: Gradual introduction based on data
- **Search**: Basic indexing and queries

### Future (Phases 4-5)
- **Blockchain**: Ethereum/Polygon
- **Smart Contracts**: Solidity
- **Storage**: IPFS for content
- **Identity**: Ethereum addresses / DIDs
- **Signatures**: Ed25519 / Secp256k1

## Design Philosophy

### Start Simple, Learn from Data
Rather than imposing a rigid type system upfront, the system observes patterns in real data:

1. **Phase 1**: Record everything, validate nothing
2. **Phase 2**: Identify patterns, suggest types
3. **Phase 3**: Enforce learned constraints

### Confidence Through Stability
Confidence is simply `1 - volatility`. Events that change frequently have low confidence, stable events have high confidence. No complex formulas or arbitrary weights.

```typescript
// Simple and transparent
confidence = 1 - volatility

// Where volatility = standard deviation of change rate
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

### Why Volatility-Based Confidence?
- Simple formula: confidence = 1 - volatility
- No arbitrary weights or subjective scoring
- Self-explanatory to users
- Directly reflects data stability

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

See [CLAUDE.md](./CLAUDE.md) for strict development guidelines.

Key rules:
1. No external databases
2. Minimal dependencies
3. Everything must be typed
4. Adapter pattern for storage
5. Think blockchain-first

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