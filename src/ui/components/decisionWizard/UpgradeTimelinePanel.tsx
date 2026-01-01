import type { Company, CompanyUpgrade, NicheUpgrade } from "../../../core/domain";
import { yearWeekKey } from "../../../core/domain/time";
import { formatCurrencyCompact } from "../../../utils/format";
import { cn } from "../../../utils/format";
import Card from "../Card";
import { Button } from "../Button";

export type UpgradeTimelinePanelProps = {
  companies: Company[];
  upgradesByCompany: Map<string, NicheUpgrade[]>;
  ownedUpgradesByCompany: Map<string, CompanyUpgrade[]>;
  draftUpgradeQueue: Array<{ companyId: string; upgradeId: string }>;
  currentYear: number;
  currentWeek: number;
  onToggleUpgrade: (companyId: string, upgradeId: string) => void;
  disabled?: boolean;
};

type TimelineStage = "Planned" | "In progress" | "Completing next tick" | "Completed";

function weeksBetween(yearA: number, weekA: number, yearB: number, weekB: number): number {
  return yearWeekKey(yearA as any, weekA as any) - yearWeekKey(yearB as any, weekB as any);
}

function resolveStage(
  owned: CompanyUpgrade | null,
  upgrade: NicheUpgrade | undefined,
  currentYear: number,
  currentWeek: number
): TimelineStage {
  if (!owned) return "Planned";
  if (!upgrade) return "Completed";

  const delay = Math.max(0, Math.round(upgrade.delayWeeks?.min ?? upgrade.durationWeeks ?? 0));
  const elapsed = weeksBetween(currentYear, currentWeek, Number(owned.purchasedYear), Number(owned.purchasedWeek));

  if (delay === 0) return "Completed";
  if (elapsed < delay - 1) return "In progress";
  if (elapsed === delay - 1) return "Completing next tick";
  return "Completed";
}

function stageBadge(stage: TimelineStage) {
  switch (stage) {
    case "Planned":
      return "bg-slate-100 text-slate-700";
    case "In progress":
      return "bg-amber-100 text-amber-700";
    case "Completing next tick":
      return "bg-emerald-100 text-emerald-700";
    case "Completed":
    default:
      return "bg-emerald-50 text-emerald-700";
  }
}

export function UpgradeTimelinePanel({
  companies,
  upgradesByCompany,
  ownedUpgradesByCompany,
  draftUpgradeQueue,
  currentYear,
  currentWeek,
  onToggleUpgrade,
  disabled,
}: UpgradeTimelinePanelProps) {
  return (
    <div className="space-y-4">
      {companies.map((company) => {
        const companyId = String(company.id);
        const available = upgradesByCompany.get(companyId) ?? [];
        const owned = ownedUpgradesByCompany.get(companyId) ?? [];
        const ownedIds = new Set(owned.map((o) => String(o.upgradeId)));
        const plannedIds = new Set(
          draftUpgradeQueue.filter((u) => u.companyId === companyId).map((u) => u.upgradeId)
        );

        const timelineItems = available
          .filter((upgrade) => ownedIds.has(String(upgrade.id)) || plannedIds.has(String(upgrade.id)))
          .map((upgrade) => {
            const ownedUpgrade = owned.find((o) => String(o.upgradeId) === String(upgrade.id)) ?? null;
            const stage = resolveStage(ownedUpgrade, upgrade, currentYear, currentWeek);
            return { upgrade, stage, ownedUpgrade };
          });

        const selectable = available.filter(
          (upgrade) => !ownedIds.has(String(upgrade.id))
        );

        return (
          <Card key={companyId} className="p-4">
            <div className="text-sm font-semibold text-[var(--text)]">{company.name} upgrades</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              {"Planned -> in progress -> completing -> completed"}
            </div>

            <div className="mt-3 space-y-2">
              {timelineItems.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)]">No upgrades queued yet.</div>
              ) : (
                timelineItems.map(({ upgrade, stage }) => {
                  const hasRisk =
                    Array.isArray((upgrade as any)?.risk?.failureEffects) &&
                    (upgrade as any)?.risk?.failureEffects.length > 0;
                  return (
                  <div
                    key={upgrade.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{upgrade.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {upgrade.description ?? "Upgrade effect applied per tick."}
                      </div>
                      {hasRisk && stage !== "Completed" ? (
                        <div className="text-xs text-amber-600">Implementation dip possible.</div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
                          stageBadge(stage)
                        )}
                      >
                        {stage}
                      </span>
                      <div className="text-xs font-semibold text-[var(--text)]">
                        {formatCurrencyCompact(Number(upgrade.cost ?? 0))}
                      </div>
                    </div>
                  </div>
                );
                })
              )}
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Add upgrades
              </div>
              <div className="mt-2 space-y-2">
                {selectable.slice(0, 6).map((upgrade) => {
                  const isPlanned = plannedIds.has(String(upgrade.id));
                  return (
                    <div
                      key={upgrade.id}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[var(--text)]">{upgrade.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{upgrade.durationWeeks} weeks</div>
                      </div>
                      <Button
                        size="sm"
                        variant={isPlanned ? "secondary" : "ghost"}
                        onClick={() => onToggleUpgrade(companyId, String(upgrade.id))}
                        disabled={disabled}
                      >
                        {isPlanned ? "Planned" : "Plan"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default UpgradeTimelinePanel;
