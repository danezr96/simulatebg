````md
# ENGINE_SPEC.md  
**SimulateBG – Simulation Engine Specification (Authoritative v1.0)**

Dit document beschrijft **exact** hoe de simulatie-engine werkt.  
Het is de blauwdruk voor `src/core/engine/*`.

> **Belangrijk**
> - De engine is **deterministisch per ronde**
> - De database is de **input + output**, nooit de rekenlaag
> - Elke ronde is **replayable** op basis van data
> - Geen shortcuts, geen “magic numbers” buiten config

---

## 1. Engine-filosofie

### 1.1 Wat de engine IS
- Een **pure simulatiepipeline**
- Werkt in **discrete stappen** (1 week = 1 tick)
- Draait **server-side / trusted context**
- Gebruikt alleen:
  - World state
  - Sector config
  - Company state
  - Decisions
  - Bot logic
  - Macro & season modifiers

### 1.2 Wat de engine NIET is
- ❌ Geen UI logic
- ❌ Geen auth logic
- ❌ Geen database business rules
- ❌ Geen “real-time per seconde” sim

---

## 2. Core entrypoint

### 2.1 `runWorldWeek(worldId)`

**Bestand:**  
`src/core/engine/runWorldWeek.ts`

**Verantwoordelijkheid:**  
Simuleert exact **1 week** voor één world.

```ts
runWorldWeek(worldId: WorldId): Promise<void>
````

### High-level flow

```
LOCK world
LOAD world + economy state
LOAD sectors + niches
LOAD holdings + companies
LOAD bots
LOAD decisions (player + bot)
APPLY macro & season modifiers
SIMULATE sector demand
SIMULATE company competition
CALCULATE financials
PROCESS loans, taxes, depreciation
APPLY events
UPDATE reputation & progression
WRITE all results
ADVANCE world time
UNLOCK world
```

---

## 3. Engine modules & volgorde

### 3.1 macroEngine.ts

**Doel:** macro-economie updaten

Input:

* `world_economy_state`
* actieve `season` (optioneel)

Output:

* Nieuwe inflation
* Nieuwe rente
* Loonindex
* Macro modifiers

Voorbeeld:

```ts
base_interest_rate *= season.modifier.interestFactor
inflation_rate += randomNoise(±0.1%)
```

---

### 3.2 sectorEngine.ts

**Doel:** sectorvraag genereren

Per sector:

```
baseDemand
× trendFactor
× seasonalityFactor
× macroDemandFactor
× randomVolatility
```

Output:

* `world_sector_state.current_demand`
* `last_round_metrics`

Belangrijk:

* Vraag wordt **niet** per bedrijf bepaald
* Eerst sector → daarna verdeling

---

### 3.3 companyEngine.ts

**Doel:** concurrentie & vraagverdeling

#### Attractiviteit per company

```
U_i =
  priceScore
+ qualityScore
+ marketingScore
+ reputationScore
+ locationFit
```

Daarna:

```
marketShare_i = U_i / ΣU
demand_i = sectorDemand × marketShare_i
sold_i = min(demand_i, capacity_i)
```

Effecten:

* Overvraag → reputatieverlies
* Overcapaciteit → kosteninefficiëntie

Output:

* Volume verkocht
* Utilisation rate
* Operationele KPI’s

---

### 3.4 financeEngine.ts

**Doel:** geldstromen & balans

Per company:

```
Revenue = sold × price
COGS = sold × variableCost
OPEX = fixed + marketing + labour
EBIT = Revenue - COGS - OPEX
Interest = loanBalance × rate
Tax = EBIT × corporateTax
NetProfit = EBIT - Interest - Tax
```

Daarnaast:

* Afschrijving
* Cashflow update
* Equity update

Holding-level:

* Dividenden
* Leningen
* Vastgoed inkomsten

---

### 3.5 botsEngine.ts

**Doel:** bot decisions genereren

Bots:

* Gebruiken **exact dezelfde decision pipeline**
* Hebben archetypes:

  * Discounter
  * Premium
  * Conservative
  * Aggressive
  * Opportunistic

Beslissingen o.a.:

* Prijs aanpassen
* Marketing verhogen
* Capaciteit uitbreiden
* Schulden aangaan

Bots reageren op:

* Marktdominantie spelers
* Sector stress
* Eigen cashpositie

---

### 3.6 eventsEngine.ts

**Doel:** events genereren & toepassen

Event triggers:

* Macro stress
* Sector volatility
* Bedrijfsfalen
* Compliance risico
* Seasons

Event effects:

* Kosten ↑
* Vraag ↓
* Reputatie impact
* Boetes
* Tijdelijke modifiers

Events zijn:

* **Write-only**
* Nooit directe state mutatie zonder trace

---

### 3.7 progressionEngine.ts

**Doel:** reputatie & meta-progressie

Triggers:

* Winstgevendheid
* Stabiliteit
* Faillissementen
* Events

Berekeningen:

* XP gain (afvlakkende curve)
* Level-ups
* Skill unlock checks
* Achievement checks

Prestige:

* Alleen op player-initiatief
* Soft reset met bonuses

---

## 4. Determinisme & replay

### 4.1 Randomness

Alle randomness:

* Gaat via één RNG per ronde
* Seed = `worldId + year + week`

➡️ Exacte replay mogelijk.

---

## 5. Error handling & veiligheid

### 5.1 Fail-safe principes

* Als één company faalt → wereld gaat door
* Als engine faalt → ronde status = FAILED
* Geen halve writes (transactioneel)

### 5.2 Locks

* Eén world tegelijk simuleren
* Advisory lock op `world_id`

---

## 6. Performance richtlijnen

* Geen N+1 queries
* Bulk inserts per table
* Max 1 sim per world tegelijk
* Async waar mogelijk, sequentieel waar nodig

---

## 7. Output per ronde (guaranteed)

Na elke succesvolle ronde:

* `world_rounds` entry
* `company_state` per bedrijf
* `company_financials` per bedrijf
* Events gelogd
* Reputation aangepast
* World time +1 week

---

## 8. Debug & observability

### Logging

* Engine-step logging (dev only)
* Per ronde samenvatting

### Metrics

* Ronde duur
* Aantal companies
* Faillissementen
* Sector winstgemiddelden

---

## 9. Engine contracts (belangrijk)

| Regel                    | Consequentie       |
| ------------------------ | ------------------ |
| Geen UI imports          | Engine blijft pure |
| Geen Supabase auth       | Server-only        |
| Geen writes buiten repos | Auditbaar          |
| Geen hidden state        | Debugbaar          |

---

## 10. Samenvatting (1 pagina)

```
runWorldWeek
 ├─ macroEngine
 ├─ sectorEngine
 ├─ botsEngine
 ├─ companyEngine
 ├─ financeEngine
 ├─ eventsEngine
 ├─ progressionEngine
 └─ persist + advance time
```

---

**Status:** v1.0 – FINAL
**Wijzigingen hierna zijn breaking**

Volgende document:
➡️ `docs/SIMULATION_EXAMPLES.md`
