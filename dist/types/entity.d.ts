/**
 * Entity and Action Object Definitions
 *
 * These represent the building blocks of our SVO statements.
 * All objects are content-addressed and version-controlled.
 */
export interface EntityObject {
    "@context": "https://schema.org/";
    "@type": "Thing";
    "@id": string;
    logicalId: string;
    version: string;
    previousVersion?: string;
    commitHash: string;
    label: string;
    description?: string;
    dataType?: {
        custom?: string;
        description?: string;
    };
    properties?: Record<string, unknown>;
}
export interface ActionObject {
    "@context": "https://schema.org/";
    "@type": "Action";
    "@id": string;
    logicalId: string;
    version: string;
    previousVersion?: string;
    commitHash: string;
    label: string;
    description?: string;
    category?: string;
    deonticType?: 'shall' | 'may' | 'must-not' | 'liable-for' | 'entitled-to' | 'should' | 'permitted' | 'prohibited';
    properties?: Record<string, unknown>;
}
