#!/usr/bin/env node
/**
 * Conflict Detection and Resolution Test Suite for Phase 2.3
 * 
 * Tests advanced conflict detection, resolution strategies, and visualization
 * for Entity, Action, and Event objects including composite events.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import from built JavaScript files
const { LocalStorageAdapter } = await import('../../../dist/adapters/local.js');
const { MergeManager } = await import('../../../dist/repository/merge.js');
const { AdvancedConflictResolver } = await import('../../../dist/repository/conflict-resolver.js');
const { ConflictDisplay, displayConflictsInTerminal } = await import('../../../dist/repository/conflict-display.js');
const { calculateEntityHash, calculateActionHash, calculateEventHash, calculateCommitHash } = await import('../../../dist/core/hash.js');

// Test configuration
const TEST_STORAGE_PATH = path.join(__dirname, '../../../.git-events-conflict-test');
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}🧪 Starting Conflict Detection and Resolution Test Suite${colors.reset}\n`);

// Initialize test environment
const storage = new LocalStorageAdapter({
  local: { dataDirectory: TEST_STORAGE_PATH }
});
await storage.initialize();

const mergeManager = new MergeManager(storage);
const conflictResolver = new AdvancedConflictResolver(storage);

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Test 1: Create conflicting entities in different branches
 */
async function testEntityConflicts() {
  console.log(`${colors.cyan}📋 Test 1: Entity Conflict Detection${colors.reset}`);
  
  try {
    // Create base entity
    const baseEntity = {
      '@context': 'https://schema.org/',
      '@type': 'EntityObject',
      logicalId: 'conflict-entity-001',
      version: '1.0',
      label: 'Test Corporation',
      description: 'A test corporation for conflict testing',
      dataType: { custom: 'Corporation' },
      properties: {
        revenue: '$100M',
        employees: 500,
        industry: 'Technology'
      },
      commitHash: 'base-commit'
    };

    const baseEntityId = calculateEntityHash(baseEntity);
    baseEntity['@id'] = baseEntityId;
    await storage.entities.store(baseEntityId, baseEntity);
    console.log(`  ✅ Created base entity: ${baseEntityId}`);

    // Create initial commit and branch
    const initialCommitData = {
      '@context': 'https://schema.org/',
      '@type': 'UpdateAction',
      timestamp: new Date().toISOString(),
      parents: [],
      tree: 'tree-base',
      author: 'test-author',
      message: 'Initial commit',
      changes: {
        entities: [baseEntityId],
        actions: [],
        events: []
      },
      branch: 'main'
    };
    const initialCommitId = calculateCommitHash(initialCommitData);
    const initialCommit = { ...initialCommitData, '@id': initialCommitId };
    await storage.commits.store(initialCommitId, initialCommit);

    // Create branch A and modify entity
    await storage.commits.createBranch({
      name: 'branch-a',
      head: initialCommit['@id'],
      created: new Date().toISOString()
    });

    const entityA = {
      ...baseEntity,
      version: '1.1',
      label: 'Test Corporation A',  // Changed label
      description: 'A test corporation with branch A changes',  // Changed description
      properties: {
        ...baseEntity.properties,
        revenue: '$150M',  // Changed revenue
        employees: 600     // Changed employee count
      }
    };

    const entityAId = calculateEntityHash(entityA);
    entityA['@id'] = entityAId;
    await storage.entities.store(entityAId, entityA);

    // Create branch B and modify entity differently
    await storage.commits.createBranch({
      name: 'branch-b',
      head: initialCommit['@id'],
      created: new Date().toISOString()
    });

    const entityB = {
      ...baseEntity,
      version: '1.1',
      label: 'Test Corporation B',  // Different label change
      description: 'A test corporation with branch B changes',  // Different description
      properties: {
        ...baseEntity.properties,
        revenue: '$120M',  // Different revenue change
        industry: 'Software'  // Changed industry
      }
    };

    const entityBId = calculateEntityHash(entityB);
    entityB['@id'] = entityBId;
    await storage.entities.store(entityBId, entityB);

    // Create commits for both branches
    const commitA = await storage.commits.store({
      '@context': 'https://schema.org/',
      '@type': 'UpdateAction',
      timestamp: new Date().toISOString(),
      parents: [initialCommit['@id']],
      tree: 'tree-a',
      author: 'author-a',
      message: 'Branch A changes to entity',
      changes: {
        entities: [entityAId],
        actions: [],
        events: []
      },
      branch: 'branch-a'
    });

    const commitB = await storage.commits.store({
      '@context': 'https://schema.org/',
      '@type': 'UpdateAction',
      timestamp: new Date().toISOString(),
      parents: [initialCommit['@id']],
      tree: 'tree-b',
      author: 'author-b',
      message: 'Branch B changes to entity',
      changes: {
        entities: [entityBId],
        actions: [],
        events: []
      },
      branch: 'branch-b'
    });

    // Update branch heads
    await storage.commits.updateBranchHead('branch-a', commitA['@id']);
    await storage.commits.updateBranchHead('branch-b', commitB['@id']);

    console.log(`  ✅ Created conflicting branches with entity modifications`);
    testResults.passed++;

  } catch (error) {
    console.log(`  ❌ Entity conflict setup failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Entity conflict setup: ${error.message}`);
  }
}

