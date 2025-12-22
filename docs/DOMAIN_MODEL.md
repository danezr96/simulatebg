```md
# DOMAIN_MODEL.md  
**SimulateBG – Canonical Domain Model (Authoritative v1.0)**

Dit document beschrijft het **volledige domeinmodel** van SimulateBG.  
Het is de **enige bron van waarheid** voor:

- TypeScript domain types (`src/core/domain/*`)
- Database mapping (`docs/DB_SCHEMA.md`)
- Engine contracts (`docs/ENGINE_SPEC.md`)
- Service interfaces (`src/core/services/*`)

> **Regel**
> - Elk domeinobject = expliciet type
> - Geen impliciete state
> - Geen “magische” afleidingen buiten engine
> - Alles is historisch reproduceerbaar

---

## 1. Domein-overzicht (high level)

```

User
↓
Player
↓
Holding ─────────────┐
↓                   │
Company               │
↓                   │
CompanyState          │
CompanyFinancials     │
│
World ─ WorldEconomyState
↓
Sector ─ Niche
↓
WorldSectorState

```

Cross-cutting:
- Decisions
- Events
- Bots
- Progression
- Finance
- Investments
- Seasons

---

## 2. Identity & ownership

### 2.1 User (Supabase Auth)
- Bestaat buiten ons domein
- Wordt gerefereerd via `user_id`
- Geen businesslogica hier

---

### 2.2 Player
**Tycoon-identiteit (1 per user per game)**

Bestand:
```

src/core/domain/player.ts

```

Belangrijkste eigenschappen:
- Reputatie (lvl 1–999)
- Prestige (meta-progressie)
- Statistieken over runs

Relaties:
- 1 Player → meerdere Holdings (per world max 1)

---

### 2.3 Holding
**Financiële en juridische entiteit**

Bestand:
```

src/core/domain/holding.ts

```

Verantwoordelijkheden:
- Cashbeheer
- Leningen
- Vastgoed & investeringen
- Policies (risk, dividend)

Relaties:
- 1 Holding → meerdere Companies
- 1 Holding → meerdere Loans / Properties / Investments

Fail-state:
- Holding failliet = einde run

---

## 3. World & time

### 3.1 World
**De gedeelde simulatiecontext**

Bestand:
```

src/core/domain/world.ts

```

Eigenschappen:
- Mode (NORMAL / FAST / HARDCORE)
- Status (ACTIVE / PAUSED)
- Season (optioneel)
- Round interval

---

### 3.2 GameTime
**Discrete tijd**

Bestand:
```

src/core/domain/time.ts

```

- 1 ronde = 1 week
- 52 weken = 1 jaar
- Geen real-time afhankelijkheid

Alles in de game is te herleiden tot:
```

(world_id, year, week)

```

---

### 3.3 WorldEconomyState
**Macro-economie per world**

- Rente
- Inflatie
- Loonindex
- Macro modifiers

Wordt **alleen** aangepast door `macroEngine`.

---

## 4. Sectoren & niches

### 4.1 Sector
**Economisch domein**

Bestand:
```

src/core/domain/sector.ts

```

Voorbeelden:
- Horeca
- Tech
- Energie
- Vastgoed

Sectoren zijn:
- Statisch
- Gedeeld tussen werelden

---

### 4.2 Niche
**Specifieke markt binnen sector**

Eigenschappen:
- Capex-intensiteit
- Marges
- Volatiliteit
- Elasticiteit
- Seasonality

NicheConfig is **cruciaal**:
➡️ bepaalt gedrag in engine

---

### 4.3 WorldSectorState
**Dynamische sectorstatus per world**

- Actuele vraag
- Trend
- Volatiliteit
- KPI’s vorige ronde

Wordt elke ronde overschreven (historie via world_rounds).

---

## 5. Companies

### 5.1 Company
**Operationele BV**

Bestand:
```

src/core/domain/company.ts

```

Eigenschappen:
- Sector + niche
- Locatie
- Status (ACTIVE, BANKRUPT, etc.)

Company is **passief**:
- Heeft geen gedrag
- Wordt gestuurd door decisions + engine

---

### 5.2 CompanyState
**Operationele staat per week**

Voorbeelden:
- Prijsniveau
- Capaciteit
- Marketing
- Personeel
- Reputatie

Elke week = nieuw record  
➡️ volledige replay mogelijk

---

### 5.3 CompanyFinancials
**Financiële uitkomst per week**

Bevat:
- P&L
- Cashflow
- Balansdelta

Wordt uitsluitend berekend door `financeEngine`.

---

## 6. Decisions

### 6.1 CompanyDecision
**Keuze per bedrijf per week**

Bestand:
```

src/core/domain/decisions.ts

```

Bron:
- PLAYER
- BOT
- SYSTEM

Voorbeelden:
- Prijs aanpassen
- Marketingbudget
- Investeren
- Personeel wijzigen

Decisions zijn:
- Declaratief
- Immutable
- Volledig auditbaar

---

### 6.2 HoldingDecision
**Strategische keuzes op holding-niveau**

Voorbeelden:
- Leningen
- Kapitaal injectie
- Vastgoed kopen
- Dividend

---

## 7. Finance

### 7.1 Loan
**Financiering**

Bestand:
```

src/core/domain/finance.ts

```

- Holding- of Company-loan
- Termijnen per week
- Default = event + reputatieschade

---

### 7.2 Property
**Vastgoed**

Bestand:
```

src/core/domain/investments.ts

```

- Kan eigendom zijn van holding of company
- Waardeveranderingen via macro
- Huur = cashflow

---

### 7.3 Investment
**Financiële belegging**

- ETF
- Obligatie
- Fonds

Doel:
- Cash parkeren
- Risico spreiden

---

## 8. Events

### 8.1 GameEvent
**Gebeurtenissen met impact**

Bestand:
```

src/core/domain/events.ts

```

Scope:
- WORLD
- SECTOR
- COMPANY
- HOLDING

Events:
- Veranderen modifiers
- Hebben severity
- Worden nooit overschreven

---

## 9. Bots

### 9.1 BotProfile
**Gedragsarchetype**

Bestand:
```

src/core/domain/bots.ts

```

Voorbeelden:
- Discounter
- Premium
- Aggressive leveraged

Bots:
- Gebruiken dezelfde decision types als spelers
- Hebben beperkingen (fairness)

---

### 9.2 Bot
**Concrete AI speler**

- Heeft eigen holding
- Speelt altijd binnen regels
- Geen cheats

---

## 10. Seasons

### 10.1 Season
**Macro-economische fase**

Bestand:
```

src/core/domain/seasons.ts

```

Voorbeelden:
- Energy Crisis
- Tech Bubble
- Logistics Meltdown

Seasons:
- Zijn presets
- Kunnen events triggeren
- Veranderen engine parameters

---

## 11. Progression

### 11.1 Reputation
- Level 1–999
- Exponentieel trager
- Beïnvloedt:
  - Rente
  - Marketing
  - Loyaliteit

---

### 11.2 Skills
**Permanente modifiers**

Trees:
- Finance
- Operations
- Market

Kleine, cumulatieve effecten.

---

### 11.3 Achievements
**Mijlpalen**

- Geen directe power
- Wel prestige / unlocks

---

### 11.4 Prestige
**Soft reset**

- Speler verkoopt alles
- Behoudt prestige bonuses
- Nieuwe run = sneller startpunt

---

## 12. Domain-invariants (HEILIG)

Deze regels mogen **nooit** gebroken worden:

1. Engine schrijft state, UI nooit
2. Elke week is reproduceerbaar
3. Geen verborgen state
4. Geen berekeningen in DB
5. Geen side-effects buiten engine
6. Faillissement = echte consequenties

---

## 13. Mapping naar code

| Domein | Pad |
|-----|----|
| Types | `src/core/domain/*` |
| Engine | `src/core/engine/*` |
| Services | `src/core/services/*` |
| DB | `supabase/*.sql` |
| UI | `src/ui/*` |

---

**Status:** v1.0 – FINAL  
**Wijzigingen hierna = breaking**

Volgende document:
➡️ `docs/SERVICE_LAYER.md`
```
