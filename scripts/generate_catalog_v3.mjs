
import fs from "fs";
import path from "path";
import crypto from "crypto";

const INPUT_PATH = path.join(process.cwd(), "docs", "niche-catalog.md");
const OUTPUT_JSON = path.join(process.cwd(), "catalog_v3.json");
const OUTPUT_SQL = path.join(process.cwd(), "schema_and_seed_v3.sql");

const raw = fs.readFileSync(INPUT_PATH, "utf8");

const UPGRADE_TEMPLATES = {
  T1: {
    capex_pct_of_startup_cost: [0.03, 0.08],
    opex_pct_of_monthly_revenue: [0.002, 0.008],
    delayWeeks: [2, 6],
  },
  T2: {
    capex_pct_of_startup_cost: [0.08, 0.18],
    opex_pct_of_monthly_revenue: [0.006, 0.015],
    delayWeeks: [4, 10],
  },
  T3: {
    capex_pct_of_startup_cost: [0.18, 0.35],
    opex_pct_of_monthly_revenue: [0.01, 0.025],
    delayWeeks: [8, 18],
  },
};

const UPGRADE_PROFILES = {
  DIGITAL: {
    branches: [
      {
        branch_code: "AUTOMATION",
        name: "Automation",
        description: "Reduce admin time and errors while boosting throughput.",
        effects: [
          { variable: "errorRate", op: "mul", range: [0.82, 0.95] },
          { variable: "capacity", op: "mul", range: [1.04, 1.15] },
        ],
        risk_notes: "Implementation risk and scope creep.",
      },
      {
        branch_code: "GROWTH",
        name: "Growth",
        description: "Grow leads and improve conversion over time.",
        effects: [
          { variable: "conversionRate", op: "mul", range: [1.03, 1.12] },
          { variable: "reputation", op: "add", range: [1, 10] },
        ],
        risk_notes: "Spend without consistent results.",
      },
      {
        branch_code: "PRODUCT",
        name: "Product",
        description: "Improve retention, reduce churn, and lower support load.",
        effects: [
          { variable: "churnRate", op: "mul", range: [0.8, 0.97] },
          { variable: "supportTicketsPerCustomer", op: "mul", range: [0.82, 0.96] },
        ],
        risk_notes: "Polish without PMF yields limited impact.",
      },
    ],
  },
  INDUSTRIAL: {
    branches: [
      {
        branch_code: "EFFICIENCY",
        name: "Efficiency",
        description: "Reduce waste and improve output per asset.",
        effects: [
          { variable: "unitCost", op: "mul", range: [0.9, 0.98] },
          { variable: "capacity", op: "mul", range: [1.03, 1.12] },
        ],
        risk_notes: "Downtime during implementation.",
      },
      {
        branch_code: "SAFETY",
        name: "Safety",
        description: "Lower incidents, fines, and insurance costs.",
        effects: [
          { variable: "incidentRate", op: "mul", range: [0.65, 0.9] },
          { variable: "insuranceCost", op: "mul", range: [0.92, 0.98] },
        ],
        risk_notes: "Training time reduces short-term capacity.",
      },
      {
        branch_code: "THROUGHPUT",
        name: "Throughput",
        description: "Scale with additional capacity and assets.",
        effects: [
          { variable: "capacity", op: "mul", range: [1.05, 1.3] },
          { variable: "fixedCosts", op: "mul", range: [1.02, 1.1] },
        ],
        risk_notes: "Overcapacity can reduce utilization.",
      },
    ],
  },
  REGULATED: {
    branches: [
      {
        branch_code: "COMPLIANCE",
        name: "Compliance",
        description: "Improve audit readiness and unlock larger clients.",
        effects: [
          { variable: "fineChance", op: "mul", range: [0.4, 0.8] },
          { variable: "enterpriseDealsUnlocked", op: "set", range: [0, 1] },
        ],
        risk_notes: "Audit failure risks reputation and extra costs.",
      },
      {
        branch_code: "COST_CONTROL",
        name: "Cost Control",
        description: "Reduce leakage and improve process efficiency.",
        effects: [
          { variable: "opex", op: "mul", range: [0.94, 0.99] },
          { variable: "errorRate", op: "mul", range: [0.88, 0.97] },
        ],
        risk_notes: "Change resistance slows delivery.",
      },
      {
        branch_code: "RELIABILITY",
        name: "Reliability",
        description: "Improve uptime, service levels, and reputation.",
        effects: [
          { variable: "downtimeRate", op: "mul", range: [0.5, 0.9] },
          { variable: "reputation", op: "add", range: [1, 8] },
        ],
        risk_notes: "Heavy capex with longer payback.",
      },
    ],
  },
  SERVICE: {
    branches: [
      {
        branch_code: "EXPERIENCE",
        name: "Experience",
        description: "Increase ticket size and repeat rate.",
        effects: [
          { variable: "avgTicket", op: "mul", range: [1.02, 1.12] },
          { variable: "repeatRate", op: "mul", range: [1.03, 1.15] },
        ],
        risk_notes: "Experience needs marketing to translate into demand.",
      },
      {
        branch_code: "LOCAL_MARKETING",
        name: "Local Marketing",
        description: "Lift foot traffic and local demand.",
        effects: [
          { variable: "baseDemand", op: "mul", range: [1.02, 1.1] },
          { variable: "reputation", op: "add", range: [1, 6] },
        ],
        risk_notes: "Competitive responses reduce lift.",
      },
      {
        branch_code: "PROCESS",
        name: "Process",
        description: "Reduce errors and improve throughput.",
        effects: [
          { variable: "capacity", op: "mul", range: [1.03, 1.12] },
          { variable: "errorRate", op: "mul", range: [0.85, 0.96] },
        ],
        risk_notes: "Training time causes temporary dips.",
      },
    ],
  },
};

