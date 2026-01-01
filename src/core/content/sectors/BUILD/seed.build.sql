-- ============================================================
-- BUILD Commercial Build seed (niche + products + upgrades)
-- ============================================================

-- Ensure BUILD sector exists
insert into public.sectors (code, name, description, is_active)
values (
  'BUILD',
  'Construction',
  'Contracting and project delivery shaped by crews, materials, and schedules.',
  true
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;

-- Commercial Build niche
with sector as (
  select id from public.sectors where code = 'BUILD'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'BUILD_COMMERCIAL',
  'Commercial Build',
  'Bid-driven commercial projects with backlog and retention risk',
  $$
  {
    "capexIntensity":"HIGH",
    "marginRange":{"min":0.08,"max":0.18},
    "demandVolatility":0.5,
    "priceElasticity":0.45,
    "labourIntensity":0.7,
    "skillIntensity":0.6,
    "regulationRisk":0.35,
    "assetLifetimeYears":12,
    "capacityElasticity":0.35,
    "ticketSize":"HIGH",
    "baseDemandLevel":260,
    "seasonalityPattern":{"monthlyFactors":[0.72,0.78,0.86,1,1.1,1.2,1.24,1.2,1.06,0.96,0.82,0.74]},
    "competitionType":"OLIGOPOLY",
    "decisionProfile":"SECTOR_BUILD",
    "upgradeProfile":"INDUSTRIAL",
    "productSeasonalityKeys":{
      "warehouse_shell_project_unit":"weather_construction_seasonality",
      "office_fitout_project_unit":"renovation_summer_peak_seasonality",
      "retail_unit_project_unit":"renovation_summer_peak_seasonality",
      "industrial_extension_project_unit":"weather_construction_seasonality",
      "design_build_contract_unit":"public_tender_cycle_seasonality",
      "maintenance_repair_retain_unit":"weather_construction_seasonality"
    },
    "pipelineConfig":{
      "bidCostPctRange":[0.01,0.05],
      "bidWinRateBaseRange":[0.18,0.32],
      "backlogWorkOffRatePerCrewRange":[0.04,0.12],
      "retentionPctRange":[0.05,0.1]
    },
    "projectModels":{
      "warehouse_shell_project_unit":{
        "base_contract_value_eur_range":{"min":1500000,"max":20000000},
        "gross_margin_pct_range":{"min":0.08,"max":0.16},
        "typical_duration_ticks_range":{"min":16,"max":52},
        "payment_terms_days_range":{"min":45,"max":90},
        "retention_pct_range":{"min":0.06,"max":0.1},
        "change_order_rate_range":{"min":0.05,"max":0.12},
        "bid_win_rate_modifier":0.85,
        "cost_model":{
          "labor_hours_per_project_range":{"min":1600,"max":12000},
          "materials_cost_pct_range":{"min":0.4,"max":0.55},
          "subcontractor_cost_pct_range":{"min":0.15,"max":0.3},
          "equipment_days_per_project_range":{"min":20,"max":120},
          "mobilization_cost_eur_range":{"min":25000,"max":200000},
          "contingency_pct_range":{"min":0.06,"max":0.12}
        },
        "risk_model":{
          "delay_probability_range":{"min":0.2,"max":0.45},
          "delay_penalty_pct_range":{"min":0.02,"max":0.08},
          "safety_incident_rate_range":{"min":0.012,"max":0.04},
          "rework_pct_range":{"min":0.02,"max":0.06}
        },
        "requirements":{
          "crew_fte_min":14,
          "supervisor_fte_min":2,
          "estimator_fte_min":1,
          "equipment_requirements":["excavator_access","crane_access"],
          "compliance_score_min":0.55
        }
      },
      "office_fitout_project_unit":{
        "base_contract_value_eur_range":{"min":250000,"max":6000000},
        "gross_margin_pct_range":{"min":0.1,"max":0.2},
        "typical_duration_ticks_range":{"min":8,"max":32},
        "payment_terms_days_range":{"min":30,"max":60},
        "retention_pct_range":{"min":0.05,"max":0.08},
        "change_order_rate_range":{"min":0.08,"max":0.2},
        "bid_win_rate_modifier":0.95,
        "cost_model":{
          "labor_hours_per_project_range":{"min":400,"max":3000},
          "materials_cost_pct_range":{"min":0.25,"max":0.45},
          "subcontractor_cost_pct_range":{"min":0.2,"max":0.35},
          "equipment_days_per_project_range":{"min":8,"max":45},
          "mobilization_cost_eur_range":{"min":8000,"max":60000},
          "contingency_pct_range":{"min":0.05,"max":0.1}
        },
        "risk_model":{
          "delay_probability_range":{"min":0.15,"max":0.35},
          "delay_penalty_pct_range":{"min":0.015,"max":0.06},
          "safety_incident_rate_range":{"min":0.008,"max":0.03},
          "rework_pct_range":{"min":0.03,"max":0.08}
        },
        "requirements":{
          "crew_fte_min":10,
          "supervisor_fte_min":2,
          "estimator_fte_min":1,
          "equipment_requirements":["scissor_lift_access"],
          "reputation_score_min":0.55
        }
      },
      "retail_unit_project_unit":{
        "base_contract_value_eur_range":{"min":150000,"max":3000000},
        "gross_margin_pct_range":{"min":0.1,"max":0.22},
        "typical_duration_ticks_range":{"min":6,"max":24},
        "payment_terms_days_range":{"min":30,"max":60},
        "retention_pct_range":{"min":0.05,"max":0.08},
        "change_order_rate_range":{"min":0.1,"max":0.22},
        "bid_win_rate_modifier":1.1,
        "cost_model":{
          "labor_hours_per_project_range":{"min":250,"max":1800},
          "materials_cost_pct_range":{"min":0.2,"max":0.4},
          "subcontractor_cost_pct_range":{"min":0.15,"max":0.3},
          "equipment_days_per_project_range":{"min":6,"max":30},
          "mobilization_cost_eur_range":{"min":5000,"max":40000},
          "contingency_pct_range":{"min":0.04,"max":0.1}
        },
        "risk_model":{
          "delay_probability_range":{"min":0.12,"max":0.3},
          "delay_penalty_pct_range":{"min":0.015,"max":0.05},
          "safety_incident_rate_range":{"min":0.008,"max":0.025},
          "rework_pct_range":{"min":0.03,"max":0.07}
        },
        "requirements":{
          "crew_fte_min":6,
          "supervisor_fte_min":1,
          "estimator_fte_min":1,
          "equipment_requirements":["scissor_lift_access"],
          "reputation_score_min":0.45
        }
      },
      "industrial_extension_project_unit":{
        "base_contract_value_eur_range":{"min":800000,"max":12000000},
        "gross_margin_pct_range":{"min":0.08,"max":0.16},
        "typical_duration_ticks_range":{"min":12,"max":48},
        "payment_terms_days_range":{"min":45,"max":90},
        "retention_pct_range":{"min":0.06,"max":0.1},
        "change_order_rate_range":{"min":0.08,"max":0.18},
        "bid_win_rate_modifier":0.9,
        "cost_model":{
          "labor_hours_per_project_range":{"min":800,"max":7000},
          "materials_cost_pct_range":{"min":0.35,"max":0.55},
          "subcontractor_cost_pct_range":{"min":0.2,"max":0.35},
          "equipment_days_per_project_range":{"min":12,"max":70},
          "mobilization_cost_eur_range":{"min":15000,"max":120000},
          "contingency_pct_range":{"min":0.05,"max":0.12}
        },
        "risk_model":{
          "delay_probability_range":{"min":0.18,"max":0.4},
          "delay_penalty_pct_range":{"min":0.02,"max":0.08},
          "safety_incident_rate_range":{"min":0.01,"max":0.035},
          "rework_pct_range":{"min":0.02,"max":0.06}
        },
        "requirements":{
          "crew_fte_min":12,
          "supervisor_fte_min":2,
          "estimator_fte_min":1,
          "equipment_requirements":["forklift_access","excavator_access"],
          "compliance_score_min":0.6
        }
      },
      "design_build_contract_unit":{
        "base_contract_value_eur_range":{"min":2000000,"max":35000000},
        "gross_margin_pct_range":{"min":0.1,"max":0.18},
        "typical_duration_ticks_range":{"min":20,"max":80},
        "payment_terms_days_range":{"min":60,"max":120},
        "retention_pct_range":{"min":0.07,"max":0.1},
        "change_order_rate_range":{"min":0.12,"max":0.3},
        "bid_win_rate_modifier":0.8,
        "cost_model":{
          "labor_hours_per_project_range":{"min":2000,"max":15000},
          "materials_cost_pct_range":{"min":0.3,"max":0.55},
          "subcontractor_cost_pct_range":{"min":0.2,"max":0.35},
          "equipment_days_per_project_range":{"min":20,"max":120},
          "mobilization_cost_eur_range":{"min":30000,"max":250000},
          "contingency_pct_range":{"min":0.06,"max":0.14}
        },
        "risk_model":{
          "delay_probability_range":{"min":0.25,"max":0.5},
          "delay_penalty_pct_range":{"min":0.03,"max":0.1},
          "safety_incident_rate_range":{"min":0.012,"max":0.04},
          "rework_pct_range":{"min":0.04,"max":0.1}
        },
        "requirements":{
          "crew_fte_min":16,
          "supervisor_fte_min":3,
          "estimator_fte_min":2,
          "equipment_requirements":["crane_access","site_office_setup"],
          "compliance_score_min":0.65,
          "reputation_score_min":0.65
        }
      },
      "maintenance_repair_retain_unit":{
        "base_contract_value_eur_range":{"min":8000,"max":80000},
        "gross_margin_pct_range":{"min":0.12,"max":0.25},
        "typical_duration_ticks_range":{"min":4,"max":12},
        "payment_terms_days_range":{"min":30,"max":45},
        "retention_pct_range":{"min":0.05,"max":0.08},
        "change_order_rate_range":{"min":0.02,"max":0.08},
        "bid_win_rate_modifier":1.2,
        "cost_model":{
          "labor_hours_per_project_range":{"min":60,"max":400},
          "materials_cost_pct_range":{"min":0.1,"max":0.25},
          "subcontractor_cost_pct_range":{"min":0.05,"max":0.15},
          "equipment_days_per_project_range":{"min":2,"max":8},
          "mobilization_cost_eur_range":{"min":1000,"max":8000},
          "contingency_pct_range":{"min":0.02,"max":0.06}
        },
        "risk_model":{
          "delay_probability_range":{"min":0.05,"max":0.15},
          "delay_penalty_pct_range":{"min":0.005,"max":0.03},
          "safety_incident_rate_range":{"min":0.002,"max":0.01},
          "rework_pct_range":{"min":0.01,"max":0.04}
        },
        "requirements":{
          "crew_fte_min":4,
          "supervisor_fte_min":0.5,
          "estimator_fte_min":0,
          "equipment_requirements":["service_van_access"],
          "compliance_score_min":0.45
        }
      }
    },
    "startingLoadout":{
      "startingCash":450000,
      "assets":[
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"compliance_score","count":0.55},
        {"assetId":"lead_pool_count","count":8},
        {"assetId":"bids_in_progress_count","count":1},
        {"assetId":"bids_capacity_per_tick","count":1.4},
        {"assetId":"bid_cost_pct_of_contract_value","count":0.02},
        {"assetId":"bid_win_rate_base","count":0.24},
        {"assetId":"backlog_contract_value_eur","count":600000},
        {"assetId":"backlog_projects_count","count":2},
        {"assetId":"wip_active_projects_count","count":1},
        {"assetId":"wip_burn_value_eur_per_tick","count":80000},
        {"assetId":"wip_burn_cost_eur_per_tick","count":70000},
        {"assetId":"retention_pct","count":0.07},
        {"assetId":"accounts_receivable_eur","count":90000},
        {"assetId":"payment_delay_ticks_min","count":2},
        {"assetId":"payment_delay_ticks_max","count":6},
        {"assetId":"retention_held_eur","count":0},
        {"assetId":"invoicing_enabled","count":1},
        {"assetId":"subcontractor_dependency_score","count":0.6},
        {"assetId":"materials_price_index","count":1},
        {"assetId":"labor_wage_index","count":1},
        {"assetId":"schedule_slip_score","count":0.18},
        {"assetId":"safety_incidents_count","count":0},
        {"assetId":"rework_backlog_value_eur","count":0},
        {"assetId":"penalty_costs_eur_accum","count":0},
        {"assetId":"credit_limit_eur","count":0},
        {"assetId":"credit_interest_rate_pct","count":0},
        {"assetId":"safety_program_certified","count":0},
        {"assetId":"forklift_access","count":1},
        {"assetId":"scissor_lift_access","count":0},
        {"assetId":"excavator_access","count":0},
        {"assetId":"crane_access","count":0},
        {"assetId":"service_van_access","count":1},
        {"assetId":"site_office_setup","count":0}
      ],
      "staff":[
        {"roleId":"crew_fte","fte":8},
        {"roleId":"supervisors_fte","fte":1},
        {"roleId":"estimators_fte","fte":1}
      ],
      "unlockedProducts":["maintenance_repair_retain_unit"]
    },
    "unlockRules":[
      {"productSku":"maintenance_repair_retain_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"retail_unit_project_unit","startingUnlocked":false,"requirements":{
        "minCrewFte":6,
        "minSupervisorFte":1,
        "minReputationScore":0.45
      }},
      {"productSku":"office_fitout_project_unit","startingUnlocked":false,"requirements":{
        "upgrades":["safety_program_certification"],
        "minCrewFte":10,
        "minSupervisorFte":2,
        "minReputationScore":0.55
      }},
      {"productSku":"warehouse_shell_project_unit","startingUnlocked":false,"requirements":{
        "minCrewFte":14,
        "minSupervisorFte":2,
        "minEstimatorFte":1,
        "minComplianceScore":0.55,
        "minCashEur":350000,
        "anyOf":[
          {"assets":[{"assetId":"excavator_access","minCount":1}]},
          {"assets":[{"assetId":"crane_access","minCount":1}]}
        ]
      }},
      {"productSku":"industrial_extension_project_unit","startingUnlocked":false,"requirements":{
        "minCrewFte":12,
        "minSupervisorFte":2,
        "minEstimatorFte":1,
        "minComplianceScore":0.6,
        "anyOf":[
          {"maxSubcontractorDependencyScore":0.5},
          {"upgrades":["subcontractor_network_sla"]}
        ]
      }},
      {"productSku":"design_build_contract_unit","startingUnlocked":false,"requirements":{
        "upgrades":["design_coordination_capability"],
        "minCrewFte":16,
        "minSupervisorFte":3,
        "minEstimatorFte":2,
        "minComplianceScore":0.65,
        "minReputationScore":0.65
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Commercial Build products
with niche as (
  select id from public.niches where code = 'BUILD_COMMERCIAL'
),
product_seed as (
  select * from (values
    ('warehouse_shell_project_unit', 'Warehouse Shell Project', 'unit', 1500000, 20000000, 84, 92, 'crew_fte', 'Large shell builds with heavy equipment.'),
    ('office_fitout_project_unit', 'Office Fit-Out Project', 'unit', 250000, 6000000, 80, 90, 'crew_fte', 'Interior fit-out work with change orders.'),
    ('retail_unit_project_unit', 'Retail Unit Project', 'unit', 150000, 3000000, 78, 90, 'crew_fte', 'Retail build-outs with fast schedules.'),
    ('industrial_extension_project_unit', 'Industrial Extension Project', 'unit', 800000, 12000000, 84, 92, 'crew_fte', 'Industrial expansions with compliance risk.'),
    ('design_build_contract_unit', 'Design-Build Contract', 'unit', 2000000, 35000000, 82, 90, 'crew_fte', 'Full-scope design-build contracts.'),
    ('maintenance_repair_retain_unit', 'Maintenance & Repair Retainer', 'unit', 8000, 80000, 75, 88, 'crew_fte', 'Recurring maintenance retainers.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
)
delete from public.niche_products
where niche_id in (select id from niche);

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

-- Commercial Build upgrades
with niche as (
  select id from public.niches where code = 'BUILD_COMMERCIAL'
),
upgrade_seed as (
  select * from (values
    (
      'estimating_team_expansion',
      'ESTIMATING',
      'Estimating Team Expansion',
      'Adds estimating capacity and improves bid quality.',
      1,
      0,
      2,
      '[{"key":"estimators_fte","op":"add","range":[1,2]},{"key":"bids_capacity_per_tick","op":"add","range":[0.6,1.6]},{"key":"bid_win_rate_base","op":"add","range":[0.02,0.05]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..15000',
      'per_estimator_monthly 3500..6500',
      1,
      3,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["overhead_pressure","low_lead_roi"]}'::jsonb
    ),
    (
      'safety_program_certification',
      'SAFETY',
      'Safety Program & Certification',
      'Improves compliance and reduces incidents.',
      2,
      0,
      4,
      '[{"key":"compliance_score","op":"add","range":[0.1,0.25]},{"key":"safety_incident_rate_modifier","op":"mul","range":[0.6,0.9]},{"key":"unlock_products","op":"set","value":["office_fitout_project_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 3000..30000',
      'monthlyFixed 200..2000',
      2,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,14],"failureEffects":["training_downtime_ticks 1..2","schedule_slip_spike"]}'::jsonb
    ),
    (
      'equipment_access_framework',
      'EQUIPMENT',
      'Equipment Access (Owned + Rental Framework)',
      'Adds equipment access and boosts throughput.',
      2,
      0,
      3,
      '[{"key":"forklift_access","op":"add","range":[1,2]},{"key":"scissor_lift_access","op":"add","range":[1,2]},{"key":"excavator_access","op":"add","range":[0,1]},{"key":"crane_access","op":"add","range":[0,1]},{"key":"wip_burn_value_eur_per_tick","op":"mul","range":[1.05,1.25]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 10000..250000',
      'monthlyFixed 500..5000',
      1,
      4,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["idle_equipment_costs","maintenance_downtime_ticks 1..2"]}'::jsonb
    ),
    (
      'subcontractor_network_sla',
      'SUBCONTRACT',
      'Subcontractor Network & SLA',
      'Stabilizes subcontractor capacity with SLA coverage.',
      2,
      0,
      3,
      '[{"key":"subcontractor_dependency_score","op":"mul","range":[0.75,0.9]},{"key":"delay_probability_modifier","op":"mul","range":[0.7,0.9]},{"key":"subcontractor_cost_pct","op":"add","range":[0.01,0.03]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..20000',
      'monthlyFixed 500..3000',
      2,
      5,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["subcontractor_cost_spike","sla_dispute_delay"]}'::jsonb
    ),
    (
      'materials_procurement_hedging',
      'PROCUREMENT',
      'Materials Procurement & Hedging',
      'Reduces materials volatility and improves pricing.',
      1,
      0,
      1,
      '[{"key":"materials_cost_pct_modifier","op":"mul","range":[0.9,0.97]},{"key":"materials_price_volatility","op":"mul","range":[0.7,0.9]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..15000',
      'materials_hedge_fee_pct 0.002..0.01',
      1,
      1,
      '{"failureChancePctRange":[6,12],"variancePctRange":[5,10],"failureEffects":["hedge_mismatch_cost_pressure"]}'::jsonb
    ),
    (
      'project_controls_scheduling_system',
      'SCHEDULING',
      'Project Controls / Scheduling System',
      'Improves schedule adherence and reduces rework.',
      2,
      0,
      4,
      '[{"key":"schedule_slip_score","op":"mul","range":[0.75,0.9]},{"key":"delay_probability_modifier","op":"mul","range":[0.7,0.9]},{"key":"rework_pct_modifier","op":"mul","range":[0.8,0.95]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 5000..60000',
      'monthlyFixed 200..2000',
      2,
      6,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["implementation_dip_ticks 1..1"]}'::jsonb
    ),
    (
      'working_capital_facility',
      'FINANCE',
      'Working Capital Facility (Credit Line)',
      'Adds credit buffer for long payment terms.',
      1,
      0,
      0,
      '[{"key":"credit_limit_eur","op":"add","range":[150000,600000]},{"key":"credit_interest_rate_pct","op":"set","value":0.12},{"key":"credit_interest_model","op":"set","value":"utilization_based"}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0',
      'interest_on_utilized_credit * (0.06..0.12)',
      0,
      0,
      '{"failureChancePctRange":[10,20],"variancePctRange":[8,14],"failureEffects":["leverage_spiral","covenant_breach_penalty"]}'::jsonb
    ),
    (
      'design_coordination_capability',
      'DESIGN',
      'Design Coordination Capability',
      'Unlocks design-build delivery capability.',
      3,
      0,
      6,
      '[{"key":"unlock_products","op":"set","value":["design_build_contract_unit"]},{"key":"bid_win_rate_base","op":"add","range":[0.02,0.06]},{"key":"change_order_rate_modifier","op":"mul","range":[0.85,0.95]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 10000..120000',
      'per_designer_monthly 4000..9000',
      3,
      8,
      '{"failureChancePctRange":[10,18],"variancePctRange":[8,14],"failureEffects":["design_liability_claim","rework_spike"]}'::jsonb
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
  upgrade_seed.capex_pct_min,
  upgrade_seed.capex_pct_max,
  upgrade_seed.opex_pct_min,
  upgrade_seed.opex_pct_max,
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
-- BUILD Electrical seed (niche + products + upgrades)
-- ============================================================

-- Electrical niche
with sector as (
  select id from public.sectors where code = 'BUILD'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'BUILD_ELECTRICAL',
  'Electrical',
  'Electrical services with inspection and scheduling constraints',
  $$
  {
    "capexIntensity":"MEDIUM",
    "marginRange":{"min":0.1,"max":0.3},
    "demandVolatility":0.45,
    "priceElasticity":0.45,
    "labourIntensity":0.65,
    "skillIntensity":0.7,
    "regulationRisk":0.4,
    "assetLifetimeYears":8,
    "capacityElasticity":0.5,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":340,
    "seasonalityPattern":{"monthlyFactors":[0.95,0.97,1,1.05,1.1,1.12,1.08,1.03,0.98,0.96,0.94,0.93]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_BUILD",
    "upgradeProfile":"INDUSTRIAL",
    "productSeasonalityKeys":{
      "residential_wiring_job_unit":"weather_construction_seasonality",
      "commercial_fitout_electrical_job_unit":"weather_construction_seasonality",
      "industrial_panel_upgrade_job_unit":"weather_construction_seasonality",
      "solar_inverter_install_job_unit":"weather_construction_seasonality",
      "emergency_callout_job_unit":"winter_emergency_seasonality",
      "annual_maintenance_contract_unit":"weather_construction_seasonality"
    },
    "jobModels":{
      "residential_wiring_job_unit":{
        "base_price_eur_range":{"min":400,"max":3500},
        "gross_margin_pct_range":{"min":0.12,"max":0.28},
        "typical_duration_ticks_range":{"min":1,"max":3},
        "payment_terms_days_range":{"min":7,"max":30},
        "retention_pct_range":{"min":0,"max":0.02},
        "cost_model":{
          "labor_hours_per_job_range":{"min":6,"max":40},
          "material_cost_eur_per_job_range":{"min":80,"max":900},
          "copper_sensitivity_score":0.35,
          "mobilization_cost_eur_range":{"min":0,"max":150}
        },
        "quality_model":{
          "inspection_required":false,
          "inspection_fail_probability_range":{"min":0.01,"max":0.05},
          "callback_probability_range":{"min":0.03,"max":0.08},
          "callback_cost_pct_range":{"min":0.05,"max":0.12}
        },
        "demand_model":{
          "base_demand_weight":0.38,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.55,
          "urgency_sensitivity":0.35
        },
        "requirements":{
          "electricians_fte_min":1,
          "master_electrician_fte_min":0,
          "scheduler_fte_min":0,
          "certification_level_min":0
        }
      },
      "commercial_fitout_electrical_job_unit":{
        "base_price_eur_range":{"min":8000,"max":250000},
        "gross_margin_pct_range":{"min":0.1,"max":0.2},
        "typical_duration_ticks_range":{"min":2,"max":8},
        "payment_terms_days_range":{"min":30,"max":60},
        "retention_pct_range":{"min":0.03,"max":0.07},
        "cost_model":{
          "labor_hours_per_job_range":{"min":80,"max":1200},
          "material_cost_eur_per_job_range":{"min":1500,"max":60000},
          "copper_sensitivity_score":0.6,
          "subcontractor_pct_range":{"min":0.05,"max":0.2},
          "mobilization_cost_eur_range":{"min":400,"max":5000}
        },
        "quality_model":{
          "inspection_required":true,
          "inspection_fail_probability_range":{"min":0.04,"max":0.12},
          "callback_probability_range":{"min":0.03,"max":0.08},
          "callback_cost_pct_range":{"min":0.04,"max":0.1}
        },
        "demand_model":{
          "base_demand_weight":0.16,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.4,
          "urgency_sensitivity":0.3
        },
        "requirements":{
          "electricians_fte_min":6,
          "master_electrician_fte_min":1,
          "scheduler_fte_min":1,
          "certification_level_min":2,
          "compliance_score_min":0.6,
          "reputation_score_min":0.55
        }
      },
      "industrial_panel_upgrade_job_unit":{
        "base_price_eur_range":{"min":6000,"max":180000},
        "gross_margin_pct_range":{"min":0.1,"max":0.18},
        "typical_duration_ticks_range":{"min":2,"max":7},
        "payment_terms_days_range":{"min":30,"max":75},
        "retention_pct_range":{"min":0.04,"max":0.08},
        "cost_model":{
          "labor_hours_per_job_range":{"min":60,"max":900},
          "material_cost_eur_per_job_range":{"min":1200,"max":50000},
          "copper_sensitivity_score":0.65,
          "subcontractor_pct_range":{"min":0.05,"max":0.2},
          "mobilization_cost_eur_range":{"min":300,"max":4000}
        },
        "quality_model":{
          "inspection_required":true,
          "inspection_fail_probability_range":{"min":0.05,"max":0.14},
          "callback_probability_range":{"min":0.03,"max":0.07},
          "callback_cost_pct_range":{"min":0.05,"max":0.12}
        },
        "demand_model":{
          "base_demand_weight":0.14,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.35,
          "urgency_sensitivity":0.25
        },
        "requirements":{
          "electricians_fte_min":5,
          "master_electrician_fte_min":1,
          "scheduler_fte_min":1,
          "certification_level_min":2,
          "compliance_score_min":0.7
        }
      },
      "solar_inverter_install_job_unit":{
        "base_price_eur_range":{"min":2500,"max":25000},
        "gross_margin_pct_range":{"min":0.12,"max":0.22},
        "typical_duration_ticks_range":{"min":1,"max":4},
        "payment_terms_days_range":{"min":20,"max":45},
        "retention_pct_range":{"min":0.02,"max":0.06},
        "cost_model":{
          "labor_hours_per_job_range":{"min":12,"max":80},
          "material_cost_eur_per_job_range":{"min":800,"max":12000},
          "copper_sensitivity_score":0.5,
          "mobilization_cost_eur_range":{"min":100,"max":900}
        },
        "quality_model":{
          "inspection_required":true,
          "inspection_fail_probability_range":{"min":0.04,"max":0.1},
          "callback_probability_range":{"min":0.03,"max":0.08},
          "callback_cost_pct_range":{"min":0.04,"max":0.1}
        },
        "demand_model":{
          "base_demand_weight":0.12,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.4,
          "urgency_sensitivity":0.35
        },
        "requirements":{
          "electricians_fte_min":3,
          "master_electrician_fte_min":1,
          "scheduler_fte_min":0,
          "certification_level_min":1,
          "compliance_score_min":0.6,
          "reputation_score_min":0.55
        }
      },
      "emergency_callout_job_unit":{
        "base_price_eur_range":{"min":120,"max":950},
        "gross_margin_pct_range":{"min":0.2,"max":0.4},
        "typical_duration_ticks_range":{"min":1,"max":2},
        "payment_terms_days_range":{"min":0,"max":14},
        "retention_pct_range":{"min":0,"max":0.01},
        "cost_model":{
          "labor_hours_per_job_range":{"min":2,"max":10},
          "material_cost_eur_per_job_range":{"min":30,"max":300},
          "copper_sensitivity_score":0.2,
          "mobilization_cost_eur_range":{"min":0,"max":120}
        },
        "quality_model":{
          "inspection_required":false,
          "inspection_fail_probability_range":{"min":0.01,"max":0.04},
          "callback_probability_range":{"min":0.08,"max":0.18},
          "callback_cost_pct_range":{"min":0.08,"max":0.18}
        },
        "demand_model":{
          "base_demand_weight":0.22,
          "seasonality_key":"winter_emergency_seasonality",
          "price_elasticity":0.3,
          "urgency_sensitivity":0.9
        },
        "requirements":{
          "electricians_fte_min":2,
          "master_electrician_fte_min":0,
          "scheduler_fte_min":0,
          "certification_level_min":0,
          "reputation_score_min":0.45
        }
      },
      "annual_maintenance_contract_unit":{
        "base_price_eur_range":{"min":300,"max":6000},
        "gross_margin_pct_range":{"min":0.15,"max":0.3},
        "typical_duration_ticks_range":{"min":4,"max":12},
        "payment_terms_days_range":{"min":15,"max":45},
        "retention_pct_range":{"min":0,"max":0.04},
        "cost_model":{
          "labor_hours_per_job_range":{"min":4,"max":28},
          "material_cost_eur_per_job_range":{"min":50,"max":800},
          "copper_sensitivity_score":0.25,
          "mobilization_cost_eur_range":{"min":0,"max":100}
        },
        "quality_model":{
          "inspection_required":true,
          "inspection_fail_probability_range":{"min":0.02,"max":0.08},
          "callback_probability_range":{"min":0.02,"max":0.06},
          "callback_cost_pct_range":{"min":0.03,"max":0.08}
        },
        "demand_model":{
          "base_demand_weight":0.18,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.35,
          "urgency_sensitivity":0.2
        },
        "requirements":{
          "electricians_fte_min":3,
          "master_electrician_fte_min":1,
          "scheduler_fte_min":1,
          "certification_level_min":1,
          "compliance_score_min":0.6,
          "reputation_score_min":0.6
        }
      }
    },
    "startingLoadout":{
      "startingCash":180000,
      "assets":[
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"compliance_score","count":0.55},
        {"assetId":"utilization_target","count":0.65},
        {"assetId":"utilization_actual","count":0.45},
        {"assetId":"labor_hours_capacity_per_tick","count":70},
        {"assetId":"job_queue_count","count":5},
        {"assetId":"average_wait_ticks","count":2},
        {"assetId":"overtime_enabled","count":0},
        {"assetId":"materials_inventory_value_eur","count":12000},
        {"assetId":"materials_fill_rate","count":0.75},
        {"assetId":"supplier_lead_time_ticks_min","count":1},
        {"assetId":"supplier_lead_time_ticks_max","count":3},
        {"assetId":"copper_price_index","count":1},
        {"assetId":"materials_waste_pct","count":0.04},
        {"assetId":"certification_level","count":0},
        {"assetId":"inspection_pass_rate","count":0.86},
        {"assetId":"callback_rate","count":0.06},
        {"assetId":"callbacks_queue_count","count":0},
        {"assetId":"warranty_reserve_eur","count":5000},
        {"assetId":"accounts_receivable_eur","count":12000},
        {"assetId":"payment_delay_ticks_min","count":1},
        {"assetId":"payment_delay_ticks_max","count":4},
        {"assetId":"retention_held_eur","count":0}
      ],
      "staff":[
        {"roleId":"electricians_fte","fte":2},
        {"roleId":"master_electrician_fte","fte":0},
        {"roleId":"apprentices_fte","fte":0},
        {"roleId":"scheduler_fte","fte":0}
      ],
      "unlockedProducts":["residential_wiring_job_unit"]
    },
    "unlockRules":[
      {"productSku":"residential_wiring_job_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"emergency_callout_job_unit","startingUnlocked":false,"requirements":{
        "minElectriciansFte":2,
        "minReputationScore":0.45,
        "anyOf":[
          {"assets":[{"assetId":"overtime_enabled","minCount":1}]},
          {"upgrades":["on_call_team_setup"]}
        ]
      }},
      {"productSku":"solar_inverter_install_job_unit","startingUnlocked":false,"requirements":{
        "upgrades":["safety_certification_compliance_pack"],
        "minCertificationLevel":1,
        "minComplianceScore":0.6
      }},
      {"productSku":"commercial_fitout_electrical_job_unit","startingUnlocked":false,"requirements":{
        "minElectriciansFte":6,
        "minMasterElectricianFte":1,
        "minSchedulerFte":1,
        "minCertificationLevel":2,
        "minReputationScore":0.55
      }},
      {"productSku":"industrial_panel_upgrade_job_unit","startingUnlocked":false,"requirements":{
        "upgrades":["testing_commissioning_tools"],
        "minElectriciansFte":5,
        "minMasterElectricianFte":1,
        "minSchedulerFte":1,
        "minCertificationLevel":2,
        "minComplianceScore":0.7
      }},
      {"productSku":"annual_maintenance_contract_unit","startingUnlocked":false,"requirements":{
        "upgrades":["scheduling_software_dispatch"],
        "minInspectionPassRate":0.9,
        "minReputationScore":0.6
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Electrical products
with niche as (
  select id from public.niches where code = 'BUILD_ELECTRICAL'
),
product_seed as (
  select * from (values
    ('residential_wiring_job_unit', 'Residential Wiring Job', 'unit', 400, 3500, 72, 88, 'electricians_fte', 'Residential wiring jobs.'),
    ('commercial_fitout_electrical_job_unit', 'Commercial Fit-Out Electrical Job', 'unit', 8000, 250000, 80, 90, 'electricians_fte', 'Commercial fit-out electrical work.'),
    ('industrial_panel_upgrade_job_unit', 'Industrial Panel Upgrade Job', 'unit', 6000, 180000, 82, 90, 'electricians_fte', 'Industrial panel upgrades with compliance.'),
    ('solar_inverter_install_job_unit', 'Solar Inverter Install Job', 'unit', 2500, 25000, 78, 88, 'electricians_fte', 'Solar inverter installs and commissioning.'),
    ('emergency_callout_job_unit', 'Emergency Callout Job', 'unit', 120, 950, 60, 80, 'electricians_fte', 'Emergency callouts with overtime.'),
    ('annual_maintenance_contract_unit', 'Annual Maintenance Contract', 'unit', 300, 6000, 70, 85, 'electricians_fte', 'Recurring maintenance contracts.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
)
delete from public.niche_products
where niche_id in (select id from niche);

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

-- Electrical upgrades
with niche as (
  select id from public.niches where code = 'BUILD_ELECTRICAL'
),
upgrade_seed as (
  select * from (values
    (
      'safety_certification_compliance_pack',
      'SAFETY',
      'Safety Certification & Compliance Pack',
      'Improves compliance and reduces inspection failures.',
      2,
      0,
      4,
      '[{"key":"compliance_score","op":"add","range":[0.1,0.25]},{"key":"inspection_fail_probability_modifier","op":"mul","range":[0.85,0.97]},{"key":"callback_probability_modifier","op":"mul","range":[0.9,0.98]},{"key":"unlock_products","op":"set","value":["solar_inverter_install_job_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 1000..20000',
      'monthlyFixed 100..1200',
      2,
      6,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["training_downtime_ticks 1..1","short_term_capacity_dip"]}'::jsonb
    ),
    (
      'scheduling_software_dispatch',
      'OPS',
      'Scheduling Software & Dispatch',
      'Improves dispatch efficiency and utilization.',
      2,
      0,
      3,
      '[{"key":"utilization_actual","op":"add","range":[0.05,0.2]},{"key":"average_wait_ticks","op":"add","range":[-2,-0.5]},{"key":"unlock_products","op":"set","value":["annual_maintenance_contract_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..35000',
      'monthlyFixed 150..1500',
      2,
      5,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["implementation_dip_ticks 1..1"]}'::jsonb
    ),
    (
      'apprenticeship_program',
      'TRAINING',
      'Apprenticeship Program',
      'Adds apprentices and builds long-term capacity.',
      2,
      0,
      6,
      '[{"key":"apprentices_fte","op":"add","range":[1,3]},{"key":"labor_hours_capacity_per_tick","op":"add","range":[10,25]},{"key":"certification_training_progress","op":"add","range":[0.1,0.3]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 500..8000',
      'per_apprentice_monthly 1200..2200',
      3,
      8,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,14],"failureEffects":["callback_rate_spike","supervision_load_increase"]}'::jsonb
    ),
    (
      'testing_commissioning_tools',
      'TOOLS',
      'Testing & Commissioning Tools',
      'Reduces inspection failures and improves quality.',
      2,
      0,
      4,
      '[{"key":"inspection_fail_probability_modifier","op":"mul","range":[0.65,0.9]},{"key":"reputation_score","op":"add","range":[0.02,0.06]},{"key":"testing_tools_ready","op":"set","value":true}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 3000..60000',
      'monthlyFixed 150..900',
      2,
      6,
      '{"failureChancePctRange":[9,16],"variancePctRange":[6,12],"failureEffects":["calibration_downtime_ticks 1..2","maintenance_cost_spike"]}'::jsonb
    ),
    (
      'materials_procurement_copper_hedging',
      'PROCUREMENT',
      'Materials Procurement & Copper Hedging',
      'Improves fill rate and reduces copper volatility.',
      1,
      0,
      1,
      '[{"key":"materials_fill_rate","op":"add","range":[0.05,0.2]},{"key":"copper_price_volatility","op":"mul","range":[0.7,0.9]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..20000',
      'copper_hedge_fee_pct 0.002..0.01',
      1,
      1,
      '{"failureChancePctRange":[8,14],"variancePctRange":[6,12],"failureEffects":["hedge_backfire_cost_spike"]}'::jsonb
    ),
    (
      'on_call_team_setup',
      'EMERGENCY',
      'On-Call Team Setup (Emergency)',
      'Enables emergency callouts and overtime response.',
      1,
      0,
      1,
      '[{"key":"overtime_enabled","op":"set","value":true},{"key":"emergency_demand_uplift","op":"add","range":[0.15,0.4]},{"key":"unlock_products","op":"set","value":["emergency_callout_job_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..10000',
      'overtime_premium_pct 0.1..0.35',
      1,
      1,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["burnout_callback_increase","overtime_cost_spike"]}'::jsonb
    ),
    (
      'quality_process_checklist_system',
      'QUALITY',
      'Quality Process & Checklist System',
      'Improves inspection pass rate and reduces callbacks.',
      1,
      0,
      1,
      '[{"key":"callback_probability_modifier","op":"mul","range":[0.6,0.9]},{"key":"warranty_reserve_eur","op":"mul","range":[0.7,0.9]},{"key":"inspection_pass_rate","op":"add","range":[0.02,0.08]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..12000',
      'monthlyFixed 100..900',
      1,
      1,
      '{"failureChancePctRange":[7,14],"variancePctRange":[5,10],"failureEffects":["admin_overhead_capacity_dip"]}'::jsonb
    ),
    (
      'hire_master_electrician',
      'CREW',
      'Crew Expansion (Hire Master Electrician)',
      'Adds master electrician capacity and raises certification level.',
      2,
      0,
      2,
      '[{"key":"master_electrician_fte","op":"add","range":[1,1]},{"key":"labor_hours_capacity_per_tick","op":"add","range":[15,35]},{"key":"certification_level","op":"add","range":[1,1]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 500..8000',
      'per_master_electrician_monthly 4500..8500',
      1,
      4,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["overhead_pressure","demand_shortfall_risk"]}'::jsonb
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
  upgrade_seed.capex_pct_min,
  upgrade_seed.capex_pct_max,
  upgrade_seed.opex_pct_min,
  upgrade_seed.opex_pct_max,
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
-- BUILD Engineering seed (niche + products + upgrades)
-- ============================================================

-- Engineering niche
with sector as (
  select id from public.sectors where code = 'BUILD'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'BUILD_ENGINEERING',
  'Engineering',
  'Engineering design, permitting, and oversight services',
  $$
  {
    "capexIntensity":"LOW",
    "marginRange":{"min":0.25,"max":0.6},
    "demandVolatility":0.4,
    "priceElasticity":0.35,
    "labourIntensity":0.75,
    "skillIntensity":0.85,
    "regulationRisk":0.45,
    "assetLifetimeYears":6,
    "capacityElasticity":0.6,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":320,
    "seasonalityPattern":{"monthlyFactors":[0.97,0.98,1,1.03,1.06,1.08,1.06,1.02,0.99,0.97,0.96,0.95]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_BUILD",
    "upgradeProfile":"INDUSTRIAL",
    "productSeasonalityKeys":{
      "structural_design_package_unit":"public_tender_cycle_seasonality",
      "mep_design_package_unit":"public_tender_cycle_seasonality",
      "geotechnical_survey_unit":"weather_construction_seasonality",
      "permitting_and_code_review_unit":"public_tender_cycle_seasonality",
      "bim_coordination_service_unit":"public_tender_cycle_seasonality",
      "owner_rep_project_management_unit":"public_tender_cycle_seasonality"
    },
    "projectModels":{
      "structural_design_package_unit":{
        "pricing_model":{
          "model_type":"fixed_fee",
          "base_fee_eur_range":{"min":8000,"max":250000},
          "hourly_rate_eur_range":{"min":90,"max":150},
          "typical_billable_hours_range":{"min":80,"max":1200}
        },
        "gross_margin_pct_range":{"min":0.3,"max":0.55},
        "typical_duration_ticks_range":{"min":3,"max":12},
        "payment_terms_days_range":{"min":30,"max":75},
        "retention_pct_range":{"min":0.03,"max":0.08},
        "cost_model":{
          "staff_hours_by_role_range":{
            "engineer_hours_range":{"min":120,"max":1400},
            "senior_engineer_hours_range":{"min":40,"max":400},
            "pm_hours_range":{"min":20,"max":160},
            "drafter_hours_range":{"min":40,"max":320}
          },
          "software_cost_eur_per_tick_range":{"min":200,"max":1200},
          "insurance_cost_pct_of_revenue_range":{"min":0.02,"max":0.05},
          "subcontractor_cost_pct_range":{"min":0.02,"max":0.08}
        },
        "liability_model":{
          "revision_rounds_range":{"min":1,"max":4},
          "error_probability_range":{"min":0.04,"max":0.12},
          "liability_claim_probability_range":{"min":0.002,"max":0.01},
          "claim_severity_eur_range":{"min":25000,"max":750000},
          "rework_hours_pct_range":{"min":0.05,"max":0.18}
        },
        "demand_model":{
          "base_demand_weight":0.2,
          "seasonality_key":"public_tender_cycle_seasonality",
          "price_elasticity":0.35,
          "reputation_sensitivity":0.7
        },
        "requirements":{
          "engineers_fte_min":2,
          "senior_engineers_fte_min":1,
          "project_manager_fte_min":0,
          "bim_specialist_fte_min":0,
          "certification_level_min":0,
          "reputation_score_min":0.5
        }
      },
      "mep_design_package_unit":{
        "pricing_model":{
          "model_type":"mixed",
          "base_fee_eur_range":{"min":10000,"max":300000},
          "hourly_rate_eur_range":{"min":85,"max":160},
          "typical_billable_hours_range":{"min":140,"max":1600}
        },
        "gross_margin_pct_range":{"min":0.28,"max":0.5},
        "typical_duration_ticks_range":{"min":4,"max":14},
        "payment_terms_days_range":{"min":30,"max":75},
        "retention_pct_range":{"min":0.04,"max":0.08},
        "cost_model":{
          "staff_hours_by_role_range":{
            "engineer_hours_range":{"min":180,"max":1800},
            "senior_engineer_hours_range":{"min":60,"max":500},
            "pm_hours_range":{"min":30,"max":220},
            "drafter_hours_range":{"min":60,"max":400}
          },
          "software_cost_eur_per_tick_range":{"min":250,"max":1400},
          "insurance_cost_pct_of_revenue_range":{"min":0.02,"max":0.06},
          "subcontractor_cost_pct_range":{"min":0.03,"max":0.1}
        },
        "liability_model":{
          "revision_rounds_range":{"min":2,"max":5},
          "error_probability_range":{"min":0.05,"max":0.15},
          "liability_claim_probability_range":{"min":0.003,"max":0.015},
          "claim_severity_eur_range":{"min":30000,"max":900000},
          "rework_hours_pct_range":{"min":0.06,"max":0.2}
        },
        "demand_model":{
          "base_demand_weight":0.18,
          "seasonality_key":"public_tender_cycle_seasonality",
          "price_elasticity":0.32,
          "reputation_sensitivity":0.65
        },
        "requirements":{
          "engineers_fte_min":3,
          "senior_engineers_fte_min":1,
          "project_manager_fte_min":1,
          "bim_specialist_fte_min":0,
          "certification_level_min":1,
          "compliance_score_min":0.6
        }
      },
      "geotechnical_survey_unit":{
        "pricing_model":{
          "model_type":"fixed_fee",
          "base_fee_eur_range":{"min":2000,"max":60000},
          "hourly_rate_eur_range":{"min":70,"max":120},
          "typical_billable_hours_range":{"min":20,"max":300}
        },
        "gross_margin_pct_range":{"min":0.25,"max":0.45},
        "typical_duration_ticks_range":{"min":1,"max":4},
        "payment_terms_days_range":{"min":20,"max":45},
        "retention_pct_range":{"min":0,"max":0.03},
        "cost_model":{
          "staff_hours_by_role_range":{
            "engineer_hours_range":{"min":20,"max":160},
            "senior_engineer_hours_range":{"min":10,"max":120},
            "pm_hours_range":{"min":6,"max":40},
            "drafter_hours_range":{"min":10,"max":80}
          },
          "software_cost_eur_per_tick_range":{"min":100,"max":700},
          "insurance_cost_pct_of_revenue_range":{"min":0.015,"max":0.04},
          "subcontractor_cost_pct_range":{"min":0.3,"max":0.6}
        },
        "liability_model":{
          "revision_rounds_range":{"min":1,"max":3},
          "error_probability_range":{"min":0.03,"max":0.1},
          "liability_claim_probability_range":{"min":0.001,"max":0.006},
          "claim_severity_eur_range":{"min":10000,"max":250000},
          "rework_hours_pct_range":{"min":0.04,"max":0.12}
        },
        "demand_model":{
          "base_demand_weight":0.16,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.4,
          "reputation_sensitivity":0.5
        },
        "requirements":{
          "engineers_fte_min":1,
          "senior_engineers_fte_min":0,
          "project_manager_fte_min":0,
          "bim_specialist_fte_min":0,
          "certification_level_min":0,
          "compliance_score_min":0.55
        }
      },
      "permitting_and_code_review_unit":{
        "pricing_model":{
          "model_type":"tm_hourly",
          "base_fee_eur_range":{"min":1500,"max":45000},
          "hourly_rate_eur_range":{"min":65,"max":130},
          "typical_billable_hours_range":{"min":10,"max":200}
        },
        "gross_margin_pct_range":{"min":0.3,"max":0.55},
        "typical_duration_ticks_range":{"min":1,"max":6},
        "payment_terms_days_range":{"min":15,"max":45},
        "retention_pct_range":{"min":0,"max":0.04},
        "cost_model":{
          "staff_hours_by_role_range":{
            "engineer_hours_range":{"min":12,"max":160},
            "senior_engineer_hours_range":{"min":8,"max":120},
            "pm_hours_range":{"min":6,"max":80},
            "drafter_hours_range":{"min":4,"max":50}
          },
          "software_cost_eur_per_tick_range":{"min":80,"max":600},
          "insurance_cost_pct_of_revenue_range":{"min":0.015,"max":0.04},
          "subcontractor_cost_pct_range":{"min":0.02,"max":0.08}
        },
        "liability_model":{
          "revision_rounds_range":{"min":1,"max":3},
          "error_probability_range":{"min":0.02,"max":0.08},
          "liability_claim_probability_range":{"min":0.001,"max":0.004},
          "claim_severity_eur_range":{"min":10000,"max":150000},
          "rework_hours_pct_range":{"min":0.03,"max":0.1}
        },
        "demand_model":{
          "base_demand_weight":0.22,
          "seasonality_key":"public_tender_cycle_seasonality",
          "price_elasticity":0.45,
          "reputation_sensitivity":0.55
        },
        "requirements":{
          "engineers_fte_min":1,
          "senior_engineers_fte_min":0,
          "project_manager_fte_min":0,
          "bim_specialist_fte_min":0,
          "certification_level_min":0,
          "compliance_score_min":0.5
        }
      },
      "bim_coordination_service_unit":{
        "pricing_model":{
          "model_type":"mixed",
          "base_fee_eur_range":{"min":6000,"max":180000},
          "hourly_rate_eur_range":{"min":80,"max":150},
          "typical_billable_hours_range":{"min":60,"max":900}
        },
        "gross_margin_pct_range":{"min":0.32,"max":0.6},
        "typical_duration_ticks_range":{"min":2,"max":10},
        "payment_terms_days_range":{"min":30,"max":60},
        "retention_pct_range":{"min":0.02,"max":0.06},
        "cost_model":{
          "staff_hours_by_role_range":{
            "engineer_hours_range":{"min":40,"max":600},
            "senior_engineer_hours_range":{"min":20,"max":240},
            "pm_hours_range":{"min":20,"max":180},
            "drafter_hours_range":{"min":50,"max":500}
          },
          "software_cost_eur_per_tick_range":{"min":400,"max":2500},
          "insurance_cost_pct_of_revenue_range":{"min":0.02,"max":0.05},
          "subcontractor_cost_pct_range":{"min":0.02,"max":0.08}
        },
        "liability_model":{
          "revision_rounds_range":{"min":2,"max":5},
          "error_probability_range":{"min":0.04,"max":0.12},
          "liability_claim_probability_range":{"min":0.002,"max":0.008},
          "claim_severity_eur_range":{"min":20000,"max":500000},
          "rework_hours_pct_range":{"min":0.05,"max":0.15}
        },
        "demand_model":{
          "base_demand_weight":0.14,
          "seasonality_key":"public_tender_cycle_seasonality",
          "price_elasticity":0.38,
          "reputation_sensitivity":0.75
        },
        "requirements":{
          "engineers_fte_min":1,
          "senior_engineers_fte_min":1,
          "project_manager_fte_min":0,
          "bim_specialist_fte_min":1,
          "certification_level_min":1,
          "compliance_score_min":0.55,
          "reputation_score_min":0.6
        }
      },
      "owner_rep_project_management_unit":{
        "pricing_model":{
          "model_type":"mixed",
          "base_fee_eur_range":{"min":5000,"max":120000},
          "hourly_rate_eur_range":{"min":90,"max":160},
          "typical_billable_hours_range":{"min":40,"max":300}
        },
        "gross_margin_pct_range":{"min":0.25,"max":0.5},
        "typical_duration_ticks_range":{"min":4,"max":16},
        "payment_terms_days_range":{"min":30,"max":75},
        "retention_pct_range":{"min":0.05,"max":0.1},
        "cost_model":{
          "staff_hours_by_role_range":{
            "engineer_hours_range":{"min":20,"max":200},
            "senior_engineer_hours_range":{"min":20,"max":180},
            "pm_hours_range":{"min":60,"max":520},
            "drafter_hours_range":{"min":10,"max":80}
          },
          "software_cost_eur_per_tick_range":{"min":200,"max":1400},
          "insurance_cost_pct_of_revenue_range":{"min":0.03,"max":0.08},
          "subcontractor_cost_pct_range":{"min":0.02,"max":0.08}
        },
        "liability_model":{
          "revision_rounds_range":{"min":2,"max":6},
          "error_probability_range":{"min":0.05,"max":0.14},
          "liability_claim_probability_range":{"min":0.004,"max":0.02},
          "claim_severity_eur_range":{"min":50000,"max":1200000},
          "rework_hours_pct_range":{"min":0.06,"max":0.2}
        },
        "demand_model":{
          "base_demand_weight":0.1,
          "seasonality_key":"public_tender_cycle_seasonality",
          "price_elasticity":0.28,
          "reputation_sensitivity":0.8
        },
        "requirements":{
          "engineers_fte_min":1,
          "senior_engineers_fte_min":1,
          "project_manager_fte_min":1,
          "bim_specialist_fte_min":0,
          "certification_level_min":1,
          "compliance_score_min":0.7,
          "reputation_score_min":0.65
        }
      }
    },
    "startingLoadout":{
      "startingCash":220000,
      "assets":[
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"compliance_score","count":0.55},
        {"assetId":"utilization_target","count":0.7},
        {"assetId":"utilization_actual","count":0.5},
        {"assetId":"billable_hours_capacity_per_tick","count":90},
        {"assetId":"overtime_enabled","count":0},
        {"assetId":"lead_pool_count","count":10},
        {"assetId":"proposals_in_progress_count","count":1},
        {"assetId":"proposals_capacity_per_tick","count":1},
        {"assetId":"proposal_cost_pct_of_contract_value","count":0.025},
        {"assetId":"win_rate_base","count":0.3},
        {"assetId":"backlog_contract_value_eur","count":120000},
        {"assetId":"backlog_projects_count","count":3},
        {"assetId":"wip_active_projects_count","count":1},
        {"assetId":"wip_burn_value_eur_per_tick","count":30000},
        {"assetId":"wip_burn_cost_eur_per_tick","count":22000},
        {"assetId":"permitting_delay_ticks_min","count":1},
        {"assetId":"permitting_delay_ticks_max","count":4},
        {"assetId":"review_cycle_delay_probability","count":0.12},
        {"assetId":"scope_creep_rate","count":0.15},
        {"assetId":"qa_process_maturity","count":0.2},
        {"assetId":"revision_backlog_hours","count":18},
        {"assetId":"error_rate","count":0.1},
        {"assetId":"liability_risk_score","count":0.3},
        {"assetId":"insurance_reserve_eur","count":6000},
        {"assetId":"claims_count","count":0},
        {"assetId":"accounts_receivable_eur","count":20000},
        {"assetId":"payment_delay_ticks_min","count":1},
        {"assetId":"payment_delay_ticks_max","count":4},
        {"assetId":"retention_held_eur","count":0},
        {"assetId":"certification_level","count":0}
      ],
      "staff":[
        {"roleId":"engineers_fte","fte":2},
        {"roleId":"senior_engineers_fte","fte":0},
        {"roleId":"drafters_fte","fte":1},
        {"roleId":"project_managers_fte","fte":0},
        {"roleId":"bim_specialists_fte","fte":0}
      ],
      "unlockedProducts":["permitting_and_code_review_unit"]
    },
    "unlockRules":[
      {"productSku":"permitting_and_code_review_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"geotechnical_survey_unit","startingUnlocked":false,"requirements":{
        "minComplianceScore":0.55,
        "anyOf":[
          {"upgrades":["subcontractor_framework_specialty"]},
          {"minSeniorEngineersFte":1}
        ]
      }},
      {"productSku":"structural_design_package_unit","startingUnlocked":false,"requirements":{
        "upgrades":["qa_baseline_checklist"],
        "minEngineersFte":2,
        "minSeniorEngineersFte":1,
        "minReputationScore":0.5
      }},
      {"productSku":"mep_design_package_unit","startingUnlocked":false,"requirements":{
        "minEngineersFte":3,
        "minSeniorEngineersFte":1,
        "minProjectManagerFte":1,
        "minCertificationLevel":1,
        "minComplianceScore":0.6
      }},
      {"productSku":"bim_coordination_service_unit","startingUnlocked":false,"requirements":{
        "upgrades":["software_stack_cad_bim"],
        "minBimSpecialistFte":1,
        "minReputationScore":0.6
      }},
      {"productSku":"owner_rep_project_management_unit","startingUnlocked":false,"requirements":{
        "upgrades":["governance_reporting_process"],
        "minProjectManagerFte":1,
        "minComplianceScore":0.7,
        "minReputationScore":0.65
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Engineering products
with niche as (
  select id from public.niches where code = 'BUILD_ENGINEERING'
),
product_seed as (
  select * from (values
    ('structural_design_package_unit', 'Structural Design Package', 'unit', 8000, 250000, 45, 70, 'engineers_fte', 'Structural design packages.'),
    ('mep_design_package_unit', 'MEP Design Package', 'unit', 10000, 300000, 50, 72, 'engineers_fte', 'MEP design packages.'),
    ('geotechnical_survey_unit', 'Geotechnical Survey', 'unit', 2000, 60000, 60, 80, 'engineers_fte', 'Geotechnical survey work.'),
    ('permitting_and_code_review_unit', 'Permitting & Code Review', 'unit', 1500, 45000, 40, 65, 'engineers_fte', 'Permitting and code review services.'),
    ('bim_coordination_service_unit', 'BIM Coordination Service', 'unit', 6000, 180000, 45, 68, 'bim_specialists_fte', 'BIM coordination services.'),
    ('owner_rep_project_management_unit', 'Owner''s Rep Project Management', 'unit', 5000, 120000, 50, 75, 'project_managers_fte', 'Owner''s rep oversight services.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
)
delete from public.niche_products
where niche_id in (select id from niche);

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

-- Engineering upgrades
with niche as (
  select id from public.niches where code = 'BUILD_ENGINEERING'
),
upgrade_seed as (
  select * from (values
    (
      'qa_baseline_checklist',
      'QA',
      'QA Baseline Checklist & Peer Review',
      'Improves QA, reduces liability risk, and unlocks structural design.',
      1,
      0,
      1,
      '[{"key":"qa_process_maturity","op":"add","range":[0.1,0.25]},{"key":"error_probability_modifier","op":"mul","range":[0.65,0.9]},{"key":"liability_claim_probability_modifier","op":"mul","range":[0.75,0.9]},{"key":"billable_hours_capacity_per_tick","op":"add","range":[-8,-3]},{"key":"unlock_products","op":"set","value":["structural_design_package_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..8000',
      'monthlyFixed 0..600',
      1,
      1,
      '{"failureChancePctRange":[8,14],"variancePctRange":[5,10],"failureEffects":["admin_overhead_capacity_dip"]}'::jsonb
    ),
    (
      'software_stack_cad_bim',
      'SOFTWARE',
      'Software Stack (CAD/BIM Licenses)',
      'Improves productivity and unlocks BIM coordination services.',
      2,
      0,
      4,
      '[{"key":"billable_hours_capacity_per_tick","op":"add","range":[5,18]},{"key":"revision_rounds_modifier","op":"mul","range":[0.85,0.95]},{"key":"unlock_products","op":"set","value":["bim_coordination_service_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 3000..60000',
      'monthlyFixed 200..2500',
      2,
      5,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["onboarding_dip_ticks 1..1","license_utilization_gap"]}'::jsonb
    ),
    (
      'proposal_engine_crm',
      'BID',
      'Proposal Engine (Templates + CRM)',
      'Increases proposal throughput and win rate.',
      2,
      0,
      4,
      '[{"key":"proposals_capacity_per_tick","op":"add","range":[0.6,1.6]},{"key":"win_rate_base","op":"add","range":[0.02,0.1]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 1000..25000',
      'monthlyFixed 100..1200',
      2,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["overhead_pressure","low_lead_roi"]}'::jsonb
    ),
    (
      'hire_senior_engineer',
      'STAFF',
      'Hire Senior Engineer',
      'Adds senior capacity and improves win rate for complex work.',
      2,
      0,
      2,
      '[{"key":"senior_engineers_fte","op":"add","range":[1,1]},{"key":"certification_level","op":"add","range":[1,1]},{"key":"win_rate_base","op":"add","range":[0.02,0.06]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 500..10000',
      'per_senior_engineer_monthly 5500..11000',
      1,
      4,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["overhead_pressure","utilization_pressure"]}'::jsonb
    ),
    (
      'subcontractor_framework_specialty',
      'PARTNERS',
      'Subcontractor Framework (Geo + Specialty)',
      'Unlocks geotechnical work and stabilizes specialty delivery.',
      1,
      0,
      1,
      '[{"key":"subcontractor_cost_pct","op":"add","range":[0.02,0.05]},{"key":"delivery_risk_modifier","op":"mul","range":[0.9,0.98]},{"key":"unlock_products","op":"set","value":["geotechnical_survey_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..10000',
      'subcontractor_margin_pct 0.02..0.05',
      1,
      1,
      '{"failureChancePctRange":[9,16],"variancePctRange":[6,12],"failureEffects":["margin_compression","quality_variance"]}'::jsonb
    ),
    (
      'professional_indemnity_upgrade',
      'RISK',
      'Professional Indemnity Upgrade (Insurance)',
      'Reduces liability exposure at the cost of higher premiums.',
      1,
      0,
      1,
      '[{"key":"liability_risk_score","op":"add","range":[-0.12,-0.04]},{"key":"insurance_reserve_eur","op":"add","range":[2000,8000]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..5000',
      'premium_pct_of_revenue 0.5..1.5%',
      1,
      1,
      '{"failureChancePctRange":[6,12],"variancePctRange":[4,8],"failureEffects":["fixed_cost_pressure"]}'::jsonb
    ),
    (
      'permitting_fast_track_relationships',
      'PERMIT',
      'Permitting Fast-Track Relationships',
      'Reduces review cycle delays and permitting drag.',
      3,
      0,
      6,
      '[{"key":"permitting_delay_ticks","op":"add","range":[-1.2,-0.4]},{"key":"review_cycle_delay_probability","op":"add","range":[-0.15,-0.05]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..30000',
      'monthlyFixed 200..1500',
      3,
      8,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["contact_churn_dependency","benefit_decay_risk"]}'::jsonb
    ),
    (
      'governance_reporting_process',
      'GOVERNANCE',
      'Governance & Reporting Process',
      'Improves reputation and unlocks owner rep oversight work.',
      3,
      0,
      5,
      '[{"key":"reputation_score","op":"add","range":[0.03,0.08]},{"key":"scope_creep_rate_modifier","op":"mul","range":[0.85,0.95]},{"key":"unlock_products","op":"set","value":["owner_rep_project_management_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..40000',
      'monthlyFixed 150..2000',
      3,
      7,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["admin_overhead_utilization_dip"]}'::jsonb
    ),
    (
      'knowledge_base_reusable_ip',
      'IP',
      'Knowledge Base & Reusable IP Library',
      'Improves throughput and margins via reusable standards.',
      2,
      0,
      4,
      '[{"key":"typical_billable_hours_modifier","op":"mul","range":[0.85,0.95]},{"key":"gross_margin_target","op":"add","range":[0.02,0.06]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 1000..20000',
      'monthlyFixed 100..800',
      2,
      6,
      '{"failureChancePctRange":[8,14],"variancePctRange":[5,10],"failureEffects":["short_term_output_dip","documentation_drag"]}'::jsonb
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
  upgrade_seed.capex_pct_min,
  upgrade_seed.capex_pct_max,
  upgrade_seed.opex_pct_min,
  upgrade_seed.opex_pct_max,
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
-- BUILD Plumbing seed (niche + products + upgrades)
-- ============================================================

-- Plumbing niche
with sector as (
  select id from public.sectors where code = 'BUILD'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'BUILD_PLUMBING',
  'Plumbing',
  'Service plumbing with scheduling, parts flow, and callback risk',
  $$
  {
    "capexIntensity":"LOW",
    "marginRange":{"min":0.18,"max":0.45},
    "demandVolatility":0.48,
    "priceElasticity":0.4,
    "labourIntensity":0.7,
    "skillIntensity":0.6,
    "regulationRisk":0.35,
    "assetLifetimeYears":6,
    "capacityElasticity":0.6,
    "ticketSize":"SMALL",
    "baseDemandLevel":420,
    "seasonalityPattern":{"monthlyFactors":[0.95,0.97,0.99,1.02,1.05,1.08,1.06,1.03,0.99,0.97,0.96,0.95]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_BUILD",
    "upgradeProfile":"INDUSTRIAL",
    "productSeasonalityKeys":{
      "residential_repair_visit_job_unit":"weather_construction_seasonality",
      "bathroom_installation_job_unit":"weather_construction_seasonality",
      "commercial_fitout_plumbing_job_unit":"weather_construction_seasonality",
      "boiler_heatpump_plumbing_service_job_unit":"winter_emergency_seasonality",
      "emergency_leak_callout_job_unit":"winter_emergency_seasonality",
      "property_maintenance_contract_unit":"weather_construction_seasonality"
    },
    "jobModels":{
      "residential_repair_visit_job_unit":{
        "base_price_eur_range":{"min":120,"max":650},
        "gross_margin_pct_range":{"min":0.2,"max":0.4},
        "typical_duration_ticks_range":{"min":1,"max":2},
        "payment_terms_days_range":{"min":7,"max":30},
        "retention_pct_range":{"min":0,"max":0.01},
        "cost_model":{
          "labor_hours_per_job_range":{"min":2,"max":10},
          "parts_cost_eur_per_job_range":{"min":20,"max":220},
          "parts_fill_rate_sensitivity":0.35,
          "mobilization_cost_eur_range":{"min":0,"max":120},
          "overtime_cost_multiplier_range":{"min":1.1,"max":1.4}
        },
        "quality_model":{
          "inspection_required":false,
          "inspection_fail_probability_range":{"min":0.01,"max":0.04},
          "callback_probability_range":{"min":0.05,"max":0.12},
          "callback_cost_pct_range":{"min":0.08,"max":0.18},
          "water_damage_claim_probability_range":{"min":0.002,"max":0.01},
          "claim_severity_eur_range":{"min":2000,"max":50000}
        },
        "demand_model":{
          "base_demand_weight":0.32,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.45,
          "urgency_sensitivity":0.4,
          "reputation_sensitivity":0.35
        },
        "requirements":{
          "plumbers_fte_min":1,
          "master_plumber_fte_min":0,
          "apprentices_fte_min":0,
          "dispatcher_fte_min":0,
          "compliance_score_min":0.45,
          "reputation_score_min":0.35
        }
      },
      "bathroom_installation_job_unit":{
        "base_price_eur_range":{"min":2500,"max":18000},
        "gross_margin_pct_range":{"min":0.18,"max":0.35},
        "typical_duration_ticks_range":{"min":2,"max":8},
        "payment_terms_days_range":{"min":30,"max":60},
        "retention_pct_range":{"min":0.02,"max":0.05},
        "cost_model":{
          "labor_hours_per_job_range":{"min":40,"max":220},
          "parts_cost_eur_per_job_range":{"min":800,"max":6000},
          "parts_fill_rate_sensitivity":0.55,
          "subcontractor_cost_pct_range":{"min":0.04,"max":0.15},
          "mobilization_cost_eur_range":{"min":150,"max":1200},
          "overtime_cost_multiplier_range":{"min":1.15,"max":1.5}
        },
        "quality_model":{
          "inspection_required":true,
          "inspection_fail_probability_range":{"min":0.04,"max":0.12},
          "callback_probability_range":{"min":0.06,"max":0.14},
          "callback_cost_pct_range":{"min":0.1,"max":0.2},
          "water_damage_claim_probability_range":{"min":0.004,"max":0.02},
          "claim_severity_eur_range":{"min":5000,"max":120000}
        },
        "demand_model":{
          "base_demand_weight":0.16,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.35,
          "urgency_sensitivity":0.3,
          "reputation_sensitivity":0.55
        },
        "requirements":{
          "plumbers_fte_min":3,
          "master_plumber_fte_min":1,
          "apprentices_fte_min":1,
          "compliance_score_min":0.6,
          "reputation_score_min":0.5,
          "parts_inventory_value_eur_min":12000,
          "tooling_requirements":["pressure_test_kit","press_tool"]
        }
      },
      "commercial_fitout_plumbing_job_unit":{
        "base_price_eur_range":{"min":6000,"max":120000},
        "gross_margin_pct_range":{"min":0.15,"max":0.28},
        "typical_duration_ticks_range":{"min":3,"max":12},
        "payment_terms_days_range":{"min":45,"max":90},
        "retention_pct_range":{"min":0.05,"max":0.1},
        "cost_model":{
          "labor_hours_per_job_range":{"min":80,"max":600},
          "parts_cost_eur_per_job_range":{"min":2000,"max":40000},
          "parts_fill_rate_sensitivity":0.6,
          "subcontractor_cost_pct_range":{"min":0.1,"max":0.25},
          "mobilization_cost_eur_range":{"min":500,"max":6000},
          "overtime_cost_multiplier_range":{"min":1.2,"max":1.6}
        },
        "quality_model":{
          "inspection_required":true,
          "inspection_fail_probability_range":{"min":0.06,"max":0.15},
          "callback_probability_range":{"min":0.05,"max":0.12},
          "callback_cost_pct_range":{"min":0.08,"max":0.18},
          "water_damage_claim_probability_range":{"min":0.006,"max":0.025},
          "claim_severity_eur_range":{"min":20000,"max":500000}
        },
        "demand_model":{
          "base_demand_weight":0.12,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.3,
          "urgency_sensitivity":0.2,
          "reputation_sensitivity":0.65
        },
        "requirements":{
          "plumbers_fte_min":4,
          "master_plumber_fte_min":1,
          "dispatcher_fte_min":1,
          "compliance_score_min":0.7,
          "reputation_score_min":0.6,
          "parts_inventory_value_eur_min":20000,
          "tooling_requirements":["press_tool","drain_camera","pressure_test_kit"]
        }
      },
      "boiler_heatpump_plumbing_service_job_unit":{
        "base_price_eur_range":{"min":350,"max":7500},
        "gross_margin_pct_range":{"min":0.2,"max":0.4},
        "typical_duration_ticks_range":{"min":1,"max":4},
        "payment_terms_days_range":{"min":20,"max":45},
        "retention_pct_range":{"min":0,"max":0.03},
        "cost_model":{
          "labor_hours_per_job_range":{"min":6,"max":60},
          "parts_cost_eur_per_job_range":{"min":150,"max":2500},
          "parts_fill_rate_sensitivity":0.5,
          "subcontractor_cost_pct_range":{"min":0.02,"max":0.1},
          "mobilization_cost_eur_range":{"min":0,"max":300},
          "overtime_cost_multiplier_range":{"min":1.1,"max":1.4}
        },
        "quality_model":{
          "inspection_required":true,
          "inspection_fail_probability_range":{"min":0.04,"max":0.12},
          "callback_probability_range":{"min":0.05,"max":0.12},
          "callback_cost_pct_range":{"min":0.08,"max":0.18},
          "water_damage_claim_probability_range":{"min":0.003,"max":0.015},
          "claim_severity_eur_range":{"min":5000,"max":120000}
        },
        "demand_model":{
          "base_demand_weight":0.18,
          "seasonality_key":"winter_emergency_seasonality",
          "price_elasticity":0.35,
          "urgency_sensitivity":0.5,
          "reputation_sensitivity":0.5
        },
        "requirements":{
          "plumbers_fte_min":2,
          "master_plumber_fte_min":1,
          "compliance_score_min":0.6,
          "parts_inventory_value_eur_min":8000,
          "tooling_requirements":["press_tool"]
        }
      },
      "emergency_leak_callout_job_unit":{
        "base_price_eur_range":{"min":160,"max":1250},
        "gross_margin_pct_range":{"min":0.25,"max":0.45},
        "typical_duration_ticks_range":{"min":1,"max":2},
        "payment_terms_days_range":{"min":0,"max":14},
        "retention_pct_range":{"min":0,"max":0.01},
        "cost_model":{
          "labor_hours_per_job_range":{"min":2,"max":12},
          "parts_cost_eur_per_job_range":{"min":50,"max":400},
          "parts_fill_rate_sensitivity":0.3,
          "mobilization_cost_eur_range":{"min":0,"max":150},
          "overtime_cost_multiplier_range":{"min":1.3,"max":1.8}
        },
        "quality_model":{
          "inspection_required":false,
          "inspection_fail_probability_range":{"min":0.01,"max":0.05},
          "callback_probability_range":{"min":0.1,"max":0.22},
          "callback_cost_pct_range":{"min":0.1,"max":0.22},
          "water_damage_claim_probability_range":{"min":0.006,"max":0.03},
          "claim_severity_eur_range":{"min":5000,"max":150000}
        },
        "demand_model":{
          "base_demand_weight":0.22,
          "seasonality_key":"winter_emergency_seasonality",
          "price_elasticity":0.25,
          "urgency_sensitivity":0.9,
          "reputation_sensitivity":0.4
        },
        "requirements":{
          "plumbers_fte_min":2,
          "master_plumber_fte_min":0,
          "compliance_score_min":0.5,
          "reputation_score_min":0.45,
          "on_call_enabled":true
        }
      },
      "property_maintenance_contract_unit":{
        "base_price_eur_range":{"min":900,"max":22000},
        "gross_margin_pct_range":{"min":0.18,"max":0.35},
        "typical_duration_ticks_range":{"min":4,"max":12},
        "payment_terms_days_range":{"min":30,"max":60},
        "retention_pct_range":{"min":0,"max":0.03},
        "cost_model":{
          "labor_hours_per_job_range":{"min":10,"max":80},
          "parts_cost_eur_per_job_range":{"min":120,"max":1500},
          "parts_fill_rate_sensitivity":0.45,
          "mobilization_cost_eur_range":{"min":0,"max":200},
          "overtime_cost_multiplier_range":{"min":1.05,"max":1.3}
        },
        "quality_model":{
          "inspection_required":true,
          "inspection_fail_probability_range":{"min":0.03,"max":0.1},
          "callback_probability_range":{"min":0.03,"max":0.08},
          "callback_cost_pct_range":{"min":0.05,"max":0.12},
          "water_damage_claim_probability_range":{"min":0.002,"max":0.01},
          "claim_severity_eur_range":{"min":5000,"max":200000}
        },
        "demand_model":{
          "base_demand_weight":0.1,
          "seasonality_key":"weather_construction_seasonality",
          "price_elasticity":0.2,
          "urgency_sensitivity":0.2,
          "reputation_sensitivity":0.8
        },
        "requirements":{
          "plumbers_fte_min":2,
          "master_plumber_fte_min":1,
          "dispatcher_fte_min":1,
          "compliance_score_min":0.6,
          "reputation_score_min":0.6,
          "parts_inventory_value_eur_min":10000
        }
      }
    },
    "startingLoadout":{
      "startingCash":140000,
      "assets":[
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"compliance_score","count":0.55},
        {"assetId":"pricing_power_score","count":0.45},
        {"assetId":"utilization_target","count":0.65},
        {"assetId":"utilization_actual","count":0.45},
        {"assetId":"labor_hours_capacity_per_tick","count":70},
        {"assetId":"job_queue_count","count":6},
        {"assetId":"average_wait_ticks","count":2},
        {"assetId":"overtime_enabled","count":0},
        {"assetId":"on_call_enabled","count":0},
        {"assetId":"parts_inventory_value_eur","count":10000},
        {"assetId":"parts_fill_rate","count":0.7},
        {"assetId":"supplier_lead_time_ticks_min","count":1},
        {"assetId":"supplier_lead_time_ticks_max","count":3},
        {"assetId":"parts_waste_pct","count":0.04},
        {"assetId":"critical_parts_stockouts_count","count":0},
        {"assetId":"callback_rate","count":0.1},
        {"assetId":"callbacks_queue_count","count":0},
        {"assetId":"inspection_required_rate","count":0.25},
        {"assetId":"inspection_fail_probability","count":0.1},
        {"assetId":"warranty_reserve_eur","count":2500},
        {"assetId":"water_damage_claim_probability","count":0.006},
        {"assetId":"accounts_receivable_eur","count":15000},
        {"assetId":"payment_delay_ticks_min","count":1},
        {"assetId":"payment_delay_ticks_max","count":4},
        {"assetId":"retention_held_eur","count":0}
      ],
      "staff":[
        {"roleId":"plumbers_fte","fte":2},
        {"roleId":"master_plumber_fte","fte":0},
        {"roleId":"apprentices_fte","fte":1},
        {"roleId":"dispatcher_fte","fte":0}
      ],
      "unlockedProducts":["residential_repair_visit_job_unit"]
    },
    "unlockRules":[
      {"productSku":"residential_repair_visit_job_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"emergency_leak_callout_job_unit","startingUnlocked":false,"requirements":{
        "minPlumbersFte":2,
        "minReputationScore":0.45,
        "anyOf":[
          {"assets":[{"assetId":"on_call_enabled","minCount":1}]},
          {"upgrades":["on_call_rotation_setup"]}
        ]
      }},
      {"productSku":"boiler_heatpump_plumbing_service_job_unit","startingUnlocked":false,"requirements":{
        "minComplianceScore":0.6,
        "anyOf":[
          {"upgrades":["tooling_upgrade_pipe_press_camera"]},
          {"minMasterPlumberFte":1}
        ]
      }},
      {"productSku":"bathroom_installation_job_unit","startingUnlocked":false,"requirements":{
        "upgrades":["quality_checklist_pressure_testing"],
        "minPlumbersFte":3,
        "minMasterPlumberFte":1,
        "assets":[{"assetId":"parts_inventory_value_eur","minCount":12000}]
      }},
      {"productSku":"property_maintenance_contract_unit","startingUnlocked":false,"requirements":{
        "minReputationScore":0.6,
        "maxCallbackRate":0.08,
        "anyOf":[
          {"minDispatcherFte":1},
          {"upgrades":["dispatcher_routing_discipline"]}
        ]
      }},
      {"productSku":"commercial_fitout_plumbing_job_unit","startingUnlocked":false,"requirements":{
        "upgrades":["project_controls_system"],
        "minComplianceScore":0.7,
        "minMasterPlumberFte":1,
        "assets":[{"assetId":"warranty_reserve_eur","minCount":8000}]
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Plumbing products
with niche as (
  select id from public.niches where code = 'BUILD_PLUMBING'
),
product_seed as (
  select * from (values
    ('residential_repair_visit_job_unit', 'Residential Repair Visit', 'unit', 120, 650, 60, 80, 'plumbers_fte', 'Residential service calls.'),
    ('bathroom_installation_job_unit', 'Bathroom Installation', 'unit', 2500, 18000, 65, 82, 'plumbers_fte', 'Bathroom install projects.'),
    ('commercial_fitout_plumbing_job_unit', 'Commercial Fit-Out Plumbing', 'unit', 6000, 120000, 70, 85, 'plumbers_fte', 'Commercial fit-out plumbing installs.'),
    ('boiler_heatpump_plumbing_service_job_unit', 'Boiler / Heat Pump Plumbing Service', 'unit', 350, 7500, 60, 80, 'plumbers_fte', 'Heating system plumbing service.'),
    ('emergency_leak_callout_job_unit', 'Emergency Leak Callout', 'unit', 160, 1250, 55, 75, 'plumbers_fte', 'Emergency leak response jobs.'),
    ('property_maintenance_contract_unit', 'Property Maintenance Contract', 'unit', 900, 22000, 65, 82, 'dispatcher_fte', 'Property maintenance contracts.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
)
delete from public.niche_products
where niche_id in (select id from niche);

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

-- Plumbing upgrades
with niche as (
  select id from public.niches where code = 'BUILD_PLUMBING'
),
upgrade_seed as (
  select * from (values
    (
      'on_call_rotation_setup',
      'OPS',
      'On-Call Rotation Setup',
      'Unlocks emergency callouts with higher overtime exposure.',
      1,
      0,
      1,
      '[{"key":"on_call_enabled","op":"set","value":true},{"key":"emergency_demand_uplift","op":"add","range":[0.15,0.4]},{"key":"unlock_products","op":"set","value":["emergency_leak_callout_job_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..8000',
      'overtime_premium_pct 0.1..0.35',
      1,
      1,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["burnout_callback_increase","overtime_cost_spike"]}'::jsonb
    ),
    (
      'parts_inventory_system',
      'SUPPLY',
      'Parts Inventory System & Reorder Points',
      'Improves parts availability and reduces stockouts.',
      2,
      0,
      4,
      '[{"key":"parts_fill_rate","op":"add","range":[0.05,0.2]},{"key":"parts_inventory_value_eur","op":"add","range":[4000,18000]},{"key":"critical_parts_stockouts_modifier","op":"mul","range":[0.5,0.8]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 1000..25000',
      'inventory_carry_pct 0.5..1.5%',
      2,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["cash_tied_up","overstock_waste"]}'::jsonb
    ),
    (
      'hire_master_plumber',
      'STAFF',
      'Hire Master Plumber',
      'Adds senior capacity and improves inspection outcomes.',
      2,
      0,
      2,
      '[{"key":"master_plumber_fte","op":"add","range":[1,1]},{"key":"inspection_fail_probability_modifier","op":"mul","range":[0.7,0.9]},{"key":"unlock_products","op":"set","value":["bathroom_installation_job_unit","commercial_fitout_plumbing_job_unit","boiler_heatpump_plumbing_service_job_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 500..8000',
      'per_master_plumber_monthly 4200..7800',
      1,
      4,
      '{"failureChancePctRange":[8,16],"variancePctRange":[6,12],"failureEffects":["overhead_pressure","utilization_pressure"]}'::jsonb
    ),
    (
      'quality_checklist_pressure_testing',
      'QUALITY',
      'Quality Checklist + Pressure Testing',
      'Reduces callbacks and water damage exposure.',
      1,
      0,
      1,
      '[{"key":"callback_probability_modifier","op":"mul","range":[0.6,0.9]},{"key":"water_damage_claim_probability_modifier","op":"mul","range":[0.6,0.85]},{"key":"labor_hours_capacity_per_tick","op":"add","range":[-8,-3]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..12000',
      'quality_admin_pct 0.2..0.8%',
      1,
      1,
      '{"failureChancePctRange":[8,14],"variancePctRange":[5,10],"failureEffects":["admin_overhead_capacity_dip"]}'::jsonb
    ),
    (
      'dispatcher_routing_discipline',
      'DISPATCH',
      'Dispatcher & Routing Discipline',
      'Improves routing and reduces average waits.',
      2,
      0,
      3,
      '[{"key":"utilization_actual","op":"add","range":[0.05,0.2]},{"key":"average_wait_ticks","op":"add","range":[-2,-0.5]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 1000..20000',
      'dispatcher_monthly 2800..5200',
      2,
      5,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["implementation_dip_ticks 1..1","routing_overhead"]}'::jsonb
    ),
    (
      'commercial_compliance_pack',
      'COMPLIANCE',
      'Commercial Compliance Pack',
      'Improves compliance for larger fit-out work.',
      2,
      0,
      4,
      '[{"key":"compliance_score","op":"add","range":[0.1,0.25]},{"key":"unlock_products","op":"set","value":["commercial_fitout_plumbing_job_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..40000',
      'monthlyFixed 150..2000',
      2,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["admin_overhead","audit_disruption"]}'::jsonb
    ),
    (
      'tooling_upgrade_pipe_press_camera',
      'TOOLS',
      'Tooling Upgrade (Pipe Press + Drain Camera)',
      'Improves productivity and reduces inspection failures.',
      2,
      0,
      3,
      '[{"key":"labor_hours_per_job_modifier","op":"mul","range":[0.85,0.95]},{"key":"inspection_fail_probability_modifier","op":"mul","range":[0.8,0.95]},{"key":"unlock_products","op":"set","value":["boiler_heatpump_plumbing_service_job_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 3000..60000',
      'tool_maintenance_pct 0.3..1.2%',
      1,
      4,
      '{"failureChancePctRange":[9,16],"variancePctRange":[6,12],"failureEffects":["calibration_downtime","maintenance_cost_spike"]}'::jsonb
    ),
    (
      'warranty_reserve_policy',
      'WARRANTY',
      'Warranty Reserve Policy & Analytics',
      'Stabilizes warranty reserves and claim exposure.',
      1,
      0,
      1,
      '[{"key":"warranty_reserve_eur_target","op":"add","range":[2000,6000]},{"key":"claim_severity_modifier","op":"mul","range":[0.9,0.98]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..10000',
      'analytics_tools_pct 0.2..0.8%',
      1,
      1,
      '{"failureChancePctRange":[8,14],"variancePctRange":[5,10],"failureEffects":["under_reserving_risk","claim_shock_exposure"]}'::jsonb
    ),
    (
      'property_manager_sales_engine',
      'SALES',
      'Property Manager Sales Engine',
      'Builds contract pipeline with property managers.',
      3,
      0,
      4,
      '[{"key":"lead_pool_count","op":"add","range":[3,8]},{"key":"pricing_power_score","op":"add","range":[0.02,0.08]},{"key":"unlock_products","op":"set","value":["property_maintenance_contract_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..50000',
      'monthlyFixed 200..3000',
      2,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["reputation_penalty_if_callbacks_high"]}'::jsonb
    ),
    (
      'project_controls_system',
      'CONTROLS',
      'Project Controls & Documentation',
      'Reduces inspection failures and wait times on larger jobs.',
      2,
      0,
      4,
      '[{"key":"average_wait_ticks","op":"add","range":[-1.5,-0.4]},{"key":"inspection_fail_probability_modifier","op":"mul","range":[0.85,0.95]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 1500..25000',
      'monthlyFixed 150..1200',
      2,
      6,
      '{"failureChancePctRange":[9,16],"variancePctRange":[6,12],"failureEffects":["documentation_overhead","process_drag"]}'::jsonb
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
  upgrade_seed.capex_pct_min,
  upgrade_seed.capex_pct_max,
  upgrade_seed.opex_pct_min,
  upgrade_seed.opex_pct_max,
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
-- BUILD Renovation seed (niche + products + upgrades)
-- ============================================================

-- Renovation niche
with sector as (
  select id from public.sectors where code = 'BUILD'
)
insert into public.niches (sector_id, code, name, description, config)
select
  sector.id,
  'BUILD_RENOVATION',
  'Renovation',
  'Renovation services with scope creep and defect risks',
  $$
  {
    "capexIntensity":"MEDIUM",
    "marginRange":{"min":0.18,"max":0.45},
    "demandVolatility":0.52,
    "priceElasticity":0.4,
    "labourIntensity":0.72,
    "skillIntensity":0.6,
    "regulationRisk":0.35,
    "assetLifetimeYears":6,
    "capacityElasticity":0.55,
    "ticketSize":"MEDIUM",
    "baseDemandLevel":380,
    "seasonalityPattern":{"monthlyFactors":[0.95,0.98,1.02,1.08,1.15,1.2,1.18,1.1,1.02,0.98,0.96,0.95]},
    "competitionType":"FRAGMENTED",
    "decisionProfile":"SECTOR_BUILD",
    "upgradeProfile":"INDUSTRIAL",
    "productSeasonalityKeys":{
      "small_repair_punchlist_job_unit":"winter_indoor_project_seasonality",
      "kitchen_renovation_job_unit":"spring_renovation_seasonality",
      "bathroom_renovation_job_unit":"spring_renovation_seasonality",
      "whole_home_renovation_job_unit":"spring_renovation_seasonality",
      "tenant_turnover_renovation_contract_unit":"winter_indoor_project_seasonality",
      "insurance_restoration_job_unit":"winter_indoor_project_seasonality"
    },
    "projectModels":{
      "small_repair_punchlist_job_unit":{
        "base_price_eur_range":{"min":300,"max":2500},
        "gross_margin_pct_range":{"min":0.25,"max":0.45},
        "typical_duration_ticks_range":{"min":1,"max":2},
        "payment_terms_days_range":{"min":7,"max":30},
        "deposit_pct_range":{"min":0.1,"max":0.2},
        "retention_pct_range":{"min":0,"max":0.03},
        "cost_model":{
          "labor_hours_per_job_range":{"min":4,"max":30},
          "materials_cost_eur_per_job_range":{"min":80,"max":600},
          "subcontractor_cost_pct_range":{"min":0.02,"max":0.08},
          "mobilization_cost_eur_range":{"min":0,"max":150},
          "overhead_cost_pct_range":{"min":0.08,"max":0.2}
        },
        "scope_contract_model":{
          "scope_creep_probability_range":{"min":0.05,"max":0.15},
          "scope_creep_cost_pct_range":{"min":0.02,"max":0.08},
          "change_order_acceptance_rate_range":{"min":0.2,"max":0.45},
          "change_order_margin_pct_range":{"min":0.15,"max":0.3},
          "milestone_billing_enabled":false
        },
        "hidden_defect_model":{
          "hidden_defect_probability_range":{"min":0.03,"max":0.1},
          "defect_detection_sensitivity":0.35,
          "defect_rework_cost_eur_range":{"min":200,"max":2500},
          "defect_delay_ticks_range":{"min":0,"max":1}
        },
        "quality_warranty_model":{
          "defect_rate_range":{"min":0.02,"max":0.08},
          "warranty_claim_rate_range":{"min":0.01,"max":0.04},
          "warranty_claim_severity_eur_range":{"min":300,"max":4000}
        },
        "demand_model":{
          "base_demand_weight":0.3,
          "seasonality_key":"winter_indoor_project_seasonality",
          "price_elasticity":0.45,
          "reputation_sensitivity":0.35
        },
        "requirements":{
          "crew_fte_min":2,
          "site_managers_fte_min":0,
          "project_manager_fte_min":0,
          "compliance_score_min":0.45,
          "reputation_score_min":0.35
        }
      },
      "kitchen_renovation_job_unit":{
        "base_price_eur_range":{"min":8000,"max":45000},
        "gross_margin_pct_range":{"min":0.2,"max":0.4},
        "typical_duration_ticks_range":{"min":2,"max":10},
        "payment_terms_days_range":{"min":30,"max":60},
        "deposit_pct_range":{"min":0.2,"max":0.3},
        "retention_pct_range":{"min":0.04,"max":0.08},
        "cost_model":{
          "labor_hours_per_job_range":{"min":80,"max":420},
          "materials_cost_eur_per_job_range":{"min":3000,"max":22000},
          "subcontractor_cost_pct_range":{"min":0.12,"max":0.28},
          "mobilization_cost_eur_range":{"min":200,"max":1800},
          "overhead_cost_pct_range":{"min":0.1,"max":0.25}
        },
        "scope_contract_model":{
          "scope_creep_probability_range":{"min":0.2,"max":0.45},
          "scope_creep_cost_pct_range":{"min":0.05,"max":0.18},
          "change_order_acceptance_rate_range":{"min":0.35,"max":0.7},
          "change_order_margin_pct_range":{"min":0.2,"max":0.4},
          "milestone_billing_enabled":true
        },
        "hidden_defect_model":{
          "hidden_defect_probability_range":{"min":0.08,"max":0.22},
          "defect_detection_sensitivity":0.45,
          "defect_rework_cost_eur_range":{"min":1500,"max":12000},
          "defect_delay_ticks_range":{"min":1,"max":4}
        },
        "quality_warranty_model":{
          "defect_rate_range":{"min":0.03,"max":0.1},
          "warranty_claim_rate_range":{"min":0.02,"max":0.06},
          "warranty_claim_severity_eur_range":{"min":1500,"max":15000}
        },
        "demand_model":{
          "base_demand_weight":0.18,
          "seasonality_key":"spring_renovation_seasonality",
          "price_elasticity":0.32,
          "reputation_sensitivity":0.55
        },
        "requirements":{
          "crew_fte_min":4,
          "site_managers_fte_min":0,
          "project_manager_fte_min":0,
          "compliance_score_min":0.5,
          "reputation_score_min":0.5,
          "contract_discipline_score_min":0.45
        }
      },
      "bathroom_renovation_job_unit":{
        "base_price_eur_range":{"min":7000,"max":35000},
        "gross_margin_pct_range":{"min":0.2,"max":0.38},
        "typical_duration_ticks_range":{"min":2,"max":9},
        "payment_terms_days_range":{"min":30,"max":60},
        "deposit_pct_range":{"min":0.2,"max":0.3},
        "retention_pct_range":{"min":0.04,"max":0.08},
        "cost_model":{
          "labor_hours_per_job_range":{"min":70,"max":360},
          "materials_cost_eur_per_job_range":{"min":2500,"max":16000},
          "subcontractor_cost_pct_range":{"min":0.12,"max":0.28},
          "mobilization_cost_eur_range":{"min":200,"max":1500},
          "overhead_cost_pct_range":{"min":0.1,"max":0.25}
        },
        "scope_contract_model":{
          "scope_creep_probability_range":{"min":0.18,"max":0.4},
          "scope_creep_cost_pct_range":{"min":0.05,"max":0.16},
          "change_order_acceptance_rate_range":{"min":0.35,"max":0.65},
          "change_order_margin_pct_range":{"min":0.18,"max":0.38},
          "milestone_billing_enabled":true
        },
        "hidden_defect_model":{
          "hidden_defect_probability_range":{"min":0.1,"max":0.28},
          "defect_detection_sensitivity":0.5,
          "defect_rework_cost_eur_range":{"min":1500,"max":15000},
          "defect_delay_ticks_range":{"min":1,"max":5}
        },
        "quality_warranty_model":{
          "defect_rate_range":{"min":0.04,"max":0.12},
          "warranty_claim_rate_range":{"min":0.03,"max":0.08},
          "warranty_claim_severity_eur_range":{"min":2000,"max":20000}
        },
        "demand_model":{
          "base_demand_weight":0.2,
          "seasonality_key":"spring_renovation_seasonality",
          "price_elasticity":0.34,
          "reputation_sensitivity":0.6
        },
        "requirements":{
          "crew_fte_min":4,
          "site_managers_fte_min":0,
          "project_manager_fte_min":0,
          "compliance_score_min":0.5,
          "reputation_score_min":0.45,
          "defect_detection_score_min":0.35
        }
      },
      "whole_home_renovation_job_unit":{
        "base_price_eur_range":{"min":60000,"max":450000},
        "gross_margin_pct_range":{"min":0.18,"max":0.35},
        "typical_duration_ticks_range":{"min":8,"max":30},
        "payment_terms_days_range":{"min":45,"max":90},
        "deposit_pct_range":{"min":0.25,"max":0.35},
        "retention_pct_range":{"min":0.05,"max":0.1},
        "cost_model":{
          "labor_hours_per_job_range":{"min":600,"max":3600},
          "materials_cost_eur_per_job_range":{"min":25000,"max":250000},
          "subcontractor_cost_pct_range":{"min":0.15,"max":0.32},
          "mobilization_cost_eur_range":{"min":2000,"max":20000},
          "overhead_cost_pct_range":{"min":0.12,"max":0.3}
        },
        "scope_contract_model":{
          "scope_creep_probability_range":{"min":0.15,"max":0.35},
          "scope_creep_cost_pct_range":{"min":0.06,"max":0.2},
          "change_order_acceptance_rate_range":{"min":0.3,"max":0.6},
          "change_order_margin_pct_range":{"min":0.18,"max":0.35},
          "milestone_billing_enabled":true
        },
        "hidden_defect_model":{
          "hidden_defect_probability_range":{"min":0.12,"max":0.3},
          "defect_detection_sensitivity":0.55,
          "defect_rework_cost_eur_range":{"min":8000,"max":80000},
          "defect_delay_ticks_range":{"min":2,"max":8}
        },
        "quality_warranty_model":{
          "defect_rate_range":{"min":0.03,"max":0.1},
          "warranty_claim_rate_range":{"min":0.02,"max":0.06},
          "warranty_claim_severity_eur_range":{"min":5000,"max":60000}
        },
        "demand_model":{
          "base_demand_weight":0.1,
          "seasonality_key":"spring_renovation_seasonality",
          "price_elasticity":0.25,
          "reputation_sensitivity":0.7
        },
        "requirements":{
          "crew_fte_min":6,
          "site_managers_fte_min":1,
          "project_manager_fte_min":1,
          "compliance_score_min":0.6,
          "reputation_score_min":0.65,
          "contract_discipline_score_min":0.6,
          "defect_detection_score_min":0.45
        }
      },
      "tenant_turnover_renovation_contract_unit":{
        "base_price_eur_range":{"min":2500,"max":60000},
        "gross_margin_pct_range":{"min":0.15,"max":0.3},
        "typical_duration_ticks_range":{"min":2,"max":8},
        "payment_terms_days_range":{"min":30,"max":60},
        "deposit_pct_range":{"min":0.1,"max":0.2},
        "retention_pct_range":{"min":0.03,"max":0.06},
        "cost_model":{
          "labor_hours_per_job_range":{"min":60,"max":280},
          "materials_cost_eur_per_job_range":{"min":2000,"max":20000},
          "subcontractor_cost_pct_range":{"min":0.12,"max":0.28},
          "mobilization_cost_eur_range":{"min":200,"max":1500},
          "overhead_cost_pct_range":{"min":0.1,"max":0.24}
        },
        "scope_contract_model":{
          "scope_creep_probability_range":{"min":0.08,"max":0.2},
          "scope_creep_cost_pct_range":{"min":0.03,"max":0.1},
          "change_order_acceptance_rate_range":{"min":0.25,"max":0.5},
          "change_order_margin_pct_range":{"min":0.12,"max":0.28},
          "milestone_billing_enabled":true
        },
        "hidden_defect_model":{
          "hidden_defect_probability_range":{"min":0.06,"max":0.18},
          "defect_detection_sensitivity":0.4,
          "defect_rework_cost_eur_range":{"min":1000,"max":12000},
          "defect_delay_ticks_range":{"min":1,"max":4}
        },
        "quality_warranty_model":{
          "defect_rate_range":{"min":0.03,"max":0.08},
          "warranty_claim_rate_range":{"min":0.02,"max":0.05},
          "warranty_claim_severity_eur_range":{"min":1500,"max":15000}
        },
        "demand_model":{
          "base_demand_weight":0.12,
          "seasonality_key":"winter_indoor_project_seasonality",
          "price_elasticity":0.22,
          "reputation_sensitivity":0.75
        },
        "requirements":{
          "crew_fte_min":4,
          "site_managers_fte_min":0,
          "project_manager_fte_min":1,
          "compliance_score_min":0.55,
          "reputation_score_min":0.6,
          "contract_discipline_score_min":0.5
        }
      },
      "insurance_restoration_job_unit":{
        "base_price_eur_range":{"min":5000,"max":120000},
        "gross_margin_pct_range":{"min":0.12,"max":0.28},
        "typical_duration_ticks_range":{"min":3,"max":14},
        "payment_terms_days_range":{"min":45,"max":90},
        "deposit_pct_range":{"min":0.1,"max":0.2},
        "retention_pct_range":{"min":0.04,"max":0.08},
        "cost_model":{
          "labor_hours_per_job_range":{"min":120,"max":900},
          "materials_cost_eur_per_job_range":{"min":4000,"max":60000},
          "subcontractor_cost_pct_range":{"min":0.15,"max":0.35},
          "mobilization_cost_eur_range":{"min":500,"max":5000},
          "overhead_cost_pct_range":{"min":0.12,"max":0.28}
        },
        "scope_contract_model":{
          "scope_creep_probability_range":{"min":0.08,"max":0.2},
          "scope_creep_cost_pct_range":{"min":0.03,"max":0.12},
          "change_order_acceptance_rate_range":{"min":0.2,"max":0.45},
          "change_order_margin_pct_range":{"min":0.1,"max":0.25},
          "milestone_billing_enabled":true
        },
        "hidden_defect_model":{
          "hidden_defect_probability_range":{"min":0.1,"max":0.25},
          "defect_detection_sensitivity":0.5,
          "defect_rework_cost_eur_range":{"min":3000,"max":40000},
          "defect_delay_ticks_range":{"min":1,"max":6}
        },
        "quality_warranty_model":{
          "defect_rate_range":{"min":0.04,"max":0.12},
          "warranty_claim_rate_range":{"min":0.03,"max":0.08},
          "warranty_claim_severity_eur_range":{"min":2500,"max":30000}
        },
        "demand_model":{
          "base_demand_weight":0.1,
          "seasonality_key":"winter_indoor_project_seasonality",
          "price_elasticity":0.18,
          "reputation_sensitivity":0.65
        },
        "requirements":{
          "crew_fte_min":4,
          "site_managers_fte_min":0,
          "project_manager_fte_min":1,
          "compliance_score_min":0.7,
          "reputation_score_min":0.5,
          "documentation_process_enabled":true
        }
      }
    },
    "startingLoadout":{
      "startingCash":120000,
      "assets":[
        {"assetId":"lead_pool_count","count":18},
        {"assetId":"quotes_sent_count","count":0},
        {"assetId":"quotes_capacity_per_tick","count":3},
        {"assetId":"close_rate_base","count":0.28},
        {"assetId":"avg_quote_cycle_ticks","count":2},
        {"assetId":"client_happiness_score","count":0.5},
        {"assetId":"reputation_score","count":0.45},
        {"assetId":"compliance_score","count":0.55},
        {"assetId":"pricing_power_score","count":0.45},
        {"assetId":"contract_discipline_score","count":0.35},
        {"assetId":"design_freeze_compliance","count":0.25},
        {"assetId":"scope_creep_rate","count":0.25},
        {"assetId":"change_order_acceptance_rate","count":0.45},
        {"assetId":"change_order_backlog_value_eur","count":0},
        {"assetId":"labor_hours_capacity_per_tick","count":140},
        {"assetId":"utilization_target","count":0.7},
        {"assetId":"utilization_actual","count":0.5},
        {"assetId":"active_projects_count","count":1},
        {"assetId":"project_queue_count","count":3},
        {"assetId":"schedule_slip_score","count":0.22},
        {"assetId":"hidden_defect_probability","count":0.16},
        {"assetId":"defect_detection_score","count":0.25},
        {"assetId":"rework_backlog_hours","count":0},
        {"assetId":"rework_cost_eur","count":0},
        {"assetId":"mold_rot_claim_probability","count":0.006},
        {"assetId":"materials_inventory_value_eur","count":14000},
        {"assetId":"materials_fill_rate","count":0.72},
        {"assetId":"supplier_lead_time_ticks_min","count":1},
        {"assetId":"supplier_lead_time_ticks_max","count":4},
        {"assetId":"subcontractor_dependency_score","count":0.55},
        {"assetId":"subcontractor_delay_probability","count":0.18},
        {"assetId":"subcontractor_cost_pct","count":0.22},
        {"assetId":"accounts_receivable_eur","count":18000},
        {"assetId":"payment_delay_ticks_min","count":1},
        {"assetId":"payment_delay_ticks_max","count":4},
        {"assetId":"deposit_pct","count":0.2},
        {"assetId":"retention_pct","count":0.05},
        {"assetId":"retention_held_eur","count":0},
        {"assetId":"warranty_reserve_eur","count":3000},
        {"assetId":"documentation_process_enabled","count":0}
      ],
      "staff":[
        {"roleId":"crew_fte","fte":4},
        {"roleId":"site_managers_fte","fte":0},
        {"roleId":"project_managers_fte","fte":0}
      ],
      "unlockedProducts":["small_repair_punchlist_job_unit"]
    },
    "unlockRules":[
      {"productSku":"small_repair_punchlist_job_unit","startingUnlocked":true,"requirements":{}},
      {"productSku":"bathroom_renovation_job_unit","startingUnlocked":false,"requirements":{
        "minCrewFte":4,
        "minReputationScore":0.45,
        "assets":[{"assetId":"materials_inventory_value_eur","minCount":12000}],
        "anyOf":[
          {"minDefectDetectionScore":0.35},
          {"upgrades":["preinspection_hidden_defect_detection"]}
        ]
      }},
      {"productSku":"kitchen_renovation_job_unit","startingUnlocked":false,"requirements":{
        "minCrewFte":4,
        "minReputationScore":0.5,
        "anyOf":[
          {"minContractDisciplineScore":0.45,"maxSubcontractorDependencyScore":0.6},
          {"minContractDisciplineScore":0.45,"upgrades":["preferred_subcontractor_network"]},
          {"upgrades":["contract_discipline_system"],"maxSubcontractorDependencyScore":0.6},
          {"upgrades":["contract_discipline_system","preferred_subcontractor_network"]}
        ]
      }},
      {"productSku":"tenant_turnover_renovation_contract_unit","startingUnlocked":false,"requirements":{
        "upgrades":["property_manager_sales_engine"],
        "minReputationScore":0.6,
        "maxScheduleSlipScore":0.25,
        "anyOf":[
          {"minProjectManagerFte":1},
          {"upgrades":["project_controls_milestone_billing"]}
        ]
      }},
      {"productSku":"insurance_restoration_job_unit","startingUnlocked":false,"requirements":{
        "upgrades":["insurance_documentation_compliance_pack"],
        "minComplianceScore":0.7,
        "assets":[
          {"assetId":"documentation_process_enabled","minCount":1},
          {"assetId":"warranty_reserve_eur","minCount":6000}
        ]
      }},
      {"productSku":"whole_home_renovation_job_unit","startingUnlocked":false,"requirements":{
        "upgrades":["project_controls_milestone_billing"],
        "minProjectManagerFte":1,
        "minSiteManagersFte":1,
        "minContractDisciplineScore":0.6,
        "minDefectDetectionScore":0.45,
        "minReputationScore":0.65
      }}
    ]
  }$$::jsonb
from sector
on conflict (sector_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;

-- Renovation products
with niche as (
  select id from public.niches where code = 'BUILD_RENOVATION'
),
product_seed as (
  select * from (values
    ('small_repair_punchlist_job_unit', 'Small Repair & Punch List', 'unit', 300, 2500, 55, 75, 'crew_fte', 'Small punch-list repairs.'),
    ('kitchen_renovation_job_unit', 'Kitchen Renovation', 'unit', 8000, 45000, 60, 80, 'crew_fte', 'Kitchen renovation projects.'),
    ('bathroom_renovation_job_unit', 'Bathroom Renovation', 'unit', 7000, 35000, 60, 80, 'crew_fte', 'Bathroom renovation projects.'),
    ('whole_home_renovation_job_unit', 'Whole-Home Renovation', 'unit', 60000, 450000, 65, 85, 'crew_fte', 'Whole-home renovation projects.'),
    ('tenant_turnover_renovation_contract_unit', 'Tenant Turnover Renovation Contract', 'unit', 2500, 60000, 65, 85, 'project_managers_fte', 'Tenant turnover renovation contracts.'),
    ('insurance_restoration_job_unit', 'Insurance Restoration Job', 'unit', 5000, 120000, 70, 88, 'project_managers_fte', 'Insurance restoration jobs.')
  ) as t(sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)
)
delete from public.niche_products
where niche_id in (select id from niche);

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

-- Renovation upgrades
with niche as (
  select id from public.niches where code = 'BUILD_RENOVATION'
),
upgrade_seed as (
  select * from (values
    (
      'contract_discipline_system',
      'CONTRACTS',
      'Contract Discipline System (Deposits + Change Orders)',
      'Improves discipline and monetizes change orders.',
      1,
      0,
      1,
      '[{"key":"contract_discipline_score","op":"add","range":[0.1,0.3]},{"key":"change_order_acceptance_rate","op":"add","range":[0.05,0.2]},{"key":"scope_creep_rate_modifier","op":"mul","range":[0.8,0.95]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..15000',
      'admin_pct 0.2..0.8%',
      1,
      1,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["close_rate_penalty","client_pushback"]}'::jsonb
    ),
    (
      'preinspection_hidden_defect_detection',
      'INSPECT',
      'Pre-Inspection & Hidden Defect Detection Kit',
      'Improves defect detection and reduces surprise rework.',
      2,
      0,
      2,
      '[{"key":"defect_detection_score","op":"add","range":[0.15,0.4]},{"key":"hidden_defect_probability_modifier","op":"mul","range":[0.75,0.9]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 500..18000',
      'inspection_tools_pct 0.2..0.6%',
      1,
      4,
      '{"failureChancePctRange":[9,16],"variancePctRange":[6,12],"failureEffects":["quote_cycle_slowdown","inspection_time_drag"]}'::jsonb
    ),
    (
      'project_controls_milestone_billing',
      'CONTROLS',
      'Project Controls & Milestone Billing Toolkit',
      'Reduces slip and improves billing cadence.',
      2,
      0,
      4,
      '[{"key":"schedule_slip_score","op":"add","range":[-0.25,-0.1]},{"key":"payment_delay_ticks_modifier","op":"mul","range":[0.85,0.95]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..40000',
      'monthlyFixed 150..2000',
      2,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["implementation_dip_ticks 1..1","process_overhead"]}'::jsonb
    ),
    (
      'supplier_framework_fixtures',
      'SUPPLY',
      'Supplier Framework (Fixtures/Cabinets/Tiles)',
      'Improves materials availability and lead times.',
      2,
      0,
      4,
      '[{"key":"materials_fill_rate","op":"add","range":[0.05,0.2]},{"key":"supplier_lead_time_ticks_modifier","op":"mul","range":[0.75,0.9]},{"key":"materials_inventory_value_eur","op":"add","range":[5000,20000]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..35000',
      'inventory_carry_pct 0.4..1.2%',
      2,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["cash_tied_up","overstock_waste"]}'::jsonb
    ),
    (
      'preferred_subcontractor_network',
      'SUBS',
      'Preferred Subcontractor Network (Plumbing/Electrical)',
      'Reduces delay risk with preferred partners.',
      2,
      0,
      3,
      '[{"key":"subcontractor_delay_probability","op":"add","range":[-0.2,-0.05]},{"key":"subcontractor_cost_pct","op":"add","range":[0.02,0.06]},{"key":"subcontractor_dependency_score","op":"add","range":[-0.12,-0.04]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 1000..25000',
      'subcontractor_premium_pct 0.5..1.5%',
      2,
      5,
      '{"failureChancePctRange":[9,16],"variancePctRange":[6,12],"failureEffects":["cost_pressure","subs_capacity_risk"]}'::jsonb
    ),
    (
      'design_freeze_client_signoff',
      'DESIGN',
      'Design Freeze & Client Sign-Off Process',
      'Reduces scope creep via signed design freeze.',
      1,
      0,
      1,
      '[{"key":"design_freeze_compliance","op":"add","range":[0.15,0.35]},{"key":"scope_creep_rate_modifier","op":"mul","range":[0.75,0.9]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..8000',
      'admin_pct 0.1..0.6%',
      1,
      1,
      '{"failureChancePctRange":[8,14],"variancePctRange":[5,10],"failureEffects":["client_happiness_dip","close_rate_drag"]}'::jsonb
    ),
    (
      'portfolio_marketing_engine',
      'MARKETING',
      'Portfolio Marketing (Before/After Engine)',
      'Improves pricing power and lead inflow.',
      2,
      0,
      4,
      '[{"key":"lead_pool_count","op":"add","range":[4,12]},{"key":"pricing_power_score","op":"add","range":[0.05,0.25]},{"key":"close_rate_base","op":"add","range":[0.02,0.1]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 1000..40000',
      'monthlyFixed 150..3000',
      2,
      6,
      '{"failureChancePctRange":[9,16],"variancePctRange":[6,12],"failureEffects":["reputation_event_if_defects","marketing_overpromise"]}'::jsonb
    ),
    (
      'quality_punch_warranty_system',
      'QUALITY',
      'Quality Punch & Warranty System',
      'Reduces defects and warranty exposure.',
      1,
      0,
      1,
      '[{"key":"defect_rate_modifier","op":"mul","range":[0.65,0.9]},{"key":"warranty_claim_rate_modifier","op":"mul","range":[0.7,0.9]},{"key":"reputation_score","op":"add","range":[0.02,0.06]},{"key":"labor_hours_capacity_per_tick","op":"add","range":[-8,-3]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 0..20000',
      'quality_admin_pct 0.2..0.8%',
      1,
      1,
      '{"failureChancePctRange":[8,14],"variancePctRange":[5,10],"failureEffects":["punch_list_overhead","throughput_dip"]}'::jsonb
    ),
    (
      'property_manager_sales_engine',
      'SALES',
      'Property Manager Sales Engine (Tenant Turnover)',
      'Unlocks tenant turnover contracts.',
      3,
      0,
      4,
      '[{"key":"lead_pool_count","op":"add","range":[3,10]},{"key":"unlock_products","op":"set","value":["tenant_turnover_renovation_contract_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 2000..60000',
      'monthlyFixed 200..4000',
      2,
      6,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["sla_penalties","reputation_drop_if_slip_high"]}'::jsonb
    ),
    (
      'insurance_documentation_compliance_pack',
      'INSURANCE',
      'Insurance Documentation & Compliance Pack',
      'Unlocks insurance restoration work with compliance lift.',
      3,
      0,
      6,
      '[{"key":"documentation_process_enabled","op":"set","value":true},{"key":"compliance_score","op":"add","range":[0.1,0.25]},{"key":"unlock_products","op":"set","value":["insurance_restoration_job_unit"]}]'::jsonb,
      null,
      null,
      null,
      null,
      'capex 3000..70000',
      'monthlyFixed 200..3000',
      3,
      8,
      '{"failureChancePctRange":[10,18],"variancePctRange":[6,12],"failureEffects":["admin_overhead","utilization_dip_if_staffing_low"]}'::jsonb
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
  upgrade_seed.capex_pct_min,
  upgrade_seed.capex_pct_max,
  upgrade_seed.opex_pct_min,
  upgrade_seed.opex_pct_max,
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
select count(*) as commercial_build_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'BUILD_COMMERCIAL';

select
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and (config->'startingLoadout'->'unlockedProducts'->>0) = 'maintenance_repair_retain_unit' as only_maintenance_unlocked
from public.niches
where code = 'BUILD_COMMERCIAL';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "design_build_contract_unit" && @.requirements.upgrades ? (@ == ["design_coordination_capability"]))'
) as design_build_upgrade_gate
from public.niches
where code = 'BUILD_COMMERCIAL';

select jsonb_path_exists(
  config,
  '$.projectModels.* ? (@.retention_pct_range.min >= 0.05 && @.retention_pct_range.max <= 0.10)'
) as retention_range_ok
from public.niches
where code = 'BUILD_COMMERCIAL';

select jsonb_path_exists(
  config,
  '$.projectModels.* ? (@.payment_terms_days_range.max >= 30)'
) as payment_terms_delay_ok
from public.niches
where code = 'BUILD_COMMERCIAL';

select count(*) as electrical_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'BUILD_ELECTRICAL';

select
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and (config->'startingLoadout'->'unlockedProducts'->>0) = 'residential_wiring_job_unit' as only_residential_unlocked
from public.niches
where code = 'BUILD_ELECTRICAL';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "industrial_panel_upgrade_job_unit" && @.requirements.upgrades ? (@ == ["testing_commissioning_tools"]) && @.requirements.minCertificationLevel >= 2 && @.requirements.minComplianceScore >= 0.7)'
) as industrial_unlock_gate
from public.niches
where code = 'BUILD_ELECTRICAL';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "annual_maintenance_contract_unit" && @.requirements.upgrades ? (@ == ["scheduling_software_dispatch"]) && @.requirements.minInspectionPassRate >= 0.9)'
) as maintenance_unlock_gate
from public.niches
where code = 'BUILD_ELECTRICAL';

select count(*) as engineering_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'BUILD_ENGINEERING';

select
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and (config->'startingLoadout'->'unlockedProducts'->>0) = 'permitting_and_code_review_unit' as only_permitting_unlocked
from public.niches
where code = 'BUILD_ENGINEERING';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "bim_coordination_service_unit" && @.requirements.upgrades ? (@ == ["software_stack_cad_bim"]) && @.requirements.minBimSpecialistFte >= 1)'
) as bim_unlock_gate
from public.niches
where code = 'BUILD_ENGINEERING';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "owner_rep_project_management_unit" && @.requirements.upgrades ? (@ == ["governance_reporting_process"]) && @.requirements.minComplianceScore >= 0.7 && @.requirements.minReputationScore >= 0.65)'
) as owner_rep_unlock_gate
from public.niches
where code = 'BUILD_ENGINEERING';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "structural_design_package_unit" && @.requirements.upgrades ? (@ == ["qa_baseline_checklist"]) && @.requirements.minSeniorEngineersFte >= 1)'
) as structural_unlock_gate
from public.niches
where code = 'BUILD_ENGINEERING';

select jsonb_path_exists(
  config,
  '$.projectModels.* ? (@.pricing_model.model_type == "tm_hourly")'
) as engineering_has_tm_model
from public.niches
where code = 'BUILD_ENGINEERING';

select count(*) as plumbing_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'BUILD_PLUMBING';

select
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and (config->'startingLoadout'->'unlockedProducts'->>0) = 'residential_repair_visit_job_unit' as only_residential_plumbing_unlocked
from public.niches
where code = 'BUILD_PLUMBING';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "emergency_leak_callout_job_unit" && @.requirements.anyOf[*].upgrades ? (@ == ["on_call_rotation_setup"]))'
) as emergency_unlock_gate
from public.niches
where code = 'BUILD_PLUMBING';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "bathroom_installation_job_unit" && @.requirements.upgrades ? (@ == ["quality_checklist_pressure_testing"]) && @.requirements.minMasterPlumberFte >= 1)'
) as bathroom_unlock_gate
from public.niches
where code = 'BUILD_PLUMBING';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "commercial_fitout_plumbing_job_unit" && @.requirements.upgrades ? (@ == ["project_controls_system"]) && @.requirements.minComplianceScore >= 0.7)'
) as commercial_unlock_gate
from public.niches
where code = 'BUILD_PLUMBING';

