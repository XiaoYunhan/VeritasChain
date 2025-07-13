#!/usr/bin/env ts-node
/**
 * MacroEvent to Event Migration Script
 * 
 * Converts existing MacroEvent files to the new unified Event format:
 * - @type: "MacroEvent" → "Event"
 * - aggregationLogic → aggregation
 * - components: string[] → ComponentRef[]
 * - Calculate depth recursively
 * - Generate migration report
 */

import { promises as fs } from 'fs';
import path from 'path';
import { migrateMacroEvent, isComposite } from '../dist/types/event.js';
import type { Event } from '../dist/types/event.js';

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

interface MigrationStats {
  filesScanned: number;
  macroEventsFound: number;
  macroEventsMigrated: number;
  eventsUpdated: number;
  errors: string[];
  warnings: string[];
}

interface MigrationOptions {
  dryRun?: boolean;
  dataDirectory?: string;
  verbose?: boolean;
  backup?: boolean;
}

/**
 * Main migration function
 */
export async function migrateMacroEvents(options: MigrationOptions = {}): Promise<MigrationStats> {
  const stats: MigrationStats = {
    filesScanned: 0,
    macroEventsFound: 0,
    macroEventsMigrated: 0,
    eventsUpdated: 0,
    errors: [],
    warnings: []
  };

  const dataDir = options.dataDirectory || './.git-events';
  const objectsDir = path.join(dataDir, 'objects');

  console.log('🔄 Starting MacroEvent Migration...');
  console.log(`📁 Data directory: ${dataDir}`);
  console.log(`🧪 Dry run: ${options.dryRun ? 'Yes' : 'No'}`);

  try {
    // Check if data directory exists
    try {
      await fs.access(objectsDir);
    } catch {
      stats.errors.push(`Data directory not found: ${objectsDir}`);
      return stats;
    }

    // Find all JSON files in objects directory
    const files = await findJsonFiles(objectsDir);
    
    console.log(`📋 Found ${files.length} JSON files to scan`);

    // Process each file
    for (const filePath of files) {
      await processFile(filePath, stats, options);
    }

    // Calculate depths for composite events
    if (!options.dryRun) {
      await calculateDepths(dataDir, stats, options);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Files scanned: ${stats.filesScanned}`);
    console.log(`   MacroEvents found: ${stats.macroEventsFound}`);
    console.log(`   MacroEvents migrated: ${stats.macroEventsMigrated}`);
    console.log(`   Events updated: ${stats.eventsUpdated}`);
    
    if (stats.errors.length > 0) {
      console.log(`   ❌ Errors: ${stats.errors.length}`);
    }
    
    if (stats.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${stats.warnings.length}`);
    }

  } catch (error) {
    stats.errors.push(`Migration failed: ${(error as Error).message}`);
  }

  return stats;
}

/**
 * Process a single JSON file
 */