const PRODUCT_TEMPLATES = {
  AGRI: {
    "Crop Farm": [
      p("Wheat / grain sale", "per_ton", 180, 320, "bulk commodity"),
      p("Vegetables bulk", "per_ton", 300, 900, "seasonal yield"),
      p("Forward contract hedge", "per_project", 500, 5000, "risk hedge fee"),
    ],
    Dairy: [
      p("Raw milk", "per_unit", 0.35, 0.6, "raw milk supply"),
      p("Cheese value add", "per_unit", 6, 18, "processed dairy"),
      p("Veterinary compliance package", "per_month", 500, 4000, "regulatory costs", [85, 98]),
    ],
    "Food Processing": [
      p("Private label batch", "per_batch", 5000, 80000, "contract manufacturing"),
      p("Packaging contract", "per_batch", 2000, 20000, "10k unit runs"),
      p("QA lab testing", "per_unit", 80, 350, "quality testing"),
    ],
    Greenhouse: [
      p("Tomatoes and peppers", "per_unit", 1.2, 3.5, "fresh produce"),
      p("Specialty greens", "per_unit", 2, 7, "premium crops"),
      p("Energy optimization service", "per_month", 1000, 15000, "energy cost control", [85, 98]),
    ],
    Livestock: [
      p("Meat sale", "per_unit", 3, 9, "processed meat"),
      p("Feed contract", "per_ton", 250, 450, "input cost", [88, 98]),
      p("Breeding stock sale", "per_unit", 200, 1500, "breeding stock"),
    ],
    Organic: [
      p("Organic premium produce", "per_unit", 2, 6, "organic crops"),
      p("CSA subscription box", "per_month", 25, 90, "community supported"),
      p("Farmers market stall", "per_day", 80, 400, "local sales"),
    ],
  },
  AUTO: {
    "Car Dealer": [
      p("Used car sale", "per_unit", 8000, 35000, "vehicle sale"),
      p("Financing commission", "per_project", 200, 1500, "finance fee"),
      p("Service plan", "per_month", 20, 100, "service coverage"),
    ],
    "Car Wash": [
      p("Basic wash", "per_order", 8, 15, "standard wash"),
      p("Premium wash", "per_order", 15, 30, "add-on services"),
      p("Monthly pass", "per_month", 20, 60, "subscription pass"),
    ],
    "EV Services": [
      p("Charger installation", "per_project", 900, 2500, "home install"),
      p("Maintenance contract", "per_month", 50, 250, "service plan"),
      p("Public charging margin", "per_unit", 0.05, 0.25, "per kWh margin"),
      p("Fleet charging install", "per_project", 5000, 40000, "fleet projects"),
    ],
    Mobility: [
      p("Subscription", "per_month", 40, 800, "vehicle access"),
      p("Per ride", "per_order", 1.5, 20, "usage fare"),
      p("Unlock fee", "per_order", 0.5, 3, "unlock charge"),
    ],
    "Parts & Tires": [
      p("Tire set and install", "per_unit", 250, 1200, "tire package"),
      p("Oil change", "per_order", 80, 180, "service job"),
      p("Brake pad replacement", "per_order", 120, 400, "repair job"),
    ],
    "Repair Shop": [
      p("Labor", "per_hour", 60, 120, "shop labor"),
      p("Diagnostics", "per_order", 40, 150, "vehicle check"),
      p("Parts markup", "per_order", 50, 300, "parts margin"),
    ],
  },
  BUILD: {
    "Commercial Build": [
      p("Project contract", "per_project", 250000, 10000000, "build contract"),
      p("Change order", "per_project", 2000, 200000, "scope change"),
      p("Site management fee", "per_month", 2000, 25000, "site ops"),
    ],
    Electrical: [
      p("Hourly work", "per_hour", 45, 85, "labor"),
      p("Residential install", "per_project", 300, 3000, "home install"),
      p("Panel upgrade", "per_project", 800, 6000, "panel upgrade"),
    ],
    Engineering: [
      p("Design package", "per_project", 10000, 250000, "design scope"),
      p("Retainer", "per_month", 2000, 25000, "retainer"),
      p("Site supervision", "per_day", 600, 1500, "supervision"),
    ],
    "New Builds": [
      p("Build contract", "per_unit", 200000, 700000, "new build"),
      p("Customization upgrade", "per_project", 5000, 80000, "upgrade work"),
      p("Permit handling", "per_project", 1000, 15000, "permit support"),
    ],
    Plumbing: [
      p("Callout and fix", "per_order", 120, 600, "service call"),
      p("Bathroom install", "per_project", 3000, 25000, "install work"),
      p("Boiler service", "per_project", 150, 600, "boiler service"),
    ],
    Renovation: [
      p("Renovation project", "per_project", 15000, 250000, "renovation work"),
      p("Design consultation", "per_project", 1000, 15000, "design consult"),
      p("Project management fee", "per_month", 1000, 10000, "project ops"),
    ],
  },
  ECOM: {
    "Digital Products": [
      p("Course or asset pack", "per_unit", 19, 299, "digital goods"),
      p("Membership", "per_month", 9, 49, "recurring access"),
      p("Premium coaching", "per_hour", 50, 200, "expert support"),
    ],
    "DTC Brand": [
      p("Main product", "per_order", 25, 120, "core product"),
      p("Upsell bundle", "per_order", 60, 220, "bundle upsell"),
      p("Subscription reorder", "per_month", 20, 80, "repeat orders"),
    ],
    "Import Arbitrage": [
      p("Marketplace unit", "per_unit", 15, 80, "unit sale"),
      p("Bundle pack", "per_order", 30, 120, "bundle sale"),
      p("Return handling fee", "per_order", 2, 10, "return cost", [85, 98]),
    ],
    "Marketplace Seller": [
      p("Unit sale", "per_unit", 12, 60, "marketplace unit"),
      p("FBA or fulfillment fee", "per_unit", 2, 8, "fulfillment cost", [85, 98]),
      p("Sponsored listing", "per_day", 10, 100, "ad spend", [85, 98]),
    ],
    "Quick Commerce": [
      p("Basket", "per_order", 15, 60, "grocery basket"),
      p("Delivery fee", "per_order", 0, 6, "delivery fee"),
      p("Priority delivery", "per_order", 2, 8, "priority fee"),
    ],
    "Subscription Box": [
      p("Box plan", "per_month", 20, 60, "monthly box"),
      p("Gift box", "per_order", 30, 90, "gift purchase"),
      p("Add-on item", "per_unit", 5, 25, "extra items"),
    ],
  },
  TECH: {
    "IT Agency": [
      p("Dev day rate", "per_day", 600, 1200, "day rate"),
      p("Project", "per_project", 10000, 250000, "project work"),
      p("Support retainer", "per_month", 500, 8000, "support"),
    ],
    "Managed Services": [
      p("MSP contract", "per_month", 50, 200, "per seat"),
      p("Incident response", "per_hour", 90, 180, "response"),
      p("Security monitoring add-on", "per_month", 200, 1500, "monitoring"),
    ],
    "Mobile Apps": [
      p("Build project", "per_project", 25000, 400000, "app build"),
      p("Maintenance", "per_month", 500, 8000, "app upkeep"),
      p("App store optimization", "per_month", 300, 3000, "growth work"),
    ],
    SaaS: [
      p("SMB plan", "per_month", 19, 199, "subscription"),
      p("Mid market plan", "per_month", 200, 2000, "subscription"),
      p("Per seat add-on", "per_month", 5, 35, "seat fee"),
    ],
    "Data & AI": [
      p("Pilot", "per_project", 20000, 300000, "pilot project"),
      p("API usage", "per_unit", 0.5, 15, "per 1k calls"),
      p("Model hosting", "per_month", 1000, 15000, "hosting"),
    ],
    Cybersecurity: [
      p("Security audit", "per_project", 5000, 80000, "audit"),
      p("SOC subscription", "per_month", 2000, 25000, "SOC"),
      p("Pen test", "per_project", 3000, 60000, "penetration test"),
    ],
  },
  LOGI: {
    Trucking: [
      p("Linehaul", "per_km", 1.2, 2.2, "linehaul rate"),
      p("Fuel surcharge", "per_km", 0.1, 0.4, "fuel index"),
      p("Wait time", "per_hour", 30, 80, "detention"),
    ],
    "Freight Forwarding": [
      p("Shipment handling fee", "per_order", 50, 400, "handling"),
      p("Documentation fee", "per_order", 20, 120, "documentation"),
      p("Freight percent fee", "percent", 1, 5, "percent of freight"),
    ],
    "Last Mile": [
      p("Delivery", "per_order", 3, 9, "delivery"),
      p("Same day premium", "per_order", 6, 15, "premium fee"),
      p("Return pickup", "per_order", 2, 6, "returns"),
    ],
    Warehousing: [
      p("Storage", "per_unit", 2, 10, "per pallet per week"),
      p("Pick and pack", "per_order", 1, 5, "fulfillment"),
      p("Inbound handling", "per_unit", 1, 4, "inbound pallets"),
    ],
    "Cold Chain": [
      p("Cold storage", "per_unit", 5, 20, "per pallet per week"),
      p("Reefer transport", "per_km", 1.6, 3.0, "reefer km"),
      p("Temperature monitoring", "per_order", 20, 80, "monitoring"),
    ],
    "Port Services": [
      p("Handling fee", "per_unit", 80, 400, "container handling"),
      p("Storage or demurrage", "per_day", 20, 150, "demurrage"),
      p("Pilotage or tug service", "per_project", 500, 3000, "port services"),
    ],
  },
  HORECA: {
    Cafe: [
      p("Coffee", "per_unit", 2.5, 4.5, "coffee item"),
      p("Lunch ticket", "per_order", 10, 18, "lunch sale"),
      p("Pastry", "per_unit", 2, 6, "pastry"),
    ],
    "Casual Restaurant": [
      p("Average check", "per_order", 18, 35, "dine in"),
      p("Delivery order", "per_order", 15, 35, "delivery"),
      p("Drinks upsell", "per_order", 4, 12, "beverage"),
    ],
    "Dark Kitchen": [
      p("Meal", "per_order", 12, 25, "meal order"),
      p("Family bundle", "per_order", 22, 45, "bundle"),
      p("Delivery fee", "per_order", 2, 6, "delivery"),
    ],
    "Fine Dining": [
      p("Tasting menu", "per_order", 90, 250, "tasting menu"),
      p("Wine pairing", "per_order", 45, 150, "pairing"),
      p("Chef table", "per_order", 150, 400, "chef table"),
    ],
    "Food Truck": [
      p("Meal", "per_order", 8, 16, "meal"),
      p("Combo meal", "per_order", 10, 22, "combo"),
      p("Event catering", "per_day", 500, 2500, "event service"),
    ],
    Hotel: [
      p("Room night ADR", "per_night", 80, 220, "room night"),
      p("Events", "per_project", 1000, 50000, "events"),
      p("Breakfast add-on", "per_order", 8, 20, "breakfast"),
    ],
  },
  FIN: {
    Accounting: [
      p("Bookkeeping", "per_month", 150, 1500, "bookkeeping"),
      p("Annual accounts", "per_project", 800, 5000, "filing"),
      p("Payroll run", "per_month", 100, 600, "payroll"),
    ],
    Consulting: [
      p("Day rate", "per_day", 800, 2000, "consulting day"),
      p("Retainer", "per_month", 2000, 30000, "retainer"),
      p("Workshop", "per_day", 1500, 5000, "workshop"),
    ],
    Insurance: [
      p("Policy premium", "per_month", 20, 220, "policy premium"),
      p("Broker commission", "percent", 5, 20, "commission"),
      p("Claims handling fee", "per_order", 50, 300, "claims fee"),
    ],
    Legal: [
      p("Hourly", "per_hour", 150, 350, "legal hours"),
      p("Case fee", "per_project", 2000, 50000, "case fee"),
      p("Contract review", "per_project", 500, 4000, "review"),
    ],
    Lending: [
      p("Servicing fee", "per_month", 20, 200, "servicing"),
      p("Origination fee", "percent", 0.5, 3, "origination"),
      p("Interest spread", "percent", 1, 8, "spread"),
    ],
    Payments: [
      p("Fixed fee", "per_order", 0.05, 0.3, "per transaction fee"),
      p("Processing fee", "percent", 0.8, 2.9, "processing fee"),
      p("Chargeback handling", "per_order", 10, 50, "chargeback"),
    ],
  },
  RECY: {
    Collection: [
      p("Commercial bin service", "per_order", 40, 180, "pickup service"),
      p("Contract", "per_month", 200, 2000, "monthly contract"),
      p("Overage fee", "per_ton", 30, 120, "overage"),
    ],
    "Sorting Facility": [
      p("Gate fee", "per_ton", 40, 180, "gate fee"),
      p("Baled material sale", "per_ton", 20, 250, "baled sale"),
      p("Contamination surcharge", "per_ton", 10, 60, "contamination"),
    ],
    "Metal Recycling": [
      p("Scrap purchase", "per_ton", 120, 350, "scrap purchase", [90, 99]),
      p("Scrap sale", "per_ton", 150, 450, "scrap sale"),
      p("Processing fee", "per_ton", 20, 80, "processing"),
    ],
    "E-Waste": [
      p("Secure destruction", "per_unit", 5, 40, "secure destruction"),
      p("Pickup service", "per_order", 80, 250, "pickup"),
      p("Data wipe certificate", "per_unit", 3, 12, "certification"),
    ],
    "Organic Waste": [
      p("Collection", "per_ton", 30, 120, "collection"),
      p("Compost sale", "per_ton", 10, 60, "compost sale"),
      p("Bin rental", "per_month", 50, 200, "bin rental"),
    ],
    "C&D Waste": [
      p("Skip or container", "per_order", 150, 600, "haulage"),
      p("Tipping", "per_ton", 30, 150, "tipping"),
      p("Recycling surcharge", "per_ton", 20, 80, "recycling"),
    ],
  },
  RETAIL: {
    Grocery: [
      p("Basket size", "per_order", 10, 45, "checkout basket"),
      p("Fresh produce", "per_unit", 1, 6, "fresh items"),
      p("Delivery fee", "per_order", 3, 8, "delivery"),
    ],
    "Fashion Store": [
      p("AOV", "per_order", 35, 140, "average order"),
      p("Accessory upsell", "per_order", 10, 60, "upsell"),
      p("Returns fee", "per_order", 2, 10, "returns"),
    ],
    Electronics: [
      p("AOV", "per_order", 80, 450, "average order"),
      p("Extended warranty", "per_unit", 20, 150, "warranty"),
      p("Accessories", "per_order", 15, 80, "accessories"),
    ],
    "Home & DIY": [
      p("AOV", "per_order", 25, 180, "average order"),
      p("Tool rental", "per_day", 20, 80, "tool rental"),
      p("Delivery fee", "per_order", 5, 30, "delivery"),
    ],
    "Luxury Boutique": [
      p("AOV", "per_order", 250, 2500, "average order"),
      p("Personal styling", "per_hour", 50, 200, "styling"),
      p("Alterations", "per_order", 20, 150, "alterations"),
    ],
    Pharmacy: [
      p("OTC basket", "per_order", 8, 35, "over the counter"),
      p("Prescription service fee", "per_unit", 1, 6, "prescription"),
      p("Health screening", "per_order", 10, 40, "screening"),
    ],
  },
  ENER: {
    "Electric Utility": [
      p("Utility bill", "per_month", 40, 180, "customer bill"),
      p("Grid services", "per_month", 1000, 50000, "per MW month"),
      p("Maintenance plan", "percent", 1, 5, "percent of capex"),
      p("Connection fee", "per_project", 500, 5000, "connections"),
    ],
    "Energy Efficiency": [
      p("Efficiency retrofit", "per_project", 5000, 200000, "retrofit project"),
      p("Energy audit", "per_project", 500, 5000, "audit"),
      p("Performance maintenance", "per_month", 200, 2000, "maintenance"),
    ],
    "Energy Trading": [
      p("Trading fee", "per_order", 50, 500, "trade fee"),
      p("Risk management service", "per_month", 1000, 10000, "risk management"),
      p("Market data access", "per_month", 200, 2000, "data access"),
    ],
    "Gas & Heat": [
      p("Utility bill", "per_month", 30, 140, "customer bill"),
      p("Connection install", "per_project", 500, 8000, "connection"),
      p("Maintenance plan", "per_month", 100, 800, "maintenance"),
    ],
    "Grid Services": [
      p("Capacity availability", "per_month", 2000, 40000, "per MW month"),
      p("Ancillary services", "per_project", 5000, 100000, "ancillary"),
      p("Asset maintenance", "percent", 1, 5, "percent of capex"),
    ],
    Renewables: [
      p("Power contract", "per_unit", 30, 120, "per MWh"),
      p("Renewable certificate", "per_unit", 5, 30, "certificate"),
      p("O&M service", "per_month", 1000, 20000, "O&M"),
    ],
  },
  HEAL: {
    Clinic: [
      p("Clinic consult", "per_order", 60, 180, "consult"),
      p("Lab test", "per_unit", 20, 120, "lab test"),
      p("Procedure", "per_project", 200, 2000, "procedure"),
    ],
    Dental: [
      p("Dental procedure", "per_project", 80, 2500, "procedure"),
      p("Hygiene visit", "per_order", 60, 120, "hygiene"),
      p("Orthodontics plan", "per_month", 80, 300, "ortho plan"),
    ],
    "Diagnostics Lab": [
      p("Diagnostic test", "per_unit", 30, 250, "test"),
      p("Lab panel", "per_batch", 200, 1200, "panel batch"),
      p("Service contract", "per_month", 500, 5000, "service"),
    ],
    "Home Care": [
      p("Home care hour", "per_hour", 25, 60, "care hours"),
      p("Care package", "per_month", 500, 3000, "package"),
      p("Travel surcharge", "per_order", 10, 40, "travel fee"),
    ],
    Physio: [
      p("Session", "per_order", 40, 90, "session"),
      p("Rehab package", "per_project", 300, 1500, "rehab package"),
      p("Group class", "per_order", 10, 30, "class"),
    ],
    Wellness: [
      p("Therapy session", "per_order", 50, 120, "session"),
      p("Membership", "per_month", 30, 120, "membership"),
      p("Retail products", "per_unit", 10, 60, "retail"),
    ],
  },
  MEDIA: {
    "Ad Agency": [
      p("Ad campaign retainer", "per_month", 2000, 50000, "retainer"),
      p("Media buying fee", "per_month", 1000, 20000, "media buying"),
      p("Creative package", "per_project", 2000, 25000, "creative"),
    ],
    "Content Studio": [
      p("Content package", "per_project", 500, 15000, "content package"),
      p("Video shoot day", "per_day", 800, 4000, "shoot day"),
      p("Editing retainer", "per_month", 500, 8000, "editing"),
    ],
    Events: [
      p("Event ticket", "per_unit", 15, 150, "ticket"),
      p("Sponsorship", "per_project", 2000, 50000, "sponsorship"),
      p("Venue service fee", "per_day", 500, 8000, "venue"),
    ],
    "Indie Games": [
      p("Game sale", "per_unit", 5, 40, "game sale"),
      p("DLC pack", "per_unit", 3, 20, "dlc"),
      p("Platform feature fee", "per_month", 200, 2000, "platform fee"),
    ],
    "Music Label": [
      p("Streaming royalty", "per_unit", 2, 12, "per 1k streams"),
      p("Sync license", "per_project", 500, 20000, "sync license"),
      p("Merchandise cut", "percent", 5, 20, "merch cut"),
    ],
    Streaming: [
      p("Subscription", "per_month", 5, 20, "subscription"),
      p("Ad impressions", "per_unit", 2, 15, "per 1k impressions"),
      p("Premium add-on", "per_month", 3, 10, "premium"),
    ],
  },
  PROP: {
    "Hospitality Property": [
      p("Room lease", "per_month", 1000, 4000, "room lease"),
      p("Management fee", "percent", 2, 8, "management fee"),
      p("Event space rental", "per_day", 500, 8000, "event rental"),
    ],
    "Office Leasing": [
      p("Office rent", "per_month", 10, 40, "per sqm month"),
      p("Service charge", "per_month", 2, 8, "service charge"),
      p("Parking lease", "per_month", 50, 200, "parking"),
    ],
    "Property Development": [
      p("Development project", "per_project", 200000, 5000000, "development"),
      p("Land parcel sale", "per_unit", 100000, 2000000, "land sale"),
      p("Planning fee", "per_project", 5000, 100000, "planning"),
    ],
    "Residential Rent": [
      p("Monthly rent", "per_month", 700, 2000, "rent"),
      p("Parking fee", "per_month", 30, 120, "parking"),
      p("Maintenance surcharge", "per_month", 20, 80, "maintenance"),
    ],
    "Retail Leasing": [
      p("Retail rent", "per_month", 20, 80, "per sqm month"),
      p("Turnover rent", "percent", 1, 6, "turnover rent"),
      p("Service charge", "per_month", 3, 12, "service charge"),
    ],
    "Warehouse Leasing": [
      p("Warehouse rent", "per_month", 5, 15, "per sqm month"),
      p("Yard storage add-on", "per_month", 2, 8, "yard storage"),
      p("Handling fee", "per_project", 500, 5000, "handling"),
    ],
  },
  MANU: {
    "Auto Parts": [
      p("Contract manufacturing", "per_batch", 10000, 300000, "contract batch"),
      p("Unit wholesale", "per_unit", 5, 200, "wholesale"),
      p("QA scrap cost", "percent", 0.5, 4, "scrap cost"),
    ],
    Chemicals: [
      p("Batch contract", "per_batch", 20000, 500000, "batch contract"),
      p("Bulk chemical sale", "per_ton", 400, 2000, "bulk sale"),
      p("Hazmat surcharge", "per_batch", 5000, 50000, "hazmat"),
    ],
    "Electronics Mfg": [
      p("OEM batch", "per_batch", 20000, 600000, "OEM batch"),
      p("Component wholesale", "per_unit", 2, 150, "components"),
      p("Test and certification", "per_batch", 2000, 40000, "testing"),
    ],
    "FMCG Factory": [
      p("Private label batch", "per_batch", 10000, 250000, "private label"),
      p("Unit wholesale", "per_unit", 1, 20, "wholesale"),
      p("Packaging changeover", "per_batch", 1000, 15000, "changeover"),
    ],
    "Metal Works": [
      p("Fabrication contract", "per_batch", 15000, 400000, "fabrication"),
      p("Metal parts", "per_unit", 10, 300, "metal parts"),
      p("Machining hours", "per_hour", 60, 140, "machining"),
    ],
    Textiles: [
      p("Fabric batch", "per_batch", 8000, 120000, "fabric batch"),
      p("Garment wholesale", "per_unit", 3, 40, "garments"),
      p("Dyeing service", "per_batch", 2000, 30000, "dyeing"),
    ],
  },
};