select count(*) as renovation_product_count
from public.niche_products p
join public.niches n on n.id = p.niche_id
where n.code = 'BUILD_RENOVATION';

select
  jsonb_array_length(config->'startingLoadout'->'unlockedProducts') = 1
  and (config->'startingLoadout'->'unlockedProducts'->>0) = 'small_repair_punchlist_job_unit' as only_small_repair_unlocked
from public.niches
where code = 'BUILD_RENOVATION';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "whole_home_renovation_job_unit" && @.requirements.upgrades ? (@ == ["project_controls_milestone_billing"]) && @.requirements.minProjectManagerFte >= 1 && @.requirements.minSiteManagersFte >= 1 && @.requirements.minContractDisciplineScore >= 0.6 && @.requirements.minDefectDetectionScore >= 0.45)'
) as whole_home_unlock_gate
from public.niches
where code = 'BUILD_RENOVATION';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "insurance_restoration_job_unit" && @.requirements.upgrades ? (@ == ["insurance_documentation_compliance_pack"]) && @.requirements.minComplianceScore >= 0.7 && @.requirements.assets ? (@[*].assetId == "documentation_process_enabled"))'
) as insurance_unlock_gate
from public.niches
where code = 'BUILD_RENOVATION';

select jsonb_path_exists(
  config,
  '$.unlockRules[*] ? (@.productSku == "tenant_turnover_renovation_contract_unit" && @.requirements.upgrades ? (@ == ["property_manager_sales_engine"]) && @.requirements.maxScheduleSlipScore <= 0.25)'
) as tenant_turnover_unlock_gate
from public.niches
where code = 'BUILD_RENOVATION';
