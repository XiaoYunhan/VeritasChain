# VeritasChain News Translation Examples

This document shows how real-world news events are translated into VeritasChain's event management language.

## ⚠️ CRITICAL UPDATE NOTICE

**Examples 1-2 have been updated to Phase 1 specifications. Examples 3+ still need updating for:**

1. **Missing `kind: "fact"`** - All news events should specify event type
2. **Manual confidence setting FORBIDDEN** - All `confidence: 0.xx` lines violate core rules
3. **Missing AUTO-CALCULATED comments** - Should show confidence formula calculation  
4. **Non-standard modifier fields** - Remove `phase`, `goals`, `impact`, etc. that don't match interfaces
5. **Missing Event interface fields** - Add `"@context"`, `"@type"`, proper metadata structure

**Correct Pattern (see Examples 1-2):**
```typescript
kind: "fact",  // Always specify for news events
certainty: {
  // AUTO-CALCULATED: confidence = (1-V) × E × S
  // V=0.05 (low volatility), E=0.9 (evidence quality), S=0.9 (NewsAgency)
  // confidence = (1-0.05) × 0.9 × 0.9 = 0.77
  evidence: "reported",
  reliability: "high"
  // confidence field is NEVER set manually
}
```

---

## 1. JPMorgan Tells Fintechs They Have to Pay Up for Customer Data

**Original News:**
> JPMorgan Chase & Co. has told financial-technology companies that it will start charging fees amounting to hundreds of millions of dollars for access to their customers' bank account information – a move that threatens to upend the industry's business models.

**Core Statement:** `JPMorgan CHARGES Fintechs FOR DataAccess`

**Key Entities:**
- JPMorgan (Company)
- Fintechs (CompanyGroup) 
- CustomerData (DataAsset)
- Fees (Currency: $100M+)

**Actions:** charges, threatens, upends

**VeritasChain Event Structure:**
```typescript
{
  "@context": "https://schema.org/",
  "@type": "Event",
  "@id": "sha256:d4e5f6789abc123def456789abcdef0123456789abcdef0123456789abcdef01",
  logicalId: "jpmorgan-fintech-fees-001",
  version: "1.0",
  commitHash: "sha256:234def456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
  
  // Event kind - fact (news event) vs norm (legal clause)
  kind: "fact",
  
  title: "JPMorgan Charges Fintechs for Data Access",
  dateOccurred: "2025-01-15T09:00:00Z",
  dateRecorded: "2025-01-15T10:30:00Z",
  statement: {
    type: 'SVO',
    subjectRef: "sha256:e5f6789abc234def456789abcdef0123456789abcdef0123456789abcdef0123",
    verbRef: "sha256:f6789abc345def456789abcdef0123456789abcdef0123456789abcdef012345",
    objectRef: "sha256:789abc456def456789abcdef0123456789abcdef0123456789abcdef01234567"
  },
  modifiers: {
    temporal: { when: "future", tense: "will" },
    purpose: { reason: "customer data access fees" },
    degree: { amount: "hundreds of millions USD", scale: "massive" },
    manner: { method: "fee implementation", style: "aggressive" },
    certainty: {
      // AUTO-CALCULATED: confidence = (1-V) × E × S
      // V=0.05 (stable), E=1.0 (official announcement), S=0.9 (NewsAgency)
      // confidence = (1-0.05) × 1.0 × 0.9 = 0.855
      evidence: "official",
      reliability: "high"
    }
  },
  relationships: [
    {
      type: "threatens",
      target: "sha256:abc456789def456789abcdef0123456789abcdef0123456789abcdef0123456789",
      strength: 0.9,
      description: "May upend industry business models"
    }
  ],
  metadata: {
    source: { 
      name: "Financial Times", 
      type: "NewsAgency",
      url: "https://ft.com/jpmorgan-fintech-fees"
    },
    author: "finance.reporter@ft.com",
    
    // AUTO-CALCULATED fields - never set manually
    confidence: null,  // Calculated: (1-V) × E × S = (1-0.05) × 1.0 × 0.9 = 0.855
    volatility: null,  // Calculated from change history
    sourceScore: null  // Calculated from source.type (NewsAgency = 0.9)
  }
}
```

---

## 2. US, India in Talks on Trade Deal That May Cut Tariff Below 20%

**Original News:**
> The US is working toward an interim trade deal with India that may reduce its proposed tariffs to below 20%, putting the South Asian nation in a favorable position against its peers in the region.

**Core Statement:** `US NEGOTIATES TradeDeal WITH India`

**Key Entities:**
- US (Country)
- India (Country)
- TradeDeal (Agreement)
- Tariffs (Policy: 20%)

**Actions:** negotiates, reduces, positions

**VeritasChain Event Structure:**
```typescript
{
  "@context": "https://schema.org/",
  "@type": "Event",
  "@id": "sha256:e5f6789abc234def456789abcdef0123456789abcdef0123456789abcdef0123",
  logicalId: "us-india-trade-negotiations-001",
  version: "1.0",
  commitHash: "sha256:345def456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
  
  kind: "fact",  // News event
  
  title: "US-India Trade Deal Negotiations",
  dateOccurred: "2025-01-15T11:00:00Z",
  dateRecorded: "2025-01-15T12:00:00Z",
  statement: {
    type: 'IMPLIES',
    operands: [
      { 
        type: 'SVO', 
        subjectRef: "sha256:789abc345def456789abcdef0123456789abcdef0123456789abcdef01234567", 
        verbRef: "sha256:abc345def456789abcdef0123456789abcdef0123456789abcdef0123456789ab", 
        objectRef: "sha256:345def456789abcdef0123456789abcdef0123456789abcdef0123456789abcd" 
      },
      { 
        type: 'SVO', 
        subjectRef: "sha256:def456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01", 
        verbRef: "sha256:456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123", 
        objectRef: "sha256:56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234" 
      }
    ]
  },
  modifiers: {
    temporal: { when: "present", tense: "is" },
    condition: { type: "possibility", condition: "interim deal success" },
    degree: { threshold: "below 20%", scale: "medium" },
    spatial: { region: "South Asia", scope: "regional" },
    purpose: { goal: "favorable trade position vs regional peers" },
    certainty: {
      // AUTO-CALCULATED: confidence = (1-V) × E × S  
      // V=0.15 (negotiations volatile), E=0.8 (reported), S=0.9 (NewsAgency)
      // confidence = (1-0.15) × 0.8 × 0.9 = 0.612
      evidence: "reported",
      reliability: "medium"
    }
  },
  relationships: [
    {
      type: "partOf",
      target: "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345",
      strength: 0.8,
      description: "Part of broader US trade strategy"
    }
  ],
  metadata: {
    source: { 
      name: "Reuters", 
      type: "NewsAgency",
      url: "https://reuters.com/us-india-trade"
    },
    author: "trade.reporter@reuters.com",
    
    // AUTO-CALCULATED fields - never set manually
    confidence: null,  // Calculated: (1-V) × E × S = (1-0.15) × 0.8 × 0.9 = 0.612
    volatility: null,  // Calculated from change history
    sourceScore: null  // Calculated from source.type (NewsAgency = 0.9)
  }
}
```

