/**
 * Jest Global Teardown
 * 
 * Cleanup after all tests complete.
 */

import { rmSync, existsSync } from 'fs';

export default async function globalTeardown() {
  // Clean up any test directories
  const testDirs = [
    '.git-events-test',
    '.git-events-integration-test',
    '.git-events-e2e-test'
  ];
  
  for (const dir of testDirs) {
    if (existsSync(dir)) {
      try {
        rmSync(dir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up test directory: ${dir}`);
      } catch (error) {
        console.warn(`⚠️  Failed to clean up ${dir}:`, error);
      }
    }
  }
}