/**
 * Conflict Visualization and Display System
 * 
 * Provides human-readable conflict visualization, CLI display utilities,
 * and export formats for conflict analysis and resolution.
 * 
 * Phase 2.3 implementation for enhanced conflict presentation.
 */

import type { MergeConflict } from './merge.js';
import type { ConflictVisualization, ConflictResolution } from './conflict-resolver.js';

export interface ConflictDisplayOptions {
  format: 'cli' | 'json' | 'markdown' | 'html';
  showSuggestions?: boolean;
  includeMetadata?: boolean;
  colorize?: boolean;
  maxWidth?: number;
}

export interface ConflictSummary {
  totalConflicts: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  autoResolvableCount: number;
  criticalCount: number;
  recommendedAction: 'proceed' | 'review' | 'manual';
}

/**
 * Conflict display and visualization utilities
 */
export class ConflictDisplay {
  
  /**
   * Generate summary of conflicts for quick overview
   */
  static generateSummary(conflicts: MergeConflict[]): ConflictSummary {
    const summary: ConflictSummary = {
      totalConflicts: conflicts.length,
      byType: {},
      bySeverity: {},
      autoResolvableCount: 0,
      criticalCount: 0,
      recommendedAction: 'proceed'
    };

    for (const conflict of conflicts) {
      // Count by type
      summary.byType[conflict.type] = (summary.byType[conflict.type] || 0) + 1;
      
      // Count by severity
      summary.bySeverity[conflict.severity] = (summary.bySeverity[conflict.severity] || 0) + 1;
      
      // Count auto-resolvable
      if (conflict.autoResolvable) {
        summary.autoResolvableCount++;
      }
      
      // Count critical
      if (conflict.severity === 'critical') {
        summary.criticalCount++;
      }
    }

    // Determine recommended action
    if (summary.criticalCount > 0) {
      summary.recommendedAction = 'manual';
    } else if (summary.autoResolvableCount < summary.totalConflicts * 0.7) {
      summary.recommendedAction = 'review';
    } else {
      summary.recommendedAction = 'proceed';
    }

    return summary;
  }

  /**
   * Display conflicts in CLI format
   */
  static displayCLI(
    conflicts: MergeConflict[], 
    options: ConflictDisplayOptions = { format: 'cli' }
  ): string {
    const lines: string[] = [];
    const colors = options.colorize !== false;
    
    // Header
    lines.push(this.colorize('🔥 MERGE CONFLICTS DETECTED', 'red', colors));
    lines.push(this.colorize('═'.repeat(50), 'gray', colors));
    
    // Summary
    const summary = this.generateSummary(conflicts);
    lines.push('');
    lines.push(this.colorize(`📊 Summary: ${summary.totalConflicts} conflicts found`, 'yellow', colors));
    lines.push(`   Auto-resolvable: ${summary.autoResolvableCount}/${summary.totalConflicts}`);
    lines.push(`   Critical: ${summary.criticalCount}`);
    lines.push(`   Recommended action: ${this.colorize(summary.recommendedAction.toUpperCase(), summary.recommendedAction === 'proceed' ? 'green' : 'red', colors)}`);
    lines.push('');

    // Group conflicts by severity
    const groupedBySeverity = this.groupBy(conflicts, 'severity');
    const severityOrder = ['critical', 'high', 'medium', 'low'];

    for (const severity of severityOrder) {
      const conflictsOfSeverity = groupedBySeverity[severity];
      if (!conflictsOfSeverity || conflictsOfSeverity.length === 0) continue;

      lines.push(this.colorize(`${this.getSeverityIcon(severity)} ${severity.toUpperCase()} CONFLICTS (${conflictsOfSeverity.length})`, this.getSeverityColor(severity), colors));
      lines.push('─'.repeat(40));

      for (let i = 0; i < conflictsOfSeverity.length; i++) {
        const conflict = conflictsOfSeverity[i];
        lines.push(...this.formatConflictCLI(conflict, i + 1, options));
        lines.push('');
      }
    }

    // Resolution suggestions
    if (options.showSuggestions !== false) {
      lines.push(this.colorize('💡 RESOLUTION SUGGESTIONS', 'blue', colors));
      lines.push('─'.repeat(30));
      lines.push(...this.generateResolutionSuggestions(conflicts, colors));
    }

    return lines.join('\n');
  }