/**
 * Test 2: Detect and resolve entity conflicts
 */
async function testEntityConflictResolution() {
  console.log(`${colors.cyan}📋 Test 2: Entity Conflict Resolution${colors.reset}`);
  
  try {
    // Attempt merge between branch-a and branch-b
    const mergeResult = await mergeManager.mergeBranches('branch-a', 'branch-b', {
      strategy: 'auto',
      conflictResolution: {
        autoResolve: true,
        confidenceThreshold: 0.6
      }
    });

    console.log(`  📊 Merge result: ${mergeResult.success ? 'Success' : 'Conflicts detected'}`);
    console.log(`  📈 Conflicts detected: ${mergeResult.conflicts.length}`);
    console.log(`  🔧 Auto-resolved: ${mergeResult.stats.conflictsResolved}`);
    console.log(`  👤 Manual required: ${mergeResult.stats.conflictsRequiringManualResolution}`);

    if (mergeResult.conflicts.length > 0) {
      // Test advanced conflict resolution
      const resolutionResult = await conflictResolver.resolveConflicts(mergeResult.conflicts, {
        autoResolveThreshold: 0.7,
        preserveHistory: true
      });

      console.log(`  🤖 Advanced resolution:`);
      console.log(`     Resolved: ${resolutionResult.resolved.length}`);
      console.log(`     Unresolved: ${resolutionResult.unresolved.length}`);

      // Display conflicts in CLI format
      if (resolutionResult.unresolved.length > 0) {
        console.log(`\n${colors.yellow}  📋 Conflict Visualization:${colors.reset}`);
        displayConflictsInTerminal(resolutionResult.unresolved.slice(0, 2), {
          colorize: true,
          maxWidth: 100
        });
      }

      testResults.passed++;
    } else {
      console.log(`  ⚠️  No conflicts detected (unexpected for this test)`);
      testResults.failed++;
    }

  } catch (error) {
    console.log(`  ❌ Entity conflict resolution failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Entity conflict resolution: ${error.message}`);
  }
}

/**
 * Test 3: Create conflicting composite events
 */
