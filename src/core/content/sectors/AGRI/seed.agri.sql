-- ============================================================
-- AGRI Crop Farm seed (niche config + products + upgrades)
-- Safe to rerun for the AGRI_FARM niche.
-- ============================================================

-- Ensure AGRI sector exists
insert into public.sectors (code, name, description, is_active)
values ('AGRI', 'Agriculture & Food', 'Farming & food production', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;

-- Crop Farm niche
with sector as (
  select id from public.sectors where code = 'AGRI'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AGRI_FARM',
  'Crop Farm',
  'Crops & grains',
  $${
    "capexIntensity":"HIGH",
    "marginRange":{"min":0.02,"max":0.1},
    "demandVolatility":0.3,
    "priceElasticity":0.65,
    "labourIntensity":0.3,
    "skillIntensity":0.35,
    "regulationRisk":0.25,
    "assetLifetimeYears":20,
    "capacityElasticity":0.2,
    "ticketSize":"HIGH",
    "baseDemandLevel":500,
    "seasonalityPattern":{"monthlyFactors":[0.75,0.8,0.9,1.05,1.15,1.2,1.15,1.05,0.95,0.9,0.82,0.78]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_AGRI",
    "upgradeProfile":"INDUSTRIAL",
    "startingLoadout":{
      "startingCash":120000,
      "assets":[
        {"assetId":"land_ha","count":20},
        {"assetId":"tractor","count":1},
        {"assetId":"harvester","count":1},
        {"assetId":"cold_storage_tons","count":10}
      ],
      "staff":[
        {"roleId":"farm_manager","fte":1},
        {"roleId":"field_worker","fte":4},
        {"roleId":"machine_operator","fte":1}
      ],
      "unlockedProducts":["agri.crop.wheat","agri.crop.potato"]
    },
    "unlockRules":[
      {"productSku":"agri.crop.wheat","startingUnlocked":true,"requirements":{
        "assets":[
          {"assetId":"land_ha","minCount":10},
          {"assetId":"tractor","minCount":1},
          {"assetId":"harvester","minCount":1}
        ],
        "staff":[
          {"roleId":"field_worker","minFTE":2},
          {"roleId":"machine_operator","minFTE":1}
        ]
      }},
      {"productSku":"agri.crop.potato","startingUnlocked":true,"requirements":{
        "assets":[
          {"assetId":"land_ha","minCount":8},
          {"assetId":"cold_storage_tons","minCount":10}
        ],
        "staff":[{"roleId":"field_worker","minFTE":2}]
      }},
      {"productSku":"agri.crop.corn","startingUnlocked":false,"requirements":{
        "assets":[
          {"assetId":"land_ha","minCount":12},
          {"assetId":"irrigation_system","minCount":1}
        ],
        "staff":[{"roleId":"field_worker","minFTE":3}],
        "upgrades":["drip_irrigation"],
        "minQualityScore":0.75
      }},
      {"productSku":"agri.crop.soy","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"land_ha","minCount":10}],
        "staff":[{"roleId":"agronomist","minFTE":0.5}],
        "upgrades":["soil_rotation_program"]
      }},
      {"productSku":"agri.crop.tomato","startingUnlocked":false,"requirements":{
        "assets":[
          {"assetId":"greenhouse_m2","minCount":500},
          {"assetId":"irrigation_system","minCount":1}
        ],
        "staff":[{"roleId":"horticulturist","minFTE":1}],
        "upgrades":["greenhouse_expansion"],
        "minQualityScore":0.8
      }},
      {"productSku":"agri.crop.apple","startingUnlocked":false,"requirements":{
        "assets":[
          {"assetId":"orchard_ha","minCount":15},
          {"assetId":"cold_storage_tons","minCount":15}
        ],
        "staff":[{"roleId":"horticulturist","minFTE":0.5}],
        "upgrades":["orchard_establishment"],
        "minQualityScore":0.8
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Crop Farm products
with niche as (
  select id from public.niches where code = 'AGRI_FARM'
),
product_seed as (
  select * from (values
    ('agri.crop.wheat', 'Wheat', 'ton', 180, 320, 38, 38, 'land_ha', 'Bulk grain crop.'),
    ('agri.crop.corn', 'Corn', 'ton', 160, 300, 36, 36, 'land_ha', 'Irrigated field crop.'),
    ('agri.crop.potato', 'Potato', 'ton', 220, 380, 42, 42, 'land_ha', 'Storage-sensitive crop.'),
    ('agri.crop.soy', 'Soy', 'ton', 250, 420, 35, 35, 'land_ha', 'Rotation-driven crop.'),
    ('agri.crop.tomato', 'Tomato', 'kg', 1.2, 2.8, 48, 48, 'greenhouse_m2', 'Greenhouse produce.'),
    ('agri.crop.apple', 'Apple', 'kg', 0.8, 2.2, 40, 40, 'orchard_ha', 'Orchard crop.')
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

-- Crop Farm upgrades
with niche as (
  select id from public.niches where code = 'AGRI_FARM'
),
upgrade_seed as (
  select * from (values
    (
      'soil_rotation_program',
      'SOIL',
      'Soil Rotation Program',
      'Improve soil health and yield stability.',
      1,
      0,
      0,
      '["yield +4%","soilQuality +0.05"]'::jsonb,
      null,
      null,
      null,
      null,
      'landHa * 40',
      'landHa * 3',
      0,
      0,
      '{"failureChance":0.05,"failureMode":"Implementation delays reduce first-week benefit."}'::jsonb
    ),
    (
      'drip_irrigation',
      'IRRIGATION',
      'Drip Irrigation',
      'Increase yield and reduce water waste.',
      2,
      0,
      4,
      '["yield +8%","waterUse -15%"]'::jsonb,
      null,
      null,
      null,
      null,
      'landHa * 800',
      'landHa * 5',
      4,
      4,
      '{"failureChance":0.08,"failureMode":"Installation overruns extend lead time.","downtimeWeeks":2}'::jsonb
    ),
    (
      'precision_ag',
      'PRECISION',
      'Precision Agriculture Suite',
      'Improve labor efficiency and input usage.',
      1,
      0,
      1,
      '["laborEfficiency +6%","inputWaste -5%"]'::jsonb,
      null,
      null,
      null,
      null,
      'machineryUnits * 2000',
      'machineryUnits * 15',
      1,
      1,
      '{"failureChance":0.06,"failureMode":"Calibration errors reduce expected savings."}'::jsonb
    ),
    (
      'cold_chain',
      'STORAGE',
      'Cold Chain Expansion',
      'Reduce waste and maintain quality.',
      2,
      0,
      6,
      '["wasteRate -10%","qualityScore +0.05"]'::jsonb,
      null,
      null,
      null,
      null,
      'storageTons * 1200',
      'storageTons * 8',
      6,
      6,
      '{"failureChance":0.1,"failureMode":"Equipment failures create short-term losses.","downtimeWeeks":1}'::jsonb
    ),
    (
      'orchard_establishment',
      'ORCHARD',
      'Orchard Establishment',
      'Build orchard capacity for fruit crops.',
      3,
      0,
      12,
      '["unlock apple production","yield +6% after maturity"]'::jsonb,
      null,
      null,
      null,
      null,
      'orchardHa * 5000',
      'orchardHa * 12',
      12,
      12,
      '{"failureChance":0.12,"failureMode":"Sapling losses delay full capacity.","downtimeWeeks":4}'::jsonb
    ),
    (
      'greenhouse_expansion',
      'GREENHOUSE',
      'Greenhouse Expansion',
      'Scale greenhouse capacity and quality.',
      2,
      0,
      8,
      '["capacity +15%","qualityScore +0.04"]'::jsonb,
      null,
      null,
      null,
      null,
      'greenhouseM2 * 300',
      'greenhouseM2 * 1.5',
      8,
      8,
      '{"failureChance":0.09,"failureMode":"Supply delays increase costs.","downtimeWeeks":2}'::jsonb
    ),
    (
      'organic_certification',
      'CERTIFICATION',
      'Organic Certification',
      'Unlock organic premium pricing and demand.',
      1,
      0,
      2,
      '["pricePremium +8%","demand +5%"]'::jsonb,
      null,
      null,
      null,
      null,
      'landHa * 150',
      'landHa * 4',
      2,
      2,
      '{"failureChance":0.07,"failureMode":"Audit findings delay certification.","downtimeWeeks":2}'::jsonb
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
-- AGRI Dairy seed (niche + products + upgrades + starting loadout)
-- ============================================================

-- Dairy niche
with sector as (
  select id from public.sectors where code = 'AGRI'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AGRI_DAIRY',
  'Dairy',
  'Milk & dairy production',
  $${
    "capexIntensity":"HIGH",
    "marginRange":{"min":0.02,"max":0.08},
    "demandVolatility":0.12,
    "priceElasticity":0.55,
    "labourIntensity":0.35,
    "skillIntensity":0.4,
    "regulationRisk":0.28,
    "assetLifetimeYears":20,
    "capacityElasticity":0.18,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":520,
    "seasonalityPattern":{"monthlyFactors":[1,1,1,1,1,1,1,1,1,1,1.02,1.04]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_AGRI",
    "upgradeProfile":"INDUSTRIAL",
    "startingLoadout":{
      "startingCash":300000,
      "assets":[
        {"assetId":"cows_total","count":300},
        {"assetId":"cows_lactating","count":250},
        {"assetId":"cows_dry","count":50},
        {"assetId":"barn_m2","count":1600},
        {"assetId":"milking_robots","count":1},
        {"assetId":"cooling_tank_liters","count":6000},
        {"assetId":"feed_storage_ton","count":20}
      ],
      "staff":[
        {"roleId":"livestock_caretaker","fte":2},
        {"roleId":"milking_operator","fte":1},
        {"roleId":"processing_operator","fte":0},
        {"roleId":"quality_compliance","fte":0},
        {"roleId":"logistics_staff","fte":1}
      ],
      "unlockedProducts":["raw_milk_bulk_liter"]
    },
    "unlockRules":[
      {"productSku":"raw_milk_bulk_liter","startingUnlocked":true,"requirements":{}},
      {"productSku":"premium_milk_liter","startingUnlocked":false,"requirements":{
        "machines":[{"machineId":"pasteurizer","minCount":1}],
        "staff":[{"roleId":"quality_compliance","minFTE":1}],
        "minHealthScore":0.85
      }},
      {"productSku":"cheese_kg","startingUnlocked":false,"requirements":{
        "machines":[{"machineId":"cheese_vat","minCount":2}],
        "staff":[{"roleId":"processing_operator","minFTE":2}],
        "assets":[{"assetId":"cold_storage_kg","minCount":1000}],
        "complianceAuditPassed":true,
        "upgrades":["vertical_integration_push"]
      }},
      {"productSku":"yogurt_kg","startingUnlocked":false,"requirements":{
        "machines":[{"machineId":"fermentation_tank","minCount":1}],
        "staff":[{"roleId":"processing_operator","minFTE":2}]
      }},
      {"productSku":"butter_kg","startingUnlocked":false,"requirements":{
        "machines":[{"machineId":"butter_churn","minCount":1}],
        "assets":[{"assetId":"cold_storage_kg","minCount":800}],
        "upgrades":["vertical_integration_push"]
      }},
      {"productSku":"whey_liter","startingUnlocked":false,"requirements":{
        "byproductOf":["cheese_kg","butter_kg"]
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Dairy products
with niche as (
  select id from public.niches where code = 'AGRI_DAIRY'
),
product_seed as (
  select * from (values
    ('raw_milk_bulk_liter', 'Raw Milk (Bulk)', 'liter', 0.35, 0.6, 120, 160, 'cows_lactating', 'Loss-leading bulk milk.'),
    ('premium_milk_liter', 'Premium Milk', 'liter', 0.55, 0.9, 90, 120, 'cows_lactating', 'Pasteurized premium milk.'),
    ('cheese_kg', 'Cheese', 'kg', 6, 18, 45, 70, 'cheese_vat', 'Value-add cheese.'),
    ('yogurt_kg', 'Yogurt', 'kg', 1.5, 4, 50, 80, 'fermentation_tank', 'Short shelf life dairy.'),
    ('butter_kg', 'Butter', 'kg', 5, 12, 50, 75, 'butter_churn', 'High-fat dairy product.'),
    ('whey_liter', 'Whey (Byproduct)', 'liter', 0.05, 0.2, 20, 40, 'cooling_tank_liters', 'Byproduct of cheese and butter.')
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

-- Dairy upgrades
with niche as (
  select id from public.niches where code = 'AGRI_DAIRY'
),
upgrade_seed as (
  select * from (values
    (
      'feed_optimization_program',
      'FEED',
      'Feed Optimization Program',
      'Improve feed efficiency to lift yield.',
      1,
      0,
      1,
      '[{"key":"milk_yield","op":"mul","range":[1.15,1.3]},{"key":"feed_cost","op":"mul","range":[1.1,1.25]}]'::jsonb,
      null,
      null,
      null,
      null,
      '0',
      'feedCost * (1.10..1.25)',
      1,
      1,
      '{"failureChancePctRange":[6,14],"variancePctRange":[4,12],"failureEffects":["supplier_dependency_variance"]}'::jsonb
    ),
    (
      'herd_health_program',
      'HEALTH',
      'Herd Health Program',
      'Improve herd health and reduce disease.',
      1,
      0,
      3,
      '[{"key":"health_score","op":"mul","range":[1.2,1.2]},{"key":"disease_chance","op":"mul","range":[0.6,0.6]}]'::jsonb,
      null,
      null,
      null,
      null,
      '0',
      'monthlyFixed 2000..8000',
      2,
      4,
      '{"failureChancePctRange":[4,10],"variancePctRange":[3,8],"failureEffects":["coverage_gap_weeks 1..2"]}'::jsonb
    ),
    (
      'automated_milking_system',
      'AUTOMATION',
      'Automated Milking System',
      'Reduce labor and boost yield.',
      2,
      0,
      6,
      '[{"key":"labor_cost","op":"mul","range":[0.8,0.8]},{"key":"milk_yield","op":"mul","range":[1.1,1.1]}]'::jsonb,
      0.05,
      0.15,
      0.005,
      0.012,
      'startup_cost * (0.05..0.15)',
      'revenueMonthly * (0.005..0.012)',
      3,
      6,
      '{"failureChancePctRange":[8,18],"variancePctRange":[6,14],"failureEffects":["automation_downtime_weeks 1..3"]}'::jsonb
    ),
    (
      'vertical_integration_push',
      'INTEGRATION',
      'Vertical Integration Push',
      'Unlock processing capacity for cheese and butter.',
      3,
      0,
      8,
      '[{"key":"unlock_products","op":"set","value":["cheese_kg","butter_kg"]},{"key":"processing_capacity","op":"mul","range":[1.1,1.25]}]'::jsonb,
      0.08,
      0.18,
      0.006,
      0.015,
      'startup_cost * (0.08..0.18)',
      'revenueMonthly * (0.006..0.015)',
      4,
      8,
      '{"failureChancePctRange":[10,22],"variancePctRange":[8,16],"failureEffects":["cashflow_stress_weeks 2..4"]}'::jsonb
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
-- AGRI Food Processing seed (niche + products + upgrades + starting loadout)
-- ============================================================

-- Food Processing niche
with sector as (
  select id from public.sectors where code = 'AGRI'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AGRI_FOODPROC',
  'Food Processing',
  'Processing farm outputs',
  $${
    "capexIntensity":"HIGH",
    "marginRange":{"min":0.03,"max":0.12},
    "demandVolatility":0.18,
    "priceElasticity":0.55,
    "labourIntensity":0.35,
    "skillIntensity":0.5,
    "regulationRisk":0.25,
    "assetLifetimeYears":15,
    "capacityElasticity":0.25,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":520,
    "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1,1,1,1,1,1,1,1.05,1.18]},
    "competitionType":"OLIGOPOLY",
    "decisionProfile":"SECTOR_AGRI",
    "upgradeProfile":"INDUSTRIAL",
    "startingLoadout":{
      "startingCash":400000,
      "assets":[
        {"assetId":"processing_m2","count":800},
        {"assetId":"dry_storage_kg","count":2000},
        {"assetId":"packaging_capacity_units","count":2000},
        {"assetId":"energy_capacity_kwh","count":4000},
        {"assetId":"milling_line","count":1}
      ],
      "staff":[
        {"roleId":"processing_operator","fte":2},
        {"roleId":"maintenance_technician","fte":0.5},
        {"roleId":"logistics_staff","fte":0.5}
      ],
      "unlockedProducts":["flour_kg"]
    },
    "unlockRules":[
      {"productSku":"flour_kg","startingUnlocked":true,"requirements":{}},
      {"productSku":"packaged_bread_unit","startingUnlocked":false,"requirements":{
        "machines":[
          {"machineId":"mixing_line","minCount":1},
          {"machineId":"baking_line","minCount":2},
          {"machineId":"packaging_line","minCount":1}
        ],
        "staff":[
          {"roleId":"processing_operator","minFTE":4},
          {"roleId":"quality_compliance","minFTE":1}
        ],
        "assets":[{"assetId":"packaging_capacity_units","minCount":10000}],
        "upgrades":["advanced_packaging"],
        "minComplianceScore":0.7
      }},
      {"productSku":"ready_meal_unit","startingUnlocked":false,"requirements":{
        "machines":[
          {"machineId":"mixing_line","minCount":1},
          {"machineId":"cooking_line","minCount":1},
          {"machineId":"packaging_line","minCount":1}
        ],
        "staff":[
          {"roleId":"processing_operator","minFTE":4},
          {"roleId":"quality_compliance","minFTE":1},
          {"roleId":"production_manager","minFTE":0.5}
        ],
        "assets":[{"assetId":"cold_storage_kg","minCount":5000}],
        "upgrades":["throughput_expansion"],
        "minComplianceScore":0.8,
        "complianceAuditPassed":true
      }},
      {"productSku":"animal_feed_mix_ton","startingUnlocked":false,"requirements":{
        "machines":[{"machineId":"mixing_line","minCount":1}],
        "staff":[{"roleId":"processing_operator","minFTE":2}],
        "assets":[{"assetId":"dry_storage_kg","minCount":15000}],
        "upgrades":["energy_optimization"],
        "minComplianceScore":0.6
      }},
      {"productSku":"frozen_vegetables_kg","startingUnlocked":false,"requirements":{
        "machines":[
          {"machineId":"freezing_line","minCount":1},
          {"machineId":"packaging_line","minCount":1}
        ],
        "staff":[
          {"roleId":"processing_operator","minFTE":3},
          {"roleId":"quality_compliance","minFTE":1}
        ],
        "assets":[{"assetId":"cold_storage_kg","minCount":8000}],
        "upgrades":["advanced_packaging"],
        "minComplianceScore":0.75
      }},
      {"productSku":"private_label_batch","startingUnlocked":false,"requirements":{
        "machines":[
          {"machineId":"mixing_line","minCount":1},
          {"machineId":"cooking_line","minCount":1},
          {"machineId":"packaging_line","minCount":1}
        ],
        "staff":[
          {"roleId":"quality_compliance","minFTE":2},
          {"roleId":"logistics_staff","minFTE":2},
          {"roleId":"production_manager","minFTE":1}
        ],
        "assets":[
          {"assetId":"packaging_capacity_units","minCount":20000},
          {"assetId":"cold_storage_kg","minCount":6000}
        ],
        "upgrades":["contract_production_line"],
        "minComplianceScore":0.85,
        "complianceAuditPassed":true,
        "contractSigned":true
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Food Processing products
with niche as (
  select id from public.niches where code = 'AGRI_FOODPROC'
),
product_seed as (
  select * from (values
    ('flour_kg', 'Flour', 'kg', 0.3, 0.6, 110, 130, 'milling_line', 'Commodity milling output.'),
    ('packaged_bread_unit', 'Packaged Bread', 'unit', 1.2, 3.5, 60, 85, 'baking_line', 'High-volume packaged bakery.'),
    ('ready_meal_unit', 'Ready Meals', 'unit', 3, 8, 60, 85, 'cooking_line', 'Energy-intensive prepared meals.'),
    ('animal_feed_mix_ton', 'Animal Feed Mix', 'ton', 220, 420, 65, 90, 'mixing_line', 'Stable bulk contracts for feed.'),
    ('frozen_vegetables_kg', 'Frozen Vegetables', 'kg', 1.5, 3.5, 60, 85, 'freezing_line', 'Cold chain frozen goods.'),
    ('private_label_batch', 'Private Label Batch', 'batch', 6000, 80000, 50, 80, 'packaging_line', 'Contracted batch manufacturing.')
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

-- Food Processing upgrades
with niche as (
  select id from public.niches where code = 'AGRI_FOODPROC'
),
upgrade_seed as (
  select * from (values
    (
      'energy_optimization',
      'ENERGY',
      'Energy Optimization',
      'Reduce energy costs and improve stability.',
      1,
      0,
      2,
      '[{"key":"energy_cost","op":"mul","range":[0.7,0.85]}]'::jsonb,
      null,
      null,
      null,
      null,
      '0',
      'monthlyFixed 2000..10000',
      2,
      2,
      '{"failureChancePctRange":[5,12],"variancePctRange":[4,10],"failureEffects":["audit_gaps_reduce_savings"]}'::jsonb
    ),
    (
      'advanced_packaging',
      'PACKAGING',
      'Advanced Packaging',
      'Extend shelf life and lift prices.',
      2,
      0,
      4,
      '[{"key":"shelf_life","op":"mul","range":[1.4,1.4]},{"key":"price_premium","op":"mul","range":[1.1,1.1]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 300000..900000',
      '0',
      3,
      5,
      '{"failureChancePctRange":[6,14],"variancePctRange":[5,12],"failureEffects":["packaging_line_delay_weeks 1..3"]}'::jsonb
    ),
    (
      'throughput_expansion',
      'THROUGHPUT',
      'Throughput Expansion',
      'Scale processing capacity with higher fixed costs.',
      3,
      0,
      6,
      '[{"key":"machine_capacity","op":"mul","range":[1.25,1.6]},{"key":"fixed_cost","op":"mul","range":[1.05,1.15]}]'::jsonb,
      0.1,
      0.25,
      0.004,
      0.01,
      'startup_cost * (0.1..0.25)',
      'revenueMonthly * (0.004..0.01)',
      4,
      8,
      '{"failureChancePctRange":[8,18],"variancePctRange":[6,14],"failureEffects":["underutilization_penalty_weeks 2..4"]}'::jsonb
    ),
    (
      'contract_production_line',
      'CONTRACTS',
      'Contract Production Line',
      'Unlock private label contract manufacturing.',
      3,
      0,
      8,
      '[{"key":"unlock_products","op":"set","value":["private_label_batch"]},{"key":"contract_capacity","op":"mul","range":[1.1,1.3]}]'::jsonb,
      0.12,
      0.3,
      0.004,
      0.01,
      'startup_cost * (0.12..0.3)',
      'revenueMonthly * (0.004..0.01)',
      5,
      9,
      '{"failureChancePctRange":[10,20],"variancePctRange":[8,16],"failureEffects":["sla_penalties_weeks 1..3"]}'::jsonb
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
-- AGRI Greenhouse seed (niche + products + upgrades + starting loadout)
-- ============================================================

-- Greenhouse niche
with sector as (
  select id from public.sectors where code = 'AGRI'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AGRI_GREEN',
  'Greenhouse',
  'Energy-sensitive controlled agriculture with fast cycles',
  $${
    "capexIntensity":"HIGH",
    "marginRange":{"min":0.03,"max":0.14},
    "demandVolatility":0.25,
    "priceElasticity":0.6,
    "labourIntensity":0.4,
    "skillIntensity":0.45,
    "regulationRisk":0.3,
    "assetLifetimeYears":15,
    "capacityElasticity":0.22,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":480,
    "seasonalityPattern":{"monthlyFactors":[0.95,0.96,0.98,1,1.02,1.03,1.03,1.02,1.01,1,1.02,1.06]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_AGRI",
    "upgradeProfile":"INDUSTRIAL",
    "startingLoadout":{
      "startingCash":350000,
      "assets":[
        {"assetId":"greenhouse_m2","count":3000},
        {"assetId":"climate_control_level","count":0.35},
        {"assetId":"irrigation_capacity_lph","count":3000},
        {"assetId":"cold_storage_kg","count":500}
      ],
      "staff":[
        {"roleId":"grower","fte":1},
        {"roleId":"picking_staff","fte":2},
        {"roleId":"logistics_staff","fte":1}
      ],
      "unlockedProducts":["tomatoes_kg"]
    },
    "unlockRules":[
      {"productSku":"tomatoes_kg","startingUnlocked":true,"requirements":{}},
      {"productSku":"cucumbers_kg","startingUnlocked":false,"requirements":{
        "minClimateControlLevel":0.45,
        "anyOf":[
          {"machines":[{"machineId":"packaging_line","minCount":1}]},
          {"staff":[{"roleId":"logistics_staff","minFTE":2}]}
        ]
      }},
      {"productSku":"bell_peppers_kg","startingUnlocked":false,"requirements":{
        "minClimateControlLevel":0.6,
        "machines":[{"machineId":"sorting_line","minCount":1}],
        "staff":[{"roleId":"quality_compliance","minFTE":1}]
      }},
      {"productSku":"herbs_pack","startingUnlocked":false,"requirements":{
        "machines":[{"machineId":"packaging_line","minCount":1}],
        "staff":[{"roleId":"quality_compliance","minFTE":1}]
      }},
      {"productSku":"strawberries_kg","startingUnlocked":false,"requirements":{
        "machines":[{"machineId":"pest_management_system","minCount":1}],
        "assets":[{"assetId":"cold_storage_kg","minCount":1500}],
        "staff":[{"roleId":"maintenance_technician","minFTE":1}]
      }},
      {"productSku":"microgreens_kg","startingUnlocked":false,"requirements":{
        "machines":[{"machineId":"led_lighting_system","minCount":1}],
        "assets":[{"assetId":"co2_injection_enabled","minCount":1}],
        "staff":[{"roleId":"grower","minFTE":2}],
        "co2InjectionRequired":true,
        "complianceAuditPassed":true
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Greenhouse products
with niche as (
  select id from public.niches where code = 'AGRI_GREEN'
),
product_seed as (
  select * from (values
    ('tomatoes_kg', 'Tomatoes', 'kg', 1.2, 3.2, 105, 130, 'greenhouse_m2', 'High-volume greenhouse staple.'),
    ('cucumbers_kg', 'Cucumbers', 'kg', 0.8, 2, 70, 105, 'greenhouse_m2', 'Fast cycle crop sensitive to oversupply.'),
    ('bell_peppers_kg', 'Bell Peppers', 'kg', 1.8, 4.5, 60, 95, 'greenhouse_m2', 'Premium greenhouse produce.'),
    ('herbs_pack', 'Herbs Pack', 'pack', 0.7, 2.2, 55, 90, 'packaging_line', 'Packaging-heavy herb packs.'),
    ('strawberries_kg', 'Strawberries', 'kg', 2.5, 7, 65, 100, 'greenhouse_m2', 'High spoilage risk, high upside.'),
    ('microgreens_kg', 'Microgreens', 'kg', 10, 35, 45, 85, 'lighting_kw_capacity', 'Premium microgreens with energy load.')
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

-- Greenhouse upgrades
with niche as (
  select id from public.niches where code = 'AGRI_GREEN'
),
upgrade_seed as (
  select * from (values
    (
      'climate_control_upgrade',
      'CLIMATE',
      'Climate Control Upgrade',
      'Improve climate stability and yield.',
      2,
      0,
      4,
      '[{"key":"climate_control_level","op":"add","range":[0.15,0.35]},{"key":"yield","op":"mul","range":[1.08,1.18]},{"key":"pest_chance","op":"mul","range":[0.75,0.9]}]'::jsonb,
      0.04,
      0.12,
      0.003,
      0.01,
      'startup_cost * (0.04..0.12)',
      'revenueMonthly * (0.003..0.010)',
      2,
      5,
      '{"failureChancePctRange":[6,14],"variancePctRange":[5,12],"failureEffects":["control_system_tuning_delay_weeks 1..3"]}'::jsonb
    ),
    (
      'led_lighting_system',
      'LIGHTING',
      'LED Lighting System',
      'Boost yield with higher energy usage.',
      2,
      0,
      3,
      '[{"key":"yield","op":"mul","range":[1.1,1.25]},{"key":"energy_use","op":"mul","range":[1.15,1.4]},{"key":"unlock_path","op":"set","value":["microgreens"]}]'::jsonb,
      0.03,
      0.1,
      0.004,
      0.015,
      'startup_cost * (0.03..0.10)',
      'revenueMonthly * (0.004..0.015)',
      2,
      4,
      '{"failureChancePctRange":[8,18],"variancePctRange":[6,14],"failureEffects":["energy_price_spike_penalty"]}'::jsonb
    ),
    (
      'integrated_pest_management',
      'PEST',
      'Integrated Pest Management',
      'Reduce pest damage and lift quality.',
      1,
      0,
      1,
      '[{"key":"pest_damage","op":"mul","range":[0.3,0.7]},{"key":"quality_score","op":"mul","range":[1.02,1.08]}]'::jsonb,
      null,
      null,
      null,
      null,
      '0',
      'monthlyFixed 2000..8000',
      1,
      1,
      '{"failureChancePctRange":[4,10],"variancePctRange":[4,9],"failureEffects":["coverage_gap_weeks 1..2"]}'::jsonb
    ),
    (
      'cold_chain_packaging_expansion',
      'COLDCHAIN',
      'Cold Chain & Packaging Expansion',
      'Reduce spoilage and raise achievable price.',
      2,
      0,
      5,
      '[{"key":"spoilage_rate","op":"mul","range":[0.4,0.8]},{"key":"price_premium","op":"mul","range":[1.05,1.12]}]'::jsonb,
      null,
      null,
      null,
      null,
      'cold_storage_kg * 120 + packaging_units * 0.6',
      'revenueMonthly * (0.003..0.008)',
      3,
      6,
      '{"failureChancePctRange":[7,16],"variancePctRange":[6,14],"failureEffects":["cold_chain_install_delay_weeks 1..4"]}'::jsonb
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
-- AGRI Livestock seed (niche + products + upgrades + starting loadout)
-- ============================================================

-- Livestock niche
with sector as (
  select id from public.sectors where code = 'AGRI'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AGRI_MEAT',
  'Livestock',
  'Feed-driven animal production with welfare and compliance pressure.',
  $${
    "capexIntensity":"HIGH",
    "marginRange":{"min":0.02,"max":0.12},
    "demandVolatility":0.3,
    "priceElasticity":0.6,
    "labourIntensity":0.4,
    "skillIntensity":0.45,
    "regulationRisk":0.35,
    "assetLifetimeYears":18,
    "capacityElasticity":0.2,
    "ticketSize":"HIGH",
    "baseDemandLevel":520,
    "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1,1.01,1.02,1.02,1.01,1,0.99,0.98,0.98]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_AGRI",
    "upgradeProfile":"INDUSTRIAL",
    "startingLoadout":{
      "startingCash":320000,
      "assets":[
        {"assetId":"barn_m2","count":900},
        {"assetId":"pens_capacity_animals","count":16000},
        {"assetId":"animals_total","count":14000},
        {"assetId":"animals_market_ready","count":6000},
        {"assetId":"feed_storage_ton","count":40},
        {"assetId":"cold_storage_kg","count":800},
        {"assetId":"manure_capacity_ton","count":20},
        {"assetId":"feed_truck","count":1},
        {"assetId":"contract_processing","count":1},
        {"assetId":"biosecurity_level","count":0.35},
        {"assetId":"welfare_score","count":0.55},
        {"assetId":"health_score","count":0.7}
      ],
      "staff":[
        {"roleId":"animal_caretaker","fte":2},
        {"roleId":"logistics_staff","fte":1},
        {"roleId":"quality_compliance","fte":0},
        {"roleId":"feed_manager","fte":0},
        {"roleId":"vet_health_officer","fte":0},
        {"roleId":"processing_operator","fte":0}
      ],
      "unlockedProducts":["poultry_meat_kg"]
    },
    "unlockRules":[
      {"productSku":"poultry_meat_kg","startingUnlocked":true,"requirements":{}},
      {"productSku":"eggs_dozen","startingUnlocked":false,"requirements":{
        "machines":[{"machineId":"egg_sorting_line","minCount":1}],
        "staff":[{"roleId":"quality_compliance","minFTE":1}],
        "minWelfareScore":0.75
      }},
      {"productSku":"pork_kg","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"pens_capacity_animals","minCount":20000}],
        "staff":[{"roleId":"feed_manager","minFTE":1}],
        "vehicles":[{"vehicleId":"livestock_trailer","minCount":1}],
        "minBiosecurityLevel":0.6
      }},
      {"productSku":"beef_kg","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"barn_m2","minCount":2000}],
        "staff":[{"roleId":"vet_health_officer","minFTE":1}],
        "minWelfareScore":0.8,
        "complianceAuditPassed":true
      }},
      {"productSku":"hides_leather_kg","startingUnlocked":false,"requirements":{
        "staff":[{"roleId":"processing_operator","minFTE":1}],
        "minQualityScore":0.7,
        "anyOf":[
          {"vehicles":[{"vehicleId":"refrigerated_truck","minCount":1}]},
          {"contractPickupAllowed":true}
        ]
      }},
      {"productSku":"byproducts_rendered_kg","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"waste_processing_enabled","minCount":1}],
        "anyOf":[
          {"machines":[{"machineId":"rendering_unit","minCount":1}]},
          {"machines":[{"machineId":"slaughter_line","minCount":1}]}
        ]
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Livestock products
with niche as (
  select id from public.niches where code = 'AGRI_MEAT'
),
product_seed as (
  select * from (values
    ('poultry_meat_kg', 'Poultry Meat', 'kg', 2.2, 4, 110, 140, 'animals_total', 'Fast cycle meat with feed volatility.'),
    ('eggs_dozen', 'Eggs', 'dozen', 1.2, 3.2, 60, 90, 'egg_sorting_line', 'Stable demand, welfare sensitive.'),
    ('pork_kg', 'Pork', 'kg', 1.8, 3.2, 65, 100, 'animals_total', 'Commodity volumes with biosecurity requirements.'),
    ('beef_kg', 'Beef', 'kg', 3.8, 7.5, 60, 95, 'animals_total', 'Premium, compliance heavy, long cycles.'),
    ('hides_leather_kg', 'Hides & Leather', 'kg', 0.8, 2.2, 40, 80, 'animals_market_ready', 'Volatile byline with quality constraints.'),
    ('byproducts_rendered_kg', 'Rendered Byproducts', 'kg', 0.3, 0.9, 25, 60, 'rendering_unit', 'Low price, offsets waste costs.')
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

-- Livestock upgrades
with niche as (
  select id from public.niches where code = 'AGRI_MEAT'
),
upgrade_seed as (
  select * from (values
    (
      'biosecurity_program',
      'BIOSECURITY',
      'Biosecurity Program',
      'Reduce disease risk and stabilize herd health.',
      1,
      0,
      1,
      '[{"key":"disease_chance","op":"mul","range":[0.4,0.7]},{"key":"health_score","op":"mul","range":[1.02,1.08]}]'::jsonb,
      null,
      null,
      null,
      null,
      '0',
      'monthlyFixed 2000..10000',
      1,
      1,
      '{"failureChancePctRange":[5,12],"variancePctRange":[4,10],"failureEffects":["compliance_overhead_increase"]}'::jsonb
    ),
    (
      'welfare_facility_improvements',
      'WELFARE',
      'Welfare Facility Improvements',
      'Improve welfare scores and growth rates.',
      2,
      0,
      4,
      '[{"key":"welfare_score","op":"add","range":[0.15,0.35]},{"key":"growth_rate","op":"mul","range":[1.05,1.12]},{"key":"premium_price_access","op":"set","value":["true"]}]'::jsonb,
      0.03,
      0.1,
      0.002,
      0.006,
      'startup_cost * (0.03..0.10)',
      'revenueMonthly * (0.002..0.006)',
      2,
      6,
      '{"failureChancePctRange":[6,14],"variancePctRange":[5,12],"failureEffects":["construction_delay_weeks 1..3"]}'::jsonb
    ),
    (
      'feed_contract_hedging',
      'FEED',
      'Feed Contract Hedging',
      'Reduce feed price volatility at a premium.',
      1,
      0,
      0,
      '[{"key":"feed_price_volatility","op":"mul","range":[0.5,0.5]},{"key":"feed_price_base","op":"mul","range":[1.05,1.1]}]'::jsonb,
      null,
      null,
      null,
      null,
      '0',
      '0',
      0,
      0,
      '{"failureChancePctRange":[3,8],"variancePctRange":[3,6],"failureEffects":["hedge_lock_in_costs"]}'::jsonb
    ),
    (
      'onsite_processing_line',
      'PROCESSING',
      'On-site Processing Line',
      'Improve processing margin and unlock byproducts.',
      3,
      0,
      8,
      '[{"key":"processing_margin","op":"mul","range":[1.08,1.2]},{"key":"unlock_products","op":"set","value":["byproducts_rendered_kg"]}]'::jsonb,
      0.06,
      0.18,
      0.004,
      0.012,
      'startup_cost * (0.06..0.18)',
      'revenueMonthly * (0.004..0.012)',
      4,
      8,
      '{"failureChancePctRange":[9,18],"variancePctRange":[7,14],"failureEffects":["processing_line_downtime_weeks 2..4"]}'::jsonb
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
-- AGRI Organic Farming seed (niche + products + upgrades + starting loadout)
-- ============================================================

-- Organic Farming niche
with sector as (
  select id from public.sectors where code = 'AGRI'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'AGRI_ORGANIC',
  'Organic Farming',
  'Certification-driven farming with premium channels and audit risk.',
  $${
    "capexIntensity":"MEDIUM",
    "marginRange":{"min":0.03,"max":0.18},
    "demandVolatility":0.22,
    "priceElasticity":0.55,
    "labourIntensity":0.5,
    "skillIntensity":0.45,
    "regulationRisk":0.4,
    "assetLifetimeYears":18,
    "capacityElasticity":0.16,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":420,
    "seasonalityPattern":{"monthlyFactors":[0.85,0.88,0.92,0.98,1.05,1.1,1.1,1.05,1,0.95,0.9,0.88]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_AGRI",
    "upgradeProfile":"INDUSTRIAL",
    "startingLoadout":{
      "startingCash":280000,
      "assets":[
        {"assetId":"organic_arable_m2","count":220000},
        {"assetId":"tractor","count":1},
        {"assetId":"seeder","count":1},
        {"assetId":"storage_ton","count":80},
        {"assetId":"compost_capacity_ton","count":0},
        {"assetId":"soil_health_score","count":0.45},
        {"assetId":"rotation_compliance_score","count":0.35},
        {"assetId":"organic_certified","count":0},
        {"assetId":"audit_readiness_score","count":0.35},
        {"assetId":"brand_reputation_score","count":0.4},
        {"assetId":"synthetic_input_used_last_ticks","count":0}
      ],
      "staff":[
        {"roleId":"farm_worker","fte":2},
        {"roleId":"logistics_staff","fte":1},
        {"roleId":"farm_manager","fte":0},
        {"roleId":"quality_compliance","fte":0},
        {"roleId":"sales_staff","fte":0}
      ],
      "unlockedProducts":["organic_grain_ton"]
    },
    "unlockRules":[
      {"productSku":"organic_grain_ton","startingUnlocked":true,"requirements":{}},
      {"productSku":"organic_vegetables_kg","startingUnlocked":false,"requirements":{
        "assets":[
          {"assetId":"irrigation_system","minCount":1},
          {"assetId":"compost_capacity_ton","minCount":15}
        ],
        "staff":[{"roleId":"farm_worker","minFTE":3}],
        "minRotationComplianceScore":0.6,
        "minSoilHealthScore":0.5
      }},
      {"productSku":"farmers_market_slot_day","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"farmers_market_slots","minCount":1}],
        "staff":[{"roleId":"sales_staff","minFTE":1}],
        "minReputationScore":0.55
      }},
      {"productSku":"csa_box_unit","startingUnlocked":false,"requirements":{
        "assets":[
          {"assetId":"packaging_line","minCount":1},
          {"assetId":"csa_subscribers","minCount":200}
        ],
        "staff":[{"roleId":"logistics_staff","minFTE":2}],
        "minReputationScore":0.65
      }},
      {"productSku":"organic_milk_liter","startingUnlocked":false,"requirements":{
        "assets":[{"assetId":"dairy_module_enabled","minCount":1}],
        "staff":[{"roleId":"quality_compliance","minFTE":1}],
        "requiresOrganicCertified":true,
        "minWelfareScore":0.75
      }},
      {"productSku":"premium_organic_contract_batch","startingUnlocked":false,"requirements":{
        "staff":[{"roleId":"quality_compliance","minFTE":1}],
        "requiresOrganicCertified":true,
        "minAuditReadinessScore":0.75,
        "minTicksSinceSyntheticInput":6,
        "upgrades":["organic_certification_program"]
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Organic Farming products
with niche as (
  select id from public.niches where code = 'AGRI_ORGANIC'
),
product_seed as (
  select * from (values
    ('organic_grain_ton', 'Organic Grain', 'ton', 320, 520, 105, 125, 'organic_arable_m2', 'Transition organic grain with lower yields.'),
    ('organic_vegetables_kg', 'Organic Vegetables', 'kg', 1.8, 4.2, 70, 95, 'organic_arable_m2', 'Labor-heavy premium vegetables.'),
    ('organic_milk_liter', 'Organic Milk', 'liter', 0.75, 1.4, 80, 110, 'dairy_module_enabled', 'Certified dairy with audit-sensitive premiums.'),
    ('csa_box_unit', 'CSA Subscription Box', 'unit', 15, 35, 60, 85, 'csa_subscribers', 'Direct-to-consumer channel with stable demand.'),
    ('farmers_market_slot_day', 'Farmers Market Slot', 'day', 500, 1800, 40, 70, 'farmers_market_slots', 'High-touch sales channel with limited capacity.'),
    ('premium_organic_contract_batch', 'Premium Organic Contract', 'batch', 8000, 60000, 45, 75, 'organic_certified', 'Audit-gated contract batches with premium pricing.')
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

-- Organic Farming upgrades
with niche as (
  select id from public.niches where code = 'AGRI_ORGANIC'
),
upgrade_seed as (
  select * from (values
    (
      'organic_certification_program',
      'CERTIFICATION',
      'Organic Certification Program',
      'Unlock organic certification for premium channels.',
      2,
      0,
      7,
      '[{"key":"organic_certified","op":"set","value":true},{"key":"premium_channel_access","op":"set","value":["csa","contracts"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 15000..60000',
      'monthlyFixed 500..2000',
      4,
      10,
      '{"failureChancePctRange":[8,18],"variancePctRange":[6,14],"failureEffects":["audit_failure_lockout_ticks 2..4"]}'::jsonb
    ),
    (
      'soil_regeneration_plan',
      'SOIL',
      'Soil Regeneration Plan',
      'Improve soil health and yield stability over time.',
      1,
      0,
      1,
      '[{"key":"soil_health_delta_per_tick","op":"add","range":[0.05,0.2]},{"key":"yield_stability","op":"mul","range":[1.02,1.08]}]'::jsonb,
      null,
      null,
      null,
      null,
      '0',
      'monthlyFixed 2000..12000',
      1,
      1,
      '{"failureChancePctRange":[5,12],"variancePctRange":[4,10],"failureEffects":["rotation_penalty_weeks 1..2"]}'::jsonb
    ),
    (
      'composting_infrastructure',
      'COMPOST',
      'Composting Infrastructure',
      'Expand compost capacity and reduce input volatility.',
      2,
      0,
      4,
      '[{"key":"compost_capacity_ton","op":"add","range":[20,80]},{"key":"fertilizer_cost_volatility","op":"mul","range":[0.7,0.9]}]'::jsonb,
      null,
      null,
      null,
      null,
      'compost_capacity_ton * 400',
      'monthlyFixed 500..3000',
      2,
      6,
      '{"failureChancePctRange":[6,14],"variancePctRange":[5,12],"failureEffects":["compost_system_delay_weeks 1..3"]}'::jsonb
    ),
    (
      'brand_direct_sales_engine',
      'BRAND',
      'Brand & Direct Sales Engine',
      'Build reputation and scale direct channels.',
      2,
      0,
      4,
      '[{"key":"brand_reputation_score","op":"add","range":[0.1,0.3]},{"key":"channel_capacity","op":"mul","range":[1.15,1.4]}]'::jsonb,
      null,
      null,
      0.002,
      0.006,
      'capex 20000..200000',
      'revenueMonthly * (0.002..0.006)',
      2,
      5,
      '{"failureChancePctRange":[7,16],"variancePctRange":[6,12],"failureEffects":["marketing_spend_overrun"]}'::jsonb
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

-- ----------------------------
-- Dairy sanity checks
-- ----------------------------
select count(*) = 6 as dairy_has_six_products
from public.niche_products np
join public.niches n on n.id = np.niche_id
where n.code = 'AGRI_DAIRY';

select (
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and config->'startingLoadout'->'unlockedProducts'->>0 = 'raw_milk_bulk_liter'
) as dairy_only_raw_unlocked
from public.niches
where code = 'AGRI_DAIRY';

select (
  select count(*) >= 2
  from jsonb_array_elements(coalesce(config->'unlockRules', '[]'::jsonb)) as rule
  where (rule->'requirements'->'upgrades') is not null
    and (rule->>'productSku') in ('cheese_kg', 'butter_kg', 'yogurt_kg')
) as dairy_processing_locked
from public.niches
where code = 'AGRI_DAIRY';

select (
  select np.cogs_pct_min > 100
  from public.niche_products np
  join public.niches n on n.id = np.niche_id
  where n.code = 'AGRI_DAIRY' and np.sku = 'raw_milk_bulk_liter'
) as dairy_raw_milk_negative_margin;

-- ----------------------------
-- Food Processing sanity checks
-- ----------------------------
select count(*) = 6 as foodproc_has_six_products
from public.niche_products np
join public.niches n on n.id = np.niche_id
where n.code = 'AGRI_FOODPROC';

select (
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and config->'startingLoadout'->'unlockedProducts'->>0 = 'flour_kg'
) as foodproc_only_flour_unlocked
from public.niches
where code = 'AGRI_FOODPROC';

select (
  select count(*) >= 1
  from jsonb_array_elements(coalesce(config->'unlockRules', '[]'::jsonb)) as rule
  where (rule->'requirements'->'upgrades') is not null
    and (rule->>'productSku') = 'private_label_batch'
) as foodproc_private_label_locked
from public.niches
where code = 'AGRI_FOODPROC';

select (
  select np.cogs_pct_min > 100
  from public.niche_products np
  join public.niches n on n.id = np.niche_id
  where n.code = 'AGRI_FOODPROC' and np.sku = 'flour_kg'
) as foodproc_flour_negative_margin;

-- ----------------------------
-- Greenhouse sanity checks
-- ----------------------------
select count(*) = 6 as greenhouse_has_six_products
from public.niche_products np
join public.niches n on n.id = np.niche_id
where n.code = 'AGRI_GREEN';

select (
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and config->'startingLoadout'->'unlockedProducts'->>0 = 'tomatoes_kg'
) as greenhouse_only_tomatoes_unlocked
from public.niches
where code = 'AGRI_GREEN';

select (
  select count(*) >= 1
  from jsonb_array_elements(coalesce(config->'unlockRules', '[]'::jsonb)) as rule
  where (rule->>'productSku') = 'microgreens_kg'
    and (rule->'requirements'->'machines') is not null
    and (rule->'requirements'->'assets') is not null
    and (rule->'requirements'->>'complianceAuditPassed') = 'true'
) as greenhouse_microgreens_locked
from public.niches
where code = 'AGRI_GREEN';

-- ----------------------------
-- Livestock sanity checks
-- ----------------------------
select count(*) = 6 as livestock_has_six_products
from public.niche_products np
join public.niches n on n.id = np.niche_id
where n.code = 'AGRI_MEAT';

select (
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and config->'startingLoadout'->'unlockedProducts'->>0 = 'poultry_meat_kg'
) as livestock_only_poultry_unlocked
from public.niches
where code = 'AGRI_MEAT';

select (
  select count(*) >= 1
  from jsonb_array_elements(coalesce(config->'unlockRules', '[]'::jsonb)) as rule
  where (rule->>'productSku') = 'beef_kg'
    and (rule->'requirements'->>'complianceAuditPassed') = 'true'
    and (rule->'requirements'->>'minWelfareScore')::numeric >= 0.8
    and exists (
      select 1
      from jsonb_array_elements(rule->'requirements'->'staff') as staff
      where staff->>'roleId' = 'vet_health_officer'
    )
) as livestock_beef_locked
from public.niches
where code = 'AGRI_MEAT';

select (
  select count(*) >= 1
  from jsonb_array_elements(coalesce(config->'unlockRules', '[]'::jsonb)) as rule
  where (rule->>'productSku') = 'byproducts_rendered_kg'
    and exists (
      select 1
      from jsonb_array_elements(rule->'requirements'->'assets') as asset
      where asset->>'assetId' = 'waste_processing_enabled'
    )
    and (rule->'requirements'->'anyOf') is not null
) as livestock_byproducts_locked
from public.niches
where code = 'AGRI_MEAT';

-- ----------------------------
-- Organic Farming sanity checks
-- ----------------------------
select count(*) = 6 as organic_has_six_products
from public.niche_products np
join public.niches n on n.id = np.niche_id
where n.code = 'AGRI_ORGANIC';

select (
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and config->'startingLoadout'->'unlockedProducts'->>0 = 'organic_grain_ton'
) as organic_only_grain_unlocked
from public.niches
where code = 'AGRI_ORGANIC';

select (
  select count(*) >= 1
  from jsonb_array_elements(coalesce(config->'unlockRules', '[]'::jsonb)) as rule
  where (rule->>'productSku') = 'premium_organic_contract_batch'
    and (rule->'requirements'->'upgrades') is not null
    and (rule->'requirements'->'requiresOrganicCertified') = 'true'
) as organic_contract_requires_certification
from public.niches
where code = 'AGRI_ORGANIC';

select (
  select count(*) >= 1
  from jsonb_array_elements(coalesce(config->'unlockRules', '[]'::jsonb)) as rule
  where (rule->>'productSku') = 'csa_box_unit'
    and (rule->'requirements'->>'minReputationScore')::numeric >= 0.65
    and exists (
      select 1
      from jsonb_array_elements(rule->'requirements'->'staff') as staff
      where staff->>'roleId' = 'logistics_staff'
        and (staff->>'minFTE')::numeric >= 2
    )
) as organic_csa_requires_reputation_logistics
from public.niches
where code = 'AGRI_ORGANIC';


