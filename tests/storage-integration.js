/**
 * Storage Integration Test
 * 
 * Tests the actual storage system with .git-events/ directory to demonstrate
 * force vs lazy evaluation modes with real file creation.
 */

import { LocalStorageAdapter } from '../dist/adapters/local.js';
import { EntityRepository } from '../dist/repository/entity.js';
import { calculateHash } from '../dist/core/hash.js';
import { rmSync, existsSync } from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const forceMode = args.includes('--force') || args.includes('-f');

console.log('🧪 Storage Integration Test');
console.log('='.repeat(50));

if (forceMode) {
  console.log('🔄 Force mode enabled - will clean and regenerate all storage\n');
  
  // Clean up existing storage directory
  try {
    rmSync('.git-events', { recursive: true, force: true });
    console.log('🗑️  Cleaned existing .git-events directory');
  } catch (error) {
    console.log('⚠️  No existing .git-events directory to clean');
  }
} else {
  console.log('⚡ Lazy mode (default) - will reuse existing storage\n');
}

async function runStorageTest() {
  try {
    // Initialize storage adapter
    const storageConfig = {
      type: 'local',
      local: {
        dataDirectory: '.git-events'
      }
    };
    
    console.log('📂 Initializing storage adapter...');
    const storage = new LocalStorageAdapter(storageConfig);
    await storage.initialize();
    
    console.log('📚 Creating entity repository...');
    const entityRepo = new EntityRepository(storage);
    
    // Test entities with fixed logical IDs for consistent hashing
    const testEntities = [
      {
        logicalId: 'jpmorgan-entity-001',
        label: 'JPMorgan Chase & Co.',
        description: 'Major US financial corporation',
        dataType: { custom: 'Corporation', description: 'Business entity' }
      },
      {
        logicalId: 'fintech-companies-001',
        label: 'Financial Technology Companies',
        description: 'Group of fintech companies',
        dataType: { custom: 'CompanyGroup', description: 'Business group' }
      }
    ];
    
    const testActions = [
      {
        logicalId: 'charges-action-001',
        label: 'charges',
        description: 'To impose a fee or cost',
        category: 'financial',
        deonticType: null
      },
      {
        logicalId: 'announces-action-001',
        label: 'announces',
        description: 'To make a public statement',
        category: 'communication',
        deonticType: null
      }
    ];
    
    console.log('\n🏗️  Creating test entities and actions...');
    
    const entities = [];
    const actions = [];
    
    // Create entities with predictable hashes for lazy evaluation demonstration
    for (let i = 0; i < testEntities.length; i++) {
      const entityData = testEntities[i];
      console.log(`  📝 Creating entity: "${entityData.label}"`);
      
      // Calculate what the hash would be
      const predictableEntityData = {
        '@context': 'https://schema.org/',
        '@type': 'Thing',
        logicalId: entityData.logicalId,
        version: '1.0',
        commitHash: 'test-commit-001',
        label: entityData.label,
        description: entityData.description,
        dataType: entityData.dataType,
        properties: undefined
      };
      
      const expectedHash = calculateHash(predictableEntityData);
      
      if (!forceMode) {
        // In lazy mode, check if it exists first
        const existing = await storage.entities.retrieve(expectedHash);
        if (existing) {
          console.log(`     ♻️  Reusing existing: ${expectedHash}`);
          entities.push(existing);
          continue;
        }
      }
      
      // Create manually with fixed logicalId
      const entity = {
        '@id': expectedHash,
        '@context': 'https://schema.org/',
        '@type': 'Thing',
        logicalId: entityData.logicalId,
        version: '1.0',
        commitHash: 'test-commit-001',
        label: entityData.label,
        description: entityData.description,
        dataType: entityData.dataType,
        properties: undefined
      };
      
      await storage.entities.store(expectedHash, entity);
      entities.push(entity);
      console.log(`     ✅ Created with hash: ${entity['@id']}`);
    }
    
    // Create actions with predictable hashes
    for (let i = 0; i < testActions.length; i++) {
      const actionData = testActions[i];
      console.log(`  ⚡ Creating action: "${actionData.label}"`);
      
      // Calculate what the hash would be
      const predictableActionData = {
        '@context': 'https://schema.org/',
        '@type': 'Action',
        logicalId: actionData.logicalId,
        version: '1.0',
        commitHash: 'test-commit-001',
        label: actionData.label,
        description: actionData.description,
        category: actionData.category,
        deonticType: actionData.deonticType,
        properties: undefined
      };
      
      const expectedHash = calculateHash(predictableActionData);
      
      if (!forceMode) {
        // In lazy mode, check if it exists first
        const existing = await storage.actions.retrieve(expectedHash);
        if (existing) {
          console.log(`     ♻️  Reusing existing: ${expectedHash}`);
          actions.push(existing);
          continue;
        }
      }
      
      // Create manually with fixed logicalId
      const action = {
        '@id': expectedHash,
        '@context': 'https://schema.org/',
        '@type': 'Action',
        logicalId: actionData.logicalId,
        version: '1.0',
        commitHash: 'test-commit-001',
        label: actionData.label,
        description: actionData.description,
        category: actionData.category,
        deonticType: actionData.deonticType,
        properties: undefined
      };
      
      await storage.actions.store(expectedHash, action);
      actions.push(action);
      console.log(`     ✅ Created with hash: ${action['@id']}`);
    }
    
    // Verify storage structure was created
    console.log('\n📁 Verifying storage structure:');
    const stats = await storage.getStatistics();
    console.log(`   - Entities: ${stats.entityCount}`);
    console.log(`   - Actions: ${stats.actionCount}`);
    console.log(`   - Events: ${stats.eventCount}`);
    console.log(`   - Commits: ${stats.commitCount}`);
    
    // Check if .git-events directory exists and show structure
    if (existsSync('.git-events')) {
      console.log('\n🗂️  .git-events directory structure created:');
      console.log('   📁 .git-events/');
      
      if (existsSync('.git-events/objects')) {
        console.log('   ├── 📁 objects/');
        
        if (existsSync('.git-events/objects/entities')) {
          console.log('   │   ├── 📁 entities/');
          console.log('   │   │   └── (entity files)');
        }
        
        if (existsSync('.git-events/objects/actions')) {
          console.log('   │   ├── 📁 actions/');
          console.log('   │   │   └── (action files)');
        }
        
        if (existsSync('.git-events/objects/events')) {
          console.log('   │   └── 📁 events/');
        }
      }
      
      if (existsSync('.git-events/refs')) {
        console.log('   └── 📁 refs/');
      }
    }
    
    // Show example created files
    console.log('\n📄 Example created entities:');
    entities.forEach((entity, i) => {
      console.log(`   ${i + 1}. ${entity.label} → ${entity['@id']}`);
    });
    
    console.log('\n⚡ Example created actions:');  
    actions.forEach((action, i) => {
      console.log(`   ${i + 1}. ${action.label} → ${action['@id']}`);
    });
    
    console.log('\n✅ Storage integration test completed successfully!');
    console.log(`Mode: ${forceMode ? 'Force (clean regeneration)' : 'Lazy (reuse existing)'}`);
    
    await storage.close();
    
  } catch (error) {
    console.error('❌ Storage integration test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runStorageTest();