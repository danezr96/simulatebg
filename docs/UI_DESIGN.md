````md
# UI_DESIGN.md  
**SimulateBG – UI Design System & Visual Language**

---

## 1. Design philosophy

**Core style:**  
Japandi × Modern SaaS × Simulation dashboard

This UI is intentionally:
- **Calm, minimal, readable**
- **Data-first, not flashy**
- **Premium but restrained**
- **Long-session friendly** (hours without fatigue)

We combine:
- **Japanese minimalism** → whitespace, balance, restraint  
- **Scandinavian warmth** → soft neutrals, rounded forms  
- **Modern SaaS clarity** → cards, tables, KPIs, panels  

> The UI should *never* feel like a game HUD.  
> It should feel like a **real executive dashboard** that happens to simulate a world.

---

## 2. Color system

### 2.1 Base palette (light mode)

| Token | Value | Usage |
|-----|------|------|
| `--bg` | `#f6f7f6` | App background |
| `--card` | `#ffffff` | Primary surfaces |
| `--card-2` | `#f1f3f4` | Secondary surfaces |
| `--border` | `#e5e7eb` | Subtle outlines |
| `--text` | `#1f2933` | Primary text |
| `--text-muted` | `#6b7280` | Secondary text |

### 2.2 Accent (Japandi blue)

| Token | Value | Usage |
|-----|------|------|
| `--accent` | `#3b82f6` | Primary actions |
| `--accent-muted` | `#93c5fd` | Soft highlights |
| `--accent-bg` | `#eff6ff` | Background highlights |

> Accent blue is **never dominant**.  
> It guides attention, not emotion.

### 2.3 Semantic colors

| Token | Usage |
|-----|------|
| `--success` | Profits, positive events |
| `--warning` | Risk, volatility |
| `--danger` | Bankruptcy, failure |

---

## 3. Typography

### 3.1 Font stack

```css
font-family:
  Inter,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  sans-serif;
````

**Why Inter?**

* Excellent numeric alignment
* Neutral personality
* Reads well at small sizes

### 3.2 Numeric data

Use **tabular numerals** everywhere for money, KPIs, tables:

```css
.mono {
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

---

## 4. Layout principles

### 4.1 Page structure

Every page follows:

```
[ Header ]
[ Intro / Context ]
[ Cards / Panels ]
[ Tables / Details ]
```

No full-width chaos.
Max width is always constrained.

### 4.2 Cards

Cards are the **atomic building block**.

Rules:

* Rounded (`24px`)
* Soft border
* Very subtle shadow
* Never harsh contrast

```tsx
<Card className="rounded-3xl p-5" />
```

Cards may contain:

* KPIs
* Forms
* Tables
* Nested cards (rare)

---

## 5. Motion & transitions

### 5.1 Philosophy

Motion is:

* **Functional**
* **Predictable**
* **Slow enough to feel intentional**

No bounce. No elastic motion. No “game juice”.

### 5.2 Motion tokens

From `src/config/motion.ts`:

* Section enter: fade + slide (6–10px)
* Modals: scale 0.96 → 1
* Lists: staggered children
* Loading: linear shimmer or progress bar

Example:

```ts
section: {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
}
```

---

## 6. Navigation

### 6.1 AppShell

* Global container
* Background
* Handles spacing & max-width

### 6.2 WorldShell

* In-world context
* Top header (world name, time)
* Bottom navigation (mobile-first)

Tabs:

* Overview
* Companies
* Decisions
* Market
* Profile

---

## 7. Components overview

### 7.1 Core components

| Component | Purpose                  |
| --------- | ------------------------ |
| `Button`  | Primary interaction      |
| `Card`    | Surface container        |
| `Table`   | Data-heavy views         |
| `Modal`   | Decisions & confirmation |
| `KPIChip` | Small metric indicators  |

### 7.2 Buttons

Variants:

* `primary` → blue accent
* `secondary` → neutral surface
* `ghost` → text-only

Rules:

* One **primary** action per card
* Never stack multiple primaries

---

## 8. Tables & data density

Tables are:

* Calm
* Row-hover only (no zebra stripes)
* Clickable rows where relevant

Rules:

* Align numbers right
* Use `mono` for numbers
* Never overload columns

Empty states always explain **what to do next**.

---

## 9. Forms & decisions

Forms should:

* Live inside cards or modals
* Group related inputs
* Never exceed 2 columns (desktop)

Decisions feel **deliberate**, not instant:

* Open modal
* Adjust knobs
* Confirm save

---

## 10. Accessibility & comfort

* Minimum text size: **12px**
* Contrast always AA+
* Click targets ≥ 36px
* No flashing animations
* Dark mode supported automatically

---

## 11. Anti-patterns (do NOT do)

❌ Neon colors
❌ Aggressive gradients
❌ Hard shadows
❌ Full-width tables
❌ “Game HUD” meters
❌ Animated numbers bouncing

---

## 12. Final intent

This UI should make players feel like:

> “I’m not playing a game.
> I’m running a real holding company in a living economy.”

If something looks fun but **reduces clarity** → remove it.
If something looks boring but **improves decision-making** → keep it.

---

**Status:** v1.0 (foundation)
**Next docs:**

* `UI_COMPONENTS.md`
* `UI_FLOWS.md`
* `THEME_TOKENS.md`

```
```
