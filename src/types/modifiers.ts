/**
 * Modifier Definitions
 * 
 * Standardized context and modifier types to prevent spelling errors
 * and ensure consistency across all events.
 */

export interface TemporalModifier {
  when?: 'past' | 'present' | 'future' | 'ongoing';
  tense?: 'will' | 'did' | 'is' | 'was' | 'has been';
  duration?: string;  // ISO 8601 duration or free text
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'ongoing';
  effectiveFrom?: string;  // ISO 8601 datetime
  effectiveTo?: string;    // ISO 8601 datetime
}

export interface SpatialModifier {
  location?: string;   // Specific location
  region?: string;     // General region
  scope: 'local' | 'regional' | 'national' | 'global';
  jurisdiction?: string;  // Legal jurisdiction
}

export interface MannerModifier {
  method?: string;     // How something is done
  style?: 'formal' | 'informal' | 'urgent' | 'routine';
  intensity?: 'low' | 'medium' | 'high';
  manner?: string;     // General manner description
}

export interface DegreeModifier {
  amount?: string;     // "$10B", "50%", "100 units"
  scale: 'small' | 'medium' | 'large' | 'massive';
  threshold?: string;  // "above $1B", "below 20%"
  percentage?: number; // 0-100
}

export interface PurposeModifier {
  goal?: string;       // Primary objective
  reason?: string;     // Why this happened
  intention?: string;  // Intent behind action
  context?: string;    // Background context
}

export interface ConditionalModifier {
  type: 'definite' | 'possibility' | 'necessity' | 'unless' | 'if' | 'when';
  condition?: string;  // Condition description
  probability?: number; // 0-1
}

export interface CertaintyModifier {
  evidence: 'primary' | 'secondary' | 'reported' | 'rumored' | 'speculated' | 'confirmed' | 'official';
  reliability: 'low' | 'medium' | 'high';
  
  // NEVER set these manually - always calculated
  confidence?: never;   // Calculated: (1-V) × E × S
  volatility?: never;   // Calculated from change history
  sourceScore?: never;  // Calculated from source.type
}

// PHASE 1: Legal-specific modifiers for normative clauses (kind='norm')
export interface LegalModifier {
  jurisdiction: string;         // "Singapore", "New York", "EU"
  effectiveDate: string;        // ISO 8601 datetime when norm becomes active
  sunsetDate?: string;          // ISO 8601 datetime when norm expires
  normForce: 'mandatory' | 'default' | 'advisory';  // Legal strength
  exception?: string;           // Exceptions to the norm
  amendedBy?: string;          // @id of amending norm
  supersededBy?: string;       // @id of superseding norm
}