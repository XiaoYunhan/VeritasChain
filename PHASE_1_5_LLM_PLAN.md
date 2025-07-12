# Phase 1.5: LLM-Assisted Parsing Integration

## Overview
Add intelligent news text → structured event parsing using local/cloud LLMs while maintaining the core VeritasChain architecture and constraints.

## Design Constraints (CRITICAL)
1. **NO NEW RUNTIME DEPENDENCIES** - LLM integration must be optional/dev-only
2. **Adapter Pattern** - Abstract LLM providers for flexibility
3. **Fallback Support** - System works without LLM (manual mode)
4. **Type Safety** - All LLM outputs validated against our TypeScript types
5. **Confidence Integration** - LLM parsing confidence feeds into our (1-V)×E×S formula

## Architecture Design

### 1. LLM Provider Abstraction
```typescript
// src/parsing/interfaces.ts
interface LLMProvider {
  name: string;
  available(): Promise<boolean>;
  parseNewsText(text: string, context?: ParsingContext): Promise<ParsedEvent>;
  extractEntities(text: string): Promise<EntitySuggestion[]>;
  extractRelationships(entities: Entity[], text: string): Promise<RelationshipSuggestion[]>;
}

interface ParsedEvent {
  title: string;
  statement: Statement;
  modifiers: EventModifiers;
  relationships?: EventRelationship[];
  confidence: {
    parsing: number;        // 0-1 LLM confidence in parsing accuracy
    extraction: number;     // 0-1 confidence in entity/action extraction
  };
  metadata: {
    llmProvider: string;
    model: string;
    promptVersion: string;
    processingTime: number;
  };
}
```

### 2. Provider Implementations

#### Local LLM (Ollama/LM Studio)
```typescript
// src/parsing/providers/local.ts
class LocalLLMProvider implements LLMProvider {
  constructor(private config: {
    endpoint: string;      // http://localhost:11434 (Ollama)
    model: string;         // "llama3.1", "mistral", etc.
    timeout: number;       // 30s default
  }) {}

  async available(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async parseNewsText(text: string): Promise<ParsedEvent> {
    const prompt = this.buildPrompt(text);
    const response = await this.callOllama(prompt);
    return this.parseResponse(response);
  }

  private buildPrompt(text: string): string {
    return `
Extract structured information from this news text:
"${text}"

Return JSON with:
{
  "title": "concise headline",
  "subject": { "entity": "name", "type": "Corporation|Person|Government|etc" },
  "verb": { "action": "announces|acquires|reports|etc", "tense": "past|present|future" },
  "object": { "entity": "name", "type": "Product|Company|Amount|etc" },
  "modifiers": {
    "temporal": { "when": "past|present|future", "tense": "specific tense" },
    "degree": { "amount": "specific amounts/numbers", "scale": "small|medium|large" },
    "spatial": { "location": "where it happened" }
  },
  "confidence": 0.85
}
`;
  }
}
```

#### Cloud LLM Providers
```typescript
// src/parsing/providers/openai.ts
class OpenAIProvider implements LLMProvider {
  constructor(private apiKey: string, private model = "gpt-4o-mini") {}
  
  async parseNewsText(text: string): Promise<ParsedEvent> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: PARSING_SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        response_format: { type: 'json_object' }
      })
    });
    
    return this.parseResponse(await response.json());
  }
}

// Similar for Claude (Anthropic) and Gemini (Google)
```

### 3. Parser Orchestrator
```typescript
// src/parsing/parser.ts
class NewsParser {
  private providers: LLMProvider[] = [];
  private fallbackMode = true;

  constructor(config: ParserConfig) {
    this.initializeProviders(config);
  }

  async parseNewsText(text: string): Promise<ParsedEvent | null> {
    // Try each provider in priority order
    for (const provider of this.providers) {
      if (await provider.available()) {
        try {
          const result = await provider.parseNewsText(text);
          
          // Validate against our types
          if (this.validateParsedEvent(result)) {
            return result;
          }
        } catch (error) {
          console.warn(`Provider ${provider.name} failed:`, error);
          continue;
        }
      }
    }

    if (this.fallbackMode) {
      console.log('All LLM providers failed, falling back to manual mode');
      return null; // User must create manually
    }

    throw new Error('No LLM providers available and fallback disabled');
  }

  private validateParsedEvent(event: ParsedEvent): boolean {
    // TypeScript runtime validation
    return (
      typeof event.title === 'string' &&
      event.statement?.type === 'SVO' &&
      typeof event.statement.subjectRef === 'string' &&
      // ... complete validation
    );
  }
}
```

