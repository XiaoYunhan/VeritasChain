/**
 * Branch Management Operations
 * 
 * Implements Git-like branch operations including creation, switching,
 * listing, and deletion with proper state management and validation.
 * Phase 2.1 implementation with full HEAD management.
 */

import type { StorageAdapter } from '../adapters/interfaces.js';
import type { Branch, Commit, Repository } from '../types/index.js';
import { calculateCommitHash } from '../core/hash.js';

export interface BranchOperationResult {
  success: boolean;
  message: string;
  branch?: Branch;
  previousBranch?: string;
  newCommit?: string;
}

export interface BranchListItem extends Branch {
  current: boolean;
  ahead: number;      // Commits ahead of base branch
  behind: number;     // Commits behind base branch
  lastCommit?: Commit;
}

/**
 * Comprehensive branch management with Git-like behavior
 */
export class BranchManager {
  constructor(private storage: StorageAdapter) {}

  /**
   * Create a new branch from current HEAD or specified commit
   */
  async createBranch(
    name: string, 
    options: {
      fromCommit?: string;    // Create from specific commit (default: current HEAD)
      author?: string;        // Branch creator (default: 'system')
      description?: string;   // Branch description
      force?: boolean;        // Force create even if branch exists
    } = {}
  ): Promise<BranchOperationResult> {
    
    // Validate branch name
    if (!this.isValidBranchName(name)) {
      return {
        success: false,
        message: `Invalid branch name: ${name}. Must be alphanumeric with hyphens/underscores.`
      };
    }

    // Check if branch already exists
    const existingBranches = await this.storage.commits.getBranches();
    const existingBranch = existingBranches.find(b => b.name === name);
    
    if (existingBranch && !options.force) {
      return {
        success: false,
        message: `Branch '${name}' already exists. Use force=true to overwrite.`
      };
    }

    // Get source commit (current HEAD or specified commit)
    const repo = await this.storage.repository.getRepository();
    if (!repo) {
      return {
        success: false,
        message: 'Repository not initialized'
      };
    }

    // Handle empty repository case
    let sourceCommit = options.fromCommit || repo.head;
    if (!sourceCommit) {
      // For empty repository, create branch with empty head
      // It will be updated when the first commit is made
      sourceCommit = '';
    } else {
      // Verify source commit exists (only if not empty)
      const commit = await this.storage.commits.retrieve(sourceCommit);
      if (!commit) {
        return {
          success: false,
          message: `Source commit not found: ${sourceCommit}`
        };
      }
    }

    // Create branch object
    const branch: Branch = {
      name,
      head: sourceCommit,
      created: new Date().toISOString(),
      author: options.author || 'system',
      description: options.description
    };

    // Save branch
    await this.storage.commits.createBranch(branch);

    return {
      success: true,
      message: `Branch '${name}' created from ${sourceCommit.slice(0, 8)}`,
      branch
    };
  }

  /**
   * Switch to specified branch (checkout)
   */
  async switchBranch(
    branchName: string,
    options: {
      force?: boolean;        // Force switch even with uncommitted changes
      createIfMissing?: boolean; // Create branch if it doesn't exist
    } = {}
  ): Promise<BranchOperationResult> {
    
    const repo = await this.storage.repository.getRepository();
    if (!repo) {
      return {
        success: false,
        message: 'Repository not initialized'
      };
    }

    const currentBranch = repo.currentBranch;

    // Check if already on target branch
    if (currentBranch === branchName) {
      return {
        success: true,
        message: `Already on branch '${branchName}'`,
        previousBranch: currentBranch
      };
    }

    // Get target branch
    const branches = await this.storage.commits.getBranches();
    let targetBranch = branches.find(b => b.name === branchName);

    // Create branch if missing and requested
    if (!targetBranch && options.createIfMissing) {
      const createResult = await this.createBranch(branchName);
      if (!createResult.success) {
        return createResult;
      }
      targetBranch = createResult.branch!;
    }

    if (!targetBranch) {
      return {
        success: false,
        message: `Branch '${branchName}' does not exist. Use createIfMissing=true to create.`
      };
    }

    // TODO: In Phase 2.3, add check for uncommitted changes
    // For now, we'll allow switching without validation

    // Update repository state
    const updatedRepo: Repository = {
      ...repo,
      currentBranch: branchName,
      head: targetBranch.head
    };

    await this.storage.repository.updateRepository(updatedRepo);

    // Update HEAD reference (only if target branch has commits)
    if (targetBranch.head) {
      await this.storage.repository.setRef('HEAD', targetBranch.head);
    }

    return {
      success: true,
      message: `Switched to branch '${branchName}'`,
      branch: targetBranch,
      previousBranch: currentBranch
    };
  }

