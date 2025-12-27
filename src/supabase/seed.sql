-- ============================================================
-- SIMULATEBG — SEED DATA (FINAL)
-- ============================================================

-- ----------------------------
-- 0) Main World + economy state
-- ----------------------------
insert into public.worlds (id, name, mode, status, base_round_interval_seconds, created_at)
values ('00000000-0000-0000-0000-000000000001', 'Main World', 'NORMAL', 'ACTIVE', 600, now())
on conflict (id) do nothing;

insert into public.world_economy_state (
  world_id,
  current_year,
  current_week,
  base_interest_rate,
  inflation_rate,
  base_wage_index,
  macro_modifiers,
  is_ticking,
  last_tick_started_at,
  last_tick_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  1, 1,
  0.020, 0.020,
  1.0000,
  '{
    "demandGlobalFactor": 1.0,
    "costEnergyFactor": 1.0,
    "costLabourFactor": 1.0,
    "riskGlobalFactor": 1.0
  }'::jsonb,
  false,
  null,
  now()
)
on conflict (world_id) do update set
  base_interest_rate = excluded.base_interest_rate,
  inflation_rate = excluded.inflation_rate,
  base_wage_index = excluded.base_wage_index,
  macro_modifiers = excluded.macro_modifiers,
  is_ticking = excluded.is_ticking,
  last_tick_started_at = excluded.last_tick_started_at;

-- ----------------------------
-- 1) Sectors (15)
-- ----------------------------
with s as (
  select * from (values
    ('HORECA', 'Horeca', 'Food & hospitality'),
    ('RETAIL', 'Retail (B&M)', 'Physical retail & stores'),
    ('ECOM', 'E-commerce', 'Online retail & DTC'),
    ('TECH', 'Tech / IT / SaaS', 'Software & IT services'),
    ('BUILD', 'Construction', 'Building & contracting'),
    ('LOGI', 'Logistics & Transport', 'Transport, warehousing, last-mile'),
    ('PROP', 'Property & Leasing', 'Real estate operations & leasing'),
    ('MANU', 'Manufacturing', 'Production & industrial'),
    ('AGRI', 'Agriculture & Food', 'Farming & food production'),
    ('ENER', 'Energy & Utilities', 'Energy production & utilities'),
    ('HEAL', 'Healthcare', 'Healthcare & wellness'),
    ('MEDIA', 'Media & Entertainment', 'Media, content, events'),
    ('FIN', 'Finance & Services', 'Professional services & finance'),
    ('AUTO', 'Automotive & Mobility', 'Auto services & mobility'),
    ('RECY', 'Waste & Recycling', 'Waste, recycling & environment')
  ) as t(code, name, description)
)
insert into public.sectors (code, name, description, is_active)
select code, name, description, true from s
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;

-- ----------------------------
-- 2) Niches (6 per sector) with configs
-- Config keys align with your domain:
-- capexIntensity, marginRange, demandVolatility, priceElasticity, labourIntensity,
-- skillIntensity, regulationRisk, assetLifetimeYears, capacityElasticity, ticketSize,
-- baseDemandLevel, seasonalityPattern.monthlyFactors[12], competitionType
-- ----------------------------

