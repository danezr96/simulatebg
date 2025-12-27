// src/core/config/nicheDecisionFields.ts
import type { Niche } from "../domain";

export type DecisionFieldKind = "PRICE" | "MARKETING" | "STAFFING" | "CAPACITY" | "QUALITY";

export type DecisionField = {
  id: string;
  kind: DecisionFieldKind;
  label: string;
  description?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  guidanceKey?: "priceLevel" | "marketingLevel" | "employeesDelta" | "capacityDelta";
};

const field = (
  kind: DecisionFieldKind,
  label: string,
  description: string,
  options: Partial<Omit<DecisionField, "id" | "kind" | "label" | "description">> = {}
): DecisionField => ({
  id: kind,
  kind,
  label,
  description,
  ...options,
});

const PRICE_FIELD = (label: string, description: string) =>
  field("PRICE", label, description, { guidanceKey: "priceLevel", min: 0.6, max: 1.6, step: 0.02 });

const MARKETING_FIELD = (label: string, description: string) =>
  field("MARKETING", label, description, { guidanceKey: "marketingLevel", min: 0, max: 10_000, step: 50 });

const STAFFING_FIELD = (label: string, description: string) =>
  field("STAFFING", label, description, { guidanceKey: "employeesDelta", min: -25, max: 25, step: 1 });

const CAPACITY_FIELD = (label: string, description: string) =>
  field("CAPACITY", label, description, { guidanceKey: "capacityDelta", min: -50, max: 250, step: 10 });

const QUALITY_FIELD = (label: string, description: string) =>
  field("QUALITY", label, description, { min: 0, max: 0.4, step: 0.02 });

const DECISION_FIELD_PROFILES: Record<string, DecisionField[]> = {
  DEFAULT: [
    PRICE_FIELD("Pricing", "Adjust price level vs market baseline."),
    MARKETING_FIELD("Marketing spend", "Demand generation and brand visibility."),
    STAFFING_FIELD("Staffing change", "Hire or release team members."),
    CAPACITY_FIELD("Capacity change", "Expand or shrink weekly capacity."),
    QUALITY_FIELD("Quality investment", "Improve service or product quality."),
  ],
  SECTOR_HORECA: [
    PRICE_FIELD("Menu pricing", "Shift prices relative to local competition."),
    MARKETING_FIELD("Local promotion", "Foot traffic and delivery awareness."),
    STAFFING_FIELD("Staffing change", "Adjust front-of-house and kitchen shifts."),
    CAPACITY_FIELD("Seating capacity", "Tables, kitchens, or delivery throughput."),
    QUALITY_FIELD("Service quality", "Boost consistency and guest experience."),
  ],
  SECTOR_RETAIL: [
    PRICE_FIELD("Shelf pricing", "Adjust prices and promotions."),
    MARKETING_FIELD("Store marketing", "Local campaigns and traffic drivers."),
    STAFFING_FIELD("Floor staff change", "Sales and service coverage."),
    CAPACITY_FIELD("Inventory capacity", "Shelf space and backroom stock."),
    QUALITY_FIELD("Store experience", "Merchandising and service quality."),
  ],
  SECTOR_ECOM: [
    PRICE_FIELD("Product pricing", "Adjust catalog prices and discounts."),
    MARKETING_FIELD("Performance marketing", "Acquisition and conversion spend."),
    STAFFING_FIELD("Ops staffing", "Fulfillment and support headcount."),
    CAPACITY_FIELD("Fulfillment capacity", "Warehouse or partner throughput."),
    QUALITY_FIELD("Service quality", "Delivery and support improvements."),
  ],
  SECTOR_TECH: [
    PRICE_FIELD("Subscription pricing", "Monthly pricing vs market."),
    MARKETING_FIELD("Sales & demand gen", "Pipeline creation and growth."),
    STAFFING_FIELD("Team size change", "Product and customer success headcount."),
    CAPACITY_FIELD("Infrastructure capacity", "Hosting and tooling headroom."),
    QUALITY_FIELD("Product quality", "Reliability and user experience."),
  ],
  SECTOR_BUILD: [
    PRICE_FIELD("Bid margin", "Project pricing and markup."),
    MARKETING_FIELD("Pipeline outreach", "Lead generation and partnerships."),
    STAFFING_FIELD("Crew size change", "Project staffing."),
    CAPACITY_FIELD("Equipment capacity", "Tools and fleet readiness."),
    QUALITY_FIELD("Build quality", "Workmanship and rework reduction."),
  ],
  SECTOR_LOGI: [
    PRICE_FIELD("Service pricing", "Contract pricing and SLAs."),
    MARKETING_FIELD("Contract outreach", "Lead generation and bids."),
    STAFFING_FIELD("Driver staffing", "Drivers and ops team size."),
    CAPACITY_FIELD("Fleet capacity", "Vehicles and routes per week."),
    QUALITY_FIELD("Reliability investment", "On-time delivery and safety."),
  ],
  SECTOR_PROP: [
    PRICE_FIELD("Lease pricing", "Occupancy pricing and concessions."),
    MARKETING_FIELD("Occupancy marketing", "Demand and tenant acquisition."),
    STAFFING_FIELD("Ops staffing", "Property management team size."),
    CAPACITY_FIELD("Unit expansion", "Renovation and unit readiness."),
    QUALITY_FIELD("Property quality", "Upkeep and tenant experience."),
  ],
  SECTOR_MANU: [
    PRICE_FIELD("Unit pricing", "Wholesale pricing and terms."),
    MARKETING_FIELD("Channel marketing", "Distributor and account growth."),
    STAFFING_FIELD("Factory staffing", "Production line headcount."),
    CAPACITY_FIELD("Production capacity", "Machines and line throughput."),
    QUALITY_FIELD("Quality control", "Defect reduction and audits."),
  ],
  SECTOR_AGRI: [
    PRICE_FIELD("Crop pricing", "Contract and spot pricing."),
    MARKETING_FIELD("Distribution push", "Routes to market and buyers."),
    STAFFING_FIELD("Seasonal labor", "Harvest and field staffing."),
    CAPACITY_FIELD("Yield capacity", "Land and equipment usage."),
    QUALITY_FIELD("Quality grading", "Sorting and waste reduction."),
  ],
  SECTOR_ENER: [
    PRICE_FIELD("Contract pricing", "Tariffs and contracts."),
    MARKETING_FIELD("Stakeholder outreach", "Community and partner relations."),
    STAFFING_FIELD("Ops crew change", "Operations and maintenance teams."),
    CAPACITY_FIELD("Generation capacity", "Output and grid readiness."),
    QUALITY_FIELD("Reliability investment", "Uptime and safety compliance."),
  ],
  SECTOR_HEAL: [
    PRICE_FIELD("Service pricing", "Rates and reimbursement levels."),
    MARKETING_FIELD("Referral outreach", "Clinician and patient acquisition."),
    STAFFING_FIELD("Care staffing", "Clinicians and support staff."),
    CAPACITY_FIELD("Appointment capacity", "Rooms and appointment slots."),
    QUALITY_FIELD("Care quality", "Patient outcomes and standards."),
  ],
  SECTOR_MEDIA: [
    PRICE_FIELD("Package pricing", "Ad rates and content pricing."),
    MARKETING_FIELD("Audience growth", "Reach and engagement campaigns."),
    STAFFING_FIELD("Content team change", "Editors, producers, talent."),
    CAPACITY_FIELD("Production capacity", "Content throughput."),
    QUALITY_FIELD("Content quality", "Brand and retention improvements."),
  ],
  SECTOR_FIN: [
    PRICE_FIELD("Fee pricing", "Pricing vs competitor services."),
    MARKETING_FIELD("Client acquisition", "Pipeline and referrals."),
    STAFFING_FIELD("Advisor staffing", "Advisors and analysts."),
    CAPACITY_FIELD("Service capacity", "Accounts managed per week."),
    QUALITY_FIELD("Compliance investment", "Risk management and audits."),
  ],
  SECTOR_AUTO: [
    PRICE_FIELD("Service pricing", "Repair and service pricing."),
    MARKETING_FIELD("Local promotion", "Neighborhood awareness."),
    STAFFING_FIELD("Tech staffing", "Mechanics and service advisors."),
    CAPACITY_FIELD("Bay capacity", "Service bays and throughput."),
    QUALITY_FIELD("Repair quality", "Comeback reduction and reviews."),
  ],
  SECTOR_RECY: [
    PRICE_FIELD("Processing pricing", "Contracts and tonnage rates."),
    MARKETING_FIELD("Feedstock sourcing", "Supply acquisition efforts."),
    STAFFING_FIELD("Ops staffing", "Sorting and processing crew."),
    CAPACITY_FIELD("Sorting capacity", "Plant throughput."),
    QUALITY_FIELD("Compliance quality", "Safety and regulatory standards."),
  ],
};

