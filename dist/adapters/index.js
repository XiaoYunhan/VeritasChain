/**
 * Storage Adapters Export
 *
 * Central export point for all storage adapters and interfaces.
 * Supports dependency injection pattern for clean architecture.
 */
// Local file system implementation
export { LocalStorageAdapter } from './local.js';
// Factory function for creating storage adapters
export function createStorageAdapter(config) {
    switch (config.type) {
        case 'local':
            return new LocalStorageAdapter(config);
        case 'blockchain':
            throw new Error('Blockchain storage not implemented yet (Phase 4-5)');
        case 'hybrid':
            throw new Error('Hybrid storage not implemented yet (Phase 4)');
        default:
            throw new Error(`Unsupported storage type: ${config.type}`);
    }
}