---

## 3. Kraft Heinz Is Preparing to Break Itself Up

**Original News:**
> Kraft Heinz Co. is preparing to break itself up, as the US food company looks to combat shifting consumer sentiment and reverse a sagging share price.

**Core Statement:** `KraftHeinz RESTRUCTURES Company`

**Key Entities:**
- KraftHeinz (Company)
- Company (Corporation)
- SharePrice (Financial)
- ConsumerSentiment (Market)

**Actions:** restructures, combats, reverses

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:f6789abc345def456789abcdef0123456789abcdef0123456789abcdef012345",
  logicalId: "kraft-heinz-restructuring-001",
  version: "1.0",
  commitHash: "sha256:456def456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
  title: "Kraft Heinz Corporate Restructuring",
  dateOccurred: "2025-01-15T08:00:00Z",
  dateRecorded: "2025-01-15T09:30:00Z",
  statement: {
    type: 'AND',
    operands: [
      { 
        type: 'SVO', 
        subjectRef: "sha256:6789abc456def456789abcdef0123456789abcdef0123456789abcdef0123456", 
        verbRef: "sha256:789abc567def456789abcdef0123456789abcdef0123456789abcdef01234567", 
        objectRef: "sha256:abc567def456789abcdef0123456789abcdef0123456789abcdef0123456789a" 
      },
      { 
        type: 'SVO', 
        subjectRef: "sha256:6789abc456def456789abcdef0123456789abcdef0123456789abcdef0123456", 
        verbRef: "sha256:bcd567def456789abcdef0123456789abcdef0123456789abcdef0123456789a", 
        objectRef: "sha256:cd567def456789abcdef0123456789abcdef0123456789abcdef0123456789ab" 
      }
    ]
  },
  modifiers: {
    temporal: { phase: "preparing", tense: "will", when: "future" },
    purpose: { 
      goals: ["combat shifting consumer sentiment", "reverse sagging share price"],
      primary: "adapt to market changes"
    },
    manner: { method: "corporate breakup", style: "formal", type: "restructuring" },
    degree: { scale: "large", impact: "significant organizational change" },
    certainty: {
      confidence: 0.75,
      source: "Corporate sources",
      evidence: "reported",
      reliability: "medium"
    }
  },
  relationships: [
    {
      type: "causedBy",
      target: "sha256:d567def456789abcdef0123456789abcdef0123456789abcdef0123456789abc",
      strength: 0.9,
      description: "Response to changing consumer preferences"
    },
    {
      type: "causedBy", 
      target: "sha256:567def456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
      strength: 0.8,
      description: "Response to falling stock value"
    }
  ],
  metadata: {
    source: { 
      name: "Wall Street Journal", 
      type: "NewsAgency",
      url: "https://wsj.com/kraft-heinz-breakup"
    },
    author: "corporate.reporter@wsj.com",
    version: "1.0",
    datePublished: "2025-01-15T09:00:00Z"
  }
}
```

---

## 4. Roblox Game-Buying Frenzy Is Turning Teens Into Millionaires

**Original News:**
> Game service spawns a busy aftermarket for the most-popular titles.

**Core Statement:** `RobloxEcosystem CREATES Millionaires FROM Teens`

**Key Entities:**
- RobloxEcosystem (Platform)
- Teens (PersonGroup)
- Millionaires (WealthStatus)
- Aftermarket (Market)

**Actions:** creates, transforms, spawns

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:789abc456def456789abcdef0123456789abcdef0123456789abcdef01234567",
  logicalId: "roblox-teen-millionaires-001",
  version: "1.0",
  commitHash: "sha256:567def456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
  title: "Roblox Creates Teen Millionaires",
  dateOccurred: "2025-01-14T00:00:00Z",
  dateRecorded: "2025-01-15T10:15:00Z",
  statement: {
    type: 'SVO',
    subjectRef: "sha256:67def456789abcdef0123456789abcdef0123456789abcdef0123456789abcde",
    verbRef: "sha256:7def456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    objectRef: "sha256:ef456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"
  },
  modifiers: {
    temporal: { when: "present", tense: "is", duration: "ongoing trend", frequency: "frequent" },
    manner: { 
      method: "game-buying frenzy", 
      mechanism: "aftermarket trading",
      style: "informal",
      type: "wealth creation"
    },
    degree: { 
      outcome: "millionaire status",
      scale: "massive",
      intensity: "extreme"
    },
    spatial: { scope: "global" },
    certainty: {
      confidence: 0.8,
      source: "Market analysis",
      evidence: "confirmed",
      reliability: "high"
    }
  },
  relationships: [
    {
      type: "causedBy",
      target: "sha256:f456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01",
      strength: 0.95,
      description: "Enabled by busy aftermarket for popular titles"
    },
    {
      type: "enables",
      target: "sha256:456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012",
      strength: 0.85,
      description: "Creates new wealth opportunities for young developers"
    }
  ],
  metadata: {
    source: { 
      name: "Bloomberg", 
      type: "NewsAgency",
      url: "https://bloomberg.com/roblox-millionaires"
    },
    author: "tech.reporter@bloomberg.com",
    version: "1.0",
    datePublished: "2025-01-15T10:00:00Z"
  }
}
```

---

## 5. Delta Strips Engines Off New Airbus Jets to Overcome US Shortage

**Original News:**
> Delta Air Lines Inc. has been cannibalizing new Airbus SE jets in Europe by stripping off their engines and using them to get grounded planes in the US back into service, as it seeks to overcome a shortage and avoid aircraft import tariffs.

**Core Statement:** `Delta CANNIBALIZES AirbusJets FOR EngineShortage`