const PRICING_MODEL_BY_SECTOR = {
  AGRI: "mixed",
  AUTO: "mixed",
  BUILD: "mixed",
  ECOM: "one_off",
  ENER: "mixed",
  FIN: "mixed",
  HEAL: "mixed",
  HORECA: "one_off",
  LOGI: "usage",
  MANU: "usage",
  MEDIA: "mixed",
  PROP: "subscription",
  RECY: "usage",
  RETAIL: "one_off",
  TECH: "mixed",
};

const PRICING_MODEL_OVERRIDES = {
  "Digital Products": "mixed",
  "Subscription Box": "subscription",
  SaaS: "subscription",
  "Managed Services": "subscription",
  "Car Wash": "mixed",
  "Electric Utility": "subscription",
  "Gas & Heat": "subscription",
  "Office Leasing": "subscription",
  "Residential Rent": "subscription",
  "Retail Leasing": "subscription",
  "Warehouse Leasing": "subscription",
  Streaming: "subscription",
  Hotel: "mixed",
  Lending: "mixed",
  Payments: "usage",
};

const CAPACITY_DRIVER_BY_SECTOR = {
  AGRI: "assets",
  AUTO: "assets",
  BUILD: "FTE",
  ECOM: "FTE",
  ENER: "assets",
  FIN: "FTE",
  HEAL: "beds",
  HORECA: "seats",
  LOGI: "assets",
  MANU: "machines",
  MEDIA: "FTE",
  PROP: "sqm",
  RECY: "machines",
  RETAIL: "sqm",
  TECH: "FTE",
};