  /**
   * Format single conflict for CLI display
   */
  private static formatConflictCLI(
    conflict: MergeConflict, 
    index: number, 
    options: ConflictDisplayOptions
  ): string[] {
    const lines: string[] = [];
    const colors = options.colorize !== false;
    const maxWidth = options.maxWidth || 80;

    // Conflict header
    lines.push(`${index}. ${this.colorize(conflict.objectType.toUpperCase(), 'cyan', colors)} ${conflict.logicalId}`);
    lines.push(`   Property: ${conflict.property || 'N/A'}`);
    lines.push(`   Type: ${conflict.type}`);
    
    if (options.includeMetadata !== false) {
      lines.push(`   Auto-resolvable: ${conflict.autoResolvable ? '✅' : '❌'}`);
      if (conflict.suggestedResolution) {
        lines.push(`   Suggested: ${conflict.suggestedResolution} ${conflict.resolutionReason ? `(${conflict.resolutionReason})` : ''}`);
      }
    }

    lines.push(`   ${this.colorize('Description:', 'gray', colors)} ${conflict.description}`);

    // Three-way diff
    lines.push('');
    lines.push('   📋 THREE-WAY COMPARISON:');
    
    if (conflict.base !== undefined) {
      lines.push(`   Base:  ${this.truncateValue(conflict.base, maxWidth - 10)}`);
    }
    lines.push(`   ${this.colorize('Ours: ', 'green', colors)} ${this.truncateValue(conflict.ours, maxWidth - 10)}`);
    lines.push(`   ${this.colorize('Theirs:', 'red', colors)} ${this.truncateValue(conflict.theirs, maxWidth - 10)}`);

    return lines;
  }