async function testCompositeEventConflicts() {
  console.log(`${colors.cyan}📋 Test 3: Composite Event Conflict Detection${colors.reset}`);
  
  try {
    // Create base entities and actions for events
    const companyEntity = await storage.entities.store({
      '@context': 'https://schema.org/',
      '@type': 'EntityObject',
      logicalId: 'company-for-events',
      version: '1.0',
      label: 'Example Corp',
      dataType: { custom: 'Corporation' },
      properties: { industry: 'Technology' },
      commitHash: 'base'
    });

    const acquireAction = await storage.actions.store({
      '@context': 'https://schema.org/',
      '@type': 'ActionObject',
      logicalId: 'acquire-action',
      version: '1.0',
      label: 'acquires',
      category: 'business',
      commitHash: 'base'
    });

    // Create component events
    const event1 = await storage.events.store({
      '@context': 'https://schema.org/',
      '@type': 'Event',
      logicalId: 'component-event-1',
      version: '1.0',
      title: 'Due Diligence Completed',
      dateOccurred: new Date().toISOString(),
      dateRecorded: new Date().toISOString(),
      statement: {
        type: 'SVO',
        subjectRef: companyEntity,
        verbRef: acquireAction,
        objectRef: companyEntity
      },
      metadata: {
        source: { name: 'Test', type: 'Academic' },
        author: 'test-author',
        version: '1.0',
        confidence: 0.9
      },
      commitHash: 'base'
    });

    const event2 = await storage.events.store({
      '@context': 'https://schema.org/',
      '@type': 'Event',
      logicalId: 'component-event-2',
      version: '1.0',
      title: 'Regulatory Approval Received',
      dateOccurred: new Date().toISOString(),
      dateRecorded: new Date().toISOString(),
      statement: {
        type: 'SVO',
        subjectRef: companyEntity,
        verbRef: acquireAction,
        objectRef: companyEntity
      },
      metadata: {
        source: { name: 'Test', type: 'Academic' },
        author: 'test-author',
        version: '1.0',
        confidence: 0.85
      },
      commitHash: 'base'
    });

    // Create base composite event
    const baseCompositeEvent = {
      '@context': 'https://schema.org/',
      '@type': 'Event',
      logicalId: 'composite-event-conflict',
      version: '1.0',
      title: 'Acquisition Process',
      dateOccurred: new Date().toISOString(),
      dateRecorded: new Date().toISOString(),
      statement: {
        type: 'AND',
        operands: []
      },
      components: [
        { logicalId: 'component-event-1', version: '1.0' },
        { logicalId: 'component-event-2', version: '1.0' }
      ],
      aggregation: 'ALL',
      metadata: {
        source: { name: 'Test System', type: 'Academic' },
        author: 'test-author',
        version: '1.0',
        confidence: 0.8
      },
      commitHash: 'base'
    };

    const baseCompositeId = await storage.events.store(baseCompositeEvent);
    console.log(`  ✅ Created base composite event: ${baseCompositeId}`);

    // Create branch C with different aggregation logic
    await storage.commits.createBranch({
      name: 'branch-c',
      head: 'initial-commit',
      created: new Date().toISOString()
    });

    const compositeEventC = {
      ...baseCompositeEvent,
      version: '1.1',
      title: 'Acquisition Process (Sequential)',
      aggregation: 'ORDERED',  // Changed aggregation logic
      components: [
        { logicalId: 'component-event-1', version: '1.0' },
        { logicalId: 'component-event-2', version: '1.0' },
        { logicalId: 'component-event-3', weak: true }  // Added weak component
      ]
    };

    const compositeEventCId = await storage.events.store(compositeEventC);

    // Create branch D with different components
    await storage.commits.createBranch({
      name: 'branch-d',
      head: 'initial-commit',
      created: new Date().toISOString()
    });

    const compositeEventD = {
      ...baseCompositeEvent,
      version: '1.1',
      title: 'Acquisition Process (Modified)',
      aggregation: 'ANY',  // Different aggregation logic
      components: [
        { logicalId: 'component-event-1' },  // Removed version (latest)
        { logicalId: 'component-event-2', version: '1.1' }  // Different version
      ]
    };

    const compositeEventDId = await storage.events.store(compositeEventD);

    console.log(`  ✅ Created conflicting composite events in branches C and D`);
    testResults.passed++;

  } catch (error) {
    console.log(`  ❌ Composite event conflict setup failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Composite event conflict setup: ${error.message}`);
  }
}

/**
 * Test 4: Test legal-specific conflict resolution
 */
