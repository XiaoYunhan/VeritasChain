/**
 * Modifier Definitions
 *
 * Standardized context and modifier types to prevent spelling errors
 * and ensure consistency across all events.
 */
export interface TemporalModifier {
    when?: 'past' | 'present' | 'future' | 'ongoing';
    tense?: 'will' | 'did' | 'is' | 'was' | 'has been';
    duration?: string;
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'ongoing';
    effectiveFrom?: string;
    effectiveTo?: string;
}
export interface SpatialModifier {
    location?: string;
    region?: string;
    scope: 'local' | 'regional' | 'national' | 'global';
    jurisdiction?: string;
}
export interface MannerModifier {
    method?: string;
    style?: 'formal' | 'informal' | 'urgent' | 'routine';
    intensity?: 'low' | 'medium' | 'high';
    manner?: string;
}
export interface DegreeModifier {
    amount?: string;
    scale: 'small' | 'medium' | 'large' | 'massive';
    threshold?: string;
    percentage?: number;
}
export interface PurposeModifier {
    goal?: string;
    reason?: string;
    intention?: string;
    context?: string;
}
export interface ConditionalModifier {
    type: 'definite' | 'possibility' | 'necessity' | 'unless' | 'if' | 'when';
    condition?: string;
    probability?: number;
}
export interface CertaintyModifier {
    evidence: 'primary' | 'secondary' | 'reported' | 'rumored' | 'speculated' | 'confirmed' | 'official';
    reliability: 'low' | 'medium' | 'high';
    confidence?: never;
    volatility?: never;
    sourceScore?: never;
}
export interface LegalModifier {
    jurisdiction: string;
    effectiveDate: string;
    sunsetDate?: string;
    normForce: 'mandatory' | 'default' | 'advisory';
    exception?: string;
    amendedBy?: string;
    supersededBy?: string;
}