  /**
   * Display conflict visualization
   */
  static displayVisualization(
    visualization: ConflictVisualization,
    options: ConflictDisplayOptions = { format: 'cli' }
  ): string {
    const lines: string[] = [];
    const colors = options.colorize !== false;

    // Header
    lines.push(this.colorize(`🔍 ${visualization.title}`, 'blue', colors));
    lines.push('═'.repeat(Math.min(visualization.title.length + 4, 60)));
    lines.push('');

    // Description and metadata
    lines.push(`${this.colorize('Description:', 'gray', colors)} ${visualization.description}`);
    lines.push(`${this.colorize('Type:', 'gray', colors)} ${visualization.type}`);
    lines.push(`${this.colorize('Severity:', 'gray', colors)} ${this.colorize(visualization.severity, this.getSeverityColor(visualization.severity), colors)}`);
    lines.push('');

    // Comparison table
    lines.push(this.colorize('📊 DETAILED COMPARISON', 'yellow', colors));
    lines.push('─'.repeat(50));

    const comparison = visualization.comparison;
    
    // Table headers
    lines.push('┌─────────────┬─────────────────────┬─────────────┬─────────────────┐');
    lines.push('│    Source   │        Value        │ Confidence  │    Timestamp    │');
    lines.push('├─────────────┼─────────────────────┼─────────────┼─────────────────┤');

    // Base row
    if (comparison.base) {
      lines.push(`│ ${this.padRight('Base', 11)} │ ${this.padRight(this.truncateValue(comparison.base.value, 19), 19)} │ ${this.padRight((comparison.base.confidence || 0).toFixed(3), 11)} │ ${this.padRight('N/A', 15)} │`);
    }

    // Our changes row
    lines.push(`│ ${this.colorize(this.padRight('Our Changes', 11), 'green', colors)} │ ${this.padRight(this.truncateValue(comparison.ours.value, 19), 19)} │ ${this.padRight((comparison.ours.confidence || 0).toFixed(3), 11)} │ ${this.padRight(this.formatTimestamp(comparison.ours.timestamp), 15)} │`);

    // Their changes row
    lines.push(`│ ${this.colorize(this.padRight('Their Changes', 11), 'red', colors)} │ ${this.padRight(this.truncateValue(comparison.theirs.value, 19), 19)} │ ${this.padRight((comparison.theirs.confidence || 0).toFixed(3), 11)} │ ${this.padRight(this.formatTimestamp(comparison.theirs.timestamp), 15)} │`);

    lines.push('└─────────────┴─────────────────────┴─────────────┴─────────────────┘');

    // Suggestions
    if (visualization.suggestions && visualization.suggestions.length > 0) {
      lines.push('');
      lines.push(this.colorize('🤖 AI SUGGESTIONS', 'blue', colors));
      lines.push('─'.repeat(20));

      for (let i = 0; i < visualization.suggestions.length; i++) {
        const suggestion = visualization.suggestions[i];
        lines.push(`${i + 1}. ${this.colorize(suggestion.strategy, 'cyan', colors)} (confidence: ${(suggestion.confidence * 100).toFixed(1)}%)`);
        lines.push(`   ${suggestion.reasoning}`);
        if (suggestion.preview) {
          lines.push(`   Preview: ${this.truncateValue(suggestion.preview, 60)}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Export conflicts to different formats
   */
  static export(
    conflicts: MergeConflict[],
    resolutions: ConflictResolution[] = [],
    format: 'json' | 'markdown' | 'csv'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify({
          summary: this.generateSummary(conflicts),
          conflicts,
          resolutions,
          exportedAt: new Date().toISOString()
        }, null, 2);

      case 'markdown':
        return this.exportMarkdown(conflicts, resolutions);

      case 'csv':
        return this.exportCSV(conflicts, resolutions);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate resolution suggestions based on conflict patterns
   */
  private static generateResolutionSuggestions(conflicts: MergeConflict[], colorize: boolean): string[] {
    const suggestions: string[] = [];
    const summary = this.generateSummary(conflicts);

    if (summary.criticalCount > 0) {
      suggestions.push(`⚠️  ${this.colorize('CRITICAL:', 'red', colorize)} ${summary.criticalCount} critical conflicts require immediate attention`);
    }

    if (summary.autoResolvableCount > 0) {
      suggestions.push(`✅ ${this.colorize('AUTO-RESOLVE:', 'green', colorize)} ${summary.autoResolvableCount} conflicts can be resolved automatically`);
    }

    const manualCount = summary.totalConflicts - summary.autoResolvableCount;
    if (manualCount > 0) {
      suggestions.push(`👤 ${this.colorize('MANUAL:', 'yellow', colorize)} ${manualCount} conflicts need manual review`);
    }

    // Strategy suggestions based on conflict types
    if (summary.byType['component'] > 0) {
      suggestions.push('💡 Component conflicts: Consider using latest versions or explicit version pinning');
    }

    if (summary.byType['statement'] > 0) {
      suggestions.push('💡 Statement conflicts: Review logical statements for consistency');
    }

    if (summary.byType['aggregation'] > 0) {
      suggestions.push('💡 Aggregation conflicts: Consider confidence impact of different aggregation strategies');
    }

    return suggestions;
  }

  /**
   * Export to Markdown format
   */
  private static exportMarkdown(conflicts: MergeConflict[], resolutions: ConflictResolution[]): string {
    const lines: string[] = [];
    const summary = this.generateSummary(conflicts);

    lines.push('# Merge Conflict Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push(`**Total Conflicts:** ${summary.totalConflicts}`);
    lines.push(`**Auto-resolvable:** ${summary.autoResolvableCount}`);
    lines.push(`**Critical:** ${summary.criticalCount}`);
    lines.push('');

    lines.push('## Summary by Type');
    lines.push('');
    lines.push('| Type | Count |');
    lines.push('|------|-------|');
    Object.entries(summary.byType).forEach(([type, count]) => {
      lines.push(`| ${type} | ${count} |`);
    });
    lines.push('');

    lines.push('## Conflicts');
    lines.push('');

    conflicts.forEach((conflict, index) => {
      lines.push(`### ${index + 1}. ${conflict.objectType} - ${conflict.logicalId}`);
      lines.push('');
      lines.push(`**Property:** ${conflict.property || 'N/A'}`);
      lines.push(`**Type:** ${conflict.type}`);
      lines.push(`**Severity:** ${conflict.severity}`);
      lines.push(`**Auto-resolvable:** ${conflict.autoResolvable ? 'Yes' : 'No'}`);
      lines.push('');
      lines.push(`**Description:** ${conflict.description}`);
      lines.push('');

      if (conflict.base !== undefined) {
        lines.push('**Base Value:**');
        lines.push('```');
        lines.push(JSON.stringify(conflict.base, null, 2));
        lines.push('```');
        lines.push('');
      }

      lines.push('**Our Value:**');
      lines.push('```');
      lines.push(JSON.stringify(conflict.ours, null, 2));
      lines.push('```');
      lines.push('');

      lines.push('**Their Value:**');
      lines.push('```');
      lines.push(JSON.stringify(conflict.theirs, null, 2));
      lines.push('```');
      lines.push('');
    });

    if (resolutions.length > 0) {
      lines.push('## Resolutions');
      lines.push('');
      resolutions.forEach((resolution, index) => {
        lines.push(`### ${index + 1}. ${resolution.conflictId}`);
        lines.push('');
        lines.push(`**Resolution:** ${resolution.resolution}`);
        lines.push(`**Confidence:** ${(resolution.confidence * 100).toFixed(1)}%`);
        lines.push(`**Method:** ${resolution.method}`);
        lines.push(`**Reasoning:** ${resolution.reasoning}`);
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  /**
   * Export to CSV format
   */
  private static exportCSV(conflicts: MergeConflict[], resolutions: ConflictResolution[]): string {
    const lines: string[] = [];
    
    // CSV headers
    lines.push('ConflictId,ObjectType,LogicalId,Property,Type,Severity,AutoResolvable,Description,OurValue,TheirValue,BaseValue');

    // CSV data
    conflicts.forEach(conflict => {
      const row = [
        `${conflict.logicalId}-${conflict.property}`,
        conflict.objectType,
        conflict.logicalId,
        conflict.property || '',
        conflict.type,
        conflict.severity,
        conflict.autoResolvable.toString(),
        this.escapeCsv(conflict.description),
        this.escapeCsv(JSON.stringify(conflict.ours)),
        this.escapeCsv(JSON.stringify(conflict.theirs)),
        this.escapeCsv(JSON.stringify(conflict.base))
      ];
      lines.push(row.join(','));
    });

    return lines.join('\n');
  }

  // Utility methods
  private static colorize(text: string, color: string, enabled: boolean): string {
    if (!enabled) return text;
    
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
      reset: '\x1b[0m'
    };
    
    return `${colors[color as keyof typeof colors] || ''}${text}${colors.reset}`;
  }

  private static getSeverityIcon(severity: string): string {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '📢',
      low: 'ℹ️'
    };
    return icons[severity as keyof typeof icons] || '❓';
  }

  private static getSeverityColor(severity: string): string {
    const colors = {
      critical: 'red',
      high: 'red',
      medium: 'yellow',
      low: 'blue'
    };
    return colors[severity as keyof typeof colors] || 'gray';
  }

  private static groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private static truncateValue(value: any, maxLength: number): string {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
  }

  private static padRight(str: string, length: number): string {
    return str.length >= length ? str.substring(0, length) : str + ' '.repeat(length - str.length);
  }

  private static formatTimestamp(timestamp?: string): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString().substring(0, 15);
  }

  private static escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

/**
 * CLI utility for displaying conflicts in terminal
 */
export function displayConflictsInTerminal(
  conflicts: MergeConflict[],
  options: Partial<ConflictDisplayOptions> = {}
): void {
  const displayOptions: ConflictDisplayOptions = {
    format: 'cli',
    colorize: true,
    showSuggestions: true,
    includeMetadata: true,
    maxWidth: process.stdout.columns || 80,
    ...options
  };

  console.log(ConflictDisplay.displayCLI(conflicts, displayOptions));
}

/**
 * Export conflicts to file
 */
export function exportConflictsToFile(
  conflicts: MergeConflict[],
  filePath: string,
  format: 'json' | 'markdown' | 'csv',
  resolutions: ConflictResolution[] = []
): void {
  const content = ConflictDisplay.export(conflicts, resolutions, format);
  
  // In a real implementation, this would write to file
  console.log(`Would export to ${filePath}:\n${content}`);
}