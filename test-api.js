#!/usr/bin/env node
/**
 * HTTP API Test Suite for Phase 2.5
 * 
 * Tests all implemented API endpoints with proper validation and error handling.
 * This demonstrates the complete REST API functionality including MacroEvents.
 */

import { app } from './dist/api/server.js';
import { v4 as uuidv4 } from 'uuid';

const port = 3001;  // Use different port for testing
let server;

// Test data
const testEntity = {
  '@context': 'https://schema.org/',
  '@type': 'EntityObject',
  logicalId: `test-entity-${uuidv4()}`,
  version: '1.0',
  label: 'Test Corp',
  description: 'A test corporation for API testing',
  dataType: { custom: 'Corporation' },
  properties: {
    founded: '2020',
    headquarters: 'Test City',
    industry: 'Technology'
  },
  commitHash: 'sha256:test-commit-hash'
};

const testAction = {
  '@context': 'https://schema.org/',
  '@type': 'ActionObject',
  logicalId: `test-action-${uuidv4()}`,
  version: '1.0',
  label: 'acquires',
  description: 'Corporate acquisition action',
  category: 'business',
  deonticType: 'may',
  commitHash: 'sha256:test-commit-hash'
};

const testEvent = {
  '@context': 'https://schema.org/',
  '@type': 'Event',
  logicalId: `test-event-${uuidv4()}`,
  version: '1.0',
  title: 'Test Corp Acquisition Announcement',
  description: 'Test event for API validation',
  dateOccurred: new Date().toISOString(),
  dateRecorded: new Date().toISOString(),
  kind: 'fact',
  statement: {
    type: 'SVO',
    subjectRef: 'placeholder-subject',
    verbRef: 'placeholder-verb',
    objectRef: 'placeholder-object'
  },
  modifiers: {
    temporal: { when: 'present', tense: 'announces' },
    degree: { amount: '$1B', scale: 'large' }
  },
  relationships: [],
  metadata: {
    source: { name: 'Test News', type: 'NewsAgency' },
    author: 'test@example.com',
    version: '1.0',
    confidence: 0.9,  // Explicitly set high confidence
    evidenceScore: 0.9,
    sourceScore: 1.0
  },
  commitHash: 'sha256:test-commit-hash'
};

let createdEntities = [];
let createdActions = [];
let createdEvents = [];
let createdMacroEvents = [];

