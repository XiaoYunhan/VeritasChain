/**
 * Confidence Aggregation Cache
 * 
 * Caches MacroEvent confidence calculations to avoid O(N) traversals
 * when commit hash hasn't changed. Stores in .git-events/objects/macro-cache/
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { ConfidenceCalculation } from '../types/confidence.js';

export interface CacheEntry {
  macroId: string;          // MacroEvent @id
  commitHash: string;       // Commit when calculation was made
  aggregatedConfidence: number;
  calculation: ConfidenceCalculation;
  componentHashes: string[]; // Component @id hashes for invalidation
  cachedAt: string;         // ISO 8601 timestamp
  hitCount: number;         // Cache usage statistics
}

export interface CacheStatistics {
  totalEntries: number;
  hitRate: number;
  avgCalculationTime: number;
  cacheSize: number; // In bytes
  oldestEntry: string;
  newestEntry: string;
}

/**
 * File-based cache for MacroEvent confidence calculations
 */
export class ConfidenceCache {
  private cacheDir: string;
  private memoryCache = new Map<string, CacheEntry>();
  private hitCounts = new Map<string, number>();
  private missCounts = new Map<string, number>();
  
  constructor(baseDir: string = '.git-events') {
    this.cacheDir = path.join(baseDir, 'objects', 'macro-cache');
  }
  
  /**
   * Initialize cache directory structure
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      // Load existing cache entries into memory
      await this.loadFromDisk();
    } catch (error) {
      console.warn('Failed to initialize confidence cache:', error);
    }
  }
  
  /**
   * Get cached confidence or return null if not found/invalid
   */
  async get(
    macroId: string, 
    commitHash: string, 
    componentHashes: string[]
  ): Promise<CacheEntry | null> {
    const cacheKey = this.getCacheKey(macroId, commitHash);
    
    // Check memory cache first
    let entry = this.memoryCache.get(cacheKey);
    
    if (!entry) {
      // Load from disk
      entry = await this.loadFromDisk(cacheKey);
    }
    
    if (!entry) {
      this.recordMiss(macroId);
      return null;
    }
    
    // Validate cache entry
    if (!this.isValid(entry, commitHash, componentHashes)) {
      await this.invalidate(cacheKey);
      this.recordMiss(macroId);
      return null;
    }
    
    // Update hit statistics
    entry.hitCount += 1;
    this.recordHit(macroId);
    this.memoryCache.set(cacheKey, entry);
    
    return entry;
  }
  
  /**
   * Store confidence calculation in cache
   */
  async set(
    macroId: string,
    commitHash: string,
    componentHashes: string[],
    confidence: number,
    calculation: ConfidenceCalculation
  ): Promise<void> {
    const cacheKey = this.getCacheKey(macroId, commitHash);
    
    const entry: CacheEntry = {
      macroId,
      commitHash,
      aggregatedConfidence: confidence,
      calculation,
      componentHashes: [...componentHashes], // Clone array
      cachedAt: new Date().toISOString(),
      hitCount: 0
    };
    
    // Store in memory
    this.memoryCache.set(cacheKey, entry);
    
    // Persist to disk
    await this.saveToDisk(cacheKey, entry);
  }
  
  /**
   * Invalidate cache entry
   */
  async invalidate(cacheKey: string): Promise<void> {
    this.memoryCache.delete(cacheKey);
    
    try {
      await fs.unlink(path.join(this.cacheDir, `${cacheKey}.json`));
    } catch (error) {
      // File might not exist, ignore error
    }
  }
  
  /**
   * Invalidate all cache entries for a MacroEvent (when it's updated)
   */
  async invalidateMacroEvent(macroId: string): Promise<void> {
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.macroId === macroId) {
        toDelete.push(key);
      }
    }
    
    await Promise.all(toDelete.map(key => this.invalidate(key)));
  }
  
  /**
   * Get cache statistics for monitoring
   */
  async getStatistics(): Promise<CacheStatistics> {
    const entries = Array.from(this.memoryCache.values());
    const totalHits = Array.from(this.hitCounts.values()).reduce((a, b) => a + b, 0);
    const totalMisses = Array.from(this.missCounts.values()).reduce((a, b) => a + b, 0);
    const totalRequests = totalHits + totalMisses;
    
    // Calculate cache size on disk
    let cacheSize = 0;
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const stats = await fs.stat(path.join(this.cacheDir, file));
          cacheSize += stats.size;
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    const sortedByDate = entries.sort((a, b) => 
      new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime()
    );
    
    return {
      totalEntries: entries.length,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      avgCalculationTime: 0, // TODO: Track calculation times
      cacheSize,
      oldestEntry: sortedByDate[0]?.cachedAt || '',
      newestEntry: sortedByDate[sortedByDate.length - 1]?.cachedAt || ''
    };
  }
  
  /**
   * Clean up old cache entries (LRU eviction)
   */
  async cleanup(maxEntries: number = 1000): Promise<number> {
    if (this.memoryCache.size <= maxEntries) {
      return 0;
    }
    
    // Sort by hit count (LRU)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.hitCount - b.hitCount);
    
    const toEvict = entries.slice(0, entries.length - maxEntries);
    let evicted = 0;
    
    for (const [key] of toEvict) {
      await this.invalidate(key);
      evicted++;
    }
    
    return evicted;
  }
  
  // Private helper methods
  private getCacheKey(macroId: string, commitHash: string): string {
    return `${macroId.slice(-16)}_${commitHash.slice(-16)}`;
  }
  
  private isValid(
    entry: CacheEntry, 
    currentCommitHash: string, 
    currentComponentHashes: string[]
  ): boolean {
    // Check commit hash matches
    if (entry.commitHash !== currentCommitHash) {
      return false;
    }
    
    // Check component hashes match (order doesn't matter)
    const entryHashes = new Set(entry.componentHashes);
    const currentHashes = new Set(currentComponentHashes);
    
    if (entryHashes.size !== currentHashes.size) {
      return false;
    }
    
    for (const hash of currentHashes) {
      if (!entryHashes.has(hash)) {
        return false;
      }
    }
    
    return true;
  }
  
  private recordHit(macroId: string): void {
    const current = this.hitCounts.get(macroId) || 0;
    this.hitCounts.set(macroId, current + 1);
  }
  
  private recordMiss(macroId: string): void {
    const current = this.missCounts.get(macroId) || 0;
    this.missCounts.set(macroId, current + 1);
  }
  
  private async loadFromDisk(cacheKey?: string): Promise<CacheEntry | null> {
    if (cacheKey) {
      // Load specific entry
      try {
        const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        const entry: CacheEntry = JSON.parse(data);
        this.memoryCache.set(cacheKey, entry);
        return entry;
      } catch (error) {
        return null;
      }
    } else {
      // Load all entries
      try {
        const files = await fs.readdir(this.cacheDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const key = file.replace('.json', '');
            await this.loadFromDisk(key);
          }
        }
      } catch (error) {
        // Directory might not exist
      }
      
      return null;
    }
  }
  
  private async saveToDisk(cacheKey: string, entry: CacheEntry): Promise<void> {
    try {
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      console.warn('Failed to save cache entry to disk:', error);
    }
  }
}

// Export singleton instance
export const confidenceCache = new ConfidenceCache();