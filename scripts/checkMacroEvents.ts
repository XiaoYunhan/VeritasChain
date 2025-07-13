#!/usr/bin/env ts-node
/**
 * Check for MacroEvents in the data directory
 * Analyzes current state before migration
 */

import { promises as fs } from 'fs';
import path from 'path';
import { readdirSync, statSync } from 'fs';

/**
 * Recursively find all JSON files in a directory
 */
async function findJsonFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await findJsonFiles(fullPath);
        files.push(...subFiles);
      } else if (path.extname(entry) === '.json') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or permission issue
  }
  
  return files;
}

interface CheckStats {
  totalFiles: number;
  eventFiles: number;
  macroEventFiles: number;
  compositeEventFiles: number;
  macroEvents: any[];
  errors: string[];
}

async function checkMacroEvents(dataDir: string = './.git-events'): Promise<CheckStats> {
  const stats: CheckStats = {
    totalFiles: 0,
    eventFiles: 0,
    macroEventFiles: 0,
    compositeEventFiles: 0,
    macroEvents: [],
    errors: []
  };

  try {
    const objectsDir = path.join(dataDir, 'objects');
    const files = await findJsonFiles(objectsDir);
    
    stats.totalFiles = files.length;

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (data['@type'] === 'Event' || data['@type'] === 'MacroEvent') {
          stats.eventFiles++;

          if (data['@type'] === 'MacroEvent') {
            stats.macroEventFiles++;
            stats.macroEvents.push({
              '@id': data['@id'],
              title: data.title,
              filePath: path.relative(process.cwd(), filePath),
              aggregationLogic: data.aggregationLogic,
              aggregation: data.aggregation,
              componentCount: data.components?.length || 0
            });
          } else if (data.components && data.components.length > 0) {
            stats.compositeEventFiles++;
          }
        }
      } catch (error) {
        stats.errors.push(`Error reading ${filePath}: ${(error as Error).message}`);
      }
    }

  } catch (error) {
    stats.errors.push(`Failed to scan directory: ${(error as Error).message}`);
  }

  return stats;
}

async function main() {
  console.log('🔍 Checking for MacroEvents...\n');
  
  const stats = await checkMacroEvents();
  
  console.log('📊 Results:');
  console.log(`   Total files: ${stats.totalFiles}`);
  console.log(`   Event files: ${stats.eventFiles}`);
  console.log(`   MacroEvent files: ${stats.macroEventFiles}`);
  console.log(`   Composite Event files: ${stats.compositeEventFiles}`);
  
  if (stats.macroEvents.length > 0) {
    console.log('\n📋 MacroEvents found:');
    stats.macroEvents.forEach(macro => {
      console.log(`   - ${macro.title} (${macro.componentCount} components)`);
      console.log(`     File: ${macro.filePath}`);
      console.log(`     Aggregation: ${macro.aggregationLogic || macro.aggregation || 'none'}`);
    });
  } else {
    console.log('\n✅ No MacroEvents found - already migrated or none exist');
  }
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }
  
  console.log(`\n${stats.macroEventFiles > 0 ? '⚠️  Migration needed' : '✅ No migration needed'}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}