const CAPACITY_DRIVER_OVERRIDES = {
  "Car Wash": "bays",
  "Repair Shop": "bays",
  "Parts & Tires": "bays",
  "Car Dealer": "assets",
  Mobility: "assets",
  Trucking: "trucks",
  "Last Mile": "trucks",
  Warehousing: "pallets",
  "Cold Chain": "pallets",
  "Port Services": "assets",
  Hotel: "beds",
  "Dark Kitchen": "sqm",
  "Food Truck": "assets",
  Clinic: "beds",
  Dental: "bays",
  "Diagnostics Lab": "machines",
  "Home Care": "FTE",
  Physio: "beds",
  Wellness: "sqm",
  "Hospitality Property": "assets",
  "Property Development": "assets",
  "Office Leasing": "sqm",
  "Retail Leasing": "sqm",
  "Warehouse Leasing": "sqm",
  Events: "seats",
  Streaming: "assets",
  "Indie Games": "FTE",
  "Music Label": "assets",
};

const WORKING_CAPITAL_DAYS = {
  AGRI: { ar: 40, ap: 30, inventory: 45 },
  AUTO: { ar: 20, ap: 30, inventory: 25 },
  BUILD: { ar: 45, ap: 35, inventory: 30 },
  ECOM: { ar: 15, ap: 20, inventory: 20 },
  ENER: { ar: 45, ap: 35, inventory: 10 },
  FIN: { ar: 30, ap: 25, inventory: 5 },
  HEAL: { ar: 30, ap: 25, inventory: 15 },
  HORECA: { ar: 10, ap: 20, inventory: 10 },
  LOGI: { ar: 40, ap: 30, inventory: 15 },
  MANU: { ar: 45, ap: 35, inventory: 60 },
  MEDIA: { ar: 20, ap: 25, inventory: 5 },
  PROP: { ar: 35, ap: 25, inventory: 10 },
  RECY: { ar: 40, ap: 30, inventory: 25 },
  RETAIL: { ar: 10, ap: 20, inventory: 25 },
  TECH: { ar: 20, ap: 25, inventory: 5 },
};

const VOLUME_OVERRIDES = {
  "Crop Farm": { min: 10, max: 80, unit: "per_ton" },
  "Car Wash": { min: 300, max: 2000, unit: "per_order" },
};

const FIXED_COST_OVERRIDES = {
  "Crop Farm": [8000, 60000],
  "Car Dealer": [20000, 150000],
};

