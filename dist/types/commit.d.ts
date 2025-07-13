/**
 * Commit and Version Control Definitions
 *
 * Git-like commit structure for tracking changes to events,
 * entities, and actions with blockchain-ready architecture.
 */
export interface Commit {
    "@context": "https://schema.org/";
    "@type": "UpdateAction";
    "@id": string;
    timestamp: string;
    parents: string[];
    tree: string;
    author: string;
    message: string;
    changes: {
        events?: string[];
        entities?: string[];
        actions?: string[];
    };
    signature?: string;
    nonce?: number;
    branch?: string;
    tags?: string[];
}
export interface Tree {
    "@context": "https://schema.org/";
    "@type": "Collection";
    "@id": string;
    entries: {
        events: Record<string, string>;
        entities: Record<string, string>;
        actions: Record<string, string>;
        macroEvents?: Record<string, string>;
    };
    timestamp: string;
    parentTree?: string;
}
export interface Branch {
    name: string;
    head: string;
    created: string;
    author: string;
    description?: string;
}
export interface Repository {
    "@context": "https://schema.org/";
    "@type": "Dataset";
    "@id": string;
    name: string;
    description?: string;
    created: string;
    owner: string;
    head: string;
    currentBranch: string;
    config: {
        defaultBranch: string;
        allowForceUpdate: boolean;
        requireSignedCommits: boolean;
    };
}
