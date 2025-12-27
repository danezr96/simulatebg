// src/config/economy.ts

/**
 * Economy configuration (single source of truth for sim defaults).
 * This is NOT player/bot data — it's the global baseline used by the engine.
 *
 * Notes:
 * - All numbers are tuned later; v0 values should be sane and stable.
 * - Engine should treat these as defaults and allow world/season overrides.
 */

export type DifficultyMode = "NORMAL" | "HARDCORE";
export type CorporateTaxModel = "FLAT";

/**
 * Corporate tax config (keep simple first).
 * If you later want brackets, switch model and add tiers.
 */
export type CorporateTaxConfig = {
  model: CorporateTaxModel;
  flatRate: number; // 0.0 - 1.0
  dividendWithholdingRate: number; // 0.0 - 1.0 (if you simulate payouts)
};

export type InterestRateConfig = {
  baseAnnualRate: number; // e.g. 0.02 = 2% yearly
  maxAnnualRate: number; // clamp
  minAnnualRate: number; // clamp
  // Convert annual to weekly: (1 + r)^(1/52) - 1
  compounding: "WEEKLY_EFFECTIVE";
};

export type InflationConfig = {
  baseAnnualInflation: number; // e.g. 0.02
  maxAnnualInflation: number;
  minAnnualInflation: number;
  passthroughToPrices: number; // 0..1 how much general inflation raises sector reference prices
  passthroughToWages: number; // 0..1
  compounding: "WEEKLY_EFFECTIVE";
};

export type WageIndexConfig = {
  baseIndex: number; // typically 1.0 at start
  annualDrift: number; // baseline wage growth excluding inflation, e.g. 0.005
};

export type DemandConfig = {
  // Global multiplier applied to all sectors (world macro modifiers can change this)
  globalDemandFactor: number; // 1.0 baseline
  // Randomness in global demand per week (macro noise)
  globalNoiseStd: number; // e.g. 0.02
};

export type CompanyAttractivenessWeights = {
  price: number; // negative effect when price is above reference price
  quality: number;
  marketing: number;
  reputation: number;
  location: number;
};

export type MarketShareConfig = {
  // Softmax temperature: higher = more even shares, lower = winner-takes-more
  softmaxTemperature: number; // e.g. 0.85
  // Clamp utility scores to avoid extreme exponentials
  utilityClamp: { min: number; max: number };
};

export type CapacityConfig = {
  // Penalty when demand exceeds capacity: drives complaints / reputation hits / churn
  overflowPenalty: number; // 0..1, influences lost demand / negative events
  // Penalty for idle capacity: drives inefficiency / margin pressure
  idlePenalty: number; // 0..1
};

export type CostConfig = {
  // Default split if niche config doesn't provide details
  // Used only as fallback.
  variableCostShareOfRevenue: number; // e.g. 0.45
  fixedCostShareOfRevenue: number; // e.g. 0.35
};

export type ReputationConfig = {
  // XP / level curve
  xpCurve: {
    // XP required for next level = base * level^exp
    base: number; // e.g. 100
    exponent: number; // e.g. 1.35
    maxLevel: number; // 999
  };
  // Weekly rep changes
  weeklyDelta: {
    profitBonus: number; // positive rep change for profitable week
    lossPenalty: number; // negative rep change for loss week
    bankruptcyPenalty: number; // big hit
    overflowPenalty: number; // capacity overflow hit
  };
};

export type LoanConfig = {
  // Minimum/maximum terms for generated offers
  termWeeks: { min: number; max: number };
  // Additional spread over base interest based on risk/reputation
  spread: { min: number; max: number };
  // Default leverage guardrails
  defaultMaxLeverageRatio: number; // totalDebt / totalAssets (holding policy default)
};

export type EventConfig = {
  // Baseline probabilities per week, can be overridden by seasons.
  globalCrisisChance: number; // 0..1
  sectorCrisisBaseChance: number; // 0..1
  companyEventBaseChance: number; // 0..1
  // Severity distribution controls
  severity: {
    min: number;
    max: number;
    skew: number; // 1 = uniform-ish; >1 biases toward low severity
  };
};

export type SimulationTimingConfig = {
  weeksPerTick: number;
  maxCatchUpWeeks: number;
};