const BRANCH_EFFECTS_BY_TIER = {
  DIGITAL: {
    AUTOMATION: {
      T1: [
        { variable: "errorRate", op: "mul", range: [0.92, 0.97] },
        { variable: "capacity", op: "mul", range: [1.04, 1.08] },
      ],
      T2: [
        { variable: "errorRate", op: "mul", range: [0.86, 0.93] },
        { variable: "capacity", op: "mul", range: [1.07, 1.12] },
      ],
      T3: [
        { variable: "errorRate", op: "mul", range: [0.82, 0.9] },
        { variable: "capacity", op: "mul", range: [1.1, 1.15] },
      ],
    },
    GROWTH: {
      T1: [
        { variable: "conversionRate", op: "mul", range: [1.03, 1.06] },
        { variable: "reputation", op: "add", range: [1, 3] },
      ],
      T2: [
        { variable: "conversionRate", op: "mul", range: [1.05, 1.09] },
        { variable: "reputation", op: "add", range: [2, 6] },
      ],
      T3: [
        { variable: "conversionRate", op: "mul", range: [1.08, 1.12] },
        { variable: "reputation", op: "add", range: [4, 10] },
      ],
    },
    PRODUCT: {
      T1: [
        { variable: "churnRate", op: "mul", range: [0.93, 0.97] },
        { variable: "supportTicketsPerCustomer", op: "mul", range: [0.92, 0.96] },
      ],
      T2: [
        { variable: "churnRate", op: "mul", range: [0.88, 0.94] },
        { variable: "supportTicketsPerCustomer", op: "mul", range: [0.86, 0.93] },
      ],
      T3: [
        { variable: "churnRate", op: "mul", range: [0.8, 0.9] },
        { variable: "supportTicketsPerCustomer", op: "mul", range: [0.82, 0.89] },
      ],
    },
  },
  INDUSTRIAL: {
    EFFICIENCY: {
      T1: [
        { variable: "unitCost", op: "mul", range: [0.95, 0.98] },
        { variable: "capacity", op: "mul", range: [1.03, 1.06] },
      ],
      T2: [
        { variable: "unitCost", op: "mul", range: [0.92, 0.96] },
        { variable: "capacity", op: "mul", range: [1.05, 1.09] },
      ],
      T3: [
        { variable: "unitCost", op: "mul", range: [0.9, 0.94] },
        { variable: "capacity", op: "mul", range: [1.08, 1.12] },
      ],
    },
    SAFETY: {
      T1: [
        { variable: "incidentRate", op: "mul", range: [0.82, 0.9] },
        { variable: "insuranceCost", op: "mul", range: [0.96, 0.98] },
      ],
      T2: [
        { variable: "incidentRate", op: "mul", range: [0.72, 0.86] },
        { variable: "insuranceCost", op: "mul", range: [0.94, 0.97] },
      ],
      T3: [
        { variable: "incidentRate", op: "mul", range: [0.65, 0.8] },
        { variable: "insuranceCost", op: "mul", range: [0.92, 0.95] },
      ],
    },
    THROUGHPUT: {
      T1: [
        { variable: "capacity", op: "mul", range: [1.05, 1.1] },
        { variable: "fixedCosts", op: "mul", range: [1.02, 1.05] },
      ],
      T2: [
        { variable: "capacity", op: "mul", range: [1.1, 1.18] },
        { variable: "fixedCosts", op: "mul", range: [1.04, 1.08] },
      ],
      T3: [
        { variable: "capacity", op: "mul", range: [1.18, 1.3] },
        { variable: "fixedCosts", op: "mul", range: [1.06, 1.12] },
      ],
    },
  },
  REGULATED: {
    COMPLIANCE: {
      T1: [
        { variable: "fineChance", op: "mul", range: [0.7, 0.85] },
        { variable: "enterpriseDealsUnlocked", op: "set", range: [0, 0] },
      ],
      T2: [
        { variable: "fineChance", op: "mul", range: [0.55, 0.75] },
        { variable: "enterpriseDealsUnlocked", op: "set", range: [1, 1] },
      ],
      T3: [
        { variable: "fineChance", op: "mul", range: [0.4, 0.6] },
        { variable: "enterpriseDealsUnlocked", op: "set", range: [1, 1] },
      ],
    },
    COST_CONTROL: {
      T1: [
        { variable: "opex", op: "mul", range: [0.97, 0.99] },
        { variable: "errorRate", op: "mul", range: [0.94, 0.97] },
      ],
      T2: [
        { variable: "opex", op: "mul", range: [0.95, 0.98] },
        { variable: "errorRate", op: "mul", range: [0.9, 0.95] },
      ],
      T3: [
        { variable: "opex", op: "mul", range: [0.94, 0.97] },
        { variable: "errorRate", op: "mul", range: [0.88, 0.92] },
      ],
    },
    RELIABILITY: {
      T1: [
        { variable: "downtimeRate", op: "mul", range: [0.82, 0.9] },
        { variable: "reputation", op: "add", range: [1, 3] },
      ],
      T2: [
        { variable: "downtimeRate", op: "mul", range: [0.65, 0.82] },
        { variable: "reputation", op: "add", range: [2, 5] },
      ],
      T3: [
        { variable: "downtimeRate", op: "mul", range: [0.5, 0.7] },
        { variable: "reputation", op: "add", range: [4, 8] },
      ],
    },
  },
  SERVICE: {
    EXPERIENCE: {
      T1: [
        { variable: "avgTicket", op: "mul", range: [1.02, 1.05] },
        { variable: "repeatRate", op: "mul", range: [1.03, 1.07] },
      ],
      T2: [
        { variable: "avgTicket", op: "mul", range: [1.04, 1.08] },
        { variable: "repeatRate", op: "mul", range: [1.06, 1.11] },
      ],
      T3: [
        { variable: "avgTicket", op: "mul", range: [1.08, 1.12] },
        { variable: "repeatRate", op: "mul", range: [1.1, 1.15] },
      ],
    },
    LOCAL_MARKETING: {
      T1: [
        { variable: "baseDemand", op: "mul", range: [1.02, 1.05] },
        { variable: "reputation", op: "add", range: [1, 3] },
      ],
      T2: [
        { variable: "baseDemand", op: "mul", range: [1.04, 1.08] },
        { variable: "reputation", op: "add", range: [2, 4] },
      ],
      T3: [
        { variable: "baseDemand", op: "mul", range: [1.07, 1.1] },
        { variable: "reputation", op: "add", range: [3, 6] },
      ],
    },
    PROCESS: {
      T1: [
        { variable: "capacity", op: "mul", range: [1.03, 1.06] },
        { variable: "errorRate", op: "mul", range: [0.92, 0.96] },
      ],
      T2: [
        { variable: "capacity", op: "mul", range: [1.05, 1.09] },
        { variable: "errorRate", op: "mul", range: [0.88, 0.93] },
      ],
      T3: [
        { variable: "capacity", op: "mul", range: [1.08, 1.12] },
        { variable: "errorRate", op: "mul", range: [0.85, 0.9] },
      ],
    },
  },
};

const RISK_BY_BRANCH = {
  DIGITAL_AUTOMATION: {
    failureChancePct: [8, 22],
    variancePct: [6, 14],
    failureEffects: ["downtimeWeeks 1..4", "reworkCostPct 2..6"],
  },
  DIGITAL_GROWTH: {
    failureChancePct: [10, 30],
    variancePct: [12, 30],
    failureEffects: ["overspendPct 5..15", "demandLiftDelayedWeeks 2..8"],
  },
  DIGITAL_PRODUCT: {
    failureChancePct: [6, 18],
    variancePct: [6, 16],
    failureEffects: ["limitedAdoptionPct 5..15"],
  },
  INDUSTRIAL_EFFICIENCY: {
    failureChancePct: [6, 18],
    variancePct: [5, 12],
    failureEffects: ["downtimeWeeks 1..3"],
  },
  INDUSTRIAL_SAFETY: {
    failureChancePct: [5, 15],
    variancePct: [4, 10],
    failureEffects: ["trainingOverrunWeeks 1..4"],
  },
  INDUSTRIAL_THROUGHPUT: {
    failureChancePct: [8, 20],
    variancePct: [8, 18],
    failureEffects: ["overcapacityPenaltyPct 2..8"],
  },
  REGULATED_COMPLIANCE: {
    failureChancePct: [7, 20],
    variancePct: [6, 15],
    failureEffects: ["auditFail", "reputation -x"],
  },
  REGULATED_COST_CONTROL: {
    failureChancePct: [6, 16],
    variancePct: [5, 12],
    failureEffects: ["changeResistanceWeeks 1..4"],
  },
  REGULATED_RELIABILITY: {
    failureChancePct: [8, 22],
    variancePct: [8, 18],
    failureEffects: ["capexOverrunPct 5..12"],
  },
  SERVICE_EXPERIENCE: {
    failureChancePct: [6, 18],
    variancePct: [5, 12],
    failureEffects: ["demandLiftDelayedWeeks 2..6"],
  },
  SERVICE_LOCAL_MARKETING: {
    failureChancePct: [8, 22],
    variancePct: [8, 20],
    failureEffects: ["competitiveResponsePct 2..6"],
  },
  SERVICE_PROCESS: {
    failureChancePct: [7, 18],
    variancePct: [6, 14],
    failureEffects: ["temporaryCapacityDipPct 5..12"],
  },
};

const UNITS = [
  "per_month",
  "per_order",
  "per_ton",
  "per_km",
  "per_hour",
  "per_day",
  "per_night",
  "per_project",
  "per_batch",
  "per_unit",
  "percent",
];

const CAPACITY_DRIVERS = [
  "FTE",
  "assets",
  "bays",
  "beds",
  "trucks",
  "machines",
  "pallets",
  "seats",
  "sqm",
];

const PRICING_MODELS = ["subscription", "usage", "one_off", "mixed"];

const sectors = parseSectors(raw);

const catalog = {
  generated_at: new Date().toISOString(),
  assumptions: {
    currency: "EUR",
    region: "EU-WEST",
    time_unit: "week",
    pricing_notes: "ranges are used; final price is computed from world modifiers",
  },
  upgrade_templates: UPGRADE_TEMPLATES,
  upgrade_profiles: UPGRADE_PROFILES,
  sectors: sectors.map((sector) => buildSector(sector)),
};

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(catalog, null, 2));
fs.writeFileSync(OUTPUT_SQL, buildSql(catalog));

function p(name, unit, min, max, notes, cogsOverride) {
  return {
    name,
    unit,
    price: [min, max],
    notes,
    cogsOverride: cogsOverride || null,
  };
}

function parseSectors(input) {
  const sectorHeaderRegex = /^###\s+([A-Z]+)\s+-\s+(.+)$/gm;
  const matches = Array.from(input.matchAll(sectorHeaderRegex));
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index < matches.length - 1 ? matches[index + 1].index : input.length;
    const chunk = input.slice(start, end);
    const lines = chunk.split(/\r?\n/).map((line) => line.trimEnd());
    const description = lines.find((line) => line.trim().length > 0) || "";
    const tableStart = lines.findIndex((line) => line.startsWith("| Niche"));
    const niches = [];
    if (tableStart === -1) {
      return {
        sector_code: match[1],
        name: sanitizeText(match[2]),
        description: sanitizeText(description),
        niches,
      };
    }
    for (let i = tableStart + 2; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line || line.startsWith("###")) {
        break;
      }
      if (!line.startsWith("|")) {
        continue;
      }
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);
      if (cells.length < 12) {
        continue;
      }
      const [
        nicheName,
        startupCost,
        roi,
        payback,
        risk,
        decisionProfile,
        upgradeProfile,
        capex,
        margin,
        baseDemand,
        ticket,
        competition,
      ] = cells;
      niches.push({
        name: sanitizeText(nicheName),
        startup_cost: parseEuro(startupCost),
        roi_pct: parsePct(roi),
        payback_years: parsePayback(payback),
        risk: risk.trim(),
        decision_profile: decisionProfile.trim(),
        upgrade_profile: upgradeProfile.trim(),
        capex: capex.trim(),
        margin_pct_range: parseMarginRange(margin),
        base_demand_index: parseInt(baseDemand, 10),
        ticket_level: ticket.trim(),
        competition: competition.trim(),
      });
    }
    return {
      sector_code: match[1],
      name: sanitizeText(match[2]),
      description: sanitizeText(description),
      niches,
    };
  });
}

