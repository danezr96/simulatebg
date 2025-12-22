````md
# DB_SCHEMA.md  
**SimulateBG – Supabase Database Schema (Authoritative v1.0)**

Dit document is de **database-bijbel** van SimulateBG.  
Alles wat de game doet (simulatie, UI, engine, bots, progression) is hierop gebaseerd.

> **Regel:**  
> - De database is *source of truth*  
> - Types in `src/core/domain` zijn 1-op-1 afgeleid van dit schema  
> - Engine & services mogen **nooit** aannames doen buiten dit schema  

---

## 0. Conventies & uitgangspunten

### Naming
- Tabellen: `snake_case`, meervoud
- Kolommen: `snake_case`
- Enum-achtige velden: `text` + app-level enums
- JSON-config: `jsonb`

### Primary keys
```sql
id uuid primary key default gen_random_uuid()
````

### Geld

```sql
numeric(18,2)
```

### Tijd

```sql
timestamptz default now()
```

---

## 1. Auth & identity

### 1.1 auth.users (Supabase)

Wordt **niet** door ons beheerd.
Wij refereren via `user_id`.

---

## 2. Player & Holding layer

### 2.1 players

**Tycoon-profiel per user**

| Kolom            | Type        | Omschrijving       |
| ---------------- | ----------- | ------------------ |
| id               | uuid        | PK                 |
| user_id          | uuid        | Supabase auth user |
| name             | text        | Display name       |
| avatar_url       | text        | Optioneel          |
| base_currency    | text        | Default: EUR       |
| reputation_level | int         | 1–999              |
| reputation_xp    | numeric     | XP progress        |
| prestige_level   | int         | Meta-progress      |
| created_at       | timestamptz |                    |

Index:

```sql
(player_id)
(user_id)
```

---

### 2.2 holdings

**Juridische / financiële moeder per world**

| Kolom          | Type                               |
| -------------- | ---------------------------------- |
| id             | uuid                               |
| player_id      | uuid → players                     |
| world_id       | uuid → worlds                      |
| name           | text                               |
| status         | text (ACTIVE, BANKRUPT, PRESTIGED) |
| cash_balance   | numeric                            |
| total_equity   | numeric                            |
| total_debt     | numeric                            |
| prestige_level | int                                |
| created_at     | timestamptz                        |

Uniek:

```sql
(player_id, world_id)
```

---

## 3. World & time

### 3.1 worlds

**Gesimuleerde wereld**

| Kolom                       | Type                            |
| --------------------------- | ------------------------------- |
| id                          | uuid                            |
| name                        | text                            |
| mode                        | text (NORMAL, FAST, HARDCORE)   |
| status                      | text (ACTIVE, PAUSED, ARCHIVED) |
| base_round_interval_seconds | int                             |
| season_id                   | uuid → seasons                  |
| created_at                  | timestamptz                     |

---

### 3.2 world_economy_state

**Macro-economie (1 rij per world)**

| Kolom              | Type        |
| ------------------ | ----------- |
| world_id           | uuid (PK)   |
| current_year       | int         |
| current_week       | int         |
| base_interest_rate | numeric     |
| inflation_rate     | numeric     |
| base_wage_index    | numeric     |
| macro_modifiers    | jsonb       |
| last_tick_at       | timestamptz |

---

### 3.3 world_rounds

**Auditlog van simulatie**

| Kolom       | Type        |
| ----------- | ----------- |
| id          | uuid        |
| world_id    | uuid        |
| year        | int         |
| week        | int         |
| started_at  | timestamptz |
| finished_at | timestamptz |
| status      | text        |

Uniek:

```sql
(world_id, year, week)
```

---

## 4. Sectoren & niches

### 4.1 sectors

**Statische sectorlijst**

| Kolom       | Type          |
| ----------- | ------------- |
| id          | uuid          |
| code        | text (unique) |
| name        | text          |
| description | text          |

---

### 4.2 niches

**6 niches per sector + config**

| Kolom       | Type  |
| ----------- | ----- |
| id          | uuid  |
| sector_id   | uuid  |
| code        | text  |
| name        | text  |
| description | text  |
| config      | jsonb |

Uniek:

```sql
(sector_id, code)
```

---

### 4.3 world_sector_state

**Sectorstatus per world**

| Kolom              | Type    |
| ------------------ | ------- |
| id                 | uuid    |
| world_id           | uuid    |
| sector_id          | uuid    |
| current_demand     | numeric |
| trend_factor       | numeric |
| volatility         | numeric |
| last_round_metrics | jsonb   |

Uniek:

```sql
(world_id, sector_id)
```

---

## 5. Companies (BV’s)

### 5.1 companies

**Actieve bedrijven**

| Kolom        | Type        |
| ------------ | ----------- |
| id           | uuid        |
| holding_id   | uuid        |
| world_id     | uuid        |
| sector_id    | uuid        |
| niche_id     | uuid        |
| name         | text        |
| region       | text        |
| founded_year | int         |
| status       | text        |
| created_at   | timestamptz |

---

### 5.2 company_state

**Operationele staat per week**

| Kolom                  | Type    |
| ---------------------- | ------- |
| id                     | uuid    |
| company_id             | uuid    |
| world_id               | uuid    |
| year                   | int     |
| week                   | int     |
| price_level            | numeric |
| capacity               | numeric |
| quality_score          | numeric |
| marketing_level        | numeric |
| employees              | int     |
| fixed_costs            | numeric |
| variable_cost_per_unit | numeric |
| reputation_score       | numeric |
| utilisation_rate       | numeric |

Uniek:

```sql
(company_id, year, week)
```

---

### 5.3 company_financials

**P&L + balansdelta per week**

| Kolom         | Type    |
| ------------- | ------- |
| id            | uuid    |
| company_id    | uuid    |
| world_id      | uuid    |
| year          | int     |
| week          | int     |
| revenue       | numeric |
| cogs          | numeric |
| opex          | numeric |
| interest_cost | numeric |
| tax_expense   | numeric |
| net_profit    | numeric |
| cash_change   | numeric |
| assets        | numeric |
| liabilities   | numeric |
| equity        | numeric |

---

## 6. Decisions & events

### 6.1 company_decisions

**Alle beslissingen (player/bot/system)**

| Kolom      | Type        |
| ---------- | ----------- |
| id         | uuid        |
| company_id | uuid        |
| world_id   | uuid        |
| year       | int         |
| week       | int         |
| source     | text        |
| payload    | jsonb       |
| created_at | timestamptz |

---

### 6.2 events

**World / sector / company / holding events**

| Kolom      | Type        |
| ---------- | ----------- |
| id         | uuid        |
| world_id   | uuid        |
| sector_id  | uuid        |
| company_id | uuid        |
| holding_id | uuid        |
| scope      | text        |
| type       | text        |
| severity   | numeric     |
| payload    | jsonb       |
| year       | int         |
| week       | int         |
| created_at | timestamptz |

---

## 7. Finance

### 7.1 loans

| Kolom               | Type        |
| ------------------- | ----------- |
| id                  | uuid        |
| world_id            | uuid        |
| holding_id          | uuid        |
| company_id          | uuid        |
| principal           | numeric     |
| outstanding_balance | numeric     |
| interest_rate       | numeric     |
| term_weeks          | int         |
| remaining_weeks     | int         |
| lender_name         | text        |
| type                | text        |
| status              | text        |
| created_at          | timestamptz |

---

### 7.2 properties

| Kolom                 | Type        |
| --------------------- | ----------- |
| id                    | uuid        |
| world_id              | uuid        |
| holding_id            | uuid        |
| company_id            | uuid        |
| type                  | text        |
| location              | text        |
| purchase_price        | numeric     |
| market_value          | numeric     |
| rental_income_week    | numeric     |
| maintenance_cost_week | numeric     |
| created_at            | timestamptz |

---

### 7.3 investments

| Kolom         | Type        |
| ------------- | ----------- |
| id            | uuid        |
| world_id      | uuid        |
| holding_id    | uuid        |
| type          | text        |
| name          | text        |
| current_value | numeric     |
| cost_basis    | numeric     |
| meta          | jsonb       |
| created_at    | timestamptz |

---

## 8. Bots

### 8.1 bot_profiles

| Kolom           | Type  |
| --------------- | ----- |
| id              | uuid  |
| name            | text  |
| archetype       | text  |
| behavior_config | jsonb |

---

### 8.2 bots

| Kolom          | Type        |
| -------------- | ----------- |
| id             | uuid        |
| world_id       | uuid        |
| bot_profile_id | uuid        |
| holding_id     | uuid        |
| active         | boolean     |
| created_at     | timestamptz |

---

## 9. Seasons

### 9.1 seasons

| Kolom       | Type  |
| ----------- | ----- |
| id          | uuid  |
| name        | text  |
| description | text  |
| config      | jsonb |

---

## 10. Progression

### 10.1 skills

| Kolom       | Type  |
| ----------- | ----- |
| id          | uuid  |
| tree        | text  |
| name        | text  |
| description | text  |
| tier        | int   |
| effects     | jsonb |

---

### 10.2 player_skills

| Kolom       | Type        |
| ----------- | ----------- |
| id          | uuid        |
| player_id   | uuid        |
| skill_id    | uuid        |
| unlocked_at | timestamptz |

---

### 10.3 achievements

| Kolom       | Type  |
| ----------- | ----- |
| id          | uuid  |
| name        | text  |
| description | text  |
| conditions  | jsonb |

---

### 10.4 player_achievements

| Kolom          | Type        |
| -------------- | ----------- |
| id             | uuid        |
| player_id      | uuid        |
| achievement_id | uuid        |
| unlocked_at    | timestamptz |

---

## 11. Relatie-overzicht (high level)

```
auth.users
   ↓
players
   ↓
holdings → companies → company_state / company_financials
   ↓                 ↘ decisions / events
worlds → world_economy_state
      ↘ world_sector_state
```

---

## 12. Ontwerpprincipes (BELANGRIJK)

* ❌ Geen business-logic in SQL
* ✅ Alle berekeningen in engine
* ❌ Geen cascades zonder nadenken
* ✅ Alles auditbaar per week
* ❌ Geen shortcuts
* ✅ Real-time speelbaar, maar historisch correct

---

**Status:** v1.0 – FINAL
**Wijzigingen hierna = breaking changes**

Volgende document:
➡️ `docs/SIMULATION_SPEC.md`

```
```
