// src/ui/panels/CompaniesPanel.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { Search, Filter, RefreshCw, Store } from "lucide-react";

import { MOTION } from "../../config/motion";

import { Card } from "../components/Card";
import Button from "../components/Button";
import CompanyMarketplace from "../components/CompanyMarketplace";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";
import { cn, formatPercent } from "../../utils/format";
import { formatMoney } from "../../utils/money";

import { useCompanies } from "../hooks/useCompany";
import { useHolding } from "../hooks/useHolding";
import { useWorld } from "../hooks/useWorld";
import { useStartupListings } from "../hooks/useStartupListings";
import type { StartupListing } from "../hooks/useStartupListings";

import { companyService } from "../../core/services/companyService";
import { asHoldingId, asSectorId, asNicheId } from "../../core/domain";

export const CompaniesPanel: React.FC = () => {
  const { companies, refetch, isLoading, holdingId } = useCompanies();
  const { holding } = useHolding();
  const { world, economy } = useWorld();
  const { listings, sectors, niches, loading: listingsLoading, error: listingsError } = useStartupListings();

  const worldId = world?.id ? String(world.id) : undefined;
  const holdingCash = Number(holding?.cashBalance ?? 0);

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const [selectedListingId, setSelectedListingId] = React.useState<string | null>(null);
  const [purchaseName, setPurchaseName] = React.useState("");
  const [purchaseRegion, setPurchaseRegion] = React.useState("EU-WEST");
  const [purchaseError, setPurchaseError] = React.useState<string | null>(null);
  const [purchaseBusy, setPurchaseBusy] = React.useState(false);

  const marketplaceRef = React.useRef<HTMLDivElement | null>(null);

  const selectedListing = React.useMemo(
    () => listings.find((listing) => listing.id === selectedListingId) ?? null,
    [listings, selectedListingId]
  );

  const filteredCompanies = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (companies ?? []).filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [companies, query, statusFilter]);

  const canPurchase =
    !!selectedListing &&
    !!worldId &&
    !!holdingId &&
    purchaseName.trim().length > 0 &&
    holdingCash >= selectedListing.pricing.startupCost &&
    !purchaseBusy;

  const onSelectListing = (listing: StartupListing) => {
    setSelectedListingId(listing.id);
    if (!purchaseName.trim()) {
      setPurchaseName(`${listing.niche.name} Co`);
    }
    setPurchaseError(null);
  };

  const onPurchase = async () => {
    setPurchaseError(null);

    if (!worldId || !holdingId) {
      setPurchaseError("World/Holding not ready yet.");
      return;
    }
    if (!selectedListing) {
      setPurchaseError("Select a listing first.");
      return;
    }
    if (!purchaseName.trim()) {
      setPurchaseError("Company name is required.");
      return;
    }
    if (holdingCash < selectedListing.pricing.startupCost) {
      setPurchaseError("Not enough cash to purchase this company.");
      return;
    }

    setPurchaseBusy(true);
    try {
      await companyService.createCompany({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        name: purchaseName.trim(),
        region: purchaseRegion.trim(),
        sectorId: asSectorId(String(selectedListing.sector.id)),
        nicheId: asNicheId(String(selectedListing.niche.id)),
        foundedYear: Number(economy?.currentYear ?? 1),
      });

      await refetch();
      setPurchaseName("");
      setSelectedListingId(null);
    } catch (e: any) {
      setPurchaseError(e?.message ?? "Failed to purchase company");
    } finally {
      setPurchaseBusy(false);
    }
  };

  return (
    <motion.div className="space-y-4" initial="hidden" animate="show" variants={MOTION.page.variants}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">Companies</div>
          <div className="text-sm text-[var(--text-muted)]">
            Manage your portfolio and purchase new companies.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => marketplaceRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            Purchase company
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              className={cn(
                "w-full bg-transparent outline-none text-sm text-[var(--text)]",
                "placeholder:text-[var(--text-muted)]"
              )}
              placeholder="Search by name or region"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
            <Filter className="h-4 w-4 text-[var(--text-muted)]" />
            <select
              className="w-full bg-transparent outline-none text-sm text-[var(--text)]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="LIQUIDATING">Liquidating</option>
              <option value="BANKRUPT">Bankrupt</option>
              <option value="SOLD">Sold</option>
            </select>
          </div>
        </div>
      </Card>

      <Table
        caption={`Companies (${filteredCompanies.length})`}
        isEmpty={!isLoading && filteredCompanies.length === 0}
        emptyMessage="No companies found. Purchase one to start."
      >
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Region</TH>
            <TH>Sector</TH>
            <TH>Niche</TH>
            <TH className="text-right">Status</TH>
          </TR>
        </THead>
        <TBody>
          {filteredCompanies.map((c: any) => (
            <TR
              key={String(c.id)}
              interactive
              className="cursor-pointer"
              onClick={() => (window.location.href = `/game/companies/${c.id}`)}
            >
              <TD className="font-semibold">{c.name}</TD>
              <TD>{c.region}</TD>
              <TD>{String(c.sectorId ?? "")}</TD>
              <TD>{String(c.nicheId ?? "")}</TD>
              <TD className="text-right">
                <span className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-2 py-1 text-xs">
                  {c.status}
                </span>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <div ref={marketplaceRef} id="company-marketplace" className="space-y-4">
        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Store className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Purchase company</div>
          </div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            Browse blank company listings. Each sector and niche has its own startup cost and expected return.
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="text-xs text-[var(--text-muted)]">Selected listing</div>
              {selectedListing ? (
                <div className="mt-2 space-y-2 text-sm">
                  <div className="text-base font-semibold text-[var(--text)]">
                    {selectedListing.niche.name} - {selectedListing.sector.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs">
                      Startup: {formatMoney(selectedListing.pricing.startupCost)}
                    </span>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs">
                      ROI: {formatPercent(selectedListing.pricing.roi)}
                    </span>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs">
                      Payback: {selectedListing.pricing.paybackYears.toFixed(1)} yrs
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Expected annual profit: {formatMoney(selectedListing.pricing.annualProfit)}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-[var(--text-muted)]">
                  Select a listing to see the full purchase summary.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">Company name</label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
                    placeholder="e.g., Northwind Logistics BV"
                    value={purchaseName}
                    onChange={(e) => setPurchaseName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">Region</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
                    value={purchaseRegion}
                    onChange={(e) => setPurchaseRegion(e.target.value)}
                  >
                    <option value="EU-WEST">EU-WEST</option>
                    <option value="EU-CENTRAL">EU-CENTRAL</option>
                    <option value="US-EAST">US-EAST</option>
                  </select>
                </div>

                <div className="text-xs text-[var(--text-muted)]">
                  Available cash: <span className="text-[var(--text)]">{formatMoney(holdingCash)}</span>
                </div>

                <Button variant="primary" size="sm" onClick={onPurchase} loading={purchaseBusy} disabled={!canPurchase}>
                  Purchase company
                </Button>
              </div>
            </div>
          </div>

          {purchaseError ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {purchaseError}
            </div>
          ) : null}
        </Card>

        <CompanyMarketplace
          listings={listings}
          sectors={sectors}
          niches={niches}
          loading={listingsLoading}
          error={listingsError}
          selectedId={selectedListingId}
          availableCash={holdingCash}
          actionLabel="Select"
          onSelect={onSelectListing}
        />
      </div>
    </motion.div>
  );
};

export default CompaniesPanel;