-- Helper: common seasonality arrays
-- - stable: low seasonality
-- - summer_peak, winter_peak, holiday_peak, construction_peak, tourism_peak
-- Note: JSON needs explicit arrays; we embed per niche.
with sector_ids as (
  select id, code from public.sectors
),
niches_seed as (
  -- Each row: sector_code, niche_code, name, description, config_jsonb
  select * from (values

  -- HORECA
  ('HORECA','HORECA_CAFE','Café','Casual café / bar',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.05,"max":0.16},"demandVolatility":0.28,"priceElasticity":0.65,
     "labourIntensity":0.75,"skillIntensity":0.45,"regulationRisk":0.20,"assetLifetimeYears":10,"capacityElasticity":0.40,
     "ticketSize":"LOW","baseDemandLevel":1050,
     "seasonalityPattern":{"monthlyFactors":[0.92,0.92,0.95,1.00,1.06,1.12,1.18,1.14,1.05,1.00,0.97,1.09]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('HORECA','HORECA_CASUAL','Casual Restaurant','Family / casual dining',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.06,"max":0.18},"demandVolatility":0.22,"priceElasticity":0.55,
     "labourIntensity":0.78,"skillIntensity":0.55,"regulationRisk":0.22,"assetLifetimeYears":12,"capacityElasticity":0.35,
     "ticketSize":"MEDIUM","baseDemandLevel":900,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,0.98,1.00,1.03,1.07,1.10,1.08,1.03,1.00,0.98,1.10]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('HORECA','HORECA_FINE','Fine Dining','Premium dining experience',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.08,"max":0.22},"demandVolatility":0.30,"priceElasticity":0.35,
     "labourIntensity":0.85,"skillIntensity":0.80,"regulationRisk":0.25,"assetLifetimeYears":15,"capacityElasticity":0.20,
     "ticketSize":"HIGH","baseDemandLevel":320,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,1.00,1.00,1.02,1.05,1.06,1.05,1.03,1.00,1.00,1.18]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('HORECA','HORECA_HOTEL','Hotel','Rooms + hospitality',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.06,"max":0.20},"demandVolatility":0.35,"priceElasticity":0.45,
     "labourIntensity":0.65,"skillIntensity":0.60,"regulationRisk":0.25,"assetLifetimeYears":25,"capacityElasticity":0.18,
     "ticketSize":"HIGH","baseDemandLevel":500,
     "seasonalityPattern":{"monthlyFactors":[0.75,0.78,0.90,1.00,1.12,1.25,1.35,1.30,1.12,1.00,0.88,1.05]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('HORECA','HORECA_DARK','Dark Kitchen','Delivery-only kitchen',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.04,"max":0.14},"demandVolatility":0.40,"priceElasticity":0.75,
     "labourIntensity":0.55,"skillIntensity":0.45,"regulationRisk":0.18,"assetLifetimeYears":7,"capacityElasticity":0.60,
     "ticketSize":"LOW","baseDemandLevel":1200,
     "seasonalityPattern":{"monthlyFactors":[1.02,1.02,1.00,0.98,0.97,0.95,0.92,0.93,0.97,1.00,1.03,1.12]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('HORECA','HORECA_FOODTRUCK','Food Truck','Mobile food unit',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.05,"max":0.18},"demandVolatility":0.50,"priceElasticity":0.70,
     "labourIntensity":0.60,"skillIntensity":0.40,"regulationRisk":0.20,"assetLifetimeYears":6,"capacityElasticity":0.65,
     "ticketSize":"LOW","baseDemandLevel":650,
     "seasonalityPattern":{"monthlyFactors":[0.70,0.75,0.88,1.00,1.18,1.30,1.40,1.35,1.15,1.00,0.85,0.90]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),

  -- RETAIL
  ('RETAIL','RETAIL_GROCERY','Grocery','Convenience / grocery store',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.02,"max":0.06},"demandVolatility":0.10,"priceElasticity":0.85,
     "labourIntensity":0.60,"skillIntensity":0.30,"regulationRisk":0.18,"assetLifetimeYears":10,"capacityElasticity":0.50,
     "ticketSize":"LOW","baseDemandLevel":2200,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.98,1.00,1.00,1.00,1.02,1.02,1.00,1.00,1.05,1.18]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('RETAIL','RETAIL_FASHION','Fashion Store','Apparel retail',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.06,"max":0.18},"demandVolatility":0.35,"priceElasticity":0.65,
     "labourIntensity":0.45,"skillIntensity":0.45,"regulationRisk":0.15,"assetLifetimeYears":8,"capacityElasticity":0.55,
     "ticketSize":"MEDIUM","baseDemandLevel":900,
     "seasonalityPattern":{"monthlyFactors":[0.90,0.95,0.98,1.00,1.02,1.05,0.95,0.92,1.00,1.08,1.12,1.25]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('RETAIL','RETAIL_ELECTRONICS','Electronics','Consumer electronics retail',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.03,"max":0.10},"demandVolatility":0.30,"priceElasticity":0.80,
     "labourIntensity":0.40,"skillIntensity":0.55,"regulationRisk":0.16,"assetLifetimeYears":8,"capacityElasticity":0.55,
     "ticketSize":"HIGH","baseDemandLevel":650,
     "seasonalityPattern":{"monthlyFactors":[0.92,0.94,0.96,1.00,1.00,1.02,1.00,0.98,1.02,1.05,1.15,1.35]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('RETAIL','RETAIL_PHARMA','Pharmacy','Health & pharmacy retail',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.04,"max":0.12},"demandVolatility":0.08,"priceElasticity":0.35,
     "labourIntensity":0.45,"skillIntensity":0.70,"regulationRisk":0.35,"assetLifetimeYears":10,"capacityElasticity":0.40,
     "ticketSize":"MEDIUM","baseDemandLevel":800,
     "seasonalityPattern":{"monthlyFactors":[1.05,1.05,1.02,1.00,0.98,0.95,0.92,0.92,0.95,0.98,1.05,1.13]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('RETAIL','RETAIL_HOME','Home & DIY','Home improvement store',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.04,"max":0.12},"demandVolatility":0.22,"priceElasticity":0.70,
     "labourIntensity":0.50,"skillIntensity":0.45,"regulationRisk":0.14,"assetLifetimeYears":12,"capacityElasticity":0.55,
     "ticketSize":"MEDIUM","baseDemandLevel":780,
     "seasonalityPattern":{"monthlyFactors":[0.88,0.92,1.00,1.08,1.15,1.18,1.12,1.05,0.98,0.95,0.92,1.05]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('RETAIL','RETAIL_LUXURY','Luxury Boutique','Premium retail niche',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.10,"max":0.28},"demandVolatility":0.40,"priceElasticity":0.30,
     "labourIntensity":0.40,"skillIntensity":0.75,"regulationRisk":0.12,"assetLifetimeYears":12,"capacityElasticity":0.25,
     "ticketSize":"HIGH","baseDemandLevel":220,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,1.00,1.00,1.02,1.05,1.02,1.00,1.02,1.05,1.10,1.35]},
     "competitionType":"MONOPOLY_LIKE"
   }'::jsonb),

  -- ECOM
  ('ECOM','ECOM_DTC','DTC Brand','Direct-to-consumer brand',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.06,"max":0.20},"demandVolatility":0.45,"priceElasticity":0.70,
     "labourIntensity":0.35,"skillIntensity":0.55,"regulationRisk":0.12,"assetLifetimeYears":5,"capacityElasticity":0.80,
     "ticketSize":"MEDIUM","baseDemandLevel":1100,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.96,0.98,1.00,1.02,1.05,1.00,0.98,1.02,1.08,1.15,1.35]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('ECOM','ECOM_MARKET','Marketplace Seller','Selling on platforms',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.03,"max":0.12},"demandVolatility":0.50,"priceElasticity":0.85,
     "labourIntensity":0.30,"skillIntensity":0.40,"regulationRisk":0.10,"assetLifetimeYears":5,"capacityElasticity":0.85,
     "ticketSize":"LOW","baseDemandLevel":1400,
     "seasonalityPattern":{"monthlyFactors":[0.94,0.95,0.98,1.00,1.02,1.04,1.00,0.98,1.02,1.10,1.18,1.40]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('ECOM','ECOM_SUBSCRIPTION','Subscription Box','Recurring box model',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.05,"max":0.16},"demandVolatility":0.25,"priceElasticity":0.45,
     "labourIntensity":0.35,"skillIntensity":0.50,"regulationRisk":0.10,"assetLifetimeYears":6,"capacityElasticity":0.75,
     "ticketSize":"MEDIUM","baseDemandLevel":750,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.98,1.00,1.00,1.00,1.00,1.00,1.00,1.02,1.05,1.12]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('ECOM','ECOM_DIGITAL','Digital Products','Courses, templates, downloads',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.15,"max":0.45},"demandVolatility":0.55,"priceElasticity":0.60,
     "labourIntensity":0.20,"skillIntensity":0.70,"regulationRisk":0.08,"assetLifetimeYears":3,"capacityElasticity":0.95,
     "ticketSize":"MEDIUM","baseDemandLevel":600,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,0.98,1.00,1.02,1.05,1.02,1.00,1.05,1.10,1.15,1.25]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('ECOM','ECOM_GROCERY','Quick Commerce','Fast-delivery groceries',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.01,"max":0.05},"demandVolatility":0.35,"priceElasticity":0.90,
     "labourIntensity":0.55,"skillIntensity":0.35,"regulationRisk":0.12,"assetLifetimeYears":6,"capacityElasticity":0.70,
     "ticketSize":"LOW","baseDemandLevel":1600,
     "seasonalityPattern":{"monthlyFactors":[1.02,1.02,1.00,0.98,0.97,0.95,0.94,0.95,0.98,1.00,1.05,1.12]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('ECOM','ECOM_IMPORT','Import Arbitrage','Buy low, sell high',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.04,"max":0.15},"demandVolatility":0.60,"priceElasticity":0.85,
     "labourIntensity":0.25,"skillIntensity":0.45,"regulationRisk":0.20,"assetLifetimeYears":4,"capacityElasticity":0.90,
     "ticketSize":"LOW","baseDemandLevel":950,
     "seasonalityPattern":{"monthlyFactors":[0.96,0.96,0.98,1.00,1.02,1.05,1.00,0.98,1.02,1.08,1.12,1.35]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),

  -- TECH
  ('TECH','TECH_SAAS','SaaS','Recurring software subscriptions',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.10,"max":0.35},"demandVolatility":0.25,"priceElasticity":0.35,
     "labourIntensity":0.35,"skillIntensity":0.85,"regulationRisk":0.15,"assetLifetimeYears":4,"capacityElasticity":0.95,
     "ticketSize":"MEDIUM","baseDemandLevel":700,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.00,1.01,1.01,1.00,1.00,1.01,1.02,1.04]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('TECH','TECH_AGENCY','IT Agency','Project-based dev/consulting',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.08,"max":0.22},"demandVolatility":0.35,"priceElasticity":0.45,
     "labourIntensity":0.55,"skillIntensity":0.80,"regulationRisk":0.12,"assetLifetimeYears":5,"capacityElasticity":0.70,
     "ticketSize":"HIGH","baseDemandLevel":420,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.96,0.98,1.00,1.02,1.02,1.00,0.98,1.00,1.02,1.02,1.05]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('TECH','TECH_CYBER','Cybersecurity','Security services & products',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.12,"max":0.30},"demandVolatility":0.20,"priceElasticity":0.25,
     "labourIntensity":0.40,"skillIntensity":0.90,"regulationRisk":0.25,"assetLifetimeYears":5,"capacityElasticity":0.85,
     "ticketSize":"HIGH","baseDemandLevel":360,
     "seasonalityPattern":{"monthlyFactors":[1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.02,1.05]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('TECH','TECH_DATA','Data & AI','Analytics, ML & data platforms',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.10,"max":0.28},"demandVolatility":0.30,"priceElasticity":0.30,
     "labourIntensity":0.35,"skillIntensity":0.90,"regulationRisk":0.18,"assetLifetimeYears":4,"capacityElasticity":0.92,
     "ticketSize":"HIGH","baseDemandLevel":380,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.01,1.01,1.01,1.00,1.00,1.01,1.02,1.04]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('TECH','TECH_MSP','Managed Services','IT ops & support contracts',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.06,"max":0.18},"demandVolatility":0.15,"priceElasticity":0.30,
     "labourIntensity":0.50,"skillIntensity":0.75,"regulationRisk":0.12,"assetLifetimeYears":5,"capacityElasticity":0.80,
     "ticketSize":"MEDIUM","baseDemandLevel":520,
     "seasonalityPattern":{"monthlyFactors":[0.99,0.99,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.01,1.02]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('TECH','TECH_APPS','Mobile Apps','Consumer/pro app studio',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.05,"max":0.25},"demandVolatility":0.60,"priceElasticity":0.55,
     "labourIntensity":0.30,"skillIntensity":0.80,"regulationRisk":0.10,"assetLifetimeYears":3,"capacityElasticity":0.95,
     "ticketSize":"LOW","baseDemandLevel":500,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,0.98,1.00,1.02,1.05,1.00,0.98,1.02,1.10,1.15,1.25]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),

  -- BUILD
  ('BUILD','BUILD_RENO','Renovation','Residential renovations',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.06,"max":0.16},"demandVolatility":0.30,"priceElasticity":0.45,
     "labourIntensity":0.65,"skillIntensity":0.60,"regulationRisk":0.22,"assetLifetimeYears":10,"capacityElasticity":0.35,
     "ticketSize":"HIGH","baseDemandLevel":380,
     "seasonalityPattern":{"monthlyFactors":[0.80,0.85,0.95,1.05,1.15,1.25,1.30,1.20,1.05,0.95,0.85,0.75]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('BUILD','BUILD_NEW','New Builds','New construction projects',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.04,"max":0.14},"demandVolatility":0.35,"priceElasticity":0.40,
     "labourIntensity":0.70,"skillIntensity":0.65,"regulationRisk":0.30,"assetLifetimeYears":15,"capacityElasticity":0.25,
     "ticketSize":"HIGH","baseDemandLevel":280,
     "seasonalityPattern":{"monthlyFactors":[0.75,0.80,0.92,1.05,1.18,1.28,1.35,1.25,1.05,0.92,0.80,0.70]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('BUILD','BUILD_COMM','Commercial Build','Offices, retail, warehouses',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.05,"max":0.15},"demandVolatility":0.28,"priceElasticity":0.35,
     "labourIntensity":0.65,"skillIntensity":0.70,"regulationRisk":0.32,"assetLifetimeYears":20,"capacityElasticity":0.22,
     "ticketSize":"HIGH","baseDemandLevel":220,
     "seasonalityPattern":{"monthlyFactors":[0.78,0.82,0.95,1.05,1.15,1.22,1.25,1.18,1.05,0.95,0.85,0.75]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('BUILD','BUILD_ELECT','Electrical','Electrical contracting',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.07,"max":0.18},"demandVolatility":0.20,"priceElasticity":0.35,
     "labourIntensity":0.55,"skillIntensity":0.75,"regulationRisk":0.24,"assetLifetimeYears":10,"capacityElasticity":0.40,
     "ticketSize":"MEDIUM","baseDemandLevel":520,
     "seasonalityPattern":{"monthlyFactors":[0.90,0.92,0.97,1.03,1.08,1.12,1.10,1.05,1.00,0.97,0.92,0.88]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('BUILD','BUILD_PLUMB','Plumbing','Plumbing & HVAC services',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.08,"max":0.20},"demandVolatility":0.18,"priceElasticity":0.30,
     "labourIntensity":0.55,"skillIntensity":0.70,"regulationRisk":0.22,"assetLifetimeYears":10,"capacityElasticity":0.45,
     "ticketSize":"MEDIUM","baseDemandLevel":560,
     "seasonalityPattern":{"monthlyFactors":[1.10,1.08,1.02,1.00,0.95,0.90,0.85,0.85,0.92,1.00,1.08,1.25]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('BUILD','BUILD_ENGINE','Engineering','Structural/civil engineering',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.10,"max":0.25},"demandVolatility":0.25,"priceElasticity":0.25,
     "labourIntensity":0.45,"skillIntensity":0.90,"regulationRisk":0.28,"assetLifetimeYears":8,"capacityElasticity":0.55,
     "ticketSize":"HIGH","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[0.90,0.92,0.97,1.03,1.08,1.10,1.08,1.05,1.00,0.97,0.92,0.90]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),

  -- LOGI
  ('LOGI','LOGI_TRUCK','Trucking','Road transport fleet',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.02,"max":0.08},"demandVolatility":0.25,"priceElasticity":0.70,
     "labourIntensity":0.55,"skillIntensity":0.45,"regulationRisk":0.22,"assetLifetimeYears":8,"capacityElasticity":0.35,
     "ticketSize":"HIGH","baseDemandLevel":700,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.96,0.98,1.00,1.02,1.05,1.05,1.03,1.01,1.00,1.02,1.08]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('LOGI','LOGI_WARE','Warehousing','Storage & 3PL',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.04,"max":0.12},"demandVolatility":0.18,"priceElasticity":0.55,
     "labourIntensity":0.45,"skillIntensity":0.40,"regulationRisk":0.18,"assetLifetimeYears":20,"capacityElasticity":0.22,
     "ticketSize":"HIGH","baseDemandLevel":480,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.00,1.01,1.02,1.01,1.00,1.00,1.03,1.12]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('LOGI','LOGI_LASTMILE','Last Mile','Parcel & last mile delivery',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.03,"max":0.10},"demandVolatility":0.35,"priceElasticity":0.75,
     "labourIntensity":0.60,"skillIntensity":0.35,"regulationRisk":0.20,"assetLifetimeYears":6,"capacityElasticity":0.45,
     "ticketSize":"LOW","baseDemandLevel":1200,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,0.98,1.00,1.02,1.05,1.00,0.98,1.02,1.10,1.18,1.45]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('LOGI','LOGI_FREIGHT','Freight Forwarding','International forwarding',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.04,"max":0.14},"demandVolatility":0.30,"priceElasticity":0.55,
     "labourIntensity":0.40,"skillIntensity":0.65,"regulationRisk":0.22,"assetLifetimeYears":7,"capacityElasticity":0.65,
     "ticketSize":"HIGH","baseDemandLevel":380,
     "seasonalityPattern":{"monthlyFactors":[0.96,0.97,0.98,1.00,1.02,1.04,1.04,1.02,1.01,1.00,1.02,1.10]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('LOGI','LOGI_COLD','Cold Chain','Temperature-controlled logistics',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.04,"max":0.12},"demandVolatility":0.22,"priceElasticity":0.45,
     "labourIntensity":0.45,"skillIntensity":0.55,"regulationRisk":0.25,"assetLifetimeYears":12,"capacityElasticity":0.25,
     "ticketSize":"HIGH","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[1.05,1.04,1.02,1.00,0.98,0.96,0.95,0.95,0.98,1.00,1.03,1.08]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('LOGI','LOGI_PORT','Port Services','Port handling & services',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.03,"max":0.10},"demandVolatility":0.28,"priceElasticity":0.40,
     "labourIntensity":0.50,"skillIntensity":0.55,"regulationRisk":0.30,"assetLifetimeYears":20,"capacityElasticity":0.18,
     "ticketSize":"HIGH","baseDemandLevel":180,
     "seasonalityPattern":{"monthlyFactors":[0.96,0.97,0.98,1.00,1.02,1.03,1.03,1.02,1.01,1.00,1.01,1.06]},
     "competitionType":"MONOPOLY_LIKE"
   }'::jsonb),

  -- PROP
  ('PROP','PROP_OFFICE','Office Leasing','Lease offices to tenants',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.08,"max":0.22},"demandVolatility":0.20,"priceElasticity":0.35,
     "labourIntensity":0.15,"skillIntensity":0.55,"regulationRisk":0.20,"assetLifetimeYears":30,"capacityElasticity":0.10,
     "ticketSize":"HIGH","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[0.99,0.99,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.01,1.02]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('PROP','PROP_WARE','Warehouse Leasing','Industrial warehouse leasing',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.09,"max":0.24},"demandVolatility":0.18,"priceElasticity":0.30,
     "labourIntensity":0.12,"skillIntensity":0.45,"regulationRisk":0.18,"assetLifetimeYears":30,"capacityElasticity":0.10,
     "ticketSize":"HIGH","baseDemandLevel":220,
     "seasonalityPattern":{"monthlyFactors":[0.99,0.99,1.00,1.00,1.00,1.01,1.01,1.00,1.00,1.00,1.02,1.04]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('PROP','PROP_RETAIL','Retail Leasing','Lease retail units',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.08,"max":0.22},"demandVolatility":0.22,"priceElasticity":0.40,
     "labourIntensity":0.18,"skillIntensity":0.50,"regulationRisk":0.22,"assetLifetimeYears":30,"capacityElasticity":0.10,
     "ticketSize":"HIGH","baseDemandLevel":200,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.96,0.98,1.00,1.02,1.03,1.02,1.00,1.02,1.05,1.10,1.25]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('PROP','PROP_RESI','Residential Rent','Residential rental units',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.06,"max":0.18},"demandVolatility":0.10,"priceElasticity":0.20,
     "labourIntensity":0.12,"skillIntensity":0.35,"regulationRisk":0.30,"assetLifetimeYears":40,"capacityElasticity":0.08,
     "ticketSize":"MEDIUM","baseDemandLevel":320,
     "seasonalityPattern":{"monthlyFactors":[1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('PROP','PROP_HOSP','Hospitality Property','Hotels / short-stay property',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.06,"max":0.20},"demandVolatility":0.35,"priceElasticity":0.45,
     "labourIntensity":0.18,"skillIntensity":0.45,"regulationRisk":0.26,"assetLifetimeYears":30,"capacityElasticity":0.10,
     "ticketSize":"HIGH","baseDemandLevel":180,
     "seasonalityPattern":{"monthlyFactors":[0.75,0.78,0.90,1.00,1.12,1.25,1.35,1.30,1.12,1.00,0.88,1.05]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('PROP','PROP_DEV','Property Development','Develop & sell real estate',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.05,"max":0.25},"demandVolatility":0.45,"priceElasticity":0.35,
     "labourIntensity":0.20,"skillIntensity":0.70,"regulationRisk":0.35,"assetLifetimeYears":25,"capacityElasticity":0.12,
     "ticketSize":"HIGH","baseDemandLevel":120,
     "seasonalityPattern":{"monthlyFactors":[0.80,0.85,0.95,1.05,1.15,1.25,1.30,1.20,1.05,0.95,0.85,0.75]},
     "competitionType":"MONOPOLY_LIKE"
   }'::jsonb),

  -- MANU
  ('MANU','MANU_FMCG','FMCG Factory','Fast-moving consumer goods',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.03,"max":0.12},"demandVolatility":0.12,"priceElasticity":0.70,
     "labourIntensity":0.35,"skillIntensity":0.55,"regulationRisk":0.20,"assetLifetimeYears":15,"capacityElasticity":0.25,
     "ticketSize":"MEDIUM","baseDemandLevel":900,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.05,1.18]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('MANU','MANU_METAL','Metal Works','Metal parts & machining',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.04,"max":0.14},"demandVolatility":0.22,"priceElasticity":0.55,
     "labourIntensity":0.40,"skillIntensity":0.65,"regulationRisk":0.25,"assetLifetimeYears":20,"capacityElasticity":0.20,
     "ticketSize":"HIGH","baseDemandLevel":420,
     "seasonalityPattern":{"monthlyFactors":[0.90,0.92,0.97,1.03,1.08,1.10,1.08,1.05,1.00,0.97,0.92,0.90]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('MANU','MANU_ELECT','Electronics Mfg','Electronics assembly',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.03,"max":0.10},"demandVolatility":0.30,"priceElasticity":0.65,
     "labourIntensity":0.30,"skillIntensity":0.70,"regulationRisk":0.22,"assetLifetimeYears":12,"capacityElasticity":0.25,
     "ticketSize":"HIGH","baseDemandLevel":380,
     "seasonalityPattern":{"monthlyFactors":[0.92,0.94,0.96,1.00,1.00,1.02,1.00,0.98,1.02,1.05,1.15,1.35]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('MANU','MANU_CHEM','Chemicals','Chemicals / materials',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.04,"max":0.16},"demandVolatility":0.20,"priceElasticity":0.45,
     "labourIntensity":0.25,"skillIntensity":0.60,"regulationRisk":0.35,"assetLifetimeYears":20,"capacityElasticity":0.18,
     "ticketSize":"HIGH","baseDemandLevel":240,
     "seasonalityPattern":{"monthlyFactors":[0.96,0.97,0.98,1.00,1.01,1.02,1.02,1.01,1.00,1.00,1.01,1.03]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('MANU','MANU_TEXT','Textiles','Textile production',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.03,"max":0.12},"demandVolatility":0.35,"priceElasticity":0.75,
     "labourIntensity":0.50,"skillIntensity":0.45,"regulationRisk":0.18,"assetLifetimeYears":12,"capacityElasticity":0.30,
     "ticketSize":"MEDIUM","baseDemandLevel":420,
     "seasonalityPattern":{"monthlyFactors":[0.90,0.95,0.98,1.00,1.02,1.05,0.95,0.92,1.00,1.08,1.12,1.25]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('MANU','MANU_AUTO','Auto Parts','Auto parts manufacturing',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.03,"max":0.12},"demandVolatility":0.28,"priceElasticity":0.60,
     "labourIntensity":0.35,"skillIntensity":0.55,"regulationRisk":0.22,"assetLifetimeYears":15,"capacityElasticity":0.22,
     "ticketSize":"HIGH","baseDemandLevel":320,
     "seasonalityPattern":{"monthlyFactors":[0.92,0.94,0.96,1.00,1.02,1.04,1.04,1.02,1.01,1.00,1.02,1.06]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),

  -- AGRI
  ('AGRI','AGRI_FARM','Crop Farm','Crops & grains',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.02,"max":0.10},"demandVolatility":0.30,"priceElasticity":0.65,
     "labourIntensity":0.30,"skillIntensity":0.35,"regulationRisk":0.25,"assetLifetimeYears":20,"capacityElasticity":0.20,
     "ticketSize":"HIGH","baseDemandLevel":500,
     "seasonalityPattern":{"monthlyFactors":[0.75,0.80,0.90,1.05,1.15,1.20,1.15,1.05,0.95,0.90,0.82,0.78]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('AGRI','AGRI_DAIRY','Dairy','Milk & dairy production',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.02,"max":0.08},"demandVolatility":0.12,"priceElasticity":0.55,
     "labourIntensity":0.35,"skillIntensity":0.40,"regulationRisk":0.28,"assetLifetimeYears":20,"capacityElasticity":0.18,
     "ticketSize":"MEDIUM","baseDemandLevel":520,
     "seasonalityPattern":{"monthlyFactors":[1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.02,1.04]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('AGRI','AGRI_GREEN','Greenhouse','Greenhouse vegetables',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.03,"max":0.12},"demandVolatility":0.20,"priceElasticity":0.60,
     "labourIntensity":0.40,"skillIntensity":0.45,"regulationRisk":0.30,"assetLifetimeYears":15,"capacityElasticity":0.22,
     "ticketSize":"MEDIUM","baseDemandLevel":480,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.96,0.98,1.00,1.02,1.03,1.03,1.02,1.01,1.00,1.02,1.06]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('AGRI','AGRI_MEAT','Livestock','Meat & livestock',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.02,"max":0.08},"demandVolatility":0.15,"priceElasticity":0.55,
     "labourIntensity":0.40,"skillIntensity":0.35,"regulationRisk":0.35,"assetLifetimeYears":20,"capacityElasticity":0.18,
     "ticketSize":"HIGH","baseDemandLevel":420,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.03,1.10]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('AGRI','AGRI_ORGANIC','Organic','Organic farm products',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.05,"max":0.16},"demandVolatility":0.25,"priceElasticity":0.45,
     "labourIntensity":0.45,"skillIntensity":0.45,"regulationRisk":0.28,"assetLifetimeYears":15,"capacityElasticity":0.22,
     "ticketSize":"MEDIUM","baseDemandLevel":360,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.96,0.98,1.00,1.02,1.03,1.02,1.01,1.00,1.00,1.02,1.06]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('AGRI','AGRI_FOODPROC','Food Processing','Processing farm outputs',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.03,"max":0.12},"demandVolatility":0.18,"priceElasticity":0.55,
     "labourIntensity":0.35,"skillIntensity":0.50,"regulationRisk":0.25,"assetLifetimeYears":15,"capacityElasticity":0.25,
     "ticketSize":"MEDIUM","baseDemandLevel":520,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.05,1.18]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),

  -- ENER
  ('ENER','ENER_RENEW','Renewables','Solar/wind operations',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.06,"max":0.20},"demandVolatility":0.10,"priceElasticity":0.20,
     "labourIntensity":0.12,"skillIntensity":0.55,"regulationRisk":0.35,"assetLifetimeYears":25,"capacityElasticity":0.10,
     "ticketSize":"HIGH","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('ENER','ENER_GRID','Grid Services','Grid balancing & services',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.06,"max":0.22},"demandVolatility":0.08,"priceElasticity":0.15,
     "labourIntensity":0.10,"skillIntensity":0.60,"regulationRisk":0.40,"assetLifetimeYears":30,"capacityElasticity":0.08,
     "ticketSize":"HIGH","baseDemandLevel":220,
     "seasonalityPattern":{"monthlyFactors":[1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00]},
     "competitionType":"MONOPOLY_LIKE"
   }'::jsonb),
  ('ENER','ENER_GAS','Gas & Heat','Gas/heat services',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.04,"max":0.16},"demandVolatility":0.15,"priceElasticity":0.25,
     "labourIntensity":0.12,"skillIntensity":0.45,"regulationRisk":0.35,"assetLifetimeYears":25,"capacityElasticity":0.08,
     "ticketSize":"HIGH","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[1.25,1.20,1.10,1.00,0.90,0.82,0.78,0.78,0.85,1.00,1.15,1.30]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('ENER','ENER_ELEC','Electric Utility','Electric supply',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.03,"max":0.12},"demandVolatility":0.08,"priceElasticity":0.20,
     "labourIntensity":0.10,"skillIntensity":0.45,"regulationRisk":0.35,"assetLifetimeYears":30,"capacityElasticity":0.08,
     "ticketSize":"HIGH","baseDemandLevel":320,
     "seasonalityPattern":{"monthlyFactors":[1.05,1.04,1.02,1.00,0.98,0.96,0.95,0.95,0.98,1.00,1.03,1.08]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('ENER','ENER_EFF','Energy Efficiency','Retrofit & efficiency services',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.08,"max":0.22},"demandVolatility":0.25,"priceElasticity":0.35,
     "labourIntensity":0.35,"skillIntensity":0.70,"regulationRisk":0.20,"assetLifetimeYears":8,"capacityElasticity":0.55,
     "ticketSize":"HIGH","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[1.10,1.08,1.02,1.00,0.95,0.90,0.85,0.85,0.92,1.00,1.08,1.25]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('ENER','ENER_TRADING','Energy Trading','Trading & brokerage',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.02,"max":0.18},"demandVolatility":0.70,"priceElasticity":0.50,
     "labourIntensity":0.18,"skillIntensity":0.85,"regulationRisk":0.35,"assetLifetimeYears":5,"capacityElasticity":0.90,
     "ticketSize":"HIGH","baseDemandLevel":180,
     "seasonalityPattern":{"monthlyFactors":[1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),

  -- HEAL
  ('HEAL','HEAL_CLINIC','Clinic','Private clinic services',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.06,"max":0.18},"demandVolatility":0.10,"priceElasticity":0.20,
     "labourIntensity":0.55,"skillIntensity":0.90,"regulationRisk":0.45,"assetLifetimeYears":12,"capacityElasticity":0.25,
     "ticketSize":"HIGH","baseDemandLevel":320,
     "seasonalityPattern":{"monthlyFactors":[1.02,1.02,1.01,1.00,0.99,0.98,0.98,0.98,0.99,1.00,1.02,1.05]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('HEAL','HEAL_DENTAL','Dental','Dental practice',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.08,"max":0.22},"demandVolatility":0.12,"priceElasticity":0.25,
     "labourIntensity":0.50,"skillIntensity":0.85,"regulationRisk":0.40,"assetLifetimeYears":12,"capacityElasticity":0.25,
     "ticketSize":"HIGH","baseDemandLevel":340,
     "seasonalityPattern":{"monthlyFactors":[1.00,1.00,1.00,1.00,1.00,0.98,0.95,0.95,0.98,1.00,1.02,1.05]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('HEAL','HEAL_PHYSIO','Physio','Physiotherapy practice',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.08,"max":0.20},"demandVolatility":0.12,"priceElasticity":0.25,
     "labourIntensity":0.55,"skillIntensity":0.80,"regulationRisk":0.35,"assetLifetimeYears":10,"capacityElasticity":0.35,
     "ticketSize":"MEDIUM","baseDemandLevel":420,
     "seasonalityPattern":{"monthlyFactors":[1.02,1.02,1.01,1.00,0.99,0.98,0.98,0.98,0.99,1.00,1.02,1.05]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('HEAL','HEAL_HOMECARE','Home Care','Care at home',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.04,"max":0.12},"demandVolatility":0.08,"priceElasticity":0.15,
     "labourIntensity":0.85,"skillIntensity":0.70,"regulationRisk":0.45,"assetLifetimeYears":8,"capacityElasticity":0.40,
     "ticketSize":"MEDIUM","baseDemandLevel":520,
     "seasonalityPattern":{"monthlyFactors":[1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('HEAL','HEAL_WELLNESS','Wellness','Wellness & therapies',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.08,"max":0.24},"demandVolatility":0.30,"priceElasticity":0.40,
     "labourIntensity":0.55,"skillIntensity":0.65,"regulationRisk":0.20,"assetLifetimeYears":8,"capacityElasticity":0.45,
     "ticketSize":"MEDIUM","baseDemandLevel":360,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,0.98,1.00,1.02,1.05,1.05,1.03,1.00,1.00,1.05,1.20]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('HEAL','HEAL_LAB','Diagnostics Lab','Testing & diagnostics',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.06,"max":0.18},"demandVolatility":0.10,"priceElasticity":0.20,
     "labourIntensity":0.45,"skillIntensity":0.85,"regulationRisk":0.50,"assetLifetimeYears":15,"capacityElasticity":0.18,
     "ticketSize":"HIGH","baseDemandLevel":280,
     "seasonalityPattern":{"monthlyFactors":[1.05,1.05,1.02,1.00,0.98,0.95,0.92,0.92,0.95,0.98,1.05,1.13]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),

  -- MEDIA
  ('MEDIA','MEDIA_CONTENT','Content Studio','Video/audio content production',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.08,"max":0.28},"demandVolatility":0.55,"priceElasticity":0.55,
     "labourIntensity":0.35,"skillIntensity":0.75,"regulationRisk":0.10,"assetLifetimeYears":4,"capacityElasticity":0.90,
     "ticketSize":"MEDIUM","baseDemandLevel":520,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,0.98,1.00,1.02,1.05,1.00,0.98,1.02,1.10,1.15,1.25]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('MEDIA','MEDIA_AGENCY','Ad Agency','Marketing & ad campaigns',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.10,"max":0.25},"demandVolatility":0.40,"priceElasticity":0.45,
     "labourIntensity":0.45,"skillIntensity":0.75,"regulationRisk":0.12,"assetLifetimeYears":5,"capacityElasticity":0.80,
     "ticketSize":"HIGH","baseDemandLevel":420,
     "seasonalityPattern":{"monthlyFactors":[0.90,0.92,0.96,1.00,1.03,1.05,1.02,1.00,1.02,1.05,1.08,1.15]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('MEDIA','MEDIA_EVENTS','Events','Events & festivals',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.06,"max":0.22},"demandVolatility":0.70,"priceElasticity":0.60,
     "labourIntensity":0.55,"skillIntensity":0.55,"regulationRisk":0.25,"assetLifetimeYears":8,"capacityElasticity":0.45,
     "ticketSize":"HIGH","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[0.60,0.65,0.80,1.00,1.20,1.35,1.45,1.40,1.15,0.95,0.75,0.70]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('MEDIA','MEDIA_MUSIC','Music Label','Artists & streaming',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.05,"max":0.30},"demandVolatility":0.80,"priceElasticity":0.50,
     "labourIntensity":0.20,"skillIntensity":0.80,"regulationRisk":0.12,"assetLifetimeYears":4,"capacityElasticity":0.95,
     "ticketSize":"LOW","baseDemandLevel":340,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,0.98,1.00,1.02,1.05,1.05,1.03,1.00,1.00,1.05,1.20]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('MEDIA','MEDIA_GAMES','Indie Games','Game studio',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.06,"max":0.35},"demandVolatility":0.85,"priceElasticity":0.55,
     "labourIntensity":0.30,"skillIntensity":0.85,"regulationRisk":0.10,"assetLifetimeYears":4,"capacityElasticity":0.95,
     "ticketSize":"MEDIUM","baseDemandLevel":300,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.95,0.98,1.00,1.02,1.05,1.00,0.98,1.02,1.08,1.12,1.40]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('MEDIA','MEDIA_STREAM','Streaming','Streaming platform niche',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.04,"max":0.20},"demandVolatility":0.30,"priceElasticity":0.35,
     "labourIntensity":0.25,"skillIntensity":0.80,"regulationRisk":0.20,"assetLifetimeYears":10,"capacityElasticity":0.70,
     "ticketSize":"MEDIUM","baseDemandLevel":240,
     "seasonalityPattern":{"monthlyFactors":[0.99,0.99,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.02,1.05]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),

  -- FIN
  ('FIN','FIN_ACCOUNT','Accounting','Accounting firm',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.10,"max":0.28},"demandVolatility":0.15,"priceElasticity":0.25,
     "labourIntensity":0.55,"skillIntensity":0.75,"regulationRisk":0.30,"assetLifetimeYears":6,"capacityElasticity":0.70,
     "ticketSize":"MEDIUM","baseDemandLevel":480,
     "seasonalityPattern":{"monthlyFactors":[1.05,1.05,1.02,1.00,0.98,0.95,0.92,0.92,0.95,1.00,1.10,1.25]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('FIN','FIN_LEGAL','Legal','Legal services',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.12,"max":0.32},"demandVolatility":0.20,"priceElasticity":0.20,
     "labourIntensity":0.60,"skillIntensity":0.90,"regulationRisk":0.35,"assetLifetimeYears":6,"capacityElasticity":0.65,
     "ticketSize":"HIGH","baseDemandLevel":320,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.01,1.01,1.01,1.00,1.00,1.01,1.02,1.04]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('FIN','FIN_CONSULT','Consulting','Management consulting',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.12,"max":0.30},"demandVolatility":0.30,"priceElasticity":0.25,
     "labourIntensity":0.55,"skillIntensity":0.90,"regulationRisk":0.20,"assetLifetimeYears":6,"capacityElasticity":0.75,
     "ticketSize":"HIGH","baseDemandLevel":340,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.96,0.98,1.00,1.02,1.02,1.00,0.98,1.00,1.02,1.02,1.05]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('FIN','FIN_INSURE','Insurance','Insurance brokerage',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.08,"max":0.22},"demandVolatility":0.12,"priceElasticity":0.20,
     "labourIntensity":0.40,"skillIntensity":0.70,"regulationRisk":0.35,"assetLifetimeYears":6,"capacityElasticity":0.80,
     "ticketSize":"MEDIUM","baseDemandLevel":380,
     "seasonalityPattern":{"monthlyFactors":[0.99,0.99,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.01,1.02]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('FIN','FIN_LENDING','Lending','Alternative lending',
   '{
     "capexIntensity":"LOW","marginRange":{"min":0.03,"max":0.20},"demandVolatility":0.40,"priceElasticity":0.15,
     "labourIntensity":0.20,"skillIntensity":0.75,"regulationRisk":0.45,"assetLifetimeYears":5,"capacityElasticity":0.90,
     "ticketSize":"HIGH","baseDemandLevel":240,
     "seasonalityPattern":{"monthlyFactors":[1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('FIN','FIN_PAYMENTS','Payments','Payment services provider',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.06,"max":0.25},"demandVolatility":0.25,"priceElasticity":0.25,
     "labourIntensity":0.25,"skillIntensity":0.85,"regulationRisk":0.40,"assetLifetimeYears":7,"capacityElasticity":0.90,
     "ticketSize":"LOW","baseDemandLevel":300,
     "seasonalityPattern":{"monthlyFactors":[0.99,0.99,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.00,1.03,1.10]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),

  -- AUTO
  ('AUTO','AUTO_REPAIR','Repair Shop','General auto repair',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.06,"max":0.18},"demandVolatility":0.15,"priceElasticity":0.35,
     "labourIntensity":0.55,"skillIntensity":0.65,"regulationRisk":0.18,"assetLifetimeYears":10,"capacityElasticity":0.35,
     "ticketSize":"HIGH","baseDemandLevel":420,
     "seasonalityPattern":{"monthlyFactors":[1.05,1.03,1.01,1.00,0.99,0.98,0.98,0.98,0.99,1.00,1.02,1.05]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('AUTO','AUTO_DEALER','Car Dealer','Used/new car sales',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.02,"max":0.10},"demandVolatility":0.55,"priceElasticity":0.50,
     "labourIntensity":0.30,"skillIntensity":0.55,"regulationRisk":0.20,"assetLifetimeYears":10,"capacityElasticity":0.30,
     "ticketSize":"HIGH","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[0.92,0.94,0.96,1.00,1.05,1.08,1.02,0.98,1.02,1.05,1.08,1.15]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('AUTO','AUTO_CARWASH','Car Wash','Car wash service',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.10,"max":0.28},"demandVolatility":0.25,"priceElasticity":0.40,
     "labourIntensity":0.25,"skillIntensity":0.30,"regulationRisk":0.15,"assetLifetimeYears":10,"capacityElasticity":0.45,
     "ticketSize":"LOW","baseDemandLevel":520,
     "seasonalityPattern":{"monthlyFactors":[0.90,0.92,0.97,1.03,1.08,1.12,1.10,1.05,1.00,0.97,0.92,0.88]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),
  ('AUTO','AUTO_EV','EV Services','EV charging & services',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.04,"max":0.18},"demandVolatility":0.35,"priceElasticity":0.25,
     "labourIntensity":0.20,"skillIntensity":0.60,"regulationRisk":0.25,"assetLifetimeYears":15,"capacityElasticity":0.15,
     "ticketSize":"MEDIUM","baseDemandLevel":240,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.01,1.01,1.01,1.00,1.00,1.01,1.02,1.04]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('AUTO','AUTO_MOBILITY','Mobility','Car-sharing / mobility service',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.02,"max":0.12},"demandVolatility":0.35,"priceElasticity":0.55,
     "labourIntensity":0.25,"skillIntensity":0.45,"regulationRisk":0.22,"assetLifetimeYears":8,"capacityElasticity":0.25,
     "ticketSize":"LOW","baseDemandLevel":380,
     "seasonalityPattern":{"monthlyFactors":[0.90,0.92,0.96,1.00,1.05,1.10,1.08,1.03,1.00,0.97,0.92,0.88]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('AUTO','AUTO_PARTS','Parts & Tires','Parts and tire retailer',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.04,"max":0.14},"demandVolatility":0.22,"priceElasticity":0.70,
     "labourIntensity":0.35,"skillIntensity":0.40,"regulationRisk":0.15,"assetLifetimeYears":8,"capacityElasticity":0.55,
     "ticketSize":"MEDIUM","baseDemandLevel":420,
     "seasonalityPattern":{"monthlyFactors":[1.08,1.05,1.02,1.00,0.98,0.95,0.92,0.92,0.95,1.00,1.05,1.12]},
     "competitionType":"FRAGMENTED"
   }'::jsonb),

  -- RECY
  ('RECY','RECY_COLLECTION','Collection','Waste collection services',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.03,"max":0.10},"demandVolatility":0.15,"priceElasticity":0.35,
     "labourIntensity":0.50,"skillIntensity":0.45,"regulationRisk":0.35,"assetLifetimeYears":12,"capacityElasticity":0.25,
     "ticketSize":"MEDIUM","baseDemandLevel":520,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.02,1.05,1.05,1.03,1.01,1.00,1.02,1.08]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('RECY','RECY_MRF','Sorting Facility','MRF / sorting facility',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.02,"max":0.12},"demandVolatility":0.25,"priceElasticity":0.25,
     "labourIntensity":0.40,"skillIntensity":0.55,"regulationRisk":0.40,"assetLifetimeYears":20,"capacityElasticity":0.18,
     "ticketSize":"HIGH","baseDemandLevel":280,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.00,1.01,1.01,1.00,1.00,1.00,1.02,1.05]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('RECY','RECY_METAL','Metal Recycling','Scrap processing',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.03,"max":0.16},"demandVolatility":0.45,"priceElasticity":0.35,
     "labourIntensity":0.35,"skillIntensity":0.50,"regulationRisk":0.38,"assetLifetimeYears":18,"capacityElasticity":0.18,
     "ticketSize":"HIGH","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[0.95,0.96,0.98,1.00,1.02,1.03,1.03,1.02,1.01,1.00,1.01,1.06]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('RECY','RECY_EWASTE','E-Waste','Electronic waste handling',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.04,"max":0.18},"demandVolatility":0.30,"priceElasticity":0.25,
     "labourIntensity":0.35,"skillIntensity":0.60,"regulationRisk":0.45,"assetLifetimeYears":12,"capacityElasticity":0.25,
     "ticketSize":"MEDIUM","baseDemandLevel":220,
     "seasonalityPattern":{"monthlyFactors":[0.92,0.94,0.96,1.00,1.00,1.02,1.00,0.98,1.02,1.05,1.15,1.35]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('RECY','RECY_CONSTR','C&D Waste','Construction & demolition waste',
   '{
     "capexIntensity":"HIGH","marginRange":{"min":0.02,"max":0.12},"demandVolatility":0.25,"priceElasticity":0.30,
     "labourIntensity":0.35,"skillIntensity":0.45,"regulationRisk":0.40,"assetLifetimeYears":18,"capacityElasticity":0.18,
     "ticketSize":"HIGH","baseDemandLevel":240,
     "seasonalityPattern":{"monthlyFactors":[0.80,0.85,0.95,1.05,1.15,1.25,1.30,1.20,1.05,0.95,0.85,0.75]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb),
  ('RECY','RECY_BIO','Organic Waste','Composting & organics',
   '{
     "capexIntensity":"MEDIUM","marginRange":{"min":0.02,"max":0.10},"demandVolatility":0.18,"priceElasticity":0.20,
     "labourIntensity":0.30,"skillIntensity":0.40,"regulationRisk":0.35,"assetLifetimeYears":15,"capacityElasticity":0.22,
     "ticketSize":"MEDIUM","baseDemandLevel":260,
     "seasonalityPattern":{"monthlyFactors":[0.98,0.98,0.99,1.00,1.02,1.05,1.05,1.03,1.01,1.00,1.02,1.08]},
     "competitionType":"OLIGOPOLY"
   }'::jsonb)

  ) as t(sector_code, code, name, description, config)
)
insert into public.niches (sector_id, code, name, description, config)
select si.id, ns.code, ns.name, ns.description, ns.config
from niches_seed ns
join sector_ids si on si.code = ns.sector_code
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- ----------------------------
-- 2b) Decision/upgrade profiles per niche (sector-based defaults)
-- ----------------------------
-- Override per niche by setting config.upgradeProfile in niches_seed.
update public.niches n
set config = n.config || jsonb_build_object(
  'decisionProfile', coalesce(n.config->>'decisionProfile', 'SECTOR_' || s.code),
  'upgradeProfile', coalesce(
    n.config->>'upgradeProfile',
    case s.code
      when 'TECH' then 'DIGITAL'
      when 'ECOM' then 'DIGITAL'
      when 'BUILD' then 'INDUSTRIAL'
      when 'MANU' then 'INDUSTRIAL'
      when 'LOGI' then 'INDUSTRIAL'
      when 'AGRI' then 'INDUSTRIAL'
      when 'RECY' then 'INDUSTRIAL'
      when 'ENER' then 'REGULATED'
      when 'HEAL' then 'REGULATED'
      when 'FIN' then 'REGULATED'
      when 'PROP' then 'REGULATED'
      when 'HORECA' then 'SERVICE'
      when 'RETAIL' then 'SERVICE'
      when 'AUTO' then 'SERVICE'
      when 'MEDIA' then 'SERVICE'
      else 'SERVICE'
    end
  )
)
from public.sectors s
where n.sector_id = s.id;

-- ----------------------------
-- 2c) Niche upgrades (profile-based trees)
-- ----------------------------
with upgrade_templates as (
  select * from (values
    -- SERVICE (HORECA/RETAIL/AUTO/MEDIA)
    ('SERVICE','EXPERIENCE', 1, 'Guest experience I', 'Sharper service and consistency.', 60000,
      '{"qualityMultiplier":1.05,"reputationMultiplier":1.02}'::jsonb),
    ('SERVICE','EXPERIENCE', 2, 'Guest experience II', 'Noticeable experience lift.', 160000,
      '{"qualityMultiplier":1.10,"reputationMultiplier":1.05}'::jsonb),
    ('SERVICE','EXPERIENCE', 3, 'Guest experience III', 'Best-in-class reviews.', 420000,
      '{"qualityMultiplier":1.18,"reputationMultiplier":1.08}'::jsonb),

    ('SERVICE','LOCAL_MARKETING', 1, 'Local visibility I', 'Improve local awareness.', 50000,
      '{"marketingMultiplier":1.08,"reputationMultiplier":1.01}'::jsonb),
    ('SERVICE','LOCAL_MARKETING', 2, 'Local visibility II', 'Stronger neighborhood presence.', 140000,
      '{"marketingMultiplier":1.15,"reputationMultiplier":1.03}'::jsonb),
    ('SERVICE','LOCAL_MARKETING', 3, 'Local visibility III', 'Dominant local brand.', 380000,
      '{"marketingMultiplier":1.25,"reputationMultiplier":1.05}'::jsonb),

    ('SERVICE','PROCESS', 1, 'Process discipline I', 'Lower waste and rework.', 70000,
      '{"variableCostMultiplier":0.97,"labourCostMultiplier":0.99}'::jsonb),
    ('SERVICE','PROCESS', 2, 'Process discipline II', 'Tighter cost controls.', 180000,
      '{"variableCostMultiplier":0.94,"labourCostMultiplier":0.96}'::jsonb),
    ('SERVICE','PROCESS', 3, 'Process discipline III', 'Best-in-class efficiency.', 420000,
      '{"variableCostMultiplier":0.90,"labourCostMultiplier":0.93}'::jsonb),

    -- DIGITAL (TECH/ECOM)
    ('DIGITAL','GROWTH', 1, 'Growth engine I', 'Stronger acquisition engine.', 120000,
      '{"marketingMultiplier":1.10,"reputationMultiplier":1.01}'::jsonb),
    ('DIGITAL','GROWTH', 2, 'Growth engine II', 'Scaled acquisition.', 320000,
      '{"marketingMultiplier":1.20,"reputationMultiplier":1.03}'::jsonb),
    ('DIGITAL','GROWTH', 3, 'Growth engine III', 'Category-level growth.', 850000,
      '{"marketingMultiplier":1.35,"reputationMultiplier":1.06}'::jsonb),

    ('DIGITAL','PRODUCT', 1, 'Product polish I', 'Incremental product quality.', 110000,
      '{"qualityMultiplier":1.06}'::jsonb),
    ('DIGITAL','PRODUCT', 2, 'Product polish II', 'Clear quality edge.', 280000,
      '{"qualityMultiplier":1.12}'::jsonb),
    ('DIGITAL','PRODUCT', 3, 'Product polish III', 'Premium product experience.', 760000,
      '{"qualityMultiplier":1.20}'::jsonb),

    ('DIGITAL','AUTOMATION', 1, 'Automation I', 'Light automation for ops.', 150000,
      '{"labourCostMultiplier":0.95,"variableCostMultiplier":0.97}'::jsonb),
    ('DIGITAL','AUTOMATION', 2, 'Automation II', 'Heavy automation rollout.', 420000,
      '{"labourCostMultiplier":0.90,"variableCostMultiplier":0.93}'::jsonb),
    ('DIGITAL','AUTOMATION', 3, 'Automation III', 'Lean machine-led ops.', 1100000,
      '{"labourCostMultiplier":0.85,"variableCostMultiplier":0.88}'::jsonb),

    -- INDUSTRIAL (BUILD/MANU/LOGI/AGRI/RECY)
    ('INDUSTRIAL','THROUGHPUT', 1, 'Throughput I', 'Increase capacity reliability.', 200000,
      '{"capacityMultiplier":1.08}'::jsonb),
    ('INDUSTRIAL','THROUGHPUT', 2, 'Throughput II', 'Expanded output.', 600000,
      '{"capacityMultiplier":1.16}'::jsonb),
    ('INDUSTRIAL','THROUGHPUT', 3, 'Throughput III', 'High-volume readiness.', 1500000,
      '{"capacityMultiplier":1.28}'::jsonb),

    ('INDUSTRIAL','EFFICIENCY', 1, 'Efficiency I', 'Cut waste in production.', 180000,
      '{"variableCostMultiplier":0.96}'::jsonb),
    ('INDUSTRIAL','EFFICIENCY', 2, 'Efficiency II', 'Lean operating model.', 520000,
      '{"variableCostMultiplier":0.92}'::jsonb),
    ('INDUSTRIAL','EFFICIENCY', 3, 'Efficiency III', 'Best-in-class cost curve.', 1250000,
      '{"variableCostMultiplier":0.88}'::jsonb),

    ('INDUSTRIAL','SAFETY', 1, 'Safety systems I', 'Reduce incidents.', 140000,
      '{"qualityMultiplier":1.04,"reputationMultiplier":1.02}'::jsonb),
    ('INDUSTRIAL','SAFETY', 2, 'Safety systems II', 'Compliance edge.', 360000,
      '{"qualityMultiplier":1.08,"reputationMultiplier":1.04}'::jsonb),
    ('INDUSTRIAL','SAFETY', 3, 'Safety systems III', 'Best-in-class standards.', 900000,
      '{"qualityMultiplier":1.15,"reputationMultiplier":1.06}'::jsonb),

    -- REGULATED (ENER/HEAL/FIN/PROP)
    ('REGULATED','COMPLIANCE', 1, 'Compliance I', 'Baseline compliance upgrades.', 250000,
      '{"qualityMultiplier":1.03,"reputationMultiplier":1.04}'::jsonb),
    ('REGULATED','COMPLIANCE', 2, 'Compliance II', 'Stronger audit readiness.', 700000,
      '{"qualityMultiplier":1.06,"reputationMultiplier":1.08}'::jsonb),
    ('REGULATED','COMPLIANCE', 3, 'Compliance III', 'Industry-leading trust.', 1800000,
      '{"qualityMultiplier":1.10,"reputationMultiplier":1.12}'::jsonb),

    ('REGULATED','RELIABILITY', 1, 'Reliability I', 'Improve uptime and quality.', 220000,
      '{"capacityMultiplier":1.05,"qualityMultiplier":1.02}'::jsonb),
    ('REGULATED','RELIABILITY', 2, 'Reliability II', 'Increase uptime resilience.', 650000,
      '{"capacityMultiplier":1.12,"qualityMultiplier":1.05}'::jsonb),
    ('REGULATED','RELIABILITY', 3, 'Reliability III', 'Best-in-class stability.', 1600000,
      '{"capacityMultiplier":1.22,"qualityMultiplier":1.08}'::jsonb),

    ('REGULATED','COST_CONTROL', 1, 'Cost control I', 'Reduce overhead leakage.', 200000,
      '{"variableCostMultiplier":0.97,"labourCostMultiplier":0.98}'::jsonb),
    ('REGULATED','COST_CONTROL', 2, 'Cost control II', 'Stronger cost governance.', 580000,
      '{"variableCostMultiplier":0.94,"labourCostMultiplier":0.95}'::jsonb),
    ('REGULATED','COST_CONTROL', 3, 'Cost control III', 'Optimized cost base.', 1400000,
      '{"variableCostMultiplier":0.90,"labourCostMultiplier":0.92}'::jsonb)
  ) as t(profile_key, tree_key, tier, name, description, cost, effects)
),
niche_profiles as (
  select
    n.id as niche_id,
    case
      when n.config->>'upgradeProfile' in ('SERVICE','DIGITAL','INDUSTRIAL','REGULATED')
        then n.config->>'upgradeProfile'
      else 'SERVICE'
    end as profile_key
  from public.niches n
)
insert into public.niche_upgrades (niche_id, code, tree_key, name, description, tier, cost, duration_weeks, effects)
select
  np.niche_id,
  t.tree_key || '_T' || t.tier,
  t.tree_key,
  t.name,
  t.description,
  t.tier,
  t.cost,
  0,
  t.effects
from niche_profiles np
join upgrade_templates t on t.profile_key = np.profile_key
on conflict (niche_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  tier = excluded.tier,
  cost = excluded.cost,
  duration_weeks = excluded.duration_weeks,
  effects = excluded.effects;

-- ----------------------------
-- 3) Init world_sector_state for all sectors
-- ----------------------------
insert into public.world_sector_state (world_id, sector_id, current_demand, trend_factor, volatility, last_round_metrics)
select
  '00000000-0000-0000-0000-000000000001'::uuid as world_id,
  s.id as sector_id,
  0::numeric(18,2),
  1.0000::numeric(10,4),
  0.1000::numeric(10,4),
  '{}'::jsonb
from public.sectors s
on conflict (world_id, sector_id) do nothing;

-- ----------------------------
-- 4) Bot profiles (dumb/normal/smart)
-- ----------------------------
insert into public.bot_profiles (name, archetype, behavior_config)
values
('Dumb Discounter', 'DISCOUNTER',
 '{
   "priceAggressiveness":0.80,
   "marketingAggressiveness":0.20,
   "leveragePreference":0.20,
   "expansionSpeed":0.25,
   "riskTolerance":0.30,
   "reactToDominantPlayer":true,
   "memoryWindowWeeks":4,
   "reactionDelayWeeks":2,
   "overreactionChance":0.15
 }'::jsonb),
('Normal Conservative', 'CONSERVATIVE',
 '{
   "priceAggressiveness":0.45,
   "marketingAggressiveness":0.45,
   "leveragePreference":0.40,
   "expansionSpeed":0.40,
   "riskTolerance":0.40,
   "reactToDominantPlayer":true,
   "memoryWindowWeeks":8,
   "reactionDelayWeeks":1,
   "overreactionChance":0.10
 }'::jsonb),
('Smart Opportunistic', 'OPPORTUNISTIC',
 '{
   "priceAggressiveness":0.60,
   "marketingAggressiveness":0.60,
   "leveragePreference":0.55,
   "expansionSpeed":0.55,
   "riskTolerance":0.55,
   "reactToDominantPlayer":true,
   "memoryWindowWeeks":12,
   "reactionDelayWeeks":1,
   "overreactionChance":0.08
 }'::jsonb)
on conflict do nothing;

-- ----------------------------
-- 5) Seasons (presets)
-- ----------------------------
insert into public.seasons (name, description, config)
values
('Energy Crisis', 'Energy costs spike; energy sector demand rises; energy-intensive sectors suffer.',
 '{
   "macroModifiers": {"costEnergyFactor": 1.35, "riskGlobalFactor": 1.15, "demandGlobalFactor": 0.98},
   "sectorModifiers": {
     "ENER": {"demandFactor": 1.20, "costFactor": 0.95, "riskFactor": 0.95, "volatilityFactor": 1.10},
     "MANU": {"demandFactor": 0.95, "costFactor": 1.15, "riskFactor": 1.10, "volatilityFactor": 1.15},
     "LOGI": {"demandFactor": 0.98, "costFactor": 1.10, "riskFactor": 1.05, "volatilityFactor": 1.10}
   },
   "eventProbabilities": {"globalCrisisChance": 0.06, "companyEventBaseline": 0.10}
 }'::jsonb),
('Tech Bubble', 'Tech demand surges; chance of sudden crash later.',
 '{
   "macroModifiers": {"demandGlobalFactor": 1.03, "riskGlobalFactor": 1.10},
   "sectorModifiers": {
     "TECH": {"demandFactor": 1.25, "costFactor": 1.02, "riskFactor": 1.05, "volatilityFactor": 1.20}
   },
   "eventProbabilities": {"globalCrisisChance": 0.04, "companyEventBaseline": 0.10}
 }'::jsonb),
('Logistics Meltdown', 'Transport constraints; prices jump; local players advantaged.',
 '{
   "macroModifiers": {"riskGlobalFactor": 1.12},
   "sectorModifiers": {
     "LOGI": {"demandFactor": 1.15, "costFactor": 1.10, "riskFactor": 1.05, "volatilityFactor": 1.20}
   },
   "eventProbabilities": {"globalCrisisChance": 0.05, "companyEventBaseline": 0.12}
 }'::jsonb)
on conflict do nothing;

-- ----------------------------
-- 6) Skills (minimal starter set)
-- ----------------------------
insert into public.skills (tree, name, description, tier, effects)
values
('FINANCE','Cheaper Debt I','Lower interest on new loans (small).',1,'{"interestRateModifier":-0.02}'::jsonb),
('FINANCE','Tax Efficiency I','Slightly reduces effective tax burden.',1,'{"taxEfficiencyModifier":0.02}'::jsonb),
('OPERATIONS','Lean Ops I','Slightly reduces variable costs.',1,'{"capacityEfficiencyModifier":0.02}'::jsonb),
('OPERATIONS','Staff Stability I','Reduces negative staff events slightly.',1,'{"eventRiskReduction":0.02}'::jsonb),
('MARKET','Better Branding I','Marketing is slightly more effective.',1,'{"marketingEffectivenessModifier":0.03}'::jsonb),
('MARKET','Price Power I','Customers react slightly less to price hikes.',1,'{"priceElasticityModifier":-0.02}'::jsonb)
on conflict do nothing;

-- ----------------------------
-- 7) Achievements (starter set)
-- ----------------------------
insert into public.achievements (name, description, conditions)
values
('First Profit','Make net profit in a single round.','{"specialConditionKey":"FIRST_PROFIT"}'::jsonb),
('10x Profitable','10 consecutive profitable rounds.','{"minConsecutiveProfitableRounds":10}'::jsonb),
('First Million','Reach a net worth of 1,000,000.','{"minNetWorth":1000000}'::jsonb),
('Portfolio Builder','Own 3 active companies at once.','{"minActiveCompanies":3}'::jsonb),
('Crisis Survivor','Stay solvent through a crisis season.','{"specialConditionKey":"CRISIS_SURVIVOR"}'::jsonb)
on conflict do nothing;

-- ============================================================
-- Done
-- ============================================================
