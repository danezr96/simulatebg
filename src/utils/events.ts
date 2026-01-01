type EventTone = "positive" | "negative" | "neutral";

export type EventNarrative = {
  headline: string;
  detail: string;
  tone: EventTone;
};

const EVENT_COPY: Record<string, { headline: string; tone: EventTone }> = {
  MACRO_SHOCK: { headline: "Macro shock rattles demand", tone: "negative" },
  GLOBAL_CRISIS: { headline: "Global crisis tightens capital", tone: "negative" },
  MARKET_PANIC: { headline: "Market panic drives caution", tone: "negative" },

  SECTOR_BOOST: { headline: "Sector demand surges", tone: "positive" },
  SECTOR_CRASH: { headline: "Sector demand cools", tone: "negative" },

  COMPANY_PR_AWARD: { headline: "Brand wins local spotlight", tone: "positive" },
  INNOVATION_BOOST: { headline: "Innovation lifts momentum", tone: "positive" },
  LOCAL_HYPE: { headline: "Local buzz boosts demand", tone: "positive" },
  COMPANY_FINE: { headline: "Compliance fine hits margins", tone: "negative" },
  COMPANY_STRIKE: { headline: "Labor strike disrupts output", tone: "negative" },
  SUPPLY_SHOCK: { headline: "Supply shock raises costs", tone: "negative" },

  BANK_REVIEW: { headline: "Bank review checks leverage", tone: "neutral" },
  HOLDING_PRIZE: { headline: "Holding wins a recognition award", tone: "positive" },
};

function impactLabel(severity: number) {
  if (severity >= 1.6) return "High impact";
  if (severity >= 1.1) return "Moderate impact";
  return "Light impact";
}

export function describeEvent(event: any): EventNarrative {
  const payload = event?.payload ?? {};
  const explicit = String(payload.title ?? payload.summary ?? "").trim();
  const type = String(event?.type ?? "EVENT");
  const severity = Number(event?.severity ?? 0);
  const impact = impactLabel(severity);

  if (explicit) {
    return {
      headline: explicit,
      detail: impact,
      tone: severity >= 1 ? "negative" : "neutral",
    };
  }

  const copy = EVENT_COPY[type] ?? { headline: type.replace(/_/g, " ").toLowerCase(), tone: "neutral" };
  const headline = copy.headline.charAt(0).toUpperCase() + copy.headline.slice(1);

  return {
    headline,
    detail: impact,
    tone: copy.tone,
  };
}

export function formatEventScope(scope?: string | null): string {
  switch (String(scope ?? "").toUpperCase()) {
    case "WORLD":
      return "Global";
    case "SECTOR":
      return "Sector";
    case "COMPANY":
      return "Company";
    case "HOLDING":
      return "Holding";
    default:
      return "World";
  }
}
