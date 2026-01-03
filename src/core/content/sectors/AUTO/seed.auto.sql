-- ============================================================
-- AUTO sector seed (minimal stub)
-- ============================================================

insert into public.sectors (code, name, description, is_active)
values ('AUTO', 'Automotive & Mobility', 'Automotive commerce and mobility services', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;

-- ============================================================
-- AUTO Car Dealer seed (niche + products + upgrades + starting loadout)
-- ============================================================

-- Car Dealer niche
with sector as (
  select id from public.sectors where code = 'AUTO'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AUTO_DEALER',
  'Car Dealer',
  'Used/new car sales',
  $${
    "capexIntensity":"HIGH",
    "marginRange":{"min":0.02,"max":0.1},
    "demandVolatility":0.55,
    "priceElasticity":0.5,
    "labourIntensity":0.3,
    "skillIntensity":0.55,
    "regulationRisk":0.2,
    "assetLifetimeYears":10,
    "capacityElasticity":0.3,
    "ticketSize":"HIGH",
    "baseDemandLevel":260,
    "seasonalityPattern":{"monthlyFactors":[0.92,0.94,0.96,1,1.05,1.08,1.02,0.98,1.02,1.05,1.08,1.15]},
    "competitionType":"OLIGOPOLY",
    "decisionProfile":"SECTOR_AUTO",
    "upgradeProfile":"SERVICE",
    "startingLoadout":{
      "startingCash":250000,
      "assets":[
        {"assetId":"showroom_m2","count":250},
        {"assetId":"inventory_slots","count":25},
        {"assetId":"storage_slots","count":15},
        {"assetId":"reconditioning_bays","count":1},
        {"assetId":"inventory_used_units","count":12},
        {"assetId":"inventory_new_units","count":0},
        {"assetId":"inventory_avg_cost_used_eur","count":15000},
        {"assetId":"inventory_avg_cost_new_eur","count":28000},
        {"assetId":"inventory_floorplan_apr","count":0.09},
        {"assetId":"reconditioning_queue_units","count":4},
        {"assetId":"service_hours_capacity_per_tick","count":40},
        {"assetId":"lead_pool","count":80},
        {"assetId":"conversion_rate","count":0.06},
        {"assetId":"compliance_score","count":0.5},
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"warranty_claim_rate","count":0.04},
        {"assetId":"returns_rate","count":0.05},
        {"assetId":"appraisal_tools","count":0}
      ],
      "staff":[
        {"roleId":"sales_staff","fte":2},
        {"roleId":"service_staff","fte":1},
        {"roleId":"finance_staff","fte":0},
        {"roleId":"service_manager","fte":0},
        {"roleId":"manager","fte":1}
      ],
      "unlockedProducts":["used_car_unit"]
    },
    "unlockRules":[
      {"productSku":"used_car_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"detailing_service_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"reconditioning_bays","minCount":1}],
        "staff":[{"roleId":"service_staff","minFTE":1}]
      }},
      {"productSku":"trade_in_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"appraisal_tools","minCount":1}],
        "staff":[{"roleId":"sales_staff","minFTE":1}],
        "minCashEur":60000
      }},
      {"productSku":"financing_contract_unit","startingUnlocked":false,"requirements":{
        "staff":[{"roleId":"finance_staff","minFTE":1}],
        "minComplianceScore":0.7,
        "complianceAuditPassed":true
      }},
      {"productSku":"extended_warranty_unit","startingUnlocked":false,"requirements":{
        "minComplianceScore":0.75,
        "minReputationScore":0.55,
        "anyOf":[
          {"staff":[{"roleId":"finance_staff","minFTE":1}]},
          {"staff":[{"roleId":"service_manager","minFTE":1}]}
        ]
      }},
      {"productSku":"new_car_unit","startingUnlocked":false,"requirements":{
        "assets":[
          {"assetId":"showroom_m2","minCount":320},
          {"assetId":"inventory_slots","minCount":20}
        ],
        "staff":[{"roleId":"sales_staff","minFTE":2}],
        "upgrades":["manufacturer_dealership_agreement"],
        "minReputationScore":0.6
      }}
    ],
    "productFlows":{
      "trade_in_unit":{
        "cashflowDirection":"outflow",
        "inventoryUsedUnitsDelta":1
      }
    }
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Car Dealer products
with niche as (
  select id from public.niches where code = 'AUTO_DEALER'
),
product_seed as (
  select * from (values
    ('used_car_unit', 'Used Car', 'unit', 8000, 35000, 96, 105, 'inventory_slots', 'Used car sales with thin margins.'),
    ('new_car_unit', 'New Car', 'unit', 18000, 80000, 94, 99, 'inventory_slots', 'OEM-backed sales with very thin gross margin.'),
    ('trade_in_unit', 'Trade-In', 'unit', 6000, 20000, 110, 130, 'appraisal_tools', 'Negative cashflow intake that feeds used inventory.'),
    ('financing_contract_unit', 'Financing Contract', 'unit', 300, 1800, 20, 40, 'compliance_score', 'Commission-based finance revenue.'),
    ('extended_warranty_unit', 'Extended Warranty', 'unit', 250, 1500, 35, 60, 'compliance_score', 'Warranty sales with claim exposure.'),
    ('detailing_service_unit', 'Detailing Service', 'unit', 80, 450, 55, 80, 'reconditioning_bays', 'Service throughput consuming bay hours.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
),
deleted as (
  delete from public.niche_products
  where niche_id in (select id from niche)
)
insert into public.niche_products (
  niche_id,
  sku,
  name,
  unit,
  price_min_eur,
  price_max_eur,
  cogs_pct_min,
  cogs_pct_max,
  capacity_driver,
  notes
)
select
  niche.id,
  product_seed.sku,
  product_seed.name,
  product_seed.unit,
  product_seed.price_min_eur,
  product_seed.price_max_eur,
  product_seed.cogs_pct_min,
  product_seed.cogs_pct_max,
  product_seed.capacity_driver,
  product_seed.notes
from product_seed
cross join niche
on conflict do nothing;

-- Car Dealer upgrades
with niche as (
  select id from public.niches where code = 'AUTO_DEALER'
),
upgrade_seed as (
  select * from (values
    (
      'local_lead_gen_engine',
      'LEADS',
      'Local Lead Gen Engine',
      'Boosts lead intake and conversion.',
      1,
      0,
      1,
      '[{"key":"lead_pool","op":"add","range":[40,160]},{"key":"conversion_rate","op":"add","range":[0.01,0.03]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 3000..25000',
      'monthlyFixed 500..2500',
      1,
      1,
      '{"failureChancePctRange":[4,10],"variancePctRange":[5,12],"failureEffects":["lead_quality_drop_weeks 1..2"]}'::jsonb
    ),
    (
      'reconditioning_bay_expansion',
      'CAPACITY',
      'Reconditioning Bay Expansion',
      'Adds bay capacity and service hours.',
      2,
      0,
      4,
      '[{"key":"reconditioning_bays","op":"add","range":[1,3]},{"key":"service_hours_capacity_per_tick","op":"add","range":[20,60]}]'::jsonb,
      null,
      null,
      null,
      null,
      'reconditioning_bays * (25000..90000)',
      'monthlyFixed 800..3000',
      2,
      6,
      '{"failureChancePctRange":[6,14],"variancePctRange":[6,12],"failureEffects":["underutilized_capacity"]}'::jsonb
    ),
    (
      'finance_desk_compliance_program',
      'FINANCE',
      'Finance Desk & Compliance Program',
      'Unlock financing and warranty sales with compliance.',
      2,
      0,
      3,
      '[{"key":"compliance_score","op":"add","range":[0.1,0.25]},{"key":"compliance_audit_passed","op":"set","value":true},{"key":"unlock_products","op":"set","value":["financing_contract_unit","extended_warranty_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 10000..60000',
      'monthlyFixed 1000..6000',
      2,
      5,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["audit_failure_lockout_ticks 2..4"]}'::jsonb
    ),
    (
      'reputation_reviews_flywheel',
      'REPUTATION',
      'Reputation & Reviews Flywheel',
      'Improves pricing power and reduces returns.',
      1,
      0,
      1,
      '[{"key":"reputation_score","op":"add","range":[0.1,0.3]},{"key":"price_uplift","op":"mul","range":[1.01,1.04]},{"key":"returns_rate","op":"mul","range":[0.85,0.95]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..20000',
      'monthlyFixed 500..2500',
      1,
      1,
      '{"failureChancePctRange":[7,15],"variancePctRange":[6,12],"failureEffects":["visibility_backlash_event"]}'::jsonb
    ),
    (
      'manufacturer_dealership_agreement',
      'MANUFACTURER',
      'Manufacturer Dealership Agreement',
      'Unlock new car sales and stabilize supply.',
      3,
      0,
      8,
      '[{"key":"unlock_products","op":"set","value":["new_car_unit"]},{"key":"new_car_supply_stability","op":"mul","range":[1.2,1.4]},{"key":"inventory_floorplan_apr","op":"mul","range":[0.9,0.98]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 50000..250000',
      'monthlyFixed 2000..10000',
      4,
      10,
      '{"failureChancePctRange":[10,20],"variancePctRange":[8,15],"failureEffects":["sales_target_penalty_weeks 2..6"]}'::jsonb
    )
  ) as t(
    code,
    tree_key,
    name,
    description,
    tier,
    cost,
    duration_weeks,
    effects,
    capex_pct_min,
    capex_pct_max,
    opex_pct_min,
    opex_pct_max,
    capex_formula,
    opex_formula,
    delay_weeks_min,
    delay_weeks_max,
    risk
  )
)
insert into public.niche_upgrades (
  niche_id,
  code,
  tree_key,
  name,
  description,
  tier,
  cost,
  duration_weeks,
  effects,
  capex_pct_min,
  capex_pct_max,
  opex_pct_min,
  opex_pct_max,
  capex_formula,
  opex_formula,
  delay_weeks_min,
  delay_weeks_max,
  risk
)
select
  niche.id,
  upgrade_seed.code,
  upgrade_seed.tree_key,
  upgrade_seed.name,
  upgrade_seed.description,
  upgrade_seed.tier,
  upgrade_seed.cost,
  upgrade_seed.duration_weeks,
  upgrade_seed.effects,
  upgrade_seed.capex_pct_min::numeric,
  upgrade_seed.capex_pct_max::numeric,
  upgrade_seed.opex_pct_min::numeric,
  upgrade_seed.opex_pct_max::numeric,
  upgrade_seed.capex_formula,
  upgrade_seed.opex_formula,
  upgrade_seed.delay_weeks_min,
  upgrade_seed.delay_weeks_max,
  upgrade_seed.risk
from upgrade_seed
cross join niche
on conflict (niche_id, code) do update set
  tree_key = excluded.tree_key,
  name = excluded.name,
  description = excluded.description,
  tier = excluded.tier,
  cost = excluded.cost,
  duration_weeks = excluded.duration_weeks,
  effects = excluded.effects,
  capex_pct_min = excluded.capex_pct_min,
  capex_pct_max = excluded.capex_pct_max,
  opex_pct_min = excluded.opex_pct_min,
  opex_pct_max = excluded.opex_pct_max,
  capex_formula = excluded.capex_formula,
  opex_formula = excluded.opex_formula,
  delay_weeks_min = excluded.delay_weeks_min,
  delay_weeks_max = excluded.delay_weeks_max,
  risk = excluded.risk;

-- ============================================================
-- AUTO Car Wash seed (niche + products + starting loadout)
-- ============================================================

-- Car Wash niche
with sector as (
  select id from public.sectors where code = 'AUTO'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AUTO_CARWASH',
  'Car Wash',
  'High-volume wash services with weather-driven demand',
  $${
    "capexIntensity":"MEDIUM",
    "marginRange":{"min":0.1,"max":0.28},
    "demandVolatility":0.25,
    "priceElasticity":0.4,
    "labourIntensity":0.25,
    "skillIntensity":0.3,
    "regulationRisk":0.15,
    "assetLifetimeYears":10,
    "capacityElasticity":0.45,
    "ticketSize":"LOW",
    "baseDemandLevel":520,
    "seasonalityPattern":{"monthlyFactors":[0.9,0.92,0.97,1.03,1.08,1.12,1.1,1.05,1,0.97,0.92,0.88]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_AUTO",
    "upgradeProfile":"SERVICE",
    "coreAssumptions":{
      "tickMinutes":10,
      "ticksPerDay":144,
      "ticksPerWeek":1008
    },
    "operations":{
      "laneThroughputPerTick":{"base":2,"max":4},
      "interiorOutputPerTickMax":2,
      "detailingOutputPerTickMax":1
    },
    "maintenance":{
      "levels":[
        {"level":0,"costPerLanePerTick":0.05,"breakdownChancePct":0.35},
        {"level":1,"costPerLanePerTick":0.2,"breakdownChancePct":0.2},
        {"level":2,"costPerLanePerTick":0.45,"breakdownChancePct":0.1},
        {"level":3,"costPerLanePerTick":0.8,"breakdownChancePct":0.06}
      ],
      "downtimeTicksRange":{"min":2,"max":12}
    },
    "queue":{
      "waitPenalty":{
        "low":0,
        "medium":-0.05,
        "high":-0.15
      }
    },
    "opsResolution":{
      "staffing":{
        "laneFtePerLane":1,
        "interiorFtePerBay":1,
        "detailingFtePerBay":1,
        "frontOfHouseFteMin":0.2,
        "trainingProductivityPctPerLevel":3,
        "trainingProductivityCapPct":15,
        "absenceUsesMorale":true,
        "staffShortageCapacityFloor":0.4
      },
      "supplyConsumption":{
        "chemicalsUnitsPerWash":{
          "carwash_basic_exterior_unit":1,
          "carwash_standard_unit":1.2,
          "carwash_premium_unit":1.5,
          "carwash_ultimate_unit":1.8
        },
        "consumablesUnitsPerJob":{
          "carwash_interior_quick_unit":1.2,
          "carwash_detailing_session_unit":3.5
        },
        "sparePartsUnitsPerLanePerDay":0.15
      },
      "supplyShortageEffects":{
        "capacityMultiplierAtZeroSupply":0.4,
        "qualityMultiplierAtZeroSupply":0.85,
        "cancellationRatePct":6
      },
      "maintenanceEffects":{
        "downtimeCapacityMultiplier":0,
        "queuePenaltyOnBreakdownPct":15,
        "reputationHitPerCancelledWashPct":0.5
      },
      "energyModes":{
        "normal":{"energyCostMultiplier":1,"throughputMultiplier":1,"qualityMultiplier":1},
        "eco":{"energyCostMultiplier":0.88,"throughputMultiplier":0.94,"qualityMultiplier":0.98},
        "peak_avoid":{"energyCostMultiplier":0.9,"throughputMultiplier":0.97,"qualityMultiplier":0.99}
      },
      "realizedCapacityFormula":"min(planned, laneCap * staffFactor * supplyFactor * energyFactor * downtimeFactor)"
    },
    "demandEngine":{
      "zoneScaling":{"min":1,"max":25,"companiesPerZone":2},
      "regionCarsTotalRanges":[
        {"minCompanies":2,"maxCompanies":5,"carsTotalRange":[80000,200000]},
        {"minCompanies":6,"maxCompanies":15,"carsTotalRange":[200000,500000]},
        {"minCompanies":16,"maxCompanies":40,"carsTotalRange":[600000,1400000]}
      ],
      "zoneCarsRange":{"min":20000,"max":90000},
      "zoneIncomeIndexRange":[0.75,1.35],
      "zoneCommuterIndexRange":[0.7,1.45],
      "baseWashesPerCarPerMonth":{"urban":0.45,"suburban":0.55,"carHeavy":0.65},
      "seasonMultipliers":{"winter":1.1,"spring":0.95,"summer":0.9,"autumn":1.05},
      "weatherMultipliers":{
        "heavy_rain":0.55,
        "light_rain":0.75,
        "cloudy":0.95,
        "sunny":1.1,
        "snow_freezing":0.7
      },
      "weatherProfiles":{
        "winter":{"snow_freezing":0.3,"cloudy":0.3,"light_rain":0.2,"heavy_rain":0.1,"sunny":0.1},
        "spring":{"cloudy":0.3,"light_rain":0.25,"heavy_rain":0.15,"sunny":0.3},
        "summer":{"sunny":0.45,"cloudy":0.25,"light_rain":0.15,"heavy_rain":0.1,"snow_freezing":0.05},
        "autumn":{"cloudy":0.3,"light_rain":0.25,"heavy_rain":0.2,"sunny":0.2,"snow_freezing":0.05},
        "default":{"sunny":0.3,"cloudy":0.25,"light_rain":0.2,"heavy_rain":0.15,"snow_freezing":0.1}
      },
      "saltWeekChance":0.04,
      "saltWeekMultiplier":1.35,
      "macroMultiplierRange":{"min":0.85,"max":1.15},
      "categoryGrowth":{"min":1,"max":1.6,"targetCapMultiplier":2.2},
      "captureRatio":{"min":0.35,"max":0.85,"base":0.45,"convWeight":0.2,"awWeight":0.2},
      "segmentShares":{"budget":0.3,"standard":0.35,"premium":0.2,"ultimate":0.1,"noise":0.05},
      "incomeShift":{"lowIndex":0.8,"highIndex":1.2},
      "addOnRateRange":{"min":0.08,"max":0.16},
      "detailingRateRange":{"min":0.002,"max":0.01},
      "fleetShareMax":0.15,
        "latentDemand":{
          "carryoverRates":{
            "sunny":0.35,
            "cloudy":0.25,
            "light_rain":0.2,
            "heavy_rain":0.1,
            "snow_freezing":0.15
          }
        }
      },
      "marketAllocation":{
        "segmentSkuMap":{
          "budget":"carwash_basic_exterior_unit",
          "standard":"carwash_standard_unit",
          "premium":"carwash_premium_unit",
          "ultimate":"carwash_ultimate_unit",
          "interior_addon":"carwash_interior_quick_unit",
          "detailing":"carwash_detailing_session_unit",
          "fleet":"carwash_standard_unit"
        },
        "elasticities":{
          "budget":2,
          "standard":1.3,
          "premium":0.9,
          "ultimate":0.7,
          "interior_addon":1.1,
          "detailing":0.5,
          "fleet":1.2
        },
        "priceFactorClamp":{"min":0.65,"max":1.45},
        "softmaxTemperature":10,
        "weights":{"price":1,"quality":0.8,"marketing":0.55,"reputation":0.7,"availability":0.6},
        "referencePrice":{"ewmaAlpha":0.02,"maxMovePct":0.08,"minPriceFloor":1}
      },
      "warehouse":{
      "storageCapacityUnitsStart":10000,
      "orderQtyRange":{"min":0,"max":50000,"step":100},
      "reorderPointRange":{"min":0,"max":20000,"step":100},
      "safetyStockRange":{"min":0,"max":30000,"step":100},
      "storageUpgrades":[
        {"capacityUnits":10000,"capexRangeEur":{"min":1500,"max":4000},"opexPerTickRangeEur":{"min":0.05,"max":0.2}},
        {"capacityUnits":50000,"capexRangeEur":{"min":6000,"max":14000},"opexPerTickRangeEur":{"min":0.2,"max":0.6}}
      ],
      "holdingCostPctPerDay":0.0002,
      "shrinkPerDayPct":{"consumables":0.0001,"chemicals":0.00005}
    },
    "procurement":{
      "supplierTiers":{
        "C":{"priceIndex":0.75,"reliabilityRange":[55,70],"qualityRange":[50,65],"leadTimeTicksRange":[12,60],"fillRateRange":[85,95],"moqUnits":2000},
        "B":{"priceIndex":1,"reliabilityRange":[70,85],"qualityRange":[65,80],"leadTimeTicksRange":[12,36],"fillRateRange":[92,98],"moqUnits":1000},
        "A":{"priceIndex":1.25,"reliabilityRange":[85,96],"qualityRange":[80,92],"leadTimeTicksRange":[6,24],"fillRateRange":[96,99.5],"moqUnits":800}
      },
      "baseChemicalsTierB":{
        "shampooCostEur":0.22,
        "foamCostEur":0.18,
        "waxCostEur":0.35,
        "ceramicLiteCostEur":0.55,
        "wasteFactorDefault":1.1
      },
      "contractOptions":{
        "spot":{"feeRangeEur":{"min":0,"max":0}},
        "contract7d":{"feeRangeEur":{"min":250,"max":1000},"priceDiscountPctRange":{"min":3,"max":8},"reliabilityBonus":3},
        "contract30d":{"feeRangeEur":{"min":1200,"max":4500},"priceDiscountPctRange":{"min":6,"max":15},"reliabilityBonus":6,"leadTimeVarianceReductionPct":20}
      }
    },
    "marketing":{
      "campaigns":{
        "performance_ads":{"budgetPerTickRangeEur":{"min":0,"max":120,"step":5},"minDurationTicks":12,"maxDurationTicks":120,"expectedLiftPctRange":{"min":0.6,"max":2.2}},
        "local_flyers_partnerships":{"budgetPerTickRangeEur":{"min":0,"max":60,"step":2},"minDurationTicks":36,"maxDurationTicks":180,"expectedLiftPctRange":{"min":0.3,"max":1.1}},
        "review_push":{"budgetPerTickRangeEur":{"min":0,"max":50,"step":2},"minDurationTicks":24,"maxDurationTicks":120,"expectedLiftPctRange":{"min":0.2,"max":0.9}},
        "hr_branding":{"budgetPerTickRangeEur":{"min":0,"max":40,"step":2},"minDurationTicks":72,"maxDurationTicks":240,"expectedLiftPctRange":{"min":0.15,"max":0.6}},
        "fleet_outreach":{"budgetPerTickRangeEur":{"min":0,"max":80,"step":4},"minDurationTicks":72,"maxDurationTicks":200,"expectedLiftPctRange":{"min":0.4,"max":1.6}},
        "referral_rewards":{"budgetPerTickRangeEur":{"min":0,"max":70,"step":3},"minDurationTicks":24,"maxDurationTicks":160,"expectedLiftPctRange":{"min":0.35,"max":1.4}}
      },
      "upsell":{
        "upgradeRateBoostPctPerStaffRange":{"min":0.5,"max":2.5},
        "upgradeRateBoostTotalCapPct":18
      }
    },
    "hr":{
      "hourlyCostRangeEur":{
        "junior_wash":[17,27],
        "senior_wash":[22,35],
        "detailer_skilled":[28,45],
        "maintenance_tech":[30,50],
        "manager":[35,60]
      },
      "hiringCostRangeEur":{
        "junior_wash":[150,450],
        "senior_wash":[300,900],
        "detailer_skilled":[400,1200]
      },
      "hiringLeadTimeTicksRange":{"min":6,"max":36},
      "firingPenaltyRangeEur":{"min":0,"max":600},
      "trainingLevels":{"min":0,"max":5},
      "trainingCostRangeEur":{"min":80,"max":450},
      "trainingTimeTicksRange":{"min":6,"max":30},
      "trainingEffects":{"productivityPctPerLevel":3,"qualityPctPerLevel":2,"upsellPctPerLevel":4},
      "moraleBaseline":60,
      "absenteeismChancePctByMorale":[
        {"min":80,"max":100,"chancePct":0.03},
        {"min":60,"max":79,"chancePct":0.07},
        {"min":40,"max":59,"chancePct":0.14},
        {"min":0,"max":39,"chancePct":0.25}
      ]
    },
    "pricing":{
      "promoDiscountPctRange":{"min":0,"max":35,"step":1},
      "promoDurationTicksRange":{"min":6,"max":72},
      "priceStepEur":0.5,
      "detailingPriceStepEur":5
    },
    "finance":{
      "startingCashRangeEur":{"min":15000,"max":40000},
      "optionalStartLoanRangeEur":{"min":0,"max":60000},
      "loanTypes":{
        "working_capital":{"principalRangeEur":{"min":5000,"max":80000},"aprRangePct":{"min":6.5,"max":14.5},"termDaysRange":{"min":7,"max":60},"earlyRepayFeePctRange":{"min":0,"max":1.5}},
        "equipment_loan":{"principalRangeEur":{"min":20000,"max":250000},"aprRangePct":{"min":4.8,"max":9.5},"termDaysRange":{"min":90,"max":720},"dscrMin":1.1},
        "lease":{"laneLeaseCostPerTickRangeEur":{"min":1.1,"max":2.4}}
      },
      "extraRepayPerTickMaxEur":2000
    },
    "softStats":{
      "reachFormula":"clamp(0.10 + Awareness/125, 0.10, 0.90)",
      "conversionMultiplierFormula":"0.70 + Reputation/200",
      "qualityRefundsPctByScore":[
        {"min":0,"max":54,"refundRangePct":[1,4]},
        {"min":55,"max":75,"refundRangePct":[0.3,1.2]},
        {"min":76,"max":100,"refundRangePct":[0.05,0.4]}
      ],
      "efficiencyCostMultiplierFormula":"clamp(0.70, 1.08, 1.08 - Efficiency/250)",
      "statDriftCapsPerTick":{"reputation":0.15,"awarenessUp":0.1,"awarenessDecay":-0.02,"efficiency":0.05}
    },
    "offers":{
      "carwash_basic_exterior_unit":{
        "name":"Basic Exterior",
        "priceRangeEur":{"min":6.5,"max":12.5,"step":0.5,"baseline":9},
        "costsEur":{"chemicals":{"min":0.35,"max":0.75},"utilities":{"min":0.2,"max":0.6},"labor":{"min":0.2,"max":0.8}},
        "serviceTimeMinutesRange":{"min":3,"max":5}
      },
      "carwash_standard_unit":{
        "name":"Standard",
        "priceRangeEur":{"min":9.5,"max":16.5,"step":0.5,"baseline":12.5},
        "costsEur":{"chemicals":{"min":0.55,"max":1.1},"utilities":{"min":0.3,"max":0.8},"labor":{"min":0.25,"max":0.9}}
      },
      "carwash_premium_unit":{
        "name":"Premium",
        "priceRangeEur":{"min":12.5,"max":22.5,"step":0.5,"baseline":16.5},
        "costsEur":{"chemicals":{"min":0.85,"max":1.8},"utilities":{"min":0.35,"max":1},"labor":{"min":0.3,"max":1.2}}
      },
      "carwash_ultimate_unit":{
        "name":"Ultimate",
        "priceRangeEur":{"min":16.5,"max":29.5,"step":0.5,"baseline":21.5},
        "costsEur":{"chemicals":{"min":1.2,"max":2.6},"utilities":{"min":0.45,"max":1.4},"labor":{"min":0.35,"max":1.4}}
      },
      "carwash_interior_quick_unit":{
        "name":"Interior Quick Clean",
        "priceRangeEur":{"min":6,"max":18,"step":0.5,"baseline":10},
        "costsEur":{"consumables":{"min":0.6,"max":1.8},"labor":{"min":2,"max":6.5}},
        "serviceTimeMinutesRange":{"min":8,"max":15},
        "outputPerTickMax":2
      },
      "carwash_detailing_session_unit":{
        "name":"Detailing Session",
        "priceRangeEur":{"min":60,"max":180,"step":5,"baseline":110},
        "costsEur":{"consumables":{"min":4,"max":18},"labor":{"min":20,"max":85}},
        "serviceTimeMinutesRange":{"min":60,"max":180},
        "outputPerTickMax":1
      }
    },
    "decisionSchema":{
      "operations":{
        "targetOutputPerOffer":{"type":"integer","min":0,"maxBy":"capacity"},
        "openStatus":{"type":"boolean","scope":"per_tick"},
        "staffAllocation":{"type":"allocation","scope":"per_role"},
        "maintenanceLevel":{"type":"integer","min":0,"max":3,"step":1},
        "energyMode":{"type":"enum","options":["normal","eco","peak_avoid"]},
        "queuePolicy":{"type":"enum","options":["walk_in_only","reservations"]}
      },
      "warehouse":{
        "orderQty":{"type":"integer","min":0,"max":50000,"step":100,"unit":"wash_units"},
        "reorderPoint":{"type":"integer","min":0,"max":20000,"step":100},
        "safetyStock":{"type":"integer","min":0,"max":30000,"step":100},
        "storageUpgrades":{"type":"toggle","scope":"module"}
      },
      "procurement":{
        "supplierChoice":{"type":"enum","scope":"per_category"},
        "spotOrContract":{"type":"enum","options":["spot","contract_7d","contract_30d"]},
        "qualityLevel":{"type":"enum","options":["budget","standard","premium"]}
      },
      "marketing":{
        "campaigns":{"type":"budget","scope":"per_campaign"},
        "promotions":{"type":"discount","maxPct":35}
      },
      "hr":{
        "hireFire":{"type":"integer","scope":"per_role"},
        "wagePolicy":{"type":"range","scope":"per_role"},
        "trainingLevel":{"type":"integer","min":0,"max":5},
        "shiftPlanning":{"type":"schedule"}
      },
      "pricing":{
        "pricePerOffer":{"type":"range","stepEur":0.5},
        "promoDiscountPct":{"type":"range","min":0,"max":35},
        "promoDurationTicks":{"type":"range","min":6,"max":72}
      },
      "finance":{
        "loans":{"type":"option","scope":"per_loan_type"},
        "extraRepayPerTick":{"type":"range","min":0,"max":2000}
      }
    },
    "productSeasonalityKeys":{
      "carwash_basic_exterior_unit":"car_wash_weather_seasonality",
      "carwash_standard_unit":"car_wash_weather_seasonality",
      "carwash_premium_unit":"car_wash_weather_seasonality",
      "carwash_ultimate_unit":"car_wash_weather_seasonality",
      "carwash_interior_quick_unit":"car_wash_weather_seasonality",
      "carwash_detailing_session_unit":"car_wash_weather_seasonality"
    },
    "startingLoadout":{
      "startingCash":25000,
      "assets":[
        {"assetId":"wash_lanes","count":1},
        {"assetId":"interior_bays","count":0},
        {"assetId":"detailing_bays","count":0},
        {"assetId":"storage_capacity_wash_units","count":10000},
        {"assetId":"chemicals_inventory_units","count":1200},
        {"assetId":"consumables_inventory_units","count":600},
        {"assetId":"spare_parts_inventory_units","count":200},
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"awareness_score","count":0.2},
        {"assetId":"service_quality_score","count":0.55},
        {"assetId":"reliability_score","count":0.6},
        {"assetId":"operational_efficiency_score","count":0.5},
        {"assetId":"employee_morale_score","count":0.6}
      ],
      "staff":[
        {"roleId":"junior_wash","fte":2},
        {"roleId":"senior_wash","fte":0},
        {"roleId":"detailer_skilled","fte":0},
        {"roleId":"maintenance_tech","fte":0},
        {"roleId":"manager","fte":0}
      ],
      "unlockedProducts":["carwash_basic_exterior_unit"]
    },
    "unlockRules":[
      {"productSku":"carwash_basic_exterior_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"carwash_standard_unit","startingUnlocked":false,"requirements":{"minReputationScore":0.5}},
      {"productSku":"carwash_premium_unit","startingUnlocked":false,"requirements":{"minReputationScore":0.55}},
      {"productSku":"carwash_ultimate_unit","startingUnlocked":false,"requirements":{"minReputationScore":0.6}},
      {"productSku":"carwash_interior_quick_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"interior_bays","minCount":1}],
        "staff":[{"roleId":"detailer_skilled","minFTE":1}],
        "upgrades":["interior_bay"]
      }},
      {"productSku":"carwash_detailing_session_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"detailing_bays","minCount":1}],
        "staff":[{"roleId":"detailer_skilled","minFTE":1}],
        "minReputationScore":0.6,
        "upgrades":["detailing_bay"]
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Car Wash products
with niche as (
  select id from public.niches where code = 'AUTO_CARWASH'
),
product_seed as (
  select * from (values
    ('carwash_basic_exterior_unit', 'Basic Exterior', 'unit', 6.5, 12.5, 8, 32, 'wash_lanes', 'Entry wash package.'),
    ('carwash_standard_unit', 'Standard', 'unit', 9.5, 16.5, 8, 30, 'wash_lanes', 'Foam and rinse package.'),
    ('carwash_premium_unit', 'Premium', 'unit', 12.5, 22.5, 8, 32, 'wash_lanes', 'Wax and underbody wash.'),
    ('carwash_ultimate_unit', 'Ultimate', 'unit', 16.5, 29.5, 8, 33, 'wash_lanes', 'Premium drying and ceramic-lite finish.'),
    ('carwash_interior_quick_unit', 'Interior Quick Clean', 'unit', 6, 18, 20, 85, 'interior_bays', 'Labor-heavy interior add-on.'),
    ('carwash_detailing_session_unit', 'Detailing Session', 'unit', 60, 180, 25, 90, 'detailing_bays', 'High-touch detailing service.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
),
deleted as (
  delete from public.niche_products
  where niche_id in (select id from niche)
)
insert into public.niche_products (
  niche_id,
  sku,
  name,
  unit,
  price_min_eur,
  price_max_eur,
  cogs_pct_min,
  cogs_pct_max,
  capacity_driver,
  notes
)
select
  niche.id,
  product_seed.sku,
  product_seed.name,
  product_seed.unit,
  product_seed.price_min_eur,
  product_seed.price_max_eur,
  product_seed.cogs_pct_min,
  product_seed.cogs_pct_max,
  product_seed.capacity_driver,
  product_seed.notes
from product_seed
cross join niche
on conflict do nothing;

-- Car Wash upgrades
with niche as (
  select id from public.niches where code = 'AUTO_CARWASH'
),
upgrade_seed as (
  select * from (values
    (
      'conveyor_speed_kit',
      'THROUGHPUT',
      'Conveyor Speed Kit',
      'Increases wash throughput per lane.',
      1,
      0,
      2,
      '[{"key":"capacity","op":"mul","range":[1.12,1.18]},{"key":"opex","op":"mul","range":[1.01,1.03]}]'::jsonb,
      null,
      null,
      0.01,
      0.03,
      'capex 9000..18000',
      null,
      1,
      2,
      null
    ),
    (
      'add_second_lane',
      'THROUGHPUT',
      'Add Second Lane',
      'Adds an extra wash lane for major capacity gains.',
      2,
      0,
      6,
      '[{"key":"capacity","op":"mul","range":[1.8,2.2]}]'::jsonb,
      null,
      null,
      0.02,
      0.05,
      'capex 65000..140000',
      null,
      2,
      4,
      null
    ),
    (
      'extra_dryer_modules',
      'QUALITY',
      'Extra Dryer Modules',
      'Boosts drying quality and modestly improves throughput.',
      1,
      0,
      3,
      '[{"key":"capacity","op":"mul","range":[1.04,1.08]},{"key":"quality","op":"add","range":[0.03,0.05]}]'::jsonb,
      null,
      null,
      0.01,
      0.03,
      'capex 12000..28000',
      null,
      1,
      3,
      null
    ),
    (
      'water_recycling',
      'SUSTAINABILITY',
      'Water Recycling',
      'Cuts water usage and improves reputation.',
      2,
      0,
      4,
      '[{"key":"unitCost","op":"mul","range":[0.6,0.75]},{"key":"reputation_score","op":"add","range":[1,3]}]'::jsonb,
      null,
      null,
      0.005,
      0.015,
      'capex 18000..55000',
      null,
      1,
      3,
      null
    ),
    (
      'solar_panels',
      'SUSTAINABILITY',
      'Solar Panels',
      'Reduces energy costs and lifts green reputation.',
      2,
      0,
      5,
      '[{"key":"unitCost","op":"mul","range":[0.72,0.9]},{"key":"reputation_score","op":"add","range":[1,2]}]'::jsonb,
      null,
      null,
      0.002,
      0.008,
      'capex 22000..70000',
      null,
      2,
      4,
      null
    ),
    (
      'chemical_dosing_optimizer',
      'SUSTAINABILITY',
      'Chemical Dosing Optimizer',
      'Reduces chemical waste while lifting wash quality.',
      1,
      0,
      2,
      '[{"key":"unitCost","op":"mul","range":[0.82,0.92]},{"key":"quality","op":"add","range":[0.01,0.02]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 6000..16000',
      null,
      1,
      2,
      null
    ),
    (
      'premium_brush_set',
      'QUALITY',
      'Premium Brush Set',
      'Improves finish quality and reduces complaints.',
      2,
      0,
      3,
      '[{"key":"quality","op":"add","range":[0.05,0.08]},{"key":"reputation_score","op":"add","range":[2,4]}]'::jsonb,
      null,
      null,
      0.004,
      0.01,
      'capex 8000..22000',
      null,
      1,
      3,
      null
    ),
    (
      'loyalty_system',
      'RETENTION',
      'Loyalty System',
      'Improves repeat rate for returning customers.',
      2,
      0,
      2,
      '[{"key":"repeat_rate","op":"mul","range":[1.06,1.16]}]'::jsonb,
      null,
      null,
      0.003,
      0.01,
      'capex 2500..9000',
      null,
      1,
      2,
      null
    ),
    (
      'memberships',
      'RETENTION',
      'Memberships',
      'Adds subscription-style demand and stabilizes volume.',
      3,
      0,
      4,
      '[{"key":"base_demand","op":"mul","range":[1.06,1.18]},{"key":"repeat_rate","op":"mul","range":[1.05,1.12]}]'::jsonb,
      null,
      null,
      0.005,
      0.02,
      'capex 6000..20000',
      null,
      2,
      4,
      null
    ),
    (
      'training_program',
      'HR',
      'Training Program',
      'Improves productivity and service quality.',
      1,
      0,
      2,
      '[{"key":"unitCost","op":"mul","range":[0.96,0.99]},{"key":"quality","op":"add","range":[0.01,0.02]}]'::jsonb,
      null,
      null,
      0.002,
      0.006,
      'capex 1000..4000',
      null,
      1,
      2,
      null
    ),
    (
      'scheduling_software',
      'HR',
      'Scheduling Software',
      'Cuts absentee impact and improves throughput.',
      1,
      0,
      2,
      '[{"key":"capacity","op":"mul","range":[1.02,1.05]}]'::jsonb,
      null,
      null,
      0.001,
      0.004,
      'capex 800..3500',
      null,
      1,
      2,
      null
    ),
    (
      'interior_bay',
      'BAYS',
      'Interior Bay',
      'Adds an interior bay and unlocks interior services.',
      2,
      0,
      4,
      '[{"key":"unlock_products","op":"set","value":["carwash_interior_quick_unit"]},{"key":"capacity","op":"mul","range":[1.05,1.12]}]'::jsonb,
      null,
      null,
      0.01,
      0.03,
      'capex 9000..30000',
      null,
      1,
      3,
      null
    ),
    (
      'detailing_bay',
      'BAYS',
      'Detailing Bay',
      'Adds a detailing bay and unlocks detailing sessions.',
      3,
      0,
      5,
      '[{"key":"unlock_products","op":"set","value":["carwash_detailing_session_unit"]},{"key":"capacity","op":"mul","range":[1.02,1.08]},{"key":"quality","op":"add","range":[0.02,0.05]}]'::jsonb,
      null,
      null,
      0.02,
      0.05,
      'capex 18000..85000',
      null,
      2,
      4,
      null
    )
  ) as t(
    code,
    tree_key,
    name,
    description,
    tier,
    cost,
    duration_weeks,
    effects,
    capex_pct_min,
    capex_pct_max,
    opex_pct_min,
    opex_pct_max,
    capex_formula,
    opex_formula,
    delay_weeks_min,
    delay_weeks_max,
    risk
  )
)
insert into public.niche_upgrades (
  niche_id,
  code,
  tree_key,
  name,
  description,
  tier,
  cost,
  duration_weeks,
  effects,
  capex_pct_min,
  capex_pct_max,
  opex_pct_min,
  opex_pct_max,
  capex_formula,
  opex_formula,
  delay_weeks_min,
  delay_weeks_max,
  risk
)
select
  niche.id,
  upgrade_seed.code,
  upgrade_seed.tree_key,
  upgrade_seed.name,
  upgrade_seed.description,
  upgrade_seed.tier,
  upgrade_seed.cost,
  upgrade_seed.duration_weeks,
  upgrade_seed.effects,
  upgrade_seed.capex_pct_min::numeric,
  upgrade_seed.capex_pct_max::numeric,
  upgrade_seed.opex_pct_min::numeric,
  upgrade_seed.opex_pct_max::numeric,
  upgrade_seed.capex_formula,
  upgrade_seed.opex_formula,
  upgrade_seed.delay_weeks_min,
  upgrade_seed.delay_weeks_max,
  upgrade_seed.risk
from upgrade_seed
cross join niche
on conflict (niche_id, code) do update set
  tree_key = excluded.tree_key,
  name = excluded.name,
  description = excluded.description,
  tier = excluded.tier,
  cost = excluded.cost,
  duration_weeks = excluded.duration_weeks,
  effects = excluded.effects,
  capex_pct_min = excluded.capex_pct_min,
  capex_pct_max = excluded.capex_pct_max,
  opex_pct_min = excluded.opex_pct_min,
  opex_pct_max = excluded.opex_pct_max,
  capex_formula = excluded.capex_formula,
  opex_formula = excluded.opex_formula,
  delay_weeks_min = excluded.delay_weeks_min,
  delay_weeks_max = excluded.delay_weeks_max,
  risk = excluded.risk;

-- ============================================================
-- AUTO Repair Shop seed (niche + products + upgrades + starting loadout)
-- ============================================================

-- Repair Shop niche
with sector as (
  select id from public.sectors where code = 'AUTO'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AUTO_REPAIR',
  'Repair Shop',
  'Mechanical repair services and diagnostics',
  $${
    "capexIntensity":"MEDIUM",
    "marginRange":{"min":0.08,"max":0.25},
    "demandVolatility":0.35,
    "priceElasticity":0.45,
    "labourIntensity":0.7,
    "skillIntensity":0.6,
    "regulationRisk":0.15,
    "assetLifetimeYears":7,
    "capacityElasticity":0.4,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":420,
    "seasonalityPattern":{"monthlyFactors":[0.95,0.98,1.05,1.08,1.02,0.98,0.95,0.97,1.03,1.08,1.05,0.96]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_AUTO",
    "upgradeProfile":"SERVICE",
    "productSeasonalityKeys":{
      "inspection_service_unit":"inspection_peak_seasonality",
      "tires_service_unit":"winter_tires_seasonality",
      "diagnostics_advanced_unit":"inspection_peak_seasonality",
      "ev_repair_job_unit":"summer_travel_mobility_seasonality"
    },
    "startingLoadout":{
      "startingCash":140000,
      "assets":[
        {"assetId":"service_bays","count":2},
        {"assetId":"lifts","count":2},
        {"assetId":"diagnostic_tools_level","count":1},
        {"assetId":"ev_tools_enabled","count":0},
        {"assetId":"shop_software_enabled","count":0},
        {"assetId":"labor_hours_capacity_per_tick","count":60},
        {"assetId":"queue_jobs_count","count":6},
        {"assetId":"average_wait_ticks","count":2},
        {"assetId":"max_queue_before_churn","count":18},
        {"assetId":"customer_satisfaction_score","count":0.55},
        {"assetId":"parts_inventory_value_eur","count":20000},
        {"assetId":"parts_fill_rate","count":0.75},
        {"assetId":"supplier_lead_time_ticks_min","count":1},
        {"assetId":"supplier_lead_time_ticks_max","count":3},
        {"assetId":"parts_price_index","count":1},
        {"assetId":"parts_stockouts_count","count":0},
        {"assetId":"comeback_rate","count":0.05},
        {"assetId":"warranty_reserve_eur","count":5000},
        {"assetId":"comeback_queue_jobs_count","count":0},
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"compliance_score","count":0.55}
      ],
      "staff":[
        {"roleId":"technician","fte":2},
        {"roleId":"master_tech","fte":0},
        {"roleId":"service_advisor","fte":1}
      ],
      "unlockedProducts":["inspection_service_unit","oil_service_unit"]
    },
    "unlockRules":[
      {"productSku":"inspection_service_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"oil_service_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"lifts","minCount":1}],
        "staff":[{"roleId":"technician","minFTE":1}]
      }},
      {"productSku":"tires_service_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"lifts","minCount":1}],
        "staff":[{"roleId":"technician","minFTE":2}]
      }},
      {"productSku":"brake_job_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"service_bays","minCount":2}],
        "staff":[{"roleId":"technician","minFTE":2}],
        "minReputationScore":0.45
      }},
      {"productSku":"diagnostics_advanced_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"diagnostic_tools_level","minCount":2}],
        "staff":[{"roleId":"master_tech","minFTE":1}],
        "minReputationScore":0.55
      }},
      {"productSku":"ev_repair_job_unit","startingUnlocked":false,"requirements":{
        "assets":[
          {"assetId":"diagnostic_tools_level","minCount":3},
          {"assetId":"ev_tools_enabled","minCount":1}
        ],
        "staff":[{"roleId":"master_tech","minFTE":1}],
        "minComplianceScore":0.75,
        "minReputationScore":0.6,
        "upgrades":["ev_certification_high_voltage_tools"]
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Repair Shop products
with niche as (
  select id from public.niches where code = 'AUTO_REPAIR'
),
product_seed as (
  select * from (values
    ('inspection_service_unit', 'Inspection Service', 'unit', 45, 120, 40, 70, 'service_bays', 'Regulated inspection work.'),
    ('oil_service_unit', 'Oil Service', 'unit', 90, 220, 55, 80, 'service_bays', 'Quick service with parts dependency.'),
    ('brake_job_unit', 'Brake Job', 'unit', 280, 900, 55, 85, 'service_bays', 'Labor plus parts intensive job.'),
    ('tires_service_unit', 'Tires Service', 'unit', 60, 180, 45, 75, 'lifts', 'Seasonal tire service work.'),
    ('diagnostics_advanced_unit', 'Advanced Diagnostics', 'unit', 80, 250, 45, 75, 'diagnostic_tools_level', 'Tooling gated diagnostics.'),
    ('ev_repair_job_unit', 'EV Repair Job', 'unit', 250, 2000, 60, 90, 'diagnostic_tools_level', 'High-voltage repair job.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
),
deleted as (
  delete from public.niche_products
  where niche_id in (select id from niche)
)
insert into public.niche_products (
  niche_id,
  sku,
  name,
  unit,
  price_min_eur,
  price_max_eur,
  cogs_pct_min,
  cogs_pct_max,
  capacity_driver,
  notes
)
select
  niche.id,
  product_seed.sku,
  product_seed.name,
  product_seed.unit,
  product_seed.price_min_eur,
  product_seed.price_max_eur,
  product_seed.cogs_pct_min,
  product_seed.cogs_pct_max,
  product_seed.capacity_driver,
  product_seed.notes
from product_seed
cross join niche
on conflict do nothing;

-- Repair Shop upgrades
with niche as (
  select id from public.niches where code = 'AUTO_REPAIR'
),
upgrade_seed as (
  select * from (values
    (
      'shop_management_software',
      'OPS',
      'Shop Management Software',
      'Scheduling and CRM improvements.',
      1,
      0,
      2,
      '[{"key":"shop_software_enabled","op":"set","value":true},{"key":"average_wait_ticks","op":"mul","range":[0.75,0.9]},{"key":"customer_satisfaction_score","op":"add","range":[0.02,0.06]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..25000',
      'monthlyFixed 100..800',
      1,
      3,
      '{"failureChancePctRange":[6,12],"variancePctRange":[5,10],"failureEffects":["adoption_dip_capacity"]}'::jsonb
    ),
    (
      'bay_lift_expansion',
      'CAPACITY',
      'Bay & Lift Expansion',
      'Adds bay and lift capacity.',
      2,
      0,
      4,
      '[{"key":"service_bays","op":"add","range":[1,3]},{"key":"lifts","op":"add","range":[1,2]},{"key":"labor_hours_capacity_per_tick","op":"add","range":[15,45]}]'::jsonb,
      null,
      null,
      null,
      null,
      'service_bays * 20000..80000 + lifts * 8000..30000',
      'monthlyFixed 600..2200',
      2,
      6,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["underutilized_capacity"]}'::jsonb
    ),
    (
      'parts_supplier_diversification',
      'SUPPLY',
      'Parts Supplier Diversification',
      'Improves fill rate at higher cost.',
      1,
      0,
      1,
      '[{"key":"parts_fill_rate","op":"add","range":[0.1,0.25]},{"key":"supplier_lead_time_ticks","op":"mul","range":[0.6,0.8]},{"key":"parts_stockouts_count","op":"mul","range":[0.3,0.7]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0',
      'parts_cost * 1.02..1.08',
      1,
      1,
      '{"failureChancePctRange":[5,9],"variancePctRange":[4,8],"failureEffects":["parts_cost_pressure"]}'::jsonb
    ),
    (
      'technician_training_program',
      'QUALITY',
      'Technician Training Program',
      'Reduces comebacks and improves efficiency.',
      2,
      0,
      3,
      '[{"key":"comeback_rate","op":"mul","range":[0.65,0.9]},{"key":"labor_hours_per_job","op":"mul","range":[0.85,0.95]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..20000',
      'monthlyFixed 300..1500',
      2,
      5,
      '{"failureChancePctRange":[7,14],"variancePctRange":[6,12],"failureEffects":["training_capacity_dip"]}'::jsonb
    ),
    (
      'advanced_diagnostics_suite',
      'TOOLS',
      'Advanced Diagnostics Suite',
      'Unlocks advanced diagnostics tools.',
      2,
      0,
      3,
      '[{"key":"diagnostic_tools_level","op":"add","range":[1,1]},{"key":"unlock_products","op":"set","value":["diagnostics_advanced_unit"]},{"key":"comeback_rate","op":"mul","range":[0.9,0.97]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 10000..80000',
      'monthlyFixed 200..1200',
      2,
      4,
      '{"failureChancePctRange":[8,15],"variancePctRange":[5,10],"failureEffects":["tool_breakdown_downtime"]}'::jsonb
    ),
    (
      'ev_certification_high_voltage_tools',
      'EV',
      'EV Certification & High-Voltage Tools',
      'Enables EV repair work with compliance.',
      3,
      0,
      6,
      '[{"key":"ev_tools_enabled","op":"set","value":true},{"key":"compliance_score","op":"add","range":[0.1,0.2]},{"key":"unlock_products","op":"set","value":["ev_repair_job_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 20000..150000',
      'monthlyFixed 300..2000',
      4,
      8,
      '{"failureChancePctRange":[10,18],"variancePctRange":[8,14],"failureEffects":["audit_failure_lockout_ticks 2..4"]}'::jsonb
    )
  ) as t(
    code,
    tree_key,
    name,
    description,
    tier,
    cost,
    duration_weeks,
    effects,
    capex_pct_min,
    capex_pct_max,
    opex_pct_min,
    opex_pct_max,
    capex_formula,
    opex_formula,
    delay_weeks_min,
    delay_weeks_max,
    risk
  )
)
insert into public.niche_upgrades (
  niche_id,
  code,
  tree_key,
  name,
  description,
  tier,
  cost,
  duration_weeks,
  effects,
  capex_pct_min,
  capex_pct_max,
  opex_pct_min,
  opex_pct_max,
  capex_formula,
  opex_formula,
  delay_weeks_min,
  delay_weeks_max,
  risk
)
select
  niche.id,
  upgrade_seed.code,
  upgrade_seed.tree_key,
  upgrade_seed.name,
  upgrade_seed.description,
  upgrade_seed.tier,
  upgrade_seed.cost,
  upgrade_seed.duration_weeks,
  upgrade_seed.effects,
  upgrade_seed.capex_pct_min::numeric,
  upgrade_seed.capex_pct_max::numeric,
  upgrade_seed.opex_pct_min::numeric,
  upgrade_seed.opex_pct_max::numeric,
  upgrade_seed.capex_formula,
  upgrade_seed.opex_formula,
  upgrade_seed.delay_weeks_min,
  upgrade_seed.delay_weeks_max,
  upgrade_seed.risk
from upgrade_seed
cross join niche
on conflict (niche_id, code) do update set
  tree_key = excluded.tree_key,
  name = excluded.name,
  description = excluded.description,
  tier = excluded.tier,
  cost = excluded.cost,
  duration_weeks = excluded.duration_weeks,
  effects = excluded.effects,
  capex_pct_min = excluded.capex_pct_min,
  capex_pct_max = excluded.capex_pct_max,
  opex_pct_min = excluded.opex_pct_min,
  opex_pct_max = excluded.opex_pct_max,
  capex_formula = excluded.capex_formula,
  opex_formula = excluded.opex_formula,
  delay_weeks_min = excluded.delay_weeks_min,
  delay_weeks_max = excluded.delay_weeks_max,
  risk = excluded.risk;

-- ============================================================
-- AUTO EV Services seed (niche + products + upgrades + starting loadout)
-- ============================================================

-- EV Services niche
with sector as (
  select id from public.sectors where code = 'AUTO'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AUTO_EV',
  'EV Services',
  'Charging operations and installation services',
  $${
    "capexIntensity":"HIGH",
    "marginRange":{"min":0.08,"max":0.25},
    "demandVolatility":0.5,
    "priceElasticity":0.6,
    "labourIntensity":0.4,
    "skillIntensity":0.6,
    "regulationRisk":0.25,
    "assetLifetimeYears":12,
    "capacityElasticity":0.35,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":320,
    "seasonalityPattern":{"monthlyFactors":[0.82,0.86,0.93,1,1.08,1.18,1.28,1.22,1.05,0.92,0.86,0.8]},
    "competitionType":"OLIGOPOLY",
    "decisionProfile":"SECTOR_AUTO",
    "upgradeProfile":"SERVICE",
    "productSeasonalityKeys":{
      "ac_charge_session_unit":"summer_travel_mobility_seasonality",
      "dc_fast_charge_session_unit":"summer_travel_mobility_seasonality",
      "kwh_energy_sale_kwh":"summer_travel_mobility_seasonality",
      "charging_membership_monthly_unit":"summer_travel_mobility_seasonality",
      "fleet_charging_contract_unit":"summer_travel_mobility_seasonality",
      "installation_service_unit":"inspection_peak_seasonality"
    },
    "startingLoadout":{
      "startingCash":220000,
      "assets":[
        {"assetId":"chargers_ac_count","count":4},
        {"assetId":"chargers_dc_count","count":0},
        {"assetId":"charger_power_ac_kw","count":11},
        {"assetId":"charger_power_dc_kw","count":100},
        {"assetId":"site_count","count":1},
        {"assetId":"parking_bays_count","count":6},
        {"assetId":"grid_capacity_kw","count":100},
        {"assetId":"peak_demand_kw","count":60},
        {"assetId":"uptime_score","count":0.82},
        {"assetId":"utilization_rate","count":0.35},
        {"assetId":"location_quality_score","count":0.45},
        {"assetId":"compliance_score","count":0.55},
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"metering_enabled","count":0},
        {"assetId":"membership_active_count","count":0},
        {"assetId":"fleet_contracts_active_count","count":0},
        {"assetId":"maintenance_backlog_units","count":2},
        {"assetId":"demand_charge_exposure_score","count":0.55},
        {"assetId":"support_response_time_score","count":0.6},
        {"assetId":"energy_purchase_price_eur_per_kwh","count":0.28},
        {"assetId":"retail_price_eur_per_kwh_base","count":0.55},
        {"assetId":"grid_fee_eur_per_kwh_base","count":0.07},
        {"assetId":"payment_processing_pct","count":0.02},
        {"assetId":"average_session_kwh_ac","count":14},
        {"assetId":"average_session_kwh_dc","count":42}
      ],
      "staff":[
        {"roleId":"operations_tech","fte":1},
        {"roleId":"support_agent","fte":1},
        {"roleId":"certified_installer","fte":0}
      ],
      "unlockedProducts":["ac_charge_session_unit"]
    },
    "unlockRules":[
      {"productSku":"ac_charge_session_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"kwh_energy_sale_kwh","startingUnlocked":false,"requirements":{
        "minComplianceScore":0.55,
        "anyOf":[
          {"assets":[{"assetId":"metering_enabled","minCount":1}]},
          {"upgrades":["smart_metering_dynamic_pricing"]}
        ]
      }},
      {"productSku":"dc_fast_charge_session_unit","startingUnlocked":false,"requirements":{
        "assets":[
          {"assetId":"chargers_dc_count","minCount":1},
          {"assetId":"grid_capacity_kw","minCount":180}
        ],
        "upgrades":["electrical_safety_program"],
        "minComplianceScore":0.65
      }},
      {"productSku":"charging_membership_monthly_unit","startingUnlocked":false,"requirements":{
        "upgrades":["crm_billing_system"],
        "minReputationScore":0.55,
        "minUptimeScore":0.85
      }},
      {"productSku":"fleet_charging_contract_unit","startingUnlocked":false,"requirements":{
        "upgrades":["fleet_partnerships_program"],
        "minComplianceScore":0.7,
        "minReputationScore":0.6,
        "minUptimeScore":0.9,
        "minChargersTotal":6
      }},
      {"productSku":"installation_service_unit","startingUnlocked":false,"requirements":{
        "staff":[{"roleId":"certified_installer","minFTE":1}],
        "upgrades":["site_permitting_pipeline"],
        "minComplianceScore":0.75
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- EV Services products
with niche as (
  select id from public.niches where code = 'AUTO_EV'
),
product_seed as (
  select * from (values
    ('ac_charge_session_unit', 'AC Charge Session', 'unit', 2, 8, 70, 90, 'chargers_ac_count', 'Session-based charging with uptime exposure.'),
    ('dc_fast_charge_session_unit', 'DC Fast Charge Session', 'unit', 8, 35, 75, 95, 'chargers_dc_count', 'Fast charging sessions with grid cost exposure.'),
    ('kwh_energy_sale_kwh', 'Metered Energy Sale', 'kwh', 0.35, 0.85, 70, 90, 'grid_capacity_kw', 'kWh retail pricing enabled by metering.'),
    ('charging_membership_monthly_unit', 'Charging Membership', 'unit', 5, 20, 20, 50, 'uptime_score', 'Recurring membership revenue with churn risk.'),
    ('fleet_charging_contract_unit', 'Fleet Charging Contract', 'unit', 800, 12000, 55, 85, 'chargers_dc_count', 'Uptime-gated fleet agreements with SLA risk.'),
    ('installation_service_unit', 'Installation Service', 'unit', 1200, 12000, 70, 90, 'certified_installer', 'Install and commissioning service.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
),
deleted as (
  delete from public.niche_products
  where niche_id in (select id from niche)
)
insert into public.niche_products (
  niche_id,
  sku,
  name,
  unit,
  price_min_eur,
  price_max_eur,
  cogs_pct_min,
  cogs_pct_max,
  capacity_driver,
  notes
)
select
  niche.id,
  product_seed.sku,
  product_seed.name,
  product_seed.unit,
  product_seed.price_min_eur,
  product_seed.price_max_eur,
  product_seed.cogs_pct_min,
  product_seed.cogs_pct_max,
  product_seed.capacity_driver,
  product_seed.notes
from product_seed
cross join niche
on conflict do nothing;

-- EV Services upgrades
with niche as (
  select id from public.niches where code = 'AUTO_EV'
),
upgrade_seed as (
  select * from (values
    (
      'site_permitting_pipeline',
      'SITE',
      'Site Acquisition & Permitting Pipeline',
      'Secures new charging sites with permitting.',
      2,
      0,
      6,
      '[{"key":"site_count","op":"add","range":[1,2]},{"key":"location_quality_score","op":"add","range":[0.05,0.2]}]'::jsonb,
      null,
      null,
      null,
      null,
      'site_count * 5000..60000',
      'monthlyFixed 300..1200',
      3,
      10,
      '{"failureChancePctRange":[10,22],"variancePctRange":[8,16],"failureEffects":["permit_delay_ticks 2..5","sunk_costs_if_rejected"]}'::jsonb
    ),
    (
      'dc_fast_charger_expansion',
      'CAPACITY',
      'DC Fast Charger Expansion',
      'Adds DC fast charging capacity.',
      3,
      0,
      8,
      '[{"key":"chargers_dc_count","op":"add","range":[1,3]},{"key":"peak_demand_kw","op":"add","range":[40,120]},{"key":"utilization_rate","op":"add","range":[0.03,0.08]}]'::jsonb,
      null,
      null,
      null,
      null,
      'chargers_dc_count * 60000..300000',
      'monthlyFixed 800..3500',
      4,
      12,
      '{"failureChancePctRange":[10,20],"variancePctRange":[8,16],"failureEffects":["demand_charge_spike","low_utilization"]}'::jsonb
    ),
    (
      'smart_metering_dynamic_pricing',
      'PRICING',
      'Smart Metering & Dynamic Pricing',
      'Enables metered pricing and dynamic margins.',
      2,
      0,
      4,
      '[{"key":"metering_enabled","op":"set","value":true},{"key":"unlock_products","op":"set","value":["kwh_energy_sale_kwh"]},{"key":"retail_price_eur_per_kwh_base","op":"mul","range":[0.95,1.05]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..25000',
      'monthlyFixed 100..1000',
      2,
      6,
      '{"failureChancePctRange":[6,14],"variancePctRange":[5,10],"failureEffects":["customer_backlash","price_volatility_visible"]}'::jsonb
    ),
    (
      'maintenance_uptime_program',
      'OPS',
      'Maintenance & Uptime Program',
      'Improves uptime and reduces maintenance backlog.',
      1,
      0,
      1,
      '[{"key":"uptime_score","op":"add","range":[0.05,0.15]},{"key":"maintenance_backlog_units","op":"mul","range":[0.6,0.85]},{"key":"support_response_time_score","op":"add","range":[0.02,0.05]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0',
      'monthlyFixed 500..6000',
      1,
      1,
      '{"failureChancePctRange":[4,10],"variancePctRange":[4,8],"failureEffects":["fixed_cost_burden"]}'::jsonb
    ),
    (
      'onsite_battery_buffer',
      'ENERGY',
      'Onsite Battery Buffer',
      'Reduces demand charge exposure during peaks.',
      3,
      0,
      8,
      '[{"key":"demand_charge_exposure_score","op":"mul","range":[0.6,0.85]},{"key":"grid_capacity_kw","op":"add","range":[20,80]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 30000..500000',
      'monthlyFixed 400..2500',
      4,
      10,
      '{"failureChancePctRange":[9,18],"variancePctRange":[7,14],"failureEffects":["battery_degradation_costs","underutilized_storage"]}'::jsonb
    ),
    (
      'crm_billing_system',
      'CRM',
      'CRM & Billing Subscription System',
      'Enables memberships and improves support.',
      2,
      0,
      4,
      '[{"key":"unlock_products","op":"set","value":["charging_membership_monthly_unit"]},{"key":"membership_active_count","op":"add","range":[100,400]},{"key":"support_response_time_score","op":"add","range":[0.04,0.1]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 3000..40000',
      'monthlyFixed 200..2000',
      2,
      5,
      '{"failureChancePctRange":[7,14],"variancePctRange":[6,12],"failureEffects":["implementation_dip_capacity 5..10%"]}'::jsonb
    ),
    (
      'electrical_safety_program',
      'COMPLIANCE',
      'Electrical Safety & Compliance Program',
      'Improves compliance and unlocks DC charging.',
      2,
      0,
      2,
      '[{"key":"compliance_score","op":"add","range":[0.1,0.25]},{"key":"unlock_products","op":"set","value":["dc_fast_charge_session_unit"]},{"key":"uptime_score","op":"add","range":[0.02,0.05]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 1000..20000',
      'monthlyFixed 100..1200',
      1,
      3,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["audit_failure_lockout_ticks 1..3"]}'::jsonb
    ),
    (
      'fleet_partnerships_program',
      'FLEET',
      'Fleet Partnerships Program',
      'Secures fleet contracts and improves reputation.',
      3,
      0,
      5,
      '[{"key":"unlock_products","op":"set","value":["fleet_charging_contract_unit"]},{"key":"fleet_contracts_active_count","op":"add","range":[1,3]},{"key":"reputation_score","op":"add","range":[0.03,0.08]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 5000..50000',
      'monthlyFixed 600..2500',
      3,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[8,14],"failureEffects":["sla_penalties_if_uptime_drops"]}'::jsonb
    )
  ) as t(
    code,
    tree_key,
    name,
    description,
    tier,
    cost,
    duration_weeks,
    effects,
    capex_pct_min,
    capex_pct_max,
    opex_pct_min,
    opex_pct_max,
    capex_formula,
    opex_formula,
    delay_weeks_min,
    delay_weeks_max,
    risk
  )
)
insert into public.niche_upgrades (
  niche_id,
  code,
  tree_key,
  name,
  description,
  tier,
  cost,
  duration_weeks,
  effects,
  capex_pct_min,
  capex_pct_max,
  opex_pct_min,
  opex_pct_max,
  capex_formula,
  opex_formula,
  delay_weeks_min,
  delay_weeks_max,
  risk
)
select
  niche.id,
  upgrade_seed.code,
  upgrade_seed.tree_key,
  upgrade_seed.name,
  upgrade_seed.description,
  upgrade_seed.tier,
  upgrade_seed.cost,
  upgrade_seed.duration_weeks,
  upgrade_seed.effects,
  upgrade_seed.capex_pct_min::numeric,
  upgrade_seed.capex_pct_max::numeric,
  upgrade_seed.opex_pct_min::numeric,
  upgrade_seed.opex_pct_max::numeric,
  upgrade_seed.capex_formula,
  upgrade_seed.opex_formula,
  upgrade_seed.delay_weeks_min,
  upgrade_seed.delay_weeks_max,
  upgrade_seed.risk
from upgrade_seed
cross join niche
on conflict (niche_id, code) do update set
  tree_key = excluded.tree_key,
  name = excluded.name,
  description = excluded.description,
  tier = excluded.tier,
  cost = excluded.cost,
  duration_weeks = excluded.duration_weeks,
  effects = excluded.effects,
  capex_pct_min = excluded.capex_pct_min,
  capex_pct_max = excluded.capex_pct_max,
  opex_pct_min = excluded.opex_pct_min,
  opex_pct_max = excluded.opex_pct_max,
  capex_formula = excluded.capex_formula,
  opex_formula = excluded.opex_formula,
  delay_weeks_min = excluded.delay_weeks_min,
  delay_weeks_max = excluded.delay_weeks_max,
  risk = excluded.risk;

-- ============================================================
-- AUTO Mobility seed (niche + products + upgrades + starting loadout)
-- ============================================================

-- Mobility niche
with sector as (
  select id from public.sectors where code = 'AUTO'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AUTO_MOBILITY',
  'Mobility',
  'Fleet mobility and rental operations',
  $${
    "capexIntensity":"HIGH",
    "marginRange":{"min":0.07,"max":0.28},
    "demandVolatility":0.45,
    "priceElasticity":0.5,
    "labourIntensity":0.35,
    "skillIntensity":0.5,
    "regulationRisk":0.2,
    "assetLifetimeYears":6,
    "capacityElasticity":0.4,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":380,
    "seasonalityPattern":{"monthlyFactors":[0.85,0.9,0.95,1.02,1.12,1.22,1.32,1.28,1.1,0.98,0.92,0.88]},
    "competitionType":"OLIGOPOLY",
    "decisionProfile":"SECTOR_AUTO",
    "upgradeProfile":"SERVICE",
    "productSeasonalityKeys":{
      "economy_rental_day_unit":"summer_travel_mobility_seasonality",
      "premium_rental_day_unit":"summer_travel_mobility_seasonality",
      "van_rental_day_unit":"summer_travel_mobility_seasonality",
      "corporate_fleet_contract_unit":"summer_travel_mobility_seasonality",
      "insurance_addon_day_unit":"summer_travel_mobility_seasonality",
      "delivery_mobility_day_unit":"summer_travel_mobility_seasonality"
    },
    "startingLoadout":{
      "startingCash":260000,
      "assets":[
        {"assetId":"fleet_economy_count","count":10},
        {"assetId":"fleet_premium_count","count":0},
        {"assetId":"fleet_van_count","count":1},
        {"assetId":"downtime_pct","count":0.1},
        {"assetId":"uptime_score","count":0.9},
        {"assetId":"utilization_rate_target","count":0.45},
        {"assetId":"utilization_rate_actual","count":0.35},
        {"assetId":"bookings_pipeline_units","count":12},
        {"assetId":"cancellations_rate","count":0.08},
        {"assetId":"workshop_capacity_vehicles_per_tick","count":2},
        {"assetId":"cleaning_capacity_vehicles_per_tick","count":6},
        {"assetId":"maintenance_backlog_units","count":3},
        {"assetId":"accident_rate_per_day","count":0.006},
        {"assetId":"claim_severity_eur_min","count":800},
        {"assetId":"claim_severity_eur_max","count":8000},
        {"assetId":"deductible_eur","count":1200},
        {"assetId":"insurance_reserve_eur","count":12000},
        {"assetId":"fraud_risk_score","count":0.35},
        {"assetId":"fleet_financing_apr","count":0.08},
        {"assetId":"residual_value_score","count":0.45},
        {"assetId":"retail_channel_score","count":0.35},
        {"assetId":"corporate_channel_score","count":0.1},
        {"assetId":"delivery_channel_score","count":0.05},
        {"assetId":"compliance_score","count":0.55},
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"booking_system_enabled","count":0},
        {"assetId":"insurance_eur_per_day_base","count":7}
      ],
      "staff":[
        {"roleId":"ops_staff","fte":2},
        {"roleId":"customer_support_staff","fte":1},
        {"roleId":"corporate_sales_staff","fte":0},
        {"roleId":"logistics_staff","fte":0}
      ],
      "unlockedProducts":["economy_rental_day_unit"]
    },
    "unlockRules":[
      {"productSku":"economy_rental_day_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"insurance_addon_day_unit","startingUnlocked":false,"requirements":{
        "upgrades":["online_booking_dynamic_pricing"],
        "minReputationScore":0.45
      }},
      {"productSku":"premium_rental_day_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"fleet_premium_count","minCount":2}],
        "staff":[{"roleId":"customer_support_staff","minFTE":1}],
        "minReputationScore":0.55
      }},
      {"productSku":"van_rental_day_unit","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"fleet_van_count","minCount":2}],
        "staff":[{"roleId":"logistics_staff","minFTE":1}],
        "minComplianceScore":0.55
      }},
      {"productSku":"delivery_mobility_day_unit","startingUnlocked":false,"requirements":{
        "upgrades":["delivery_partnerships_program"],
        "assets":[
          {"assetId":"fleet_van_count","minCount":2},
          {"assetId":"fleet_economy_count","minCount":6}
        ],
        "staff":[{"roleId":"logistics_staff","minFTE":1}],
        "minComplianceScore":0.65,
        "minUptimeScore":0.85,
        "minFleetTotal":10
      }},
      {"productSku":"corporate_fleet_contract_unit","startingUnlocked":false,"requirements":{
        "upgrades":["corporate_contracting_sla_program"],
        "staff":[{"roleId":"corporate_sales_staff","minFTE":1}],
        "minComplianceScore":0.7,
        "minReputationScore":0.6,
        "minUptimeScore":0.9,
        "minFleetTotal":18
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Mobility products
with niche as (
  select id from public.niches where code = 'AUTO_MOBILITY'
),
product_seed as (
  select * from (values
    ('economy_rental_day_unit', 'Economy Rental Day', 'unit', 25, 70, 65, 80, 'fleet_economy_count', 'Core rental day product with utilization sensitivity.'),
    ('premium_rental_day_unit', 'Premium Rental Day', 'unit', 65, 180, 60, 75, 'fleet_premium_count', 'Premium rentals with higher service expectations.'),
    ('van_rental_day_unit', 'Van Rental Day', 'unit', 55, 150, 60, 75, 'fleet_van_count', 'Utility rentals with compliance requirements.'),
    ('corporate_fleet_contract_unit', 'Corporate Fleet Contract', 'unit', 1000, 25000, 65, 85, 'uptime_score', 'Contract revenue tied to uptime and SLAs.'),
    ('insurance_addon_day_unit', 'Insurance Add-on Day', 'unit', 6, 20, 20, 40, 'booking_system_enabled', 'High-margin insurance add-on per rental day.'),
    ('delivery_mobility_day_unit', 'Delivery Mobility Day', 'unit', 40, 120, 60, 80, 'fleet_van_count', 'Last-mile delivery utilization with higher wear.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
),
deleted as (
  delete from public.niche_products
  where niche_id in (select id from niche)
)
insert into public.niche_products (
  niche_id,
  sku,
  name,
  unit,
  price_min_eur,
  price_max_eur,
  cogs_pct_min,
  cogs_pct_max,
  capacity_driver,
  notes
)
select
  niche.id,
  product_seed.sku,
  product_seed.name,
  product_seed.unit,
  product_seed.price_min_eur,
  product_seed.price_max_eur,
  product_seed.cogs_pct_min,
  product_seed.cogs_pct_max,
  product_seed.capacity_driver,
  product_seed.notes
from product_seed
cross join niche
on conflict do nothing;

-- Mobility upgrades
with niche as (
  select id from public.niches where code = 'AUTO_MOBILITY'
),
upgrade_seed as (
  select * from (values
    (
      'online_booking_dynamic_pricing',
      'DIGITAL',
      'Online Booking System & Dynamic Pricing',
      'Improves retail booking and utilization.',
      2,
      0,
      3,
      '[{"key":"booking_system_enabled","op":"set","value":true},{"key":"retail_channel_score","op":"add","range":[0.1,0.3]},{"key":"cancellations_rate","op":"mul","range":[0.85,0.95]},{"key":"utilization_rate_target","op":"add","range":[0.05,0.15]},{"key":"unlock_products","op":"set","value":["insurance_addon_day_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 5000..60000',
      'monthlyFixed 200..2000',
      2,
      5,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["pricing_backlash_reputation_drop","conversion_volatility"]}'::jsonb
    ),
    (
      'fleet_expansion_economy_program',
      'FLEET',
      'Fleet Expansion Program (Economy)',
      'Adds economy vehicles to grow capacity.',
      2,
      0,
      4,
      '[{"key":"fleet_economy_count","op":"add","range":[3,8]},{"key":"bookings_pipeline_units","op":"add","range":[6,18]}]'::jsonb,
      null,
      null,
      null,
      null,
      'fleet_economy_count * (8000..22000)',
      'monthlyFixed 400..1800',
      2,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[8,14],"failureEffects":["utilization_drop","financing_pressure"]}'::jsonb
    ),
    (
      'premium_fleet_acquisition',
      'PREMIUM',
      'Premium Fleet Acquisition',
      'Adds premium vehicles and improves brand mix.',
      2,
      0,
      5,
      '[{"key":"fleet_premium_count","op":"add","range":[1,4]},{"key":"reputation_score","op":"add","range":[0.03,0.08]}]'::jsonb,
      null,
      null,
      null,
      null,
      'fleet_premium_count * (25000..75000)',
      'monthlyFixed 600..2400',
      3,
      8,
      '{"failureChancePctRange":[10,20],"variancePctRange":[8,16],"failureEffects":["claim_severity_increase","downtime_spike"]}'::jsonb
    ),
    (
      'maintenance_turnaround_optimization',
      'OPS',
      'Maintenance & Turnaround Optimization',
      'Reduces downtime and improves turnaround.',
      1,
      0,
      1,
      '[{"key":"downtime_pct","op":"mul","range":[0.7,0.9]},{"key":"cleaning_capacity_vehicles_per_tick","op":"add","range":[1,3]},{"key":"maintenance_backlog_units","op":"mul","range":[0.7,0.9]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0',
      'monthlyFixed 500..8000',
      1,
      1,
      '{"failureChancePctRange":[6,12],"variancePctRange":[5,10],"failureEffects":["fixed_cost_pressure"]}'::jsonb
    ),
    (
      'telematics_risk_scoring',
      'RISK',
      'Telematics & Risk Scoring',
      'Reduces accidents and insurance costs.',
      2,
      0,
      4,
      '[{"key":"accident_rate_per_day","op":"mul","range":[0.7,0.9]},{"key":"fraud_risk_score","op":"mul","range":[0.8,0.95]},{"key":"insurance_eur_per_day_base","op":"mul","range":[0.9,0.98]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 3000..40000',
      'per_vehicle_monthly 2..10',
      2,
      6,
      '{"failureChancePctRange":[9,16],"variancePctRange":[6,12],"failureEffects":["privacy_backlash_reputation_drop"]}'::jsonb
    ),
    (
      'corporate_contracting_sla_program',
      'CORP',
      'Corporate Contracting & SLA Program',
      'Unlocks corporate contracts and SLA operations.',
      3,
      0,
      5,
      '[{"key":"unlock_products","op":"set","value":["corporate_fleet_contract_unit"]},{"key":"corporate_channel_score","op":"add","range":[0.1,0.3]},{"key":"reputation_score","op":"add","range":[0.02,0.06]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 5000..80000',
      'monthlyFixed 500..6000',
      3,
      7,
      '{"failureChancePctRange":[10,18],"variancePctRange":[8,14],"failureEffects":["sla_penalties","contract_churn"]}'::jsonb
    ),
    (
      'delivery_partnerships_program',
      'DELIVERY',
      'Delivery Partnerships Program',
      'Unlocks delivery fleet utilization.',
      3,
      0,
      5,
      '[{"key":"unlock_products","op":"set","value":["delivery_mobility_day_unit"]},{"key":"delivery_channel_score","op":"add","range":[0.1,0.35]},{"key":"utilization_rate_target","op":"add","range":[0.03,0.08]},{"key":"maintenance_backlog_units","op":"add","range":[1,3]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 3000..50000',
      'monthlyFixed 200..3000',
      3,
      8,
      '{"failureChancePctRange":[9,17],"variancePctRange":[7,13],"failureEffects":["wear_and_tear_spike","downtime_increase"]}'::jsonb
    ),
    (
      'insurance_structure_optimization',
      'INSURANCE',
      'Insurance Structure Optimization',
      'Reduces per-day insurance with higher deductibles.',
      1,
      0,
      1,
      '[{"key":"insurance_eur_per_day_base","op":"mul","range":[0.88,0.96]},{"key":"deductible_eur","op":"add","range":[500,1500]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0',
      'monthlyFixed 0',
      1,
      1,
      '{"failureChancePctRange":[10,20],"variancePctRange":[8,14],"failureEffects":["large_claim_shock","reserve_shortfall"]}'::jsonb
    )
  ) as t(
    code,
    tree_key,
    name,
    description,
    tier,
    cost,
    duration_weeks,
    effects,
    capex_pct_min,
    capex_pct_max,
    opex_pct_min,
    opex_pct_max,
    capex_formula,
    opex_formula,
    delay_weeks_min,
    delay_weeks_max,
    risk
  )
)
insert into public.niche_upgrades (
  niche_id,
  code,
  tree_key,
  name,
  description,
  tier,
  cost,
  duration_weeks,
  effects,
  capex_pct_min,
  capex_pct_max,
  opex_pct_min,
  opex_pct_max,
  capex_formula,
  opex_formula,
  delay_weeks_min,
  delay_weeks_max,
  risk
)
select
  niche.id,
  upgrade_seed.code,
  upgrade_seed.tree_key,
  upgrade_seed.name,
  upgrade_seed.description,
  upgrade_seed.tier,
  upgrade_seed.cost,
  upgrade_seed.duration_weeks,
  upgrade_seed.effects,
  upgrade_seed.capex_pct_min::numeric,
  upgrade_seed.capex_pct_max::numeric,
  upgrade_seed.opex_pct_min::numeric,
  upgrade_seed.opex_pct_max::numeric,
  upgrade_seed.capex_formula,
  upgrade_seed.opex_formula,
  upgrade_seed.delay_weeks_min,
  upgrade_seed.delay_weeks_max,
  upgrade_seed.risk
from upgrade_seed
cross join niche
on conflict (niche_id, code) do update set
  tree_key = excluded.tree_key,
  name = excluded.name,
  description = excluded.description,
  tier = excluded.tier,
  cost = excluded.cost,
  duration_weeks = excluded.duration_weeks,
  effects = excluded.effects,
  capex_pct_min = excluded.capex_pct_min,
  capex_pct_max = excluded.capex_pct_max,
  opex_pct_min = excluded.opex_pct_min,
  opex_pct_max = excluded.opex_pct_max,
  capex_formula = excluded.capex_formula,
  opex_formula = excluded.opex_formula,
  delay_weeks_min = excluded.delay_weeks_min,
  delay_weeks_max = excluded.delay_weeks_max,
  risk = excluded.risk;

-- ============================================================
-- Sanity checks
-- ============================================================
select count(*) as car_dealer_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'AUTO_DEALER';

select
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and (config->'startingLoadout'->'unlockedProducts'->>0) = 'used_car_unit' as only_used_unlocked
from public.niches
where code = 'AUTO_DEALER';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "new_car_unit" && exists(@.requirements.upgrades[*] ? (@ == "manufacturer_dealership_agreement")))'
) as new_car_upgrade_gate
from public.niches
where code = 'AUTO_DEALER';

select
  (config->'productFlows'->'trade_in_unit'->>'cashflowDirection') = 'outflow'
  and (config->'productFlows'->'trade_in_unit'->>'inventoryUsedUnitsDelta')::int = 1 as trade_in_flow_ok
from public.niches
where code = 'AUTO_DEALER';

select count(*) as carwash_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'AUTO_CARWASH';

select
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and (config->'startingLoadout'->'unlockedProducts'->>0) = 'carwash_basic_exterior_unit' as only_basic_unlocked
from public.niches
where code = 'AUTO_CARWASH';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "carwash_interior_quick_unit" && exists(@.requirements.upgrades[*] ? (@ == "interior_bay")))'
) as interior_bay_gate
from public.niches
where code = 'AUTO_CARWASH';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "carwash_detailing_session_unit" && exists(@.requirements.upgrades[*] ? (@ == "detailing_bay")))'
) as detailing_bay_gate
from public.niches
where code = 'AUTO_CARWASH';

select
  exists(
    select 1
    from public.niche_upgrades u
    join public.niches n on n.id = u.niche_id
    where n.code = 'AUTO_CARWASH'
      and u.code = 'interior_bay'
  ) as interior_bay_upgrade_present,
  exists(
    select 1
    from public.niche_upgrades u
    join public.niches n on n.id = u.niche_id
    where n.code = 'AUTO_CARWASH'
      and u.code = 'detailing_bay'
  ) as detailing_bay_upgrade_present;

select count(*) as repair_shop_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'AUTO_REPAIR';

select
  (config->'startingLoadout'->'unlockedProducts' ? 'inspection_service_unit') as inspection_unlocked
from public.niches
where code = 'AUTO_REPAIR';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "ev_repair_job_unit" && exists(@.requirements.upgrades[*] ? (@ == "ev_certification_high_voltage_tools")))'
) as ev_upgrade_gate
from public.niches
where code = 'AUTO_REPAIR';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "ev_repair_job_unit" && exists(@.requirements.assets[*] ? (@.assetId == "diagnostic_tools_level" && @.minCount >= 3)))'
) as ev_tools_level_gate
from public.niches
where code = 'AUTO_REPAIR';

select
  (config->'productSeasonalityKeys'->>'inspection_service_unit') = 'inspection_peak_seasonality'
  or (config->'productSeasonalityKeys'->>'tires_service_unit') = 'winter_tires_seasonality'
  as repair_shop_seasonality_ok
from public.niches
where code = 'AUTO_REPAIR';

select count(*) as ev_services_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'AUTO_EV';

select
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and (config->'startingLoadout'->'unlockedProducts'->>0) = 'ac_charge_session_unit' as only_ac_unlocked
from public.niches
where code = 'AUTO_EV';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "dc_fast_charge_session_unit" && exists(@.requirements.upgrades[*] ? (@ == "electrical_safety_program")))'
) as dc_fast_upgrade_gate
from public.niches
where code = 'AUTO_EV';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "kwh_energy_sale_kwh" && exists(@.requirements.anyOf[*].upgrades[*] ? (@ == "smart_metering_dynamic_pricing")))'
) as kwh_metering_gate
from public.niches
where code = 'AUTO_EV';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "charging_membership_monthly_unit" && exists(@.requirements.upgrades[*] ? (@ == "crm_billing_system")))'
) as membership_upgrade_gate
from public.niches
where code = 'AUTO_EV';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "fleet_charging_contract_unit" && @.requirements.minUptimeScore >= 0.9)'
) as fleet_uptime_gate
from public.niches
where code = 'AUTO_EV';

select count(*) as mobility_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'AUTO_MOBILITY';

select
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and (config->'startingLoadout'->'unlockedProducts'->>0) = 'economy_rental_day_unit' as only_economy_unlocked
from public.niches
where code = 'AUTO_MOBILITY';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "corporate_fleet_contract_unit" && exists(@.requirements.upgrades[*] ? (@ == "corporate_contracting_sla_program")) && @.requirements.minUptimeScore >= 0.9)'
) as corporate_contract_gate
from public.niches
where code = 'AUTO_MOBILITY';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "delivery_mobility_day_unit" && exists(@.requirements.upgrades[*] ? (@ == "delivery_partnerships_program")))'
) as delivery_partnership_gate
from public.niches
where code = 'AUTO_MOBILITY';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "insurance_addon_day_unit" && exists(@.requirements.upgrades[*] ? (@ == "online_booking_dynamic_pricing")))'
) as insurance_addon_gate
from public.niches
where code = 'AUTO_MOBILITY';