### 4. Integration with Existing Repository
```typescript
// src/repository/event.ts - Enhanced
class EventRepository {
  constructor(
    private storage: StorageAdapter,
    private parser?: NewsParser  // Optional LLM parser
  ) {}

  // New method: Parse and create from text
  async createEventFromText(
    text: string, 
    metadata: EventMetadata,
    commitHash: string
  ): Promise<Event> {
    
    if (this.parser) {
      // Try LLM parsing first
      const parsed = await this.parser.parseNewsText(text);
      
      if (parsed) {
        // Convert LLM output to our Event structure
        const event = await this.convertParsedToEvent(parsed, metadata, commitHash);
        
        // Integrate LLM confidence into our formula
        const volatility = 0.0; // New event, no history
        const evidence = this.calculateEvidenceFromLLM(parsed.confidence);
        const source = this.getSourceFactor(metadata.source.type);
        
        event.metadata.confidence = (1 - volatility) * evidence * source;
        
        return event;
      }
    }

    // Fallback: Manual creation (existing behavior)
    throw new Error('LLM parsing failed, manual event creation required');
  }

  private calculateEvidenceFromLLM(llmConfidence: { parsing: number, extraction: number }): number {
    // Convert LLM confidence to evidence factor
    const combined = (llmConfidence.parsing + llmConfidence.extraction) / 2;
    
    // Map to our evidence scale (0.6-1.0)
    return 0.6 + (combined * 0.4);
  }
}
```

## Configuration Strategy

### Environment-Based Configuration
```typescript
// .env (not committed)
# Local LLM (preferred)
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3.1

# Cloud fallbacks
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=...
GEMINI_API_KEY=...

# Parser settings
LLM_TIMEOUT=30000
LLM_FALLBACK_ENABLED=true
```

### Config File
```typescript
// config/parsing.json
{
  "providers": [
    {
      "type": "ollama",
      "priority": 1,
      "config": {
        "endpoint": "http://localhost:11434",
        "model": "llama3.1",
        "timeout": 30000
      }
    },
    {
      "type": "openai", 
      "priority": 2,
      "config": {
        "model": "gpt-4o-mini",
        "maxTokens": 1000
      }
    }
  ],
  "fallback": true
}
```

## Implementation Plan

### Step 1: Core Interfaces (Week 1)
- [ ] Define LLMProvider interface
- [ ] Create ParsedEvent types
- [ ] Add validation utilities

### Step 2: Local LLM Integration (Week 2)  
- [ ] Implement OllamaProvider
- [ ] Create prompt templates
- [ ] Add response parsing/validation

### Step 3: Cloud Provider Integration (Week 2)
- [ ] Implement OpenAI, Claude, Gemini providers
- [ ] Add API key management
- [ ] Implement rate limiting/retry logic

### Step 4: Parser Orchestrator (Week 3)
- [ ] Build provider selection logic
- [ ] Add fallback mechanisms
- [ ] Integrate with EventRepository

### Step 5: Testing & Validation (Week 3-4)
- [ ] Unit tests for each provider
- [ ] Integration tests with real LLMs
- [ ] Accuracy validation against manual parsing
- [ ] Performance benchmarks

## Testing Strategy

### 1. Mock LLM Testing
```typescript
// tests/unit/parsing/mock-provider.test.ts
class MockLLMProvider implements LLMProvider {
  async parseNewsText(text: string): Promise<ParsedEvent> {
    return {
      title: "Mock Event",
      statement: { type: 'SVO', ... },
      confidence: { parsing: 0.9, extraction: 0.8 }
    };
  }
}

test('EventRepository integrates LLM parsing', async () => {
  const mockParser = new NewsParser([new MockLLMProvider()]);
  const repo = new EventRepository(storage, mockParser);
  
  const event = await repo.createEventFromText(
    "Apple acquires startup for $1B",
    metadata,
    commitHash
  );
  
  expect(event.title).toBe("Mock Event");
  expect(event.metadata.confidence).toBeGreaterThan(0.7);
});
```

### 2. Real LLM Integration Tests
```typescript
// tests/integration/parsing/real-llm.test.ts (requires API keys)
describe('Real LLM Integration', () => {
  test('Ollama parsing accuracy', async () => {
    const provider = new OllamaProvider({
      endpoint: 'http://localhost:11434',
      model: 'llama3.1'
    });
    
    if (await provider.available()) {
      const result = await provider.parseNewsText(SAMPLE_NEWS_TEXT);
      expect(result.statement.type).toBe('SVO');
      expect(result.confidence.parsing).toBeGreaterThan(0.5);
    } else {
      test.skip('Ollama not available');
    }
  });
});
```

## Benefits

1. **Optional Enhancement**: System works without LLM (maintains Phase 1 functionality)
2. **Local-First**: Prefers on-device models (privacy, cost)
3. **Cloud Fallback**: Ensures availability when local models unavailable
4. **Type Safety**: All LLM outputs validated against our strict TypeScript types
5. **Confidence Integration**: LLM confidence feeds into our transparent (1-V)×E×S formula
6. **Provider Flexibility**: Easy to add new LLM providers or switch models

## Deployment Strategy

### Development
```bash
# Install Ollama locally
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1

# Run with LLM parsing
npm run dev
```

### Production
```bash
# Environment variables for cloud providers
export OPENAI_API_KEY="..."
export LLM_FALLBACK_ENABLED=true

# Graceful degradation if no LLM available
npm start
```

This maintains CLAUDE.md constraints while adding intelligent parsing capabilities that enhance but don't replace the core version control system.