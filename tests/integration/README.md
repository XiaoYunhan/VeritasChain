# Integration Tests

Complete integration tests for VeritasChain Phase 2 implementation.

## Test Structure

```
tests/integration/
├── api/
│   └── api.test.js           # HTTP API endpoints (Phase 2.5)
├── branches/
│   └── branches.test.js      # Branch management (Phase 2.1)
├── merge/
│   └── merge.test.js         # Three-way merge (Phase 2.2)
└── README.md
```

## Running Tests

### Individual Test Suites
```bash
npm run test:api        # Test HTTP API endpoints
npm run test:branches   # Test branch management
npm run test:merge      # Test merge operations
```

### Combined Phase 2 Tests
```bash
npm run test:phase2     # Run all Phase 2 integration tests
```

### Official Jest Tests
```bash
npm test               # Run Jest unit tests
npm run test:coverage  # Run with coverage report
```

## Test Ports

To avoid conflicts, each test suite uses different ports:
- **API Tests**: Port 3001
- **Branch Tests**: Port 3002  
- **Merge Tests**: Port 3003

## Test Features

### ✅ API Tests (15 tests)
- Entity CRUD operations
- Action CRUD operations
- Event CRUD operations
- MacroEvent operations with validation
- Repository endpoints

### ✅ Branch Tests (12 tests)
- Branch creation and validation
- Branch switching and HEAD management
- Current branch information
- Branch renaming
- Branch deletion with safety
- Error handling scenarios

### ✅ Merge Tests (10 tests)
- Branch setup and management
- Fast-forward merge detection
- Divergent branch creation
- Three-way merge logic
- Conflict detection
- Multiple merge strategies
- Error handling

## CI/CD Integration

These integration tests are **excluded** from GitHub Actions by default.
They are designed for local development and manual testing.

For CI/CD, use the Jest unit tests:
```bash
npm test              # Safe for CI/CD
npm run test:coverage # Generate coverage reports
```