**Key Entities:**
- Delta (Airline)
- AirbusJets (Aircraft)
- Engines (Component)
- GroundedPlanes (AssetGroup)

**Actions:** cannibalizes, strips, overcomes

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:abc456789def456789abcdef0123456789abcdef0123456789abcdef0123456789",
  logicalId: "delta-engine-cannibalization-001",
  version: "1.0",
  commitHash: "sha256:678def456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
  title: "Delta Cannibalizes Jets for Engine Parts",
  dateOccurred: "2025-01-10T00:00:00Z",
  dateRecorded: "2025-01-15T11:45:00Z",
  statement: {
    type: 'IMPLIES',
    operands: [
      { 
        type: 'SVO', 
        subjectRef: "sha256:56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123", 
        verbRef: "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234", 
        objectRef: "sha256:789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345" 
      },
      { 
        type: 'SVO', 
        subjectRef: "sha256:89abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456", 
        verbRef: "sha256:9abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567", 
        objectRef: "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345678" 
      }
    ]
  },
  modifiers: {
    temporal: { when: "present", tense: "has been", phase: "continuing" },
    spatial: { 
      from: "Europe", 
      to: "United States",
      scope: "international"
    },
    purpose: { 
      primary: "overcome engine shortage", 
      secondary: "avoid aircraft import tariffs",
      goals: ["restore fleet capacity", "minimize costs"]
    },
    manner: { 
      method: "aircraft cannibalization",
      type: "operational workaround",
      style: "aggressive"
    },
    degree: { scale: "large", impact: "significant fleet impact" },
    certainty: {
      confidence: 0.9,
      source: "Delta operations",
      evidence: "confirmed",
      reliability: "high"
    }
  },
  relationships: [
    {
      type: "causedBy",
      target: "sha256:bcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      strength: 0.95,
      description: "Direct response to engine shortage"
    },
    {
      type: "prevents",
      target: "sha256:cdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789a",
      strength: 0.8,
      description: "Avoids import tariffs on full aircraft"
    }
  ],
  metadata: {
    source: { 
      name: "Aviation Week", 
      type: "NewsAgency",
      url: "https://aviationweek.com/delta-engine-shortage"
    },
    author: "aviation.reporter@aviationweek.com",
    version: "1.0",
    datePublished: "2025-01-15T11:00:00Z"
  }
}
```

---

## 6. Big Banks Are Tired of Losing Recruits to Private Equity

**Original News:**
> JPMorgan Chase & Co. bosses grew curious last summer as they clocked an unusual number of absences at the training sessions that kicked off their ultra-competitive junior analyst program.

**Core Statement:** `BigBanks LOSE TalentPool TO PrivateEquity`

**Key Entities:**
- BigBanks (IndustryGroup)
- TalentPool (PersonGroup)
- PrivateEquity (Industry)
- JPMorgan (Company)

**Actions:** loses, migrates, competes

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:def789abc123def456789abcdef0123456789abcdef0123456789abcdef012345",
  logicalId: "banking-talent-migration-001",
  version: "1.0",
  commitHash: "sha256:789def456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
  title: "Banking Talent Migration to Private Equity",
  dateOccurred: "2024-07-01T00:00:00Z",
  dateRecorded: "2025-01-15T13:00:00Z",
  statement: {
    type: 'SVO',
    subjectRef: "sha256:ef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
    verbRef: "sha256:f0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
    objectRef: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abc"
  },
  modifiers: {
    temporal: { 
      when: "past",
      tense: "was",
      pattern: "ongoing", 
      context: "summer training season",
      frequency: "frequent"
    },
    manner: { 
      type: "talent migration", 
      intensity: "high",
      method: "competitive recruiting"
    },
    degree: { 
      impact: "industry-wide concern",
      scale: "significant",
      intensity: "unusual number"
    },
    spatial: { scope: "national" },
    certainty: {
      confidence: 0.85,
      source: "Banking industry sources",
      evidence: "confirmed",
      reliability: "high"
    }
  },
  relationships: [
    {
      type: "relatedTo",
      target: "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
      strength: 0.9,
      description: "Evidenced by JPMorgan training absences"
    },
    {
      type: "threatens",
      target: "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcde",
      strength: 0.8,
      description: "Threatens traditional banking recruitment"
    }
  ],
  metadata: {
    source: { 
      name: "Financial Times", 
      type: "NewsAgency",
      url: "https://ft.com/banking-talent-private-equity"
    },
    author: "banking.reporter@ft.com",
    version: "1.0",
    datePublished: "2025-01-15T12:30:00Z"
  }
}
```

---

## 7. Zara Billionaire Ortega Buys Hotel in Paris for $113 Million

**Original News:**
> Fashion billionaire Amancio Ortega bought Hotel Banke in Paris for €97 million ($113 million), the Zara brand founder's second property acquisition in the French city in the past year.

**Core Statement:** `Ortega ACQUIRES HotelBanke FOR $113M`

**Key Entities:**
- Ortega (Person: Billionaire)
- HotelBanke (Property)
- Paris (City)
- $113M (Currency)