function resolveProfileKey(niche: Niche | null | undefined): string {
  const explicit = String((niche as any)?.config?.decisionProfile ?? "").trim();
  if (explicit) return explicit;

  const nicheCode = String(niche?.code ?? "");
  const sectorCode = nicheCode.includes("_") ? nicheCode.split("_")[0] : "";
  const sectorKey = `SECTOR_${sectorCode}`;
  return DECISION_FIELD_PROFILES[sectorKey] ? sectorKey : "DEFAULT";
}

function shouldIncludeField(kind: DecisionFieldKind, config: Record<string, unknown>): boolean {
  const elasticity = Number(config.priceElasticity ?? 0.6);
  const labour = Number(config.labourIntensity ?? 0.6);
  const capex = String(config.capexIntensity ?? "MEDIUM");
  const capacityElasticity = Number(config.capacityElasticity ?? 0.6);
  const skill = Number(config.skillIntensity ?? 0.6);
  const regulation = Number(config.regulationRisk ?? 0.2);
  const competition = String(config.competitionType ?? "FRAGMENTED");

  switch (kind) {
    case "PRICE":
      return true;
    case "MARKETING":
      return elasticity >= 0.35 || competition === "FRAGMENTED";
    case "STAFFING":
      return labour >= 0.25;
    case "CAPACITY":
      return capex !== "LOW" || capacityElasticity >= 0.45;
    case "QUALITY":
      return skill >= 0.45 || regulation >= 0.3;
    default:
      return true;
  }
}

export function getDecisionFieldsForNiche(niche: Niche | null | undefined): DecisionField[] {
  if (!niche) return DECISION_FIELD_PROFILES.DEFAULT;

  const profileKey = resolveProfileKey(niche);
  const config = (niche as any)?.config ?? {};
  const fields = DECISION_FIELD_PROFILES[profileKey] ?? DECISION_FIELD_PROFILES.DEFAULT;
  const filtered = fields.filter((field) => shouldIncludeField(field.kind, config));

  return filtered.length ? filtered : DECISION_FIELD_PROFILES.DEFAULT;
}