/** ✅ Bot tuning used by botsEngine.ts */
export type BotsConfig = {
  price: {
    min: number;
    max: number;
    maxWeeklyDelta: number; // fraction, e.g. 0.05 => 5%
  };
  marketing: {
    min: number;
    max: number;
    maxWeeklyDelta: number; // fraction
  };
  staff: {
    min: number;
    max: number;
  };
  capacity: {
    defaultUnits: number;
  };
  react: {
    dominantShareThreshold: number; // share 0..1
    priceWarDelta: number; // fraction
    marketingBoost: number; // absolute spend bump
  };
};

export type EconomyConfig = {
  version: "v0.1";
  difficulty: DifficultyMode;

  time: SimulationTimingConfig;

  taxes: CorporateTaxConfig;
  interest: InterestRateConfig;
  inflation: InflationConfig;
  wages: WageIndexConfig;

  demand: DemandConfig;
  attractiveness: {
    weights: CompanyAttractivenessWeights;
  };
  marketShare: MarketShareConfig;
  capacity: CapacityConfig;

  costs: CostConfig;

  reputation: ReputationConfig;

  loans: LoanConfig;

  events: EventConfig;

  // ✅ Bots (engine tuning)
  bots: BotsConfig;

  // Accounting
  accounting: {
    defaultAssetLifetimeYears: number;
  };
};

export const ECONOMY: EconomyConfig = {
  version: "v0.1",
  difficulty: "NORMAL",

  time: {
    weeksPerTick: 1,
    maxCatchUpWeeks: 26,
  },

  taxes: {
    model: "FLAT",
    flatRate: 0.19,
    dividendWithholdingRate: 0.15,
  },

  interest: {
    baseAnnualRate: 0.02,
    minAnnualRate: 0.0,
    maxAnnualRate: 0.18,
    compounding: "WEEKLY_EFFECTIVE",
  },

  inflation: {
    baseAnnualInflation: 0.02,
    minAnnualInflation: -0.01,
    maxAnnualInflation: 0.12,
    passthroughToPrices: 0.85,
    passthroughToWages: 0.75,
    compounding: "WEEKLY_EFFECTIVE",
  },

  wages: {
    baseIndex: 1.0,
    annualDrift: 0.005,
  },

  demand: {
    globalDemandFactor: 1.0,
    globalNoiseStd: 0.02,
  },

  attractiveness: {
    weights: {
      price: 0.9,
      quality: 0.8,
      marketing: 0.55,
      reputation: 0.7,
      location: 0.35,
    },
  },

  marketShare: {
    softmaxTemperature: 0.85,
    utilityClamp: { min: -6, max: 6 },
  },

  capacity: {
    overflowPenalty: 0.35,
    idlePenalty: 0.12,
  },

  costs: {
    variableCostShareOfRevenue: 0.45,
    fixedCostShareOfRevenue: 0.35,
  },

  reputation: {
    xpCurve: {
      base: 110,
      exponent: 1.34,
      maxLevel: 999,
    },
    weeklyDelta: {
      profitBonus: 2.0,
      lossPenalty: -2.4,
      bankruptcyPenalty: -18,
      overflowPenalty: -1.2,
    },
  },

  loans: {
    termWeeks: { min: 12, max: 260 },
    spread: { min: 0.01, max: 0.16 },
    defaultMaxLeverageRatio: 0.65,
  },

  events: {
    globalCrisisChance: 0.004,
    sectorCrisisBaseChance: 0.01,
    companyEventBaseChance: 0.03,
    severity: { min: 0.6, max: 2.2, skew: 1.6 },
  },

  // ✅ botsEngine.ts expects this shape
  bots: {
    price: {
      min: 0.6,
      max: 1.8,
      maxWeeklyDelta: 0.05,
    },
    marketing: {
      min: 0,
      max: 100,
      maxWeeklyDelta: 0.15,
    },
    staff: {
      min: 1,
      max: 750,
    },
    capacity: {
      defaultUnits: 10,
    },
    react: {
      dominantShareThreshold: 0.35,
      priceWarDelta: 0.03,
      marketingBoost: 5,
    },
  },

  accounting: {
    defaultAssetLifetimeYears: 10,
  },
} as const;

// ✅ Alias so engines can import { economyConfig }
export const economyConfig = ECONOMY;