function buildSector(sector) {
  const nicheCosts = sector.niches.map((niche) => niche.startup_cost).sort((a, b) => a - b);
  const total = nicheCosts.reduce((sum, value) => sum + value, 0);
  const avg = nicheCosts.length ? total / nicheCosts.length : 0;
  const median =
    nicheCosts.length % 2 === 0
      ? (nicheCosts[nicheCosts.length / 2 - 1] + nicheCosts[nicheCosts.length / 2]) / 2
      : nicheCosts[Math.floor(nicheCosts.length / 2)];
  const decisionProfile = sector.niches[0]?.decision_profile || "DEFAULT";
  const upgradeProfile = sector.niches[0]?.upgrade_profile || "SERVICE";

  return {
    sector_code: sector.sector_code,
    name: sector.name,
    description: sector.description,
    decision_profile: decisionProfile,
    upgrade_profile: upgradeProfile,
    startup_cost_stats: {
      min: nicheCosts[0] || 0,
      max: nicheCosts[nicheCosts.length - 1] || 0,
      avg: round2(avg),
      median: round2(median || 0),
    },
    niches: sector.niches.map((niche) => buildNiche(sector, niche)),
  };
}

function buildNiche(sector, niche) {
  const products = getProducts(sector.sector_code, niche.name);
  const pricingModel = getPricingModel(niche.name, sector.sector_code);
  const primaryUnit = products[0]?.unit || "per_unit";
  const volumeBaseline = getVolumeBaseline(niche, primaryUnit);
  const fixedCosts = getFixedCosts(niche, sector.sector_code);
  const maintenance = getMaintenanceRange(niche, sector.sector_code);

  return {
    niche_code: niche.name,
    startup_cost: niche.startup_cost,
    roi_pct: niche.roi_pct,
    payback_years: niche.payback_years,
    risk: niche.risk,
    capex: niche.capex,
    margin_pct_range: niche.margin_pct_range,
    base_demand_index: niche.base_demand_index,
    ticket_level: niche.ticket_level,
    competition: niche.competition,
    decision_profile: niche.decision_profile,
    upgrade_profile: niche.upgrade_profile,
    products,
    pricing_model: pricingModel,
    volume_baseline_week: volumeBaseline,
    fixed_costs_month_eur_range: fixedCosts,
    working_capital_days: WORKING_CAPITAL_DAYS[sector.sector_code] || {
      ar: 30,
      ap: 25,
      inventory: 15,
    },
    maintenance_pct_of_capex_per_year: maintenance,
    investment_programs: buildInvestmentPrograms(niche.upgrade_profile),
  };
}

function getProducts(sectorCode, nicheName) {
  const sectorTemplates = PRODUCT_TEMPLATES[sectorCode];
  if (!sectorTemplates) {
    throw new Error(`Missing product templates for sector ${sectorCode}`);
  }
  const key = normalizeKey(nicheName);
  const templateKey = Object.keys(sectorTemplates).find(
    (name) => normalizeKey(name) === key,
  );
  if (!templateKey) {
    throw new Error(`Missing product templates for niche ${nicheName} in ${sectorCode}`);
  }
  const products = sectorTemplates[templateKey];
  const pricingModel = getPricingModel(nicheName, sectorCode);
  const cogsRange = getCogsRange(sectorCode, nicheName, pricingModel, null);
  const capacityDriver = getCapacityDriver(nicheName, sectorCode);
  return products.map((product) => ({
    sku: `${slugify(nicheName)}_${slugify(product.name)}`,
    name: product.name,
    unit: product.unit,
    price_eur_range: product.price,
    cogs_pct_range: product.cogsOverride || cogsRange,
    capacity_driver: capacityDriver,
    notes: product.notes,
  }));
}

function getPricingModel(nicheName, sectorCode) {
  return PRICING_MODEL_OVERRIDES[nicheName] || PRICING_MODEL_BY_SECTOR[sectorCode] || "mixed";
}

function getCapacityDriver(nicheName, sectorCode) {
  return CAPACITY_DRIVER_OVERRIDES[nicheName] || CAPACITY_DRIVER_BY_SECTOR[sectorCode] || "FTE";
}

function getFixedCosts(niche, sectorCode) {
  const override = FIXED_COST_OVERRIDES[niche.name];
  if (override) {
    return override;
  }
  let minFactor = 0.002;
  let maxFactor = 0.008;
  if (niche.capex === "MEDIUM") {
    minFactor = 0.003;
    maxFactor = 0.012;
  }
  if (niche.capex === "HIGH") {
    minFactor = 0.004;
    maxFactor = 0.015;
  }
  if (["TECH", "ECOM", "MEDIA"].includes(sectorCode)) {
    minFactor *= 0.7;
    maxFactor *= 0.7;
  }
  return [round2(niche.startup_cost * minFactor), round2(niche.startup_cost * maxFactor)];
}

function getMaintenanceRange(niche, sectorCode) {
  let min = 1;
  let max = 3;
  if (niche.capex === "MEDIUM") {
    min = 2;
    max = 6;
  }
  if (niche.capex === "HIGH") {
    min = 3;
    max = 8;
  }
  if (["TECH", "ECOM", "MEDIA"].includes(sectorCode)) {
    min = 0.5;
    max = 2;
  }
  return [min, max];
}

function getVolumeBaseline(niche, unit) {
  const override = VOLUME_OVERRIDES[niche.name];
  if (override) {
    return {
      min: override.min,
      max: override.max,
      unit: override.unit,
    };
  }
  const ticketFactor = niche.ticket_level === "LOW" ? 1.3 : niche.ticket_level === "HIGH" ? 0.6 : 1;
  const unitFactor = getUnitFactor(unit);
  const base = niche.base_demand_index * ticketFactor * unitFactor;
  const min = Math.max(1, Math.round(base * 0.6));
  const max = Math.max(min + 1, Math.round(base * 1.4));
  return {
    min,
    max,
    unit,
  };
}

function getUnitFactor(unit) {
  switch (unit) {
    case "per_ton":
      return 0.12;
    case "per_km":
      return 30;
    case "per_hour":
      return 0.5;
    case "per_day":
      return 0.12;
    case "per_night":
      return 0.12;
    case "per_month":
      return 0.06;
    case "per_project":
      return 0.03;
    case "per_batch":
      return 0.05;
    case "per_order":
      return 0.4;
    case "per_unit":
      return 0.2;
    case "percent":
      return 0.02;
    default:
      return 0.2;
  }
}

function getCogsRange(sectorCode, nicheName, pricingModel, marginRange) {
  let min = 40;
  let max = 70;
  switch (sectorCode) {
    case "TECH":
      min = 15;
      max = 45;
      break;
    case "ECOM":
      min = 35;
      max = 70;
      break;
    case "LOGI":
    case "RETAIL":
    case "ENER":
      min = 80;
      max = 95;
      break;
    case "AGRI":
    case "MANU":
    case "RECY":
      min = 75;
      max = 94;
      break;
    case "HORECA":
      min = 60;
      max = 80;
      break;
    case "FIN":
      min = 35;
      max = 65;
      break;
    case "BUILD":
      min = 55;
      max = 80;
      break;
    case "AUTO":
      min = 60;
      max = 85;
      break;
    case "PROP":
      min = 45;
      max = 75;
      break;
    case "MEDIA":
      min = 35;
      max = 70;
      break;
    case "HEAL":
      min = 45;
      max = 75;
      break;
    default:
      min = 40;
      max = 70;
  }
  if (pricingModel === "subscription" && ["TECH", "ECOM"].includes(sectorCode)) {
    min = 10;
    max = 35;
  }
  if (nicheName === "Digital Products") {
    min = 15;
    max = 35;
  }
  if (marginRange && marginRange[1] <= 10) {
    min = Math.max(min, 85);
    max = Math.max(max, 92);
  }
  if (marginRange && marginRange[1] <= 6) {
    min = Math.max(min, 88);
    max = Math.max(max, 96);
  }
  if (nicheName === "Grocery") {
    min = 88;
    max = 97;
  }
  return [min, max];
}

function buildInvestmentPrograms(profileCode) {
  const branches = UPGRADE_PROFILES[profileCode]?.branches || [];
  const tiers = Object.keys(UPGRADE_TEMPLATES);
  const programs = [];
  for (const branch of branches) {
    for (const tier of tiers) {
      const effects = BRANCH_EFFECTS_BY_TIER[profileCode]?.[branch.branch_code]?.[tier] || [];
      const riskKey = `${profileCode}_${branch.branch_code}`;
      const risk = buildRisk(riskKey, tier);
      programs.push({
        program_code: `${profileCode}_${branch.branch_code}`,
        tier,
        capex_formula: "startup_cost * pct",
        opex_formula: "revenueMonthly * pct",
        effects,
        delayWeeks: {
          min: UPGRADE_TEMPLATES[tier].delayWeeks[0],
          max: UPGRADE_TEMPLATES[tier].delayWeeks[1],
        },
        risk,
      });
    }
  }
  return programs;
}