**Actions:** acquires, invests, expands

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:efg123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
  logicalId: "ortega-hotel-acquisition-001",
  version: "1.0",
  commitHash: "sha256:890def456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
  title: "Ortega Acquires Paris Hotel for $113M",
  dateOccurred: "2025-01-10T14:00:00Z",
  dateRecorded: "2025-01-15T14:00:00Z",
  statement: {
    type: 'SVO',
    subjectRef: "sha256:3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    verbRef: "sha256:acquires-action456def789abc123def456789abcdef0123456789abcdef01",
    objectRef: "sha256:56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01"
  },
  modifiers: {
    temporal: { 
      when: "past",
      tense: "did",
      context: "second acquisition this year",
      frequency: "occasional"
    },
    spatial: { 
      location: "Paris, France",
      scope: "international"
    },
    degree: { 
      amount: "€97M ($113M)",
      scale: "large",
      intensity: "significant"
    },
    manner: { 
      type: "real estate expansion",
      method: "direct acquisition",
      style: "formal"
    },
    purpose: {
      primary: "real estate portfolio expansion",
      goal: "diversify investments"
    },
    certainty: {
      confidence: 0.95,
      source: "Public transaction records",
      evidence: "official",
      reliability: "verified"
    }
  },
  relationships: [
    {
      type: "follows",
      target: "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012",
      strength: 0.9,
      description: "Second acquisition in Paris within one year"
    },
    {
      type: "partOf",
      target: "sha256:789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123",
      strength: 0.85,
      description: "Part of broader real estate investment strategy"
    }
  ],
  metadata: {
    source: { 
      name: "Reuters", 
      type: "NewsAgency",
      url: "https://reuters.com/ortega-paris-hotel"
    },
    author: "realestate.reporter@reuters.com",
    version: "1.0",
    datePublished: "2025-01-15T13:30:00Z"
  }
}
```

---

## 8. Ukraine Spy Chief Says 40% of Russian Ammunition Is North Korean

**Original News:**
> North Korea is now supplying as much as 40% of Russia's ammunition for the war in Ukraine as the partnership between Pyongyang and Moscow deepens.

**Core Statement:** `NorthKorea SUPPLIES RussianAmmunition AT 40%`

**Key Entities:**
- NorthKorea (Country)
- Russia (Country)
- Ammunition (MilitaryAsset)
- Ukraine (ConflictZone)

**Actions:** supplies, supports, deepens

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:fgh234567890abcdef0123456789abcdef0123456789abcdef0123456789ab",
  logicalId: "north-korea-russia-ammunition-001",
  version: "1.0",
  commitHash: "sha256:abcdef456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
  title: "North Korea Supplies 40% of Russian Ammunition",
  dateOccurred: "2025-01-01T00:00:00Z",
  dateRecorded: "2025-01-15T15:00:00Z",
  statement: {
    type: 'AND',
    operands: [
      { 
        type: 'SVO', 
        subjectRef: "sha256:89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234", 
        verbRef: "sha256:9abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345", 
        objectRef: "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456" 
      },
      { 
        type: 'EQ', 
        operands: [
          { 
            type: 'SVO', 
            subjectRef: "sha256:bcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567", 
            verbRef: "sha256:equals-action789abc456def123abc456def789abc456def123abc456de", 
            objectRef: "sha256:def0123456789abcdef0123456789abcdef0123456789abcdef0123456789" 
          }
        ]
      }
    ]
  },
  modifiers: {
    temporal: { 
      when: "present",
      tense: "is",
      timeframe: "current ongoing",
      frequency: "frequent"
    },
    spatial: { 
      context: "Ukraine war theater",
      scope: "international"
    },
    degree: {
      amount: "40%",
      scale: "large",
      threshold: "significant portion"
    },
    certainty: { 
      source: "Ukraine intelligence", 
      confidence: 0.8,
      evidence: "reported",
      reliability: "medium"
    }
  },
  relationships: [
    {
      type: "causedBy",
      target: "sha256:ef0123456789abcdef0123456789abcdef0123456789abcdef0123456789a",
      strength: 0.95,
      description: "Direct result of ongoing conflict"
    },
    {
      type: "relatedTo",
      target: "sha256:f0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
      strength: 0.9,
      description: "Evidence of deepening partnership"
    }
  ],
  metadata: {
    source: { 
      name: "BBC", 
      type: "NewsAgency",
      url: "https://bbc.com/ukraine-north-korea-ammunition"
    },
    author: "defense.correspondent@bbc.com",
    version: "1.0",
    datePublished: "2025-01-15T14:30:00Z"
  }
}
```

---

## 9. Performance Food Draws Takeover Interest From US Foods

**Original News:**
> Performance Food Group Co. has attracted takeover interest from US Foods Holding Corp., a potential deal that would create a food distribution company with combined sales of roughly $100 billion.

**Core Statement:** `USFoods TARGETS PerformanceFood FOR $100B Merger`

**Key Entities:**
- USFoods (Company)
- PerformanceFood (Company)
- $100B (Currency)
- FoodDistribution (Industry)

**Actions:** targets, merges, creates

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:ghi345678901abcdef0123456789abcdef0123456789abcdef0123456789ab",
  logicalId: "us-foods-performance-takeover-001",
  version: "1.0",
  commitHash: "sha256:bcddef456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
  title: "US Foods Targets Performance Food Takeover",
  dateOccurred: "2025-01-12T00:00:00Z",
  dateRecorded: "2025-01-15T16:00:00Z",
  statement: {
    type: 'IMPLIES',
    operands: [
      { 
        type: 'SVO', 
        subjectRef: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abc", 
        verbRef: "sha256:acquires-action456def789abc123def456789abcdef0123456789abcdef01", 
        objectRef: "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd" 
      },
      { 
        type: 'SVO', 
        subjectRef: "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcde", 
        verbRef: "sha256:3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", 
        objectRef: "sha256:456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0" 
      }
    ]
  },
  modifiers: {
    temporal: { 
      when: "future",
      tense: "would",
      phase: "potential"
    },
    condition: { 
      type: "potential", 
      certainty: 0.6,
      condition: "successful acquisition negotiations"
    },
    degree: { 
      scale: "$100B combined sales",
      amount: "$100 billion",
      intensity: "massive"
    },
    manner: { 
      type: "takeover acquisition",
      method: "corporate merger",
      style: "aggressive"
    },
    purpose: {
      goal: "create dominant food distribution company",
      primary: "market consolidation"
    },
    certainty: {
      confidence: 0.6,
      source: "Industry sources",
      evidence: "reported",
      reliability: "medium"
    }
  },
  relationships: [
    {
      type: "partOf",
      target: "sha256:56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01",
      strength: 0.8,
      description: "Part of broader industry consolidation trend"
    }
  ],
  metadata: {
    source: { 
      name: "Wall Street Journal", 
      type: "NewsAgency",
      url: "https://wsj.com/us-foods-performance-takeover"
    },
    author: "ma.reporter@wsj.com",
    version: "1.0",
    datePublished: "2025-01-15T15:30:00Z"
  }
}
```

---

## 10. Rubio Says Xi-Trump Summit Likely After Meeting China Envoy

**Original News:**
> US Secretary of State Marco Rubio said a summit between President Donald Trump and Chinese leader Xi Jinping is likely after the top diplomats from the two countries met in Malaysia.

**Core Statement:** `Rubio PREDICTS XiTrumpSummit AFTER DiplomaticMeeting`

**Key Entities:**
- Rubio (Person: Secretary)
- XiTrumpSummit (Event)
- China (Country)
- Malaysia (Country)

**Actions:** predicts, facilitates, enables

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:hij456789012abcdef0123456789abcdef0123456789abcdef0123456789ab",
  logicalId: "rubio-xi-trump-summit-prediction-001",
  version: "1.0",
  commitHash: "sha256:cdedef456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
  title: "Rubio Predicts Xi-Trump Summit After Diplomatic Meeting",
  dateOccurred: "2025-01-14T10:00:00Z",
  dateRecorded: "2025-01-15T17:00:00Z",
  statement: {
    type: 'IMPLIES',
    operands: [
      { 
        type: 'SVO', 
        subjectRef: "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012", 
        verbRef: "sha256:789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123", 
        objectRef: "sha256:89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234" 
      },
      { 
        type: 'SVO', 
        subjectRef: "sha256:9abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345", 
        verbRef: "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456", 
        objectRef: "sha256:bcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567" 
      }
    ]
  },
  modifiers: {
    temporal: { 
      when: "future",
      tense: "is",
      sequence: "after diplomatic meeting",
      phase: "predicted"
    },
    spatial: { 
      location: "Malaysia",
      scope: "international"
    },
    certainty: { 
      probability: 0.75, 
      source: "US Secretary of State",
      confidence: 0.8,
      evidence: "official",
      reliability: "high"
    },
    manner: {
      type: "diplomatic prediction",
      style: "public",
      method: "official statement"
    }
  },
  relationships: [
    {
      type: "causedBy",
      target: "sha256:cdef0123456789abcdef0123456789abcdef0123456789abcdef012345678",
      strength: 0.9,
      description: "Summit likelihood increased by successful diplomatic meeting"
    },
    {
      type: "partOf",
      target: "sha256:def0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      strength: 0.8,
      description: "Part of broader US-China diplomatic engagement"
    }
  ],
  metadata: {
    source: { 
      name: "Associated Press", 
      type: "NewsAgency",
      url: "https://ap.org/rubio-xi-trump-summit"
    },
    author: "diplomatic.correspondent@ap.org",
    version: "1.0",
    datePublished: "2025-01-15T16:30:00Z"
  }
}
```

