# VeritasChain Testing Guide

Comprehensive testing strategy for development and CI/CD.

## 🧪 Test Structure

### Jest Unit Tests (CI/CD Safe)
```bash
npm test                # Run all Jest tests
npm run test:coverage   # Generate coverage reports  
npm run test:watch      # Watch mode for development
```

**Location**: `tests/minimal.test.ts`
**Purpose**: Unit tests, safe for GitHub Actions CI/CD
**Status**: ✅ 8/8 tests passing

### Integration Tests (Development Only)
```bash
npm run test:api        # HTTP API endpoints (15 tests)
npm run test:branches   # Branch management (13 tests)  
npm run test:merge      # Three-way merge (10 tests)
npm run test:phase2     # All Phase 2 tests (38 tests total)
```

**Location**: `tests/integration/`
**Purpose**: End-to-end testing with HTTP servers
**Status**: ✅ 38/38 tests passing (100% success rate)

## 📁 Directory Structure

```
tests/
├── minimal.test.ts              # Jest unit tests (CI/CD)
├── integration/                 # Development integration tests  
│   ├── README.md               # Integration test documentation
│   ├── api/
│   │   └── api.test.js         # HTTP API tests (port 3001)
│   ├── branches/
│   │   └── branches.test.js    # Branch management (port 3002)
│   └── merge/
│       └── merge.test.js       # Merge operations (port 3003)
├── helpers/                     # Test utilities
│   ├── cleanup.ts
│   └── setup.ts
└── output/                      # Test artifacts
```

## 🚨 Fixed Issues

### Before (Problems):
- ❌ Test files scattered in project root (`test-*.js`)
- ❌ Would be included in `npm test` and CI/CD
- ❌ Poor organization and maintenance
- ❌ Import path issues

### After (Solutions):
- ✅ Organized in `tests/integration/` directory
- ✅ Separate npm scripts (`test:api`, `test:branches`, `test:merge`)
- ✅ Different ports to avoid conflicts (3001, 3002, 3003)
- ✅ Proper import paths (`../../../dist/api/server.js`)
- ✅ Jest tests isolated from integration tests
- ✅ GitIgnore patterns for test artifacts

## 🔒 CI/CD Safety

### Safe for GitHub Actions:
```bash
npm test              # Jest unit tests only
npm run test:coverage # Coverage reports
npm run lint          # TypeScript checking
```

### Development Only:
```bash
npm run test:phase2   # Integration tests (not for CI/CD)
npm run test:api      # Individual integration tests
npm run test:branches
npm run test:merge
```

## 📊 Test Results Summary

| Test Suite | Tests | Status | Coverage |
|------------|-------|--------|----------|
| Jest Unit Tests | 8 | ✅ 100% | Core functions |
| API Integration | 15 | ✅ 100% | HTTP endpoints |
| Branch Management | 13 | ✅ 100% | Git-like operations |
| Merge Operations | 10 | ✅ 100% | Three-way merge |
| **Total** | **46** | **✅ 100%** | **Full Phase 2** |

## 🛠 Adding New Tests

### For CI/CD (Jest):
1. Add to `tests/` directory with `.test.ts` extension
2. Use Jest syntax (`describe`, `test`, `expect`)
3. Mock external dependencies
4. Run with `npm test`

### For Integration (Development):
1. Add to `tests/integration/{feature}/` 
2. Use unique port number
3. Import from `../../../dist/api/server.js`
4. Update `package.json` scripts if needed

## 🔧 Development Workflow

1. **Write Code**: Implement features in `src/`
2. **Unit Tests**: Add Jest tests for core logic
3. **Integration Tests**: Test full HTTP API workflows  
4. **Verify**: Run `npm run test:phase2` before commits
5. **CI/CD**: Only Jest tests run in GitHub Actions

This ensures robust testing while keeping CI/CD fast and reliable.