// Test runner
async function runTests() {
  console.log('🚀 Starting VeritasChain HTTP API Test Suite...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test 1: Health Check
    console.log('📋 Test 1: Health Check');
    await testHealthCheck(results);
    
    // Test 2: Entity Operations
    console.log('\\n📋 Test 2: Entity Operations');
    await testEntityOperations(results);
    
    // Test 3: Action Operations
    console.log('\\n📋 Test 3: Action Operations');
    await testActionOperations(results);
    
    // Test 4: Event Operations
    console.log('\\n📋 Test 4: Event Operations');
    await testEventOperations(results);
    
    // Test 5: MacroEvent Operations
    console.log('\\n📋 Test 5: MacroEvent Operations');
    await testMacroEventOperations(results);
    
    // Test 6: Repository Operations
    console.log('\\n📋 Test 6: Repository Operations');
    await testRepositoryOperations(results);
    
    // Test 7: Error Handling
    console.log('\\n📋 Test 7: Error Handling');
    await testErrorHandling(results);
    
    // Test 8: Metadata Endpoint
    console.log('\\n📋 Test 8: Metadata Endpoint');
    await testMetadataEndpoint(results);

  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
    results.failed++;
    results.errors.push(`Test suite error: ${error.message}`);
  } finally {
    console.log('\\n' + '='.repeat(60));
    console.log('📊 PHASE 2.5 HTTP API TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.errors.length > 0) {
      console.log('\\n🐛 Errors:');
      results.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    console.log('\\n🏁 Test suite completed.');
    
    // Stop server
    if (server) {
      server.close();
    }
    
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

async function testHealthCheck(results) {
  try {
    const response = await fetch(`http://localhost:${port}/v1/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'healthy') {
      console.log('  ✅ Health check passed');
      results.passed++;
    } else {
      console.log('  ❌ Health check failed');
      results.failed++;
      results.errors.push('Health check endpoint not responding correctly');
    }
  } catch (error) {
    console.log('  ❌ Health check error:', error.message);
    results.failed++;
    results.errors.push(`Health check error: ${error.message}`);
  }
}

async function testEntityOperations(results) {
  try {
    // Create entity
    const createResponse = await fetch(`http://localhost:${port}/v1/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEntity)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Create entity failed: ${createResponse.status}`);
    }
    
    const createData = await createResponse.json();
    const entityId = createData['@id'];
    createdEntities.push(entityId);
    
    console.log(`  ✅ Entity created: ${entityId}`);
    results.passed++;
    
    // Retrieve entity
    const getResponse = await fetch(`http://localhost:${port}/v1/entities/${entityId}`);
    const entityData = await getResponse.json();
    
    if (getResponse.ok && entityData.label === testEntity.label) {
      console.log('  ✅ Entity retrieval passed');
      results.passed++;
    } else {
      throw new Error('Entity retrieval validation failed');
    }
    
    // Get by logical ID
    const logicalResponse = await fetch(`http://localhost:${port}/v1/entities/logical/${testEntity.logicalId}`);
    const logicalData = await logicalResponse.json();
    
    if (logicalResponse.ok && logicalData.logicalId === testEntity.logicalId) {
      console.log('  ✅ Entity logical ID retrieval passed');
      results.passed++;
    } else {
      throw new Error('Entity logical ID retrieval failed');
    }
    
  } catch (error) {
    console.log(`  ❌ Entity operations error: ${error.message}`);
    results.failed++;
    results.errors.push(`Entity operations: ${error.message}`);
  }
}

async function testActionOperations(results) {
  try {
    // Create action
    const createResponse = await fetch(`http://localhost:${port}/v1/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAction)
    });
    
    const createData = await createResponse.json();
    const actionId = createData['@id'];
    createdActions.push(actionId);
    
    console.log(`  ✅ Action created: ${actionId}`);
    results.passed++;
    
    // Retrieve action
    const getResponse = await fetch(`http://localhost:${port}/v1/actions/${actionId}`);
    const actionData = await getResponse.json();
    
    if (getResponse.ok && actionData.label === testAction.label) {
      console.log('  ✅ Action retrieval passed');
      results.passed++;
    } else {
      throw new Error('Action retrieval validation failed');
    }
    
  } catch (error) {
    console.log(`  ❌ Action operations error: ${error.message}`);
    results.failed++;
    results.errors.push(`Action operations: ${error.message}`);
  }
}

async function testEventOperations(results) {
  try {
    // Update event with real entity references
    const eventWithRefs = {
      ...testEvent,
      statement: {
        type: 'SVO',
        subjectRef: createdEntities[0] || 'placeholder-subject',
        verbRef: createdActions[0] || 'placeholder-verb', 
        objectRef: createdEntities[0] || 'placeholder-object'
      }
    };
    
    // Create event
    const createResponse = await fetch(`http://localhost:${port}/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventWithRefs)
    });
    
    const createData = await createResponse.json();
    const eventId = createData['@id'];
    createdEvents.push(eventId);
    
    console.log(`  ✅ Event created: ${eventId}`);
    results.passed++;
    
    // Retrieve event
    const getResponse = await fetch(`http://localhost:${port}/v1/events/${eventId}`);
    const eventData = await getResponse.json();
    
    if (getResponse.ok && eventData.title === testEvent.title) {
      console.log('  ✅ Event retrieval passed');
      results.passed++;
    } else {
      throw new Error('Event retrieval validation failed');
    }
    
  } catch (error) {
    console.log(`  ❌ Event operations error: ${error.message}`);
    results.failed++;
    results.errors.push(`Event operations: ${error.message}`);
  }
}

async function testMacroEventOperations(results) {
  try {
    // Create MacroEvent only if we have component events
    if (createdEvents.length === 0) {
      console.log('  ⚠️  Skipping MacroEvent tests - no component events created');
      return;
    }
    
    const testMacroEvent = {
      '@context': 'https://schema.org/',
      '@type': 'MacroEvent',
      logicalId: `test-macro-${uuidv4()}`,
      version: '1.0',
      title: 'Test Acquisition Process',
      description: 'A composite event representing the complete acquisition process',
      dateOccurred: new Date().toISOString(),
      dateRecorded: new Date().toISOString(),
      kind: 'fact',
      statement: {
        type: 'SVO',
        subjectRef: createdEntities[0] || 'placeholder',
        verbRef: createdActions[0] || 'placeholder',
        objectRef: createdEntities[0] || 'placeholder'
      },
      components: [
        { logicalId: testEvent.logicalId }  // Reference without version for latest
      ],
      aggregation: 'OR',  // Use OR aggregation which is less strict
      timelineSpan: { 
        start: new Date(Date.now() - 86400000).toISOString(),  // 1 day ago
        end: new Date().toISOString()  // Now
      },
      summary: 'Test acquisition process',
      importance: 3,
      modifiers: {
        temporal: { duration: 'P1D' }
      },
      relationships: [],
      metadata: {
        source: { name: 'Test System', type: 'Academic' },
        author: 'test@example.com',
        version: '1.0'
      },
      commitHash: 'sha256:test-commit-hash'
    };
    
    // Create MacroEvent (should trigger validation)
    const createResponse = await fetch(`http://localhost:${port}/v1/macro-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMacroEvent)
    });
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`MacroEvent creation failed: ${errorData.error}`);
    }
    
    const createData = await createResponse.json();
    const macroId = createData['@id'];
    createdMacroEvents.push(macroId);
    
    console.log(`  ✅ MacroEvent created: ${macroId}`);
    results.passed++;
    
    // Retrieve MacroEvent
    const getResponse = await fetch(`http://localhost:${port}/v1/macro-events/${macroId}`);
    const macroData = await getResponse.json();
    
    if (getResponse.ok && macroData.title === testMacroEvent.title) {
      console.log('  ✅ MacroEvent retrieval passed');
      results.passed++;
    } else {
      throw new Error('MacroEvent retrieval validation failed');
    }
    
  } catch (error) {
    console.log(`  ❌ MacroEvent operations error: ${error.message}`);
    results.failed++;
    results.errors.push(`MacroEvent operations: ${error.message}`);
  }
}

async function testRepositoryOperations(results) {
  try {
    // Test commit creation
    const commitResponse = await fetch(`http://localhost:${port}/v1/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Test commit for API validation',
        changes: {
          entities: createdEntities,
          actions: createdActions,
          events: createdEvents,
          macroEvents: createdMacroEvents
        }
      })
    });
    
    const commitData = await commitResponse.json();
    
    if (commitResponse.ok && commitData.message) {
      console.log(`  ✅ Commit created: ${commitData['@id']}`);
      results.passed++;
    } else {
      throw new Error('Commit creation failed');
    }
    
    // Test commit list
    const listResponse = await fetch(`http://localhost:${port}/v1/commits?limit=5`);
    const listData = await listResponse.json();
    
    if (listResponse.ok && Array.isArray(listData.commits)) {
      console.log(`  ✅ Commit list retrieved (${listData.commits.length} commits)`);
      results.passed++;
    } else {
      throw new Error('Commit list retrieval failed');
    }
    
  } catch (error) {
    console.log(`  ❌ Repository operations error: ${error.message}`);
    results.failed++;
    results.errors.push(`Repository operations: ${error.message}`);
  }
}

async function testErrorHandling(results) {
  try {
    // Test 404 error
    const notFoundResponse = await fetch(`http://localhost:${port}/v1/entities/sha256:nonexistent`);
    
    if (notFoundResponse.status === 404) {
      console.log('  ✅ 404 error handling passed');
      results.passed++;
    } else {
      throw new Error('404 error handling failed');
    }
    
    // Test 400 error (missing required fields)
    const badRequestResponse = await fetch(`http://localhost:${port}/v1/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' })
    });
    
    if (badRequestResponse.status === 400) {
      console.log('  ✅ 400 error handling passed');
      results.passed++;
    } else {
      throw new Error('400 error handling failed');
    }
    
  } catch (error) {
    console.log(`  ❌ Error handling test error: ${error.message}`);
    results.failed++;
    results.errors.push(`Error handling: ${error.message}`);
  }
}

async function testMetadataEndpoint(results) {
  try {
    const response = await fetch(`http://localhost:${port}/v1/metadata`);
    const data = await response.json();
    
    if (response.ok && data.version && data.storage && data.endpoints) {
      console.log('  ✅ Metadata endpoint passed');
      console.log(`    📊 Storage stats: ${data.storage.entityCount} entities, ${data.storage.eventCount} events`);
      results.passed++;
    } else {
      throw new Error('Metadata endpoint validation failed');
    }
    
  } catch (error) {
    console.log(`  ❌ Metadata endpoint error: ${error.message}`);
    results.failed++;
    results.errors.push(`Metadata endpoint: ${error.message}`);
  }
}

// Start server and run tests
console.log('🔧 Starting test server...');
server = app.listen(port, async () => {
  console.log(`✅ Test server running on port ${port}\\n`);
  
  // Wait a moment for server to fully start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Run all tests
  await runTests();
});

// Handle server startup errors
server.on('error', (error) => {
  console.error('❌ Failed to start test server:', error.message);
  process.exit(1);
});