---

## 11. OCBC Names Tan CEO as Wong Steps Down After Four Years

**Original News:**
> Oversea-Chinese Banking Corp. Chief Executive Officer Helen Wong is stepping down after four years, with Tan named as her successor.

**Core Statement:** `OCBC REPLACES WongCEO WITH TanCEO`

**Key Entities:**
- OCBC (Bank)
- HelenWong (Person: CEO)
- Tan (Person: Successor)
- 4Years (Duration)

**Actions:** replaces, steps_down, succeeds

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:ijk567890123abcdef0123456789abcdef0123456789abcdef0123456789ab",
  logicalId: "ocbc-ceo-transition-001",
  version: "1.0", 
  commitHash: "sha256:defdef456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
  title: "OCBC CEO Transition: Wong to Tan",
  dateOccurred: "2025-01-13T09:00:00Z",
  dateRecorded: "2025-01-15T18:00:00Z",
  statement: {
    type: 'AND',
    operands: [
      { 
        type: 'SVO', 
        subjectRef: "sha256:helen-wong-person123abc456def789abc123def456789abc123def456789abc", 
        verbRef: "sha256:steps-down-action234def567abc890def234abc567def890abc234def567ab", 
        objectRef: "sha256:ceo-position345abc678def901abc345def678abc901def345abc678def901a" 
      },
      { 
        type: 'SVO', 
        subjectRef: "sha256:tan-person456def789abc012def456abc789def012abc456def789abc012de", 
        verbRef: "sha256:assumes-action567abc890def123abc567def890abc123def567abc890def12", 
        objectRef: "sha256:ceo-position345abc678def901abc345def678abc901def345abc678def901a" 
      }
    ]
  },
  modifiers: {
    temporal: { 
      when: "present",
      tense: "is",
      duration: "after 4 years", 
      timing: "succession",
      phase: "completed"
    },
    manner: { 
      type: "planned leadership transition",
      method: "corporate succession",
      style: "formal"
    },
    degree: {
      scale: "medium",
      impact: "significant organizational change"
    },
    certainty: {
      confidence: 0.95,
      source: "OCBC official announcement",
      evidence: "official",
      reliability: "verified"
    }
  },
  relationships: [
    {
      type: "follows",
      target: "sha256:wong-4-year-tenure123abc456def789abc123def456789abc123def456789ab",
      strength: 1.0,
      description: "Succession after 4-year leadership tenure"
    },
    {
      type: "partOf",
      target: "sha256:ocbc-leadership-strategy234def567abc890def234abc567def890abc234d",
      strength: 0.9,
      description: "Part of planned leadership development"
    }
  ],
  metadata: {
    source: { 
      name: "Straits Times", 
      type: "NewsAgency",
      url: "https://straitstimes.com/ocbc-ceo-transition"
    },
    author: "banking.reporter@straitstimes.com",
    version: "1.0",
    datePublished: "2025-01-15T17:30:00Z"
  }
}
```

---

## 12. Complex Logical Examples

### Example: Denial/Contradiction (NOT operator)

**Hypothetical News:**
> Company X denies reports that it will acquire Company Y, calling the rumors "completely false and unfounded."

**Core Statement:** `CompanyX DENIES AcquisitionClaims`

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456",
  logicalId: "denial-companyx-companyy-001",
  version: "1.0",
  commitHash: "sha256:123def456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
  title: "Company X Denies Acquisition Rumors",
  statement: {
    type: 'NOT',
    operands: [
      { 
        type: 'SVO',
        subjectRef: "sha256:companyx456def789abc123def456789abc123def456789abc123def456de",
        verbRef: "sha256:acquires789abc456def123abc456def789abc456def123abc456def789ab", 
        objectRef: "sha256:companyy321def456abc789def456abc789def456abc789def456abc789de"
      }
    ]
  },
  modifiers: {
    temporal: { when: "present", tense: "is" },
    manner: { style: "public", intensity: "high" },
    certainty: { 
      confidence: 0.9,
      source: "Company X official statement",
      evidence: "official"
    }
  },
  relationships: [
    {
      type: "contradicts",
      target: "sha256:original-rumor-event345abc678def901abc345def678abc901abc345def6",
      strength: 1.0,
      confidence: 0.95
    }
  ],
  metadata: {
    source: { name: "Company X Press Release", type: "Corporate" },
    author: "press@companyx.com",
    version: "1.0"
  }
}
```

### Example: Temporal Logic (BEFORE/AFTER)

**Hypothetical News:**
> The merger can only proceed after regulatory approval, which must happen before the December deadline.