  /**
   * List all branches with status information
   */
  async listBranches(options: {
    verbose?: boolean;      // Include commit details
    includeStats?: boolean; // Include ahead/behind statistics
  } = {}): Promise<BranchListItem[]> {
    
    const repo = await this.storage.repository.getRepository();
    const branches = await this.storage.commits.getBranches();
    const currentBranchName = repo?.currentBranch || 'main';

    const branchList: BranchListItem[] = [];

    for (const branch of branches) {
      const branchItem: BranchListItem = {
        ...branch,
        current: branch.name === currentBranchName,
        ahead: 0,
        behind: 0
      };

      if (options.verbose || options.includeStats) {
        // Get last commit for this branch
        const lastCommit = await this.storage.commits.retrieve(branch.head);
        if (lastCommit) {
          branchItem.lastCommit = lastCommit;
        }

        // Calculate ahead/behind stats relative to main branch
        if (options.includeStats && branch.name !== 'main') {
          const stats = await this.calculateBranchStats(branch.name, 'main');
          branchItem.ahead = stats.ahead;
          branchItem.behind = stats.behind;
        }
      }

      branchList.push(branchItem);
    }

    // Sort: current branch first, then alphabetically
    return branchList.sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Delete a branch with safety checks
   */
  async deleteBranch(
    branchName: string,
    options: {
      force?: boolean;        // Force delete even if not fully merged
      remote?: boolean;       // Delete remote branch (Phase 4 feature)
    } = {}
  ): Promise<BranchOperationResult> {
    
    const repo = await this.storage.repository.getRepository();
    if (!repo) {
      return {
        success: false,
        message: 'Repository not initialized'
      };
    }

    // Prevent deleting current branch
    if (repo.currentBranch === branchName) {
      return {
        success: false,
        message: `Cannot delete current branch '${branchName}'. Switch to another branch first.`
      };
    }

    // Prevent deleting default branch
    if (repo.config.defaultBranch === branchName) {
      return {
        success: false,
        message: `Cannot delete default branch '${branchName}'.`
      };
    }

    // Check if branch exists
    const branches = await this.storage.commits.getBranches();
    const targetBranch = branches.find(b => b.name === branchName);
    
    if (!targetBranch) {
      return {
        success: false,
        message: `Branch '${branchName}' does not exist.`
      };
    }

    // TODO: In Phase 2.2, add merge status check
    // For now, we'll allow deletion without merge validation unless force=false

    // Delete branch
    await this.storage.commits.deleteBranch(branchName);

    return {
      success: true,
      message: `Branch '${branchName}' deleted`,
      branch: targetBranch
    };
  }

  /**
   * Get current branch information
   */
  async getCurrentBranch(): Promise<Branch | null> {
    const repo = await this.storage.repository.getRepository();
    if (!repo) return null;

    const branches = await this.storage.commits.getBranches();
    return branches.find(b => b.name === repo.currentBranch) || null;
  }

  /**
   * Rename a branch
   */
  async renameBranch(
    oldName: string,
    newName: string,
    options: {
      force?: boolean;  // Force rename even if new name exists
    } = {}
  ): Promise<BranchOperationResult> {
    
    if (!this.isValidBranchName(newName)) {
      return {
        success: false,
        message: `Invalid branch name: ${newName}`
      };
    }

    // Check if old branch exists
    const branches = await this.storage.commits.getBranches();
    const oldBranch = branches.find(b => b.name === oldName);
    
    if (!oldBranch) {
      return {
        success: false,
        message: `Branch '${oldName}' does not exist`
      };
    }

    // Check if new name already exists
    const existingBranch = branches.find(b => b.name === newName);
    if (existingBranch && !options.force) {
      return {
        success: false,
        message: `Branch '${newName}' already exists. Use force=true to overwrite.`
      };
    }

    // Create new branch with same head
    const newBranch: Branch = {
      ...oldBranch,
      name: newName,
      created: new Date().toISOString()  // Update creation timestamp
    };

    await this.storage.commits.createBranch(newBranch);

    // Update repository if this was the current branch
    const repo = await this.storage.repository.getRepository();
    if (repo && repo.currentBranch === oldName) {
      const updatedRepo: Repository = {
        ...repo,
        currentBranch: newName
      };
      await this.storage.repository.updateRepository(updatedRepo);
    }

    // Delete old branch
    await this.storage.commits.deleteBranch(oldName);

    return {
      success: true,
      message: `Branch '${oldName}' renamed to '${newName}'`,
      branch: newBranch,
      previousBranch: oldName
    };
  }

  /**
   * Calculate branch statistics (ahead/behind commits)
   */
  private async calculateBranchStats(
    branchName: string, 
    baseBranchName: string
  ): Promise<{ ahead: number; behind: number }> {
    // TODO: Implement proper commit graph traversal in Phase 2.2
    // For now, return placeholder values
    return { ahead: 0, behind: 0 };
  }

  /**
   * Validate branch name according to Git naming rules
   */
  private isValidBranchName(name: string): boolean {
    // Git branch naming rules (simplified):
    // - Cannot be empty
    // - Cannot start with hyphen
    // - Cannot contain spaces or special characters except hyphen and underscore
    // - Cannot end with .lock
    
    if (!name || name.length === 0) return false;
    if (name.startsWith('-')) return false;
    if (name.endsWith('.lock')) return false;
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) return false;
    
    return true;
  }
}

/**
 * Convenience functions for common branch operations
 */
export async function createBranch(
  storage: StorageAdapter,
  name: string,
  options?: Parameters<BranchManager['createBranch']>[1]
): Promise<BranchOperationResult> {
  const manager = new BranchManager(storage);
  return manager.createBranch(name, options);
}

export async function switchBranch(
  storage: StorageAdapter,
  branchName: string,
  options?: Parameters<BranchManager['switchBranch']>[1]
): Promise<BranchOperationResult> {
  const manager = new BranchManager(storage);
  return manager.switchBranch(branchName, options);
}

export async function listBranches(
  storage: StorageAdapter,
  options?: Parameters<BranchManager['listBranches']>[0]
): Promise<BranchListItem[]> {
  const manager = new BranchManager(storage);
  return manager.listBranches(options);
}

export async function deleteBranch(
  storage: StorageAdapter,
  branchName: string,
  options?: Parameters<BranchManager['deleteBranch']>[1]
): Promise<BranchOperationResult> {
  const manager = new BranchManager(storage);
  return manager.deleteBranch(branchName, options);
}