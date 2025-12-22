// src/ui/panels/CompaniesPanel.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, RefreshCw } from "lucide-react";

import { MOTION } from "../../config/motion";

import { Card } from "../components/Card";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";
import { cn } from "../../utils/format";

import { useCompanies } from "../hooks/useCompany";
import { useWorld } from "../hooks/useWorld";

import { companyService } from "../../core/services/companyService";
import { sectorRepo } from "../../core/persistence/sectorRepo";

import {
  asHoldingId,
  asWorldId,
  asSectorId,
  asNicheId,
} from "../../core/domain";

type SectorOption = { id: string; name: string };
type NicheOption = { id: string; sectorId: string; name: string };

type CreateCompanyForm = {
  name: string;
  region: string;
  sectorId: string;
  nicheId: string;
};

const defaultForm: CreateCompanyForm = {
  name: "",
  region: "EU-WEST",
  sectorId: "",
  nicheId: "",
};

export const CompaniesPanel: React.FC = () => {
  const { companies, refetch, isLoading, holdingId } = useCompanies();
  const { world, economy } = useWorld();

  const worldId = world?.id ? String(world.id) : undefined;

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const [openCreate, setOpenCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState<CreateCompanyForm>(defaultForm);
  const [error, setError] = React.useState<string | null>(null);

  // --- load sectors/niches (real DB lists) ---
  const [sectors, setSectors] = React.useState<SectorOption[]>([]);
  const [niches, setNiches] = React.useState<NicheOption[]>([]);
  const [listsLoading, setListsLoading] = React.useState(false);
  const [listsError, setListsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function loadLists() {
      setListsLoading(true);
      setListsError(null);
      try {
        const s = await sectorRepo.listSectors();
        const n = await sectorRepo.listAllNiches();

        if (!alive) return;

        setSectors(
          (s ?? []).map((x: any) => ({
            id: String(x.id),
            name: String(x.name ?? x.label ?? x.code ?? x.id),
          }))
        );

        setNiches(
          (n ?? []).map((x: any) => ({
            id: String(x.id),
            sectorId: String(x.sectorId ?? x.sector_id),
            name: String(x.name ?? x.label ?? x.code ?? x.id),
          }))
        );
      } catch (e: any) {
        if (!alive) return;
        setListsError(e?.message ?? "Failed to load sectors/niches");
      } finally {
        if (!alive) return;
        setListsLoading(false);
      }
    }

    if (openCreate) void loadLists();
    return () => {
      alive = false;
    };
  }, [openCreate]);

  const filteredNiches = React.useMemo(() => {
    if (!form.sectorId) return [];
    return niches.filter((n) => n.sectorId === form.sectorId);
  }, [niches, form.sectorId]);

  // reset niche if sector changes
  React.useEffect(() => {
    if (!form.sectorId) {
      if (form.nicheId) setForm((f) => ({ ...f, nicheId: "" }));
      return;
    }
    if (form.nicheId && !filteredNiches.some((n) => n.id === form.nicheId)) {
      setForm((f) => ({ ...f, nicheId: "" }));
    }
  }, [form.sectorId, form.nicheId, filteredNiches]);

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

  const resetForm = () => setForm(defaultForm);

  const onCreate = async () => {
    setError(null);

    if (!worldId || !holdingId) {
      setError("World/Holding not ready yet.");
      return;
    }
    if (!form.name.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!form.sectorId) {
      setError("Sector is required.");
      return;
    }
    if (!form.nicheId) {
      setError("Niche is required.");
      return;
    }

    setCreating(true);
    try {
      await companyService.createCompany({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        name: form.name.trim(),
        region: form.region.trim(),
        sectorId: asSectorId(form.sectorId),
        nicheId: asNicheId(form.nicheId),
        foundedYear: Number(economy?.currentYear ?? 1),
      });

      await refetch();
      setOpenCreate(false);
      resetForm();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create company");
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="show"
      variants={MOTION.page.variants}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">
            Companies
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            Manage your BV’s across sectors and niches.
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
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setOpenCreate(true)}
          >
            New company
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
              placeholder="Search by name or region…"
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
        emptyMessage="No companies found. Create one to start."
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

      <Modal
        open={openCreate}
        onOpenChange={(v) => {
          setOpenCreate(v);
          if (!v) {
            setError(null);
            setListsError(null);
            resetForm();
          }
        }}
        title="Create new company"
        description="Pick a sector + niche and create your company."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={creating} onClick={onCreate}>
              Create
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Company name
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm outline-none"
              placeholder="e.g., Northwind Logistics BV"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Region
            </label>
            <input
              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm outline-none"
              placeholder="EU-WEST"
              value={form.region}
              onChange={(e) =>
                setForm((f) => ({ ...f, region: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Sector
            </label>
            <select
              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm outline-none"
              value={form.sectorId}
              onChange={(e) =>
                setForm((f) => ({ ...f, sectorId: e.target.value }))
              }
              disabled={listsLoading || !!listsError}
            >
              <option value="">
                {listsLoading ? "Loading…" : "Select a sector"}
              </option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Niche
            </label>
            <select
              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm outline-none"
              value={form.nicheId}
              onChange={(e) =>
                setForm((f) => ({ ...f, nicheId: e.target.value }))
              }
              disabled={!form.sectorId || listsLoading || !!listsError}
            >
              <option value="">
                {!form.sectorId
                  ? "Select sector first"
                  : listsLoading
                  ? "Loading…"
                  : filteredNiches.length
                  ? "Select a niche"
                  : "No niches for this sector"}
              </option>
              {filteredNiches.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {listsError ? (
            <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {listsError}
            </div>
          ) : null}

          {error ? (
            <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </Modal>
    </motion.div>
  );
};

export default CompaniesPanel;