async function testLegalConflictResolution() {
  console.log(`${colors.cyan}📋 Test 4: Legal-Specific Conflict Resolution${colors.reset}`);
  
  try {
    // Create conflicting legal events with different jurisdictions and hierarchy
    const legalEventA = await storage.events.store({
      '@context': 'https://schema.org/',
      '@type': 'Event',
      logicalId: 'legal-conflict-event',
      version: '1.0',
      title: 'Employment Regulation A',
      dateOccurred: new Date().toISOString(),
      dateRecorded: new Date().toISOString(),
      kind: 'norm',
      statement: {
        type: 'SVO',
        subjectRef: 'employer-entity',
        verbRef: 'must-provide-action',
        objectRef: 'paternity-leave-entity'
      },
      modifiers: {
        legal: {
          jurisdiction: 'Singapore',
          effectiveDate: '2024-01-01',
          normForce: 'mandatory'
        }
      },
      metadata: {
        source: { 
          name: 'Singapore Parliament', 
          type: 'Government',
          legalType: 'statute'
        },
        author: 'legal-authority',
        version: '1.0',
        confidence: 0.95
      },
      commitHash: 'legal-a'
    });

    const legalEventB = await storage.events.store({
      '@context': 'https://schema.org/',
      '@type': 'Event',
      logicalId: 'legal-conflict-event',
      version: '1.1',
      title: 'Employment Regulation B',
      dateOccurred: new Date().toISOString(),
      dateRecorded: new Date().toISOString(),
      kind: 'norm',
      statement: {
        type: 'SVO',
        subjectRef: 'employer-entity',
        verbRef: 'may-provide-action',  // Different deontic type
        objectRef: 'paternity-leave-entity'
      },
      modifiers: {
        legal: {
          jurisdiction: 'Singapore',
          effectiveDate: '2024-01-01',
          normForce: 'default'  // Different norm force
        }
      },
      metadata: {
        source: { 
          name: 'Ministry Guidelines', 
          type: 'Government',
          legalType: 'regulation'  // Lower in legal hierarchy
        },
        author: 'ministry-official',
        version: '1.1',
        confidence: 0.8  // Lower confidence
      },
      commitHash: 'legal-b'
    });

    // Test legal hierarchy resolution
    const mockConflict = {
      type: 'statement',
      logicalId: 'legal-conflict-event',
      objectType: 'event',
      property: 'statement',
      base: undefined,
      ours: legalEventA['@id'],
      theirs: legalEventB['@id'],
      description: 'Legal statement conflict between statute and regulation',
      severity: 'critical',
      autoResolvable: false,
      suggestedResolution: 'manual'
    };

    const resolutionResult = await conflictResolver.resolveConflicts([mockConflict], {
      autoResolveThreshold: 0.6,
      preserveHistory: true
    });

    console.log(`  🏛️  Legal conflict resolution:`);
    console.log(`     Resolved: ${resolutionResult.resolved.length}`);
    console.log(`     Unresolved: ${resolutionResult.unresolved.length}`);

    if (resolutionResult.resolved.length > 0) {
      const resolution = resolutionResult.resolved[0].resolution;
      console.log(`     Resolution method: ${resolution.method}`);
      console.log(`     Reasoning: ${resolution.reasoning}`);
      console.log(`     Confidence: ${(resolution.confidence * 100).toFixed(1)}%`);
    }

    testResults.passed++;

  } catch (error) {
    console.log(`  ❌ Legal conflict resolution failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Legal conflict resolution: ${error.message}`);
  }
}

/**
 * Test 5: Conflict visualization and export
 */