function buildRisk(riskKey, tier) {
  const base = RISK_BY_BRANCH[riskKey] || {
    failureChancePct: [8, 20],
    variancePct: [6, 14],
    failureEffects: ["delayWeeks 1..4"],
  };
  const tierFactor = tier === "T1" ? 0.9 : tier === "T2" ? 1 : 1.15;
  return {
    failureChancePct: scaleRange(base.failureChancePct, tierFactor, 1, 60),
    variancePct: scaleRange(base.variancePct, tierFactor, 1, 60),
    failureEffects: base.failureEffects,
  };
}

function scaleRange([min, max], factor, minClamp, maxClamp) {
  const scaledMin = clamp(min * factor, minClamp, maxClamp);
  const scaledMax = clamp(max * factor, minClamp, maxClamp);
  return [round2(scaledMin), round2(scaledMax)];
}

function buildSql(catalogData) {
  const ids = {
    sectors: new Map(),
    niches: new Map(),
    upgradeProfiles: new Map(),
  };
  const metaId = crypto.randomUUID();

  const upgradeProfileRows = [];
  Object.entries(UPGRADE_PROFILES).forEach(([profileCode, profile]) => {
    profile.branches.forEach((branch) => {
      const id = crypto.randomUUID();
      ids.upgradeProfiles.set(`${profileCode}:${branch.branch_code}`, id);
      upgradeProfileRows.push({
        id,
        profile_code: profileCode,
        branch_code: branch.branch_code,
        name: branch.name,
        description: branch.description,
        effects: branch.effects,
        risk_notes: branch.risk_notes,
      });
    });
  });

  const sectorRows = [];
  const nicheRows = [];
  const productRows = [];
  const programRows = [];

  catalogData.sectors.forEach((sector) => {
    const sectorId = crypto.randomUUID();
    ids.sectors.set(sector.sector_code, sectorId);
    sectorRows.push({
      id: sectorId,
      sector_code: sector.sector_code,
      name: sector.name,
      description: sector.description,
      decision_profile: sector.decision_profile,
      upgrade_profile: sector.upgrade_profile,
      startup_cost_min_eur: sector.startup_cost_stats.min,
      startup_cost_max_eur: sector.startup_cost_stats.max,
      startup_cost_avg_eur: sector.startup_cost_stats.avg,
      startup_cost_median_eur: sector.startup_cost_stats.median,
    });

    sector.niches.forEach((niche) => {
      const nicheId = crypto.randomUUID();
      ids.niches.set(`${sector.sector_code}:${niche.niche_code}`, nicheId);
      nicheRows.push({
        id: nicheId,
        sector_id: sectorId,
        niche_code: slugify(niche.niche_code),
        name: niche.niche_code,
        startup_cost_eur: niche.startup_cost,
        roi_pct: niche.roi_pct,
        payback_years: niche.payback_years,
        risk: niche.risk,
        capex: niche.capex,
        margin_pct_min: niche.margin_pct_range[0],
        margin_pct_max: niche.margin_pct_range[1],
        base_demand_index: niche.base_demand_index,
        ticket_level: niche.ticket_level,
        competition: niche.competition,
        decision_profile: niche.decision_profile,
        upgrade_profile: niche.upgrade_profile,
        pricing_model: niche.pricing_model,
        volume_baseline_week_min: niche.volume_baseline_week.min,
        volume_baseline_week_max: niche.volume_baseline_week.max,
        volume_unit: niche.volume_baseline_week.unit,
        fixed_costs_month_min_eur: niche.fixed_costs_month_eur_range[0],
        fixed_costs_month_max_eur: niche.fixed_costs_month_eur_range[1],
        working_capital_days: niche.working_capital_days,
        maintenance_pct_of_capex_per_year_min: niche.maintenance_pct_of_capex_per_year[0],
        maintenance_pct_of_capex_per_year_max: niche.maintenance_pct_of_capex_per_year[1],
      });

      niche.products.forEach((product) => {
        productRows.push({
          id: crypto.randomUUID(),
          niche_id: nicheId,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          price_min_eur: product.price_eur_range[0],
          price_max_eur: product.price_eur_range[1],
          cogs_pct_min: product.cogs_pct_range[0],
          cogs_pct_max: product.cogs_pct_range[1],
          capacity_driver: product.capacity_driver,
          notes: product.notes,
        });
      });

      niche.investment_programs.forEach((program) => {
        const branchCode = program.program_code.replace(`${niche.upgrade_profile}_`, "");
        const upgradeProfileId = ids.upgradeProfiles.get(
          `${niche.upgrade_profile}:${branchCode}`,
        );
        programRows.push({
          id: crypto.randomUUID(),
          niche_id: nicheId,
          upgrade_profile_id: upgradeProfileId,
          profile_code: niche.upgrade_profile,
          branch_code: branchCode,
          tier: program.tier,
          capex_formula: program.capex_formula,
          opex_formula: program.opex_formula,
          effects: program.effects,
          delay_weeks_min: program.delayWeeks.min,
          delay_weeks_max: program.delayWeeks.max,
          risk: program.risk,
        });
      });
    });
  });

  const sql = [];
  sql.push(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  sql.push("");
  sql.push("CREATE TABLE IF NOT EXISTS catalog_meta (");
  sql.push("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),");
  sql.push("  generated_at TIMESTAMPTZ NOT NULL,");
  sql.push("  assumptions JSONB NOT NULL,");
  sql.push("  upgrade_templates JSONB NOT NULL");
  sql.push(");");
  sql.push("");
  sql.push("CREATE TABLE IF NOT EXISTS sectors (");
  sql.push("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),");
  sql.push("  sector_code TEXT NOT NULL UNIQUE,");
  sql.push("  name TEXT NOT NULL,");
  sql.push("  description TEXT NOT NULL,");
  sql.push("  decision_profile TEXT NOT NULL,");
  sql.push("  upgrade_profile TEXT NOT NULL,");
  sql.push("  startup_cost_min_eur NUMERIC(14,2) NOT NULL,");
  sql.push("  startup_cost_max_eur NUMERIC(14,2) NOT NULL,");
  sql.push("  startup_cost_avg_eur NUMERIC(14,2) NOT NULL,");
  sql.push("  startup_cost_median_eur NUMERIC(14,2) NOT NULL,");
  sql.push(
    "  CHECK (upgrade_profile IN ('DIGITAL','INDUSTRIAL','REGULATED','SERVICE'))",
  );
  sql.push(");");
  sql.push("");
  sql.push("CREATE TABLE IF NOT EXISTS niches (");
  sql.push("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),");
  sql.push("  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,");
  sql.push("  niche_code TEXT NOT NULL,");
  sql.push("  name TEXT NOT NULL,");
  sql.push("  startup_cost_eur NUMERIC(14,2) NOT NULL,");
  sql.push("  roi_pct NUMERIC(5,2) NOT NULL,");
  sql.push("  payback_years NUMERIC(6,2) NOT NULL,");
  sql.push("  risk TEXT NOT NULL,");
  sql.push("  capex TEXT NOT NULL,");
  sql.push("  margin_pct_min NUMERIC(5,2) NOT NULL,");
  sql.push("  margin_pct_max NUMERIC(5,2) NOT NULL,");
  sql.push("  base_demand_index INT NOT NULL,");
  sql.push("  ticket_level TEXT NOT NULL,");
  sql.push("  competition TEXT NOT NULL,");
  sql.push("  decision_profile TEXT NOT NULL,");
  sql.push("  upgrade_profile TEXT NOT NULL,");
  sql.push("  pricing_model TEXT NOT NULL,");
  sql.push("  volume_baseline_week_min NUMERIC(14,2) NOT NULL,");
  sql.push("  volume_baseline_week_max NUMERIC(14,2) NOT NULL,");
  sql.push("  volume_unit TEXT NOT NULL,");
  sql.push("  fixed_costs_month_min_eur NUMERIC(14,2) NOT NULL,");
  sql.push("  fixed_costs_month_max_eur NUMERIC(14,2) NOT NULL,");
  sql.push("  working_capital_days JSONB NOT NULL,");
  sql.push("  maintenance_pct_of_capex_per_year_min NUMERIC(5,2) NOT NULL,");
  sql.push("  maintenance_pct_of_capex_per_year_max NUMERIC(5,2) NOT NULL,");
  sql.push(
    "  CHECK (risk IN ('Low','Medium','High'))",
  );
  sql.push(
    "  CHECK (capex IN ('LOW','MEDIUM','HIGH'))",
  );
  sql.push(
    "  CHECK (ticket_level IN ('LOW','MEDIUM','HIGH'))",
  );
  sql.push(
    "  CHECK (competition IN ('FRAGMENTED','OLIGOPOLY','MONOPOLY_LIKE'))",
  );
  sql.push(
    `  CHECK (pricing_model IN ('${PRICING_MODELS.join("','")}'))`,
  );
  sql.push(
    "  CHECK (upgrade_profile IN ('DIGITAL','INDUSTRIAL','REGULATED','SERVICE'))",
  );
  sql.push(
    `  CHECK (volume_unit IN ('${UNITS.join("','")}'))`,
  );
  sql.push("  UNIQUE (sector_id, niche_code)");
  sql.push(");");
  sql.push("");
  sql.push("CREATE TABLE IF NOT EXISTS niche_products (");
  sql.push("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),");
  sql.push("  niche_id UUID NOT NULL REFERENCES niches(id) ON DELETE CASCADE,");
  sql.push("  sku TEXT NOT NULL,");
  sql.push("  name TEXT NOT NULL,");
  sql.push("  unit TEXT NOT NULL,");
  sql.push("  price_min_eur NUMERIC(14,2) NOT NULL,");
  sql.push("  price_max_eur NUMERIC(14,2) NOT NULL,");
  sql.push("  cogs_pct_min NUMERIC(5,2) NOT NULL,");
  sql.push("  cogs_pct_max NUMERIC(5,2) NOT NULL,");
  sql.push("  capacity_driver TEXT NOT NULL,");
  sql.push("  notes TEXT NOT NULL,");
  sql.push(
    `  CHECK (unit IN ('${UNITS.join("','")}'))`,
  );
  sql.push(
    `  CHECK (capacity_driver IN ('${CAPACITY_DRIVERS.join("','")}'))`,
  );
  sql.push("  CHECK (price_min_eur < price_max_eur),");
  sql.push("  CHECK (cogs_pct_min >= 0 AND cogs_pct_max <= 100 AND cogs_pct_min <= cogs_pct_max)");
  sql.push(");");
  sql.push("");
  sql.push("CREATE TABLE IF NOT EXISTS upgrade_profiles (");
  sql.push("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),");
  sql.push("  profile_code TEXT NOT NULL,");
  sql.push("  branch_code TEXT NOT NULL,");
  sql.push("  name TEXT NOT NULL,");
  sql.push("  description TEXT NOT NULL,");
  sql.push("  effects JSONB NOT NULL,");
  sql.push("  risk_notes TEXT NOT NULL,");
  sql.push(
    "  CHECK (profile_code IN ('DIGITAL','INDUSTRIAL','REGULATED','SERVICE'))",
  );
  sql.push("  UNIQUE (profile_code, branch_code)");
  sql.push(");");
  sql.push("");
  sql.push("CREATE TABLE IF NOT EXISTS upgrade_programs (");
  sql.push("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),");
  sql.push("  niche_id UUID NOT NULL REFERENCES niches(id) ON DELETE CASCADE,");
  sql.push("  upgrade_profile_id UUID NOT NULL REFERENCES upgrade_profiles(id) ON DELETE CASCADE,");
  sql.push("  profile_code TEXT NOT NULL,");
  sql.push("  branch_code TEXT NOT NULL,");
  sql.push("  tier TEXT NOT NULL,");
  sql.push("  capex_formula TEXT NOT NULL,");
  sql.push("  opex_formula TEXT NOT NULL,");
  sql.push("  effects JSONB NOT NULL,");
  sql.push("  delay_weeks_min INT NOT NULL,");
  sql.push("  delay_weeks_max INT NOT NULL,");
  sql.push("  risk JSONB NOT NULL,");
  sql.push("  CHECK (tier IN ('T1','T2','T3')),");
  sql.push(
    "  CHECK (profile_code IN ('DIGITAL','INDUSTRIAL','REGULATED','SERVICE'))",
  );
  sql.push(");");
  sql.push("");

  sql.push(
    `INSERT INTO catalog_meta (id, generated_at, assumptions, upgrade_templates) VALUES (${sqlUuid(
      metaId,
    )}, ${sqlString(catalogData.generated_at)}, ${sqlJson(
      catalogData.assumptions,
    )}, ${sqlJson(catalogData.upgrade_templates)});`,
  );
  sql.push("");
  sql.push(buildInsert("upgrade_profiles", upgradeProfileRows, [
    "id",
    "profile_code",
    "branch_code",
    "name",
    "description",
    "effects",
    "risk_notes",
  ]));
  sql.push("");
  sql.push(buildInsert("sectors", sectorRows, [
    "id",
    "sector_code",
    "name",
    "description",
    "decision_profile",
    "upgrade_profile",
    "startup_cost_min_eur",
    "startup_cost_max_eur",
    "startup_cost_avg_eur",
    "startup_cost_median_eur",
  ]));
  sql.push("");
  sql.push(buildInsert("niches", nicheRows, [
    "id",
    "sector_id",
    "niche_code",
    "name",
    "startup_cost_eur",
    "roi_pct",
    "payback_years",
    "risk",
    "capex",
    "margin_pct_min",
    "margin_pct_max",
    "base_demand_index",
    "ticket_level",
    "competition",
    "decision_profile",
    "upgrade_profile",
    "pricing_model",
    "volume_baseline_week_min",
    "volume_baseline_week_max",
    "volume_unit",
    "fixed_costs_month_min_eur",
    "fixed_costs_month_max_eur",
    "working_capital_days",
    "maintenance_pct_of_capex_per_year_min",
    "maintenance_pct_of_capex_per_year_max",
  ]));
  sql.push("");
  sql.push(buildInsert("niche_products", productRows, [
    "id",
    "niche_id",
    "sku",
    "name",
    "unit",
    "price_min_eur",
    "price_max_eur",
    "cogs_pct_min",
    "cogs_pct_max",
    "capacity_driver",
    "notes",
  ]));
  sql.push("");
  sql.push(buildInsert("upgrade_programs", programRows, [
    "id",
    "niche_id",
    "upgrade_profile_id",
    "profile_code",
    "branch_code",
    "tier",
    "capex_formula",
    "opex_formula",
    "effects",
    "delay_weeks_min",
    "delay_weeks_max",
    "risk",
  ]));
  sql.push("");
  sql.push("-- Sanity checks");
  sql.push(
    "SELECT n.id, n.name, COUNT(p.id) AS product_count",
  );
  sql.push("FROM niches n");
  sql.push("LEFT JOIN niche_products p ON p.niche_id = n.id");
  sql.push("GROUP BY n.id, n.name");
  sql.push("HAVING COUNT(p.id) < 3;");
  sql.push("");
  sql.push(
    "SELECT n.id, n.name, COUNT(up.id) AS program_count",
  );
  sql.push("FROM niches n");
  sql.push("LEFT JOIN upgrade_programs up ON up.niche_id = n.id");
  sql.push("GROUP BY n.id, n.name");
  sql.push("HAVING COUNT(up.id) < 9;");
  sql.push("");
  sql.push(
    "SELECT n.id, n.name, up.branch_code, COUNT(DISTINCT up.tier) AS tiers",
  );
  sql.push("FROM niches n");
  sql.push("JOIN upgrade_programs up ON up.niche_id = n.id");
  sql.push("GROUP BY n.id, n.name, up.branch_code");
  sql.push("HAVING COUNT(DISTINCT up.tier) < 3;");
  sql.push("");
  sql.push("SELECT * FROM niche_products WHERE price_min_eur >= price_max_eur;");
  sql.push("");
  sql.push(
    "SELECT * FROM niches WHERE margin_pct_min <= 0 OR margin_pct_max >= 100 OR margin_pct_min > margin_pct_max;",
  );

  return `${sql.join("\n")}\n`;
}

function buildInsert(table, rows, columns) {
  if (!rows.length) {
    return `-- No rows for ${table}`;
  }
  const values = rows
    .map((row) => {
      const fields = columns.map((column) => sqlValue(row[column]));
      return `  (${fields.join(", ")})`;
    })
    .join(",\n");
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${values};`;
}

function sqlValue(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }
  if (typeof value === "string") {
    return sqlString(value);
  }
  if (typeof value === "object") {
    return sqlJson(value);
  }
  return sqlString(String(value));
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlUuid(value) {
  return sqlString(value);
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function slugify(value) {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sanitizeText(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeKey(value) {
  return sanitizeText(value).toLowerCase();
}

function parseEuro(value) {
  const digits = value.replace(/[^\d]/g, "");
  return parseInt(digits, 10);
}

function parsePct(value) {
  return parseFloat(value.replace("%", "").replace(",", "."));
}

function parsePayback(value) {
  return parseFloat(value.replace("yrs", "").replace(",", ".").trim());
}

function parseMarginRange(value) {
  const [minRaw, maxRaw] = value.split("-").map((part) => part.replace("%", "").trim());
  return [parseFloat(minRaw.replace(",", ".")), parseFloat(maxRaw.replace(",", "."))];
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