**Core Statement:** `RegulatoryApproval MUST_HAPPEN BEFORE MergerCompletion`

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789",
  logicalId: "merger-timeline-constraints-001", 
  version: "1.0",
  commitHash: "sha256:commit456def789abc123def456789abc123def456789abc123def456789abc1",
  title: "Merger Timeline Dependencies",
  statement: {
    type: 'AND',
    operands: [
      {
        type: 'BEFORE',
        operands: [
          { 
            type: 'SVO',
            subjectRef: "sha256:regulatory-body567abc890def123abc567def890abc123def567abc890d",
            verbRef: "sha256:approves678abc901def234abc678def901abc234def678abc901def234ab",
            objectRef: "sha256:merger-application789def012abc345def789abc012def345abc789def01"
          },
          {
            type: 'SVO', 
            subjectRef: "sha256:cdef0123456789abcdef0123456789abcdef0123456789abcdef012345678",
            verbRef: "sha256:def0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
            objectRef: "sha256:ef0123456789abcdef0123456789abcdef0123456789abcdef0123456789a"
          }
        ]
      },
      {
        type: 'BEFORE',
        operands: [
          {
            type: 'SVO',
            subjectRef: "sha256:f0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
            verbRef: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abc", 
            objectRef: "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd"
          }
        ]
      }
    ]
  },
  modifiers: {
    temporal: { 
      when: "future",
      sequence: "before",
      deadline: "2025-12-31T23:59:59Z"
    },
    condition: {
      type: "provided that",
      condition: "regulatory approval granted",
      certainty: 0.8
    }
  }
}
```

### Example: Nested Logic (Multi-level)

**Hypothetical News:**
> If oil prices rise above $100 AND supply chain disruptions continue, then either inflation will spike OR central banks will intervene aggressively.

**Core Statement:** `(OilPrices > $100 AND SupplyDisruptions) IMPLIES (InflationSpike OR CentralBankIntervention)`

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:c3d4e5f6789ab1def0123456789abcdef0123456789abcdef0123456789a",
  logicalId: "economic-scenario-analysis-001",
  version: "1.0", 
  commitHash: "sha256:789def456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
  title: "Economic Scenario: Oil Price Impact Analysis",
  statement: {
    type: 'IMPLIES',
    operands: [
      // Antecedent: Oil prices > $100 AND supply disruptions
      {
        type: 'AND',
        operands: [
          {
            type: 'GT',
            operands: [
              {
                type: 'SVO',
                subjectRef: "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcde",
                verbRef: "sha256:3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                objectRef: "sha256:456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"
              }
            ]
          },
          {
            type: 'SVO',
            subjectRef: "sha256:56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01", 
            verbRef: "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012",
            objectRef: "sha256:789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123"
          }
        ]
      },
      // Consequent: Inflation spike OR central bank intervention  
      {
        type: 'OR',
        operands: [
          {
            type: 'SVO',
            subjectRef: "sha256:89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234",
            verbRef: "sha256:9abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345",
            objectRef: "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456"
          },
          {
            type: 'SVO', 
            subjectRef: "sha256:bcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567",
            verbRef: "sha256:cdef0123456789abcdef0123456789abcdef0123456789abcdef012345678",
            objectRef: "sha256:def0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
          }
        ]
      }
    ]
  },
  modifiers: {
    condition: {
      type: "if",
      certainty: 0.7,
      dependency: "oil price threshold breach"
    },
    degree: {
      threshold: "$100 per barrel",
      scale: "significant"
    },
    certainty: {
      confidence: 0.75,
      source: "Economic analysis",
      evidence: "reported",
      reliability: "medium"
    }
  },
  metadata: {
    source: { 
      name: "Economic Research Institute", 
      type: "Academic",
      url: "https://eri.edu/analysis"
    },
    author: "dr.economist@eri.edu",
    version: "1.0",
    datePublished: "2025-01-15T14:30:00Z"
  }
}
```

---

## Key Translation Patterns

### Entity Types Observed
- **Organizations**: Companies, Banks, Countries, Industries
- **People**: CEOs, Government Officials, Demographics (Teens)
- **Assets**: Properties, Ammunition, Data, Currency
- **Concepts**: Negotiations, Shortages, Sentiment

### Action Categories
- **Business**: acquires, charges, negotiates, restructures
- **Financial**: invests, creates_value, loses, costs
- **Operational**: supplies, cannibalizes, strips, overcomes
- **Strategic**: targets, predicts, positions, threatens

### Modifier Patterns (状语和定语)
- **Temporal**: "will start", "after 4 years", "ongoing"
- **Spatial**: "Europe to US", "Paris", "Malaysia"
- **Degree**: "$113M", "40%", "hundreds of millions"
- **Purpose**: "overcome shortage", "combat sentiment"
- **Manner**: "cannibalization", "frenzy", "diplomatic meeting"
- **Condition**: "may reduce", "potential deal", "likely"

### Logical Structures
- **Simple SVO**: Basic subject-verb-object facts
- **IMPLIES**: Causal relationships (if A then B)
- **AND**: Multiple concurrent facts
- **EQ**: Quantitative relationships (percentages, amounts)

### Relationship Tracking
- **causedBy**: Events that triggered this event
- **relatedEvents**: Connected events in same domain
- **causes**: What this event triggers

---

## 13. Quantitative Comparison Example (LT/GTE)

### Example: Market Performance Threshold Analysis

**Hypothetical News:**
> Financial analysts report that companies with revenue growth below 5% are likely to face investor scrutiny, while those exceeding 15% growth are expected to outperform market benchmarks.

**Core Statement:** `RevenueGrowth < 5% IMPLIES InvestorScrutiny AND RevenueGrowth > 15% IMPLIES MarketOutperformance`