async function testConflictVisualization() {
  console.log(`${colors.cyan}📋 Test 5: Conflict Visualization and Export${colors.reset}`);
  
  try {
    // Create sample conflicts for visualization testing
    const sampleConflicts = [
      {
        type: 'content',
        logicalId: 'test-entity-123',
        objectType: 'entity',
        property: 'label',
        base: 'Original Name',
        ours: 'Updated Name A',
        theirs: 'Updated Name B',
        description: 'Entity name conflict between two updates',
        severity: 'medium',
        autoResolvable: false,
        suggestedResolution: 'manual'
      },
      {
        type: 'aggregation',
        logicalId: 'composite-event-456',
        objectType: 'event',
        property: 'aggregation',
        base: 'ALL',
        ours: 'ORDERED',
        theirs: 'ANY',
        description: 'Aggregation logic conflict in composite event',
        severity: 'critical',
        autoResolvable: false,
        suggestedResolution: 'manual'
      },
      {
        type: 'component',
        logicalId: 'composite-event-789',
        objectType: 'event',
        property: 'components[component-1]',
        base: { logicalId: 'component-1', version: '1.0' },
        ours: { logicalId: 'component-1', version: '1.1' },
        theirs: { logicalId: 'component-1' },
        description: 'Component version reference conflict',
        severity: 'medium',
        autoResolvable: true,
        suggestedResolution: 'theirs',
        resolutionReason: 'Prefer latest version'
      }
    ];

    // Test CLI display
    console.log(`\n${colors.yellow}  📋 Testing CLI Conflict Display:${colors.reset}`);
    const cliOutput = ConflictDisplay.displayCLI(sampleConflicts, {
      format: 'cli',
      colorize: false,  // Disable colors for clean test output
      showSuggestions: true,
      includeMetadata: true,
      maxWidth: 80
    });
    
    console.log(`  ✅ CLI display generated (${cliOutput.split('\n').length} lines)`);

    // Test export formats
    const jsonExport = ConflictDisplay.export(sampleConflicts, [], 'json');
    const markdownExport = ConflictDisplay.export(sampleConflicts, [], 'markdown');
    const csvExport = ConflictDisplay.export(sampleConflicts, [], 'csv');

    console.log(`  ✅ JSON export generated (${jsonExport.length} characters)`);
    console.log(`  ✅ Markdown export generated (${markdownExport.length} characters)`);
    console.log(`  ✅ CSV export generated (${csvExport.split('\n').length} rows)`);

    // Test summary generation
    const summary = ConflictDisplay.generateSummary(sampleConflicts);
    console.log(`  📊 Conflict summary:`);
    console.log(`     Total: ${summary.totalConflicts}`);
    console.log(`     Auto-resolvable: ${summary.autoResolvableCount}`);
    console.log(`     Critical: ${summary.criticalCount}`);
    console.log(`     Recommended action: ${summary.recommendedAction}`);

    testResults.passed++;

  } catch (error) {
    console.log(`  ❌ Conflict visualization failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Conflict visualization: ${error.message}`);
  }
}

/**
 * Test 6: Resolution history and statistics
 */
async function testResolutionHistory() {
  console.log(`${colors.cyan}📋 Test 6: Resolution History and Statistics${colors.reset}`);
  
  try {
    // Create and resolve some conflicts to build history
    const testConflicts = [
      {
        type: 'content',
        logicalId: 'history-test-1',
        objectType: 'entity',
        property: 'description',
        ours: 'Description A',
        theirs: 'Description B',
        description: 'Test conflict for history',
        severity: 'low',
        autoResolvable: true,
        suggestedResolution: 'merge'
      },
      {
        type: 'metadata',
        logicalId: 'history-test-2',
        objectType: 'event',
        property: 'importance',
        ours: 3,
        theirs: 5,
        description: 'Importance level conflict',
        severity: 'low',
        autoResolvable: true,
        suggestedResolution: 'theirs'
      }
    ];

    const resolutionResult = await conflictResolver.resolveConflicts(testConflicts, {
      autoResolveThreshold: 0.5,
      preserveHistory: true
    });

    console.log(`  🔄 Processed ${testConflicts.length} conflicts for history`);
    console.log(`  ✅ Resolved: ${resolutionResult.resolved.length}`);

    // Test resolution history retrieval
    const history = conflictResolver.getResolutionHistory();
    console.log(`  📚 History entries: ${history.size}`);

    // Test resolution statistics
    const stats = conflictResolver.getResolutionStatistics();
    console.log(`  📊 Resolution statistics:`);
    console.log(`     Total conflicts: ${stats.totalConflicts}`);
    console.log(`     Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
    console.log(`     Methods used: ${Object.keys(stats.resolvedByMethod).join(', ')}`);

    testResults.passed++;

  } catch (error) {
    console.log(`  ❌ Resolution history test failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Resolution history: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  console.log(`${colors.blue}🚀 Running Conflict Detection and Resolution Test Suite${colors.reset}\n`);

  await testEntityConflicts();
  await testEntityConflictResolution();
  await testCompositeEventConflicts();
  await testLegalConflictResolution();
  await testConflictVisualization();
  await testResolutionHistory();

  // Display final results
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}📊 CONFLICT RESOLUTION TEST RESULTS${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log(`\n${colors.red}🐛 Errors:${colors.reset}`);
    testResults.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }

  console.log('\n🏁 Conflict resolution test suite completed.');
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Execute tests
runAllTests().catch(error => {
  console.error(`${colors.red}❌ Test suite failed: ${error.message}${colors.reset}`);
  process.exit(1);
});