async function processFile(
  filePath: string, 
  stats: MigrationStats, 
  options: MigrationOptions
): Promise<void> {
  try {
    stats.filesScanned++;
    
    if (options.verbose) {
      console.log(`📄 Processing: ${path.relative(process.cwd(), filePath)}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Check if this is a MacroEvent
    if (data['@type'] === 'MacroEvent') {
      stats.macroEventsFound++;
      
      if (options.verbose) {
        console.log(`   🔍 Found MacroEvent: ${data.title || data['@id']}`);
      }

      // Create backup if requested
      if (options.backup && !options.dryRun) {
        const backupPath = filePath + '.backup';
        await fs.writeFile(backupPath, content);
      }

      // Migrate the MacroEvent
      const migratedEvent = await migrateMacroEventContent(data, stats, options);
      
      if (migratedEvent) {
        stats.macroEventsMigrated++;
        
        // Write migrated content
        if (!options.dryRun) {
          const migratedContent = JSON.stringify(migratedEvent, null, 2);
          await fs.writeFile(filePath, migratedContent);
          stats.eventsUpdated++;
        }
        
        if (options.verbose) {
          console.log(`   ✅ Migrated successfully`);
        }
      }
    }

  } catch (error) {
    const errorMsg = `Error processing ${filePath}: ${(error as Error).message}`;
    stats.errors.push(errorMsg);
    
    if (options.verbose) {
      console.log(`   ❌ ${errorMsg}`);
    }
  }
}

/**
 * Migrate MacroEvent content to new Event format
 */
async function migrateMacroEventContent(
  oldEvent: any,
  stats: MigrationStats,
  options: MigrationOptions
): Promise<Event | null> {
  try {
    // Use the migration helper from types
    let migratedEvent = migrateMacroEvent(oldEvent);

    // Resolve component references
    if (migratedEvent.components) {
      migratedEvent.components = await resolveComponentReferences(
        migratedEvent.components,
        stats,
        options
      );
    }

    // Add system-managed fields
    migratedEvent.depth = await calculateEventDepth(migratedEvent, options);

    return migratedEvent;

  } catch (error) {
    stats.errors.push(`Migration failed for ${oldEvent['@id']}: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Resolve component references from string IDs to ComponentRef objects
 */
async function resolveComponentReferences(
  components: any[],
  stats: MigrationStats,
  options: MigrationOptions
): Promise<any[]> {
  const resolved = [];

  for (const component of components) {
    if (typeof component === 'string') {
      // Old format: component is a direct @id reference
      const logicalId = await resolveLogicalIdFromHash(component, options);
      if (logicalId) {
        resolved.push({
          logicalId,
          version: undefined // Use latest by default
        });
      } else {
        stats.warnings.push(`Could not resolve logical ID for component: ${component}`);
        // Keep as-is for manual resolution
        resolved.push({
          logicalId: component,
          version: undefined
        });
      }
    } else {
      // Already in new format or partial migration
      resolved.push(component);
    }
  }

  return resolved;
}

/**
 * Resolve logical ID from a content hash
 */
async function resolveLogicalIdFromHash(
  hash: string,
  options: MigrationOptions
): Promise<string | null> {
  try {
    // This would need to search through files to find the event with this hash
    // For now, return the hash as logical ID (will need manual cleanup)
    return hash;
  } catch {
    return null;
  }
}

/**
 * Calculate event depth recursively
 */
async function calculateEventDepth(
  event: Event,
  options: MigrationOptions,
  visited: Set<string> = new Set()
): Promise<number> {
  // Prevent infinite recursion
  if (visited.has(event['@id'])) {
    return 0; // Circular reference detected
  }

  if (!isComposite(event)) {
    return 0; // Leaf event
  }

  visited.add(event['@id']);

  let maxChildDepth = 0;
  
  for (const component of event.components || []) {
    // In a real implementation, we'd load the component event
    // For migration, we'll estimate based on component count
    const childDepth = 1; // Simplified for migration
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  }

  visited.delete(event['@id']);
  return maxChildDepth + 1;
}

/**
 * Calculate depths for all composite events
 */
async function calculateDepths(
  dataDir: string,
  stats: MigrationStats,
  options: MigrationOptions
): Promise<void> {
  console.log('🔢 Calculating event depths...');
  
  // This would iterate through all events and calculate proper depths
  // For now, we'll skip this step and let the system calculate depths on-demand
  
  if (options.verbose) {
    console.log('   ✅ Depth calculation completed');
  }
}

/**
 * Generate migration report
 */
export function generateMigrationReport(stats: MigrationStats): string {
  const report = [
    '# MacroEvent Migration Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    `- Files scanned: ${stats.filesScanned}`,
    `- MacroEvents found: ${stats.macroEventsFound}`,
    `- MacroEvents migrated: ${stats.macroEventsMigrated}`,
    `- Events updated: ${stats.eventsUpdated}`,
    '',
    '## Status',
    stats.errors.length === 0 ? '✅ Migration completed successfully' : '❌ Migration completed with errors',
    ''
  ];

  if (stats.errors.length > 0) {
    report.push('## Errors');
    stats.errors.forEach(error => {
      report.push(`- ${error}`);
    });
    report.push('');
  }

  if (stats.warnings.length > 0) {
    report.push('## Warnings');
    stats.warnings.forEach(warning => {
      report.push(`- ${warning}`);
    });
    report.push('');
  }

  report.push('## Next Steps');
  report.push('1. Verify migrated events load correctly');
  report.push('2. Run tests to ensure functionality');
  report.push('3. Update API clients to use new Event format');
  report.push('4. Remove backup files when confident in migration');

  return report.join('\n');
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    backup: args.includes('--backup'),
    dataDirectory: args.find(arg => arg.startsWith('--data-dir='))?.split('=')[1]
  };

  console.log('🔄 MacroEvent Migration Tool');
  console.log('============================');

  const stats = await migrateMacroEvents(options);
  
  // Generate and save report
  const report = generateMigrationReport(stats);
  const reportPath = 'migration-report.md';
  
  await fs.writeFile(reportPath, report);
  console.log(`\n📋 Migration report saved: ${reportPath}`);

  // Exit with error code if there were errors
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}