**VeritasChain Event Structure:**
```typescript
{
  "@id": "sha256:jkl678901234abcdef0123456789abcdef0123456789abcdef0123456789a",
  logicalId: "revenue-growth-thresholds-001",
  version: "1.0",
  commitHash: "sha256:efgdef456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
  title: "Revenue Growth Performance Thresholds Analysis",
  dateOccurred: "2025-01-15T16:00:00Z",
  dateRecorded: "2025-01-15T19:00:00Z",
  statement: {
    type: 'AND',
    operands: [
      // Low growth → scrutiny
      {
        type: 'IMPLIES',
        operands: [
          {
            type: 'LT',
            operands: [
              {
                type: 'SVO',
                subjectRef: "sha256:ef0123456789abcdef0123456789abcdef0123456789abcdef0123456789a",
                verbRef: "sha256:equals-action789abc456def123abc456def789abc456def123abc456de",
                objectRef: "sha256:f0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab"
              }
            ],
            threshold: { value: 5, unit: "percent", dataType: "number" }
          },
          {
            type: 'SVO',
            subjectRef: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abc",
            verbRef: "sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
            objectRef: "sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcde"
          }
        ]
      },
      // High growth → outperformance
      {
        type: 'IMPLIES',
        operands: [
          {
            type: 'GT',
            operands: [
              {
                type: 'SVO',
                subjectRef: "sha256:ef0123456789abcdef0123456789abcdef0123456789abcdef0123456789a",
                verbRef: "sha256:equals-action789abc456def123abc456def789abc456def123abc456de",
                objectRef: "sha256:f0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab"
              }
            ],
            threshold: { value: 15, unit: "percent", dataType: "number" }
          },
          {
            type: 'SVO',
            subjectRef: "sha256:3456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            verbRef: "sha256:456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
            objectRef: "sha256:56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01"
          }
        ]
      }
    ]
  },
  modifiers: {
    temporal: { 
      when: "present",
      tense: "are",
      phase: "ongoing analysis"
    },
    degree: {
      threshold: "5% low, 15% high",
      scale: "market-wide",
      intensity: "significant"
    },
    certainty: {
      confidence: 0.75,
      source: "Financial analysts consensus",
      evidence: "reported",
      reliability: "medium"
    },
    purpose: {
      goal: "identify performance categories",
      primary: "investment analysis"
    }
  },
  relationships: [
    {
      type: "partOf",
      target: "sha256:6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012",
      strength: 0.8,
      description: "Component of broader market performance analysis"
    }
  ],
  metadata: {
    source: { 
      name: "Financial Analysis Institute", 
      type: "Academic",
      url: "https://fai.edu/revenue-growth-study"
    },
    author: "quantitative.analyst@fai.edu",
    version: "1.0",
    datePublished: "2025-01-15T18:30:00Z",
    confidence: 0.75,
    volatility: 0.1,
    evidenceScore: 0.8,
    sourceScore: 1.0
  }
}
```

**Key Features Demonstrated:**
- **LT/GT operators**: Quantitative threshold comparisons
- **Threshold objects**: Structured value + unit + dataType
- **Compound logic**: Multiple IMPLIES within AND
- **Confidence/Strength**: Applied to quantitative relationships

---

## Improvements Implemented

Based on comprehensive architecture review, the following improvements have been made:

### 1. **ID System Clarification**
- **@id**: SHA-256 content hash (ONLY unique identifier)
- **logicalId**: UUID v4 for logical grouping across versions
- **commitHash**: Tracks which commit this version belongs to
- Examples now show proper `sha256:...` format instead of placeholder strings

### 2. **Complete Metadata Examples**
- Added full `metadata` sections with source, author, version info
- Included `dateOccurred` vs `dateRecorded` distinction
- Added URL references for source tracking

### 3. **Standardized Modifiers**
- **Certainty modifiers** now included in most examples (confidence, source, evidence, reliability)
- **Temporal modifiers** use standardized enums (when, tense, phase, sequence)
- **Spatial, manner, degree** modifiers with consistent structure

### 4. **Unified Relationship System**
- Replaced scattered `causedBy/causes/relatedEvents` with unified `relationships[]`
- Each relationship has `type`, `target`, `strength`, `confidence`
- Clear semantic categories: causal, informational, contextual

### 5. **Complex Logical Examples**
- **NOT operator**: Denial and contradiction scenarios
- **BEFORE/AFTER**: Temporal logic with dependencies
- **Nested logic**: Multi-level IMPLIES with AND/OR combinations
- **Comparison operators**: GT, EQ for quantitative relationships

### 6. **Type Safety Improvements**
- **DataType system**: Supports custom schemas, arrays, unions, references
- **Modifier interfaces**: Prevent spelling errors with standardized enums
- **API versioning**: All endpoints use `/v1/` prefix for future compatibility

### 7. **Hash System Consistency**
- All references use content-addressed `sha256:...` format
- Clear distinction between content hash (@id) and logical grouping (logicalId)
- Version chains linked through `previousVersion` references

This enhanced translation framework enables VeritasChain to capture the full complexity of real-world events while maintaining logical structure for analysis, version control, and blockchain compatibility. The standardized approach ensures consistency across different contributors and prevents common implementation errors.

---

## PHASE 1 ADDITION: Legal Normative Clauses (kind='norm')

### Example A: Employment Law Amendment

**Original Legal Text:**
> Effective January 1, 2025, all employees in Singapore shall be entitled to a minimum of 14 days paternity leave upon the birth or adoption of a child.

**Core Deontic Statement:** `Employees SHALL_BE_ENTITLED_TO PaternityLeave`

**VeritasChain Legal Clause:**
```typescript
{
  "@id": "sha256:a9b8c7d6e5f4321098765432109876543210987654321098765432109876543210",
  logicalId: "sg-paternity-leave-amendment-2025",
  version: "1.0",
  commitHash: "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  
  // PHASE 1: Legal clause designation
  kind: "norm",
  
  title: "Singapore Paternity Leave Amendment 2025",
  dateOccurred: "2024-12-15T00:00:00Z",  // When law was passed
  dateRecorded: "2024-12-16T09:00:00Z",
  
  statement: {
    type: 'SVO',
    subjectRef: "sha256:employees-sg-entity1234567890abcdef1234567890abcdef1234567890ab",
    verbRef: "sha256:entitled-to-action1234567890abcdef1234567890abcdef1234567890a",
    objectRef: "sha256:paternity-leave-benefit1234567890abcdef1234567890abcdef12345"
  },
  
  modifiers: {
    temporal: {
      when: "future",
      effectiveFrom: "2025-01-01T00:00:00Z"
    },
    // PHASE 1: Legal-specific modifiers
    legal: {
      jurisdiction: "Singapore",
      effectiveDate: "2025-01-01T00:00:00Z",
      normForce: "mandatory",  // strength: 1.0
      exception: "Does not apply to contract workers"
    },
    degree: {
      amount: "14 days minimum",
      scale: "medium"
    },
    condition: {
      type: "upon",
      condition: "birth or adoption of child"
    },
    certainty: {
      evidence: "official",     // E = 1.0
      reliability: "high"
    }
  },
  
  relationships: [
    {
      type: "amends",  // PHASE 1: Legal relationship
      target: "sha256:sg-employment-act-original1234567890abcdef1234567890abcdef",
      strength: 1.0,
      description: "Amends Singapore Employment Act Section 76"
    }
  ],
  
  metadata: {
    source: {
      name: "Ministry of Manpower Singapore",
      type: "Government",
      legalType: "statute",     // PHASE 1: Legal hierarchy = 0.95
      url: "https://mom.gov.sg/employment-act-amendment-2024"
    },
    author: "mom.policy@gov.sg",
    version: "1.0",
    datePublished: "2024-12-15T16:00:00Z",
    
    // AUTO-CALCULATED: confidence = (1-V) × E × S
    // V=0.0 (new law, no changes yet), E=1.0 (official), S=0.95 (statute)
    // confidence = (1-0.0) × 1.0 × 0.95 = 0.95
    confidence: 0.95,
    volatility: 0.0,
    evidenceScore: 1.0,
    legalHierarchyWeight: 0.95
  }
}
```

---

### Example B: Contract Clause with Sunset Date

**Original Contract Text:**
> The Supplier must deliver all materials by December 31, 2025, or shall be liable for liquidated damages of $10,000 per day of delay, unless force majeure conditions prevent performance.

**Core Deontic Statement:** `Supplier MUST_DELIVER Materials BY_DEADLINE OR LIABLE_FOR Damages`

**VeritasChain Legal Clause:**
```typescript
{
  "@id": "sha256:b1c2d3e4f5678901234567890123456789012345678901234567890123456789",
  logicalId: "supply-contract-delivery-clause-001",
  version: "1.0", 
  commitHash: "sha256:2345678901bcdef2345678901bcdef2345678901bcdef2345678901bcdef23",
  
  kind: "norm",
  
  title: "Material Delivery Obligation with Liquidated Damages",
  dateOccurred: "2024-06-15T14:30:00Z",  // Contract signing
  dateRecorded: "2024-06-15T14:30:00Z",
  
  statement: {
    type: 'IMPLIES',  // Complex logical structure
    operands: [
      {
        type: 'NOT',
        operands: [{
          type: 'SVO',
          subjectRef: "sha256:supplier-entity234567890abcdef234567890abcdef234567890abc",
          verbRef: "sha256:delivers-action234567890abcdef234567890abcdef234567890ab",
          objectRef: "sha256:materials-object234567890abcdef234567890abcdef234567890a"
        }]
      },
      {
        type: 'SVO',
        subjectRef: "sha256:supplier-entity234567890abcdef234567890abcdef234567890abc",
        verbRef: "sha256:liable-for-action234567890abcdef234567890abcdef234567890",
        objectRef: "sha256:damages-10k-object234567890abcdef234567890abcdef23456789"
      }
    ]
  },
  
  modifiers: {
    temporal: {
      when: "future",
      deadline: "2025-12-31T23:59:59Z"
    },
    legal: {
      jurisdiction: "New York",
      effectiveDate: "2024-06-15T14:30:00Z",
      sunsetDate: "2025-12-31T23:59:59Z",  // PHASE 1: Contract expiration
      normForce: "mandatory",
      exception: "Force majeure conditions excuse performance"
    },
    degree: {
      amount: "$10,000 per day",
      scale: "large"
    },
    condition: {
      type: "unless",
      condition: "force majeure prevents performance"
    },
    certainty: {
      evidence: "confirmed",   // E = 1.0
      reliability: "high"
    }
  },
  
  relationships: [
    {
      type: "partOf",
      target: "sha256:master-supply-agreement234567890abcdef234567890abcdef2345",
      strength: 1.0,
      description: "Section 4.2 of Master Supply Agreement"
    },
    {
      type: "dependentOn",  // PHASE 1: Legal dependency
      target: "sha256:material-specification234567890abcdef234567890abcdef234567",
      strength: 0.9,
      description: "Delivery obligation depends on agreed specifications"
    }
  ],
  
  metadata: {
    source: {
      name: "ABC Corp - XYZ Suppliers Contract",
      type: "Corporate",
      legalType: "contract",    // PHASE 1: Legal hierarchy = 0.8
      url: "internal://contracts/supply-001"
    },
    author: "legal@abccorp.com",
    version: "1.0",
    datePublished: "2024-06-15T14:30:00Z",
    
    // AUTO-CALCULATED: confidence = (1-V) × E × S  
    // V=0.05 (minor clarifications), E=1.0 (confirmed), S=0.8 (contract)
    // confidence = (1-0.05) × 1.0 × 0.8 = 0.76
    confidence: 0.76,
    volatility: 0.05,
    evidenceScore: 1.0,
    legalHierarchyWeight: 0.8
  }
}
```

---

## ⚠️ LEGAL CLAUSE EXAMPLES ALSO NEED UPDATING

**Even the legal clause examples (kind='norm') still violate core rules:**
- Line 1623: `confidence: 0.76` - FORBIDDEN manual setting
- Lines 1499, 1575, 1581: Manual confidence values throughout

**Legal clauses should follow the same pattern:**
```typescript
kind: "norm",  // Legal clause
certainty: {
  // AUTO-CALCULATED: confidence = (1-V) × E × S (legal hierarchy)
  // V=0.05, E=1.0, S=0.8 (contract) → confidence = 0.76
  evidence: "confirmed",
  reliability: "high"
  // NEVER set confidence manually, even for legal clauses
}
```

---

## Phase 1 Legal Integration Summary

**What's Now Possible**: VeritasChain can store and query both `kind='fact'` (news events) and `kind='norm'` (legal clauses) using identical APIs and data structures.

**Key Features Added**:
- **Deontic Actions**: `shall`, `may`, `must-not`, `liable-for`, `entitled-to`, etc.
- **Legal Modifiers**: `jurisdiction`, `effectiveDate`, `sunsetDate`, `normForce`
- **Legal Relationships**: `amends`, `supersedes`, `refersTo`, `dependentOn` 
- **Hierarchy Weights**: Constitution (1.0) → Statute (0.95) → Regulation (0.9) → Case-law (0.85) → Contract (0.8) → Policy (0.75)
- **Norm Force**: Mandatory (1.0) / Default (0.7) / Advisory (0.4)

**Same Transparent Formula**: `confidence = (1-V) × E × S` works for both facts and norms, with legal hierarchy replacing source factors for normative clauses.