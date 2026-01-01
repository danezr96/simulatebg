// src/ui/panels/FinancePanel.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Wallet,
  CreditCard,
  Building2,
  RefreshCw,
  Store,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { MOTION } from "../../config/motion";
import { economyConfig } from "../../config/economy";

import { Card } from "../components/Card";
import Button from "../components/Button";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";
import KPIChip from "../components/KPIChip";
import Sparkline from "../components/Sparkline";
import PieChart from "../components/PieChart";

import { useWorld } from "../hooks/useWorld";
import { useHolding } from "../hooks/useHolding";
import { useCompanies } from "../hooks/useCompany";
import { useSectorDirectory } from "../hooks/useSectorDirectory";
import { useCurrentPlayer } from "../hooks/useCurrentPlayer";

import { financeRepo } from "../../core/persistence/financeRepo";
import { companyRepo } from "../../core/persistence/companyRepo";
import { acquisitionRepo } from "../../core/persistence/acquisitionRepo";
import { companyService } from "../../core/services/companyService";
import { decisionService } from "../../core/services/decisionService";
import { scoreboardService, type HoldingSectorShare } from "../../core/services/scoreboardService";
import { asCompanyId, asHoldingId, asWorldId } from "../../core/domain";
import type { Loan, AcquisitionOffer } from "../../core/domain";

import { formatMoney, money } from "../../utils/money";
import { cn } from "../../utils/format";
import { applyCreditRate, estimateWeeklyLoanPayment, getCreditTier } from "../../utils/loan";

type PortfolioTotals = {
  revenue: number;
  netProfit: number;
  cashChange: number;
  assets: number;
  liabilities: number;
};

type PortfolioSeries = {
  revenue: number[];
  netProfit: number[];
  assets: number[];
  liabilities: number[];
};

type MarketRow = {
  id: string;
  name: string;
  sectorId: string;
  nicheId: string;
  region: string;
  revenue: number;
  netProfit: number;
  price: number;
};

type CompanyDirectoryRow = {
  id: string;
  name: string;
  sectorId: string;
  nicheId: string;
  region: string;
};


const emptyTotals: PortfolioTotals = {
  revenue: 0,
  netProfit: 0,
  cashChange: 0,
  assets: 0,
  liabilities: 0,
};

const emptySeries: PortfolioSeries = {
  revenue: [],
  netProfit: [],
  assets: [],
  liabilities: [],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const seriesStats = (data: number[]) => {
  if (!data.length) return { min: 0, max: 0, last: 0, delta: 0 };
  const clean = data.map((v) => (Number.isFinite(v) ? v : 0));
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const last = clean[clean.length - 1] ?? 0;
  const prev = clean[clean.length - 2] ?? last;
  const delta = last - prev;
  return { min, max, last, delta };
};

const TAB_OPTIONS = [
  { key: "overview", label: "Overview", description: "Cash, portfolio, and loans at a glance." },
  { key: "loans", label: "Loans", description: "Borrow extra capital for the next round." },
  { key: "acquisitions", label: "Acquisitions", description: "Browse companies available for takeover." },
] as const;

export const FinancePanel: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const activeTab = (params.get("tab") ?? "overview") as (typeof TAB_OPTIONS)[number]["key"];

  const { world, economy } = useWorld();
  const holdingHook = useHolding();
  const { holding } = holdingHook;
  const refreshHolding = holdingHook.refetch ?? (async () => {});

  const { companies } = useCompanies();
  const { sectorById, nicheById } = useSectorDirectory();
  const { player } = useCurrentPlayer();

  const worldId = world?.id ? String(world.id) : undefined;
  const holdingId = holding?.id ? String(holding.id) : undefined;

  const currentYear = economy?.currentYear ?? 1;
  const currentWeek = economy?.currentWeek ?? 1;

  const cash = Number(holding?.cashBalance ?? 0);
  const debt = Number(holding?.totalDebt ?? 0);
  const equity = Number(holding?.totalEquity ?? 0);
  const netWorth = cash + equity - debt;

  const [portfolioTotals, setPortfolioTotals] = React.useState<PortfolioTotals>(emptyTotals);
  const [portfolioLoading, setPortfolioLoading] = React.useState(false);
  const [portfolioError, setPortfolioError] = React.useState<string | null>(null);
  const [portfolioSeries, setPortfolioSeries] = React.useState<PortfolioSeries>(emptySeries);
  const [portfolioSeriesLoading, setPortfolioSeriesLoading] = React.useState(false);
  const [portfolioSeriesError, setPortfolioSeriesError] = React.useState<string | null>(null);

  const [loans, setLoans] = React.useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = React.useState(false);
  const [loansError, setLoansError] = React.useState<string | null>(null);

  const [marketRows, setMarketRows] = React.useState<MarketRow[]>([]);
  const [marketLoading, setMarketLoading] = React.useState(false);
  const [marketError, setMarketError] = React.useState<string | null>(null);
  const [marketQuery, setMarketQuery] = React.useState("");
  const [marketSubmittingId, setMarketSubmittingId] = React.useState<string | null>(null);
  const [companyDirectory, setCompanyDirectory] = React.useState<Record<string, CompanyDirectoryRow>>({});
  const [offers, setOffers] = React.useState<AcquisitionOffer[]>([]);
  const [offerDrafts, setOfferDrafts] = React.useState<Record<string, string>>({});
  const [counterDrafts, setCounterDrafts] = React.useState<Record<string, string>>({});
  const [offerMessage, setOfferMessage] = React.useState<string | null>(null);
  const [holdingShareRows, setHoldingShareRows] = React.useState<HoldingSectorShare[]>([]);
  const [holdingShareLoading, setHoldingShareLoading] = React.useState(false);
  const [holdingShareError, setHoldingShareError] = React.useState<string | null>(null);

  const loadPortfolio = React.useCallback(async () => {
    if (!companies.length) {
      setPortfolioTotals(emptyTotals);
      return;
    }

    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      const rows = await Promise.all(
        companies.map((company) => companyService.getLatestFinancials(asCompanyId(String(company.id))))
      );

      const totals = rows.reduce<PortfolioTotals>((acc, row) => {
        if (!row) return acc;
        return {
          revenue: acc.revenue + Number(row.revenue ?? 0),
          netProfit: acc.netProfit + Number(row.netProfit ?? 0),
          cashChange: acc.cashChange + Number(row.cashChange ?? 0),
          assets: acc.assets + Number(row.assets ?? 0),
          liabilities: acc.liabilities + Number(row.liabilities ?? 0),
        };
      }, { ...emptyTotals });

      setPortfolioTotals(totals);
    } catch (error: any) {
      setPortfolioError(error?.message ?? "Failed to load portfolio totals.");
      setPortfolioTotals(emptyTotals);
    } finally {
      setPortfolioLoading(false);
    }
  }, [companies]);

  const loadPortfolioSeries = React.useCallback(async () => {
    if (!companies.length) {
      setPortfolioSeries(emptySeries);
      return;
    }

    setPortfolioSeriesLoading(true);
    setPortfolioSeriesError(null);
    try {
      const rowsByCompany = await Promise.all(
        companies.map((company) => companyService.listFinancials(asCompanyId(String(company.id)), 26))
      );

      const byWeek = new Map<
        number,
        { revenue: number; netProfit: number; assets: number; liabilities: number }
      >();

      for (const rows of rowsByCompany) {
        for (const row of rows ?? []) {
          const year = Number((row as any).year ?? 0);
          const week = Number((row as any).week ?? 0);
          if (!year || !week) continue;
          const key = year * 52 + week;
          const prev = byWeek.get(key) ?? { revenue: 0, netProfit: 0, assets: 0, liabilities: 0 };
          byWeek.set(key, {
            revenue: prev.revenue + Number(row.revenue ?? 0),
            netProfit: prev.netProfit + Number(row.netProfit ?? 0),
            assets: prev.assets + Number((row as any).assets ?? 0),
            liabilities: prev.liabilities + Number((row as any).liabilities ?? 0),
          });
        }
      }

      const ordered = Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]);
      const revenue = ordered.map(([, value]) => value.revenue);
      const netProfit = ordered.map(([, value]) => value.netProfit);
      const assets = ordered.map(([, value]) => value.assets);
      const liabilities = ordered.map(([, value]) => value.liabilities);

      setPortfolioSeries({ revenue, netProfit, assets, liabilities });
    } catch (error: any) {
      setPortfolioSeriesError(error?.message ?? "Failed to load portfolio trends.");
      setPortfolioSeries(emptySeries);
    } finally {
      setPortfolioSeriesLoading(false);
    }
  }, [companies]);

  const loadLoans = React.useCallback(async () => {
    if (!holdingId) {
      setLoans([]);
      return;
    }

    setLoansLoading(true);
    setLoansError(null);
    try {
      const rows = await financeRepo.listLoansByHolding(asHoldingId(holdingId));
      setLoans(rows ?? []);
    } catch (error: any) {
      setLoansError(error?.message ?? "Failed to load loans.");
      setLoans([]);
    } finally {
      setLoansLoading(false);
    }
  }, [holdingId]);

  const loadOffers = React.useCallback(async () => {
    if (!holdingId || !worldId) {
      setOffers([]);
      return;
    }
    try {
      const rows = await acquisitionRepo.listByHolding({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
      });
      setOffers(rows ?? []);
    } catch {
      setOffers([]);
    }
  }, [holdingId, worldId]);

  const loadMarketplace = React.useCallback(async () => {
    if (!worldId || !holdingId) {
      setMarketRows([]);
      return;
    }

    setMarketLoading(true);
    setMarketError(null);
    try {
      const rows = await companyRepo.listByWorld(asWorldId(worldId));
      const candidates = (rows ?? []).filter(
        (row) => String(row.holdingId) !== String(holdingId) && String(row.status ?? "ACTIVE") === "ACTIVE"
      );
      const slice = candidates.slice(0, 18);

      const directory: Record<string, CompanyDirectoryRow> = {};
      for (const row of rows ?? []) {
        if (!row?.id) continue;
        directory[String(row.id)] = {
          id: String(row.id),
          name: String(row.name ?? "Company"),
          sectorId: String(row.sectorId ?? ""),
          nicheId: String(row.nicheId ?? ""),
          region: String(row.region ?? ""),
        };
      }

      const financials = await Promise.all(
        slice.map((company) => companyService.getLatestFinancials(asCompanyId(String(company.id))))
      );

      const mapped = slice.map((company, idx) => {
        const fin = financials[idx];
        const revenue = Number(fin?.revenue ?? 0);
        const netProfit = Number(fin?.netProfit ?? 0);
        const equityValue = Number(fin?.equity ?? 0);
        const price = Math.max(10_000, revenue * 1.1, netProfit * 6, equityValue * 1.2);

        return {
          id: String(company.id),
          name: String(company.name ?? "Company"),
          sectorId: String(company.sectorId ?? ""),
          nicheId: String(company.nicheId ?? ""),
          region: String(company.region ?? ""),
          revenue,
          netProfit,
          price,
        };
      });

      setMarketRows(mapped);
      setCompanyDirectory(directory);
      setOfferDrafts((prev) => {
        const next = { ...prev };
        for (const row of mapped) {
          if (next[row.id] === undefined) {
            next[row.id] = String(Math.round(row.price));
          }
        }
        return next;
      });
      await loadOffers();
    } catch (error: any) {
      setMarketError(error?.message ?? "Failed to load acquisition market.");
      setMarketRows([]);
    } finally {
      setMarketLoading(false);
    }
  }, [worldId, holdingId, loadOffers]);

  const loadHoldingMarketShare = React.useCallback(async () => {
    if (!worldId || !holdingId) {
      setHoldingShareRows([]);
      return;
    }

    setHoldingShareLoading(true);
    setHoldingShareError(null);
    try {
      const rows = await scoreboardService.getHoldingMarketShareBySector(
        asWorldId(worldId),
        String(holdingId),
        6
      );
      setHoldingShareRows(rows ?? []);
    } catch (error: any) {
      setHoldingShareError(error?.message ?? "Failed to load market share.");
      setHoldingShareRows([]);
    } finally {
      setHoldingShareLoading(false);
    }
  }, [worldId, holdingId]);

  React.useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio, currentWeek, currentYear]);

  React.useEffect(() => {
    void loadPortfolioSeries();
  }, [loadPortfolioSeries, currentWeek, currentYear]);

  React.useEffect(() => {
    void loadLoans();
  }, [loadLoans, currentWeek, currentYear]);

  React.useEffect(() => {
    if (activeTab === "acquisitions") {
      void loadMarketplace();
    }
  }, [activeTab, loadMarketplace]);

  React.useEffect(() => {
    void loadHoldingMarketShare();
  }, [loadHoldingMarketShare, currentWeek, currentYear]);

  const baseRate = Number(economy?.baseInterestRate ?? economyConfig.interest.baseAnnualRate ?? 0.02);
  const minRate = economyConfig.interest.minAnnualRate ?? 0;
  const maxRate = economyConfig.interest.maxAnnualRate ?? 0.2;
  const minTerm = economyConfig.loans.termWeeks.min;
  const maxTerm = economyConfig.loans.termWeeks.max;
  const creditLevel = Number(player?.creditRepLevel ?? 1);
  const creditTier = getCreditTier(creditLevel);

  const loanOffers = React.useMemo(
    () => [
      {
        id: "bridge",
        label: "Bridge loan",
        principal: 500_000,
        termWeeks: clamp(78, minTerm, maxTerm),
        spread: economyConfig.loans.spread.min,
        lenderName: "Atlas Credit",
      },
      {
        id: "growth",
        label: "Growth loan",
        principal: 2_000_000,
        termWeeks: clamp(156, minTerm, maxTerm),
        spread: (economyConfig.loans.spread.min + economyConfig.loans.spread.max) / 2,
        lenderName: "Northwind Bank",
      },
      {
        id: "expansion",
        label: "Expansion loan",
        principal: 6_000_000,
        termWeeks: clamp(260, minTerm, maxTerm),
        spread: economyConfig.loans.spread.max,
        lenderName: "Venture Capital Partners",
      },
    ],
    [minTerm, maxTerm]
  );

  const loanOffersWithRates = React.useMemo(
    () =>
      loanOffers.map((offer) => {
        const rawRate = clamp(baseRate + offer.spread, minRate, maxRate);
        const applied = applyCreditRate({
          baseRate: rawRate,
          creditLevel,
          minRate,
          maxRate,
        });
        return {
          ...offer,
          baseRate: rawRate,
          rate: applied.rate,
        };
      }),
    [loanOffers, baseRate, minRate, maxRate, creditLevel]
  );

  const [selectedOfferId, setSelectedOfferId] = React.useState(loanOffers[0].id);
  const fallbackOffer =
    loanOffersWithRates[0] ?? {
      ...loanOffers[0],
      baseRate: clamp(baseRate + loanOffers[0].spread, minRate, maxRate),
      rate: clamp(baseRate + loanOffers[0].spread, minRate, maxRate),
    };
  const selectedOffer = loanOffersWithRates.find((offer) => offer.id === selectedOfferId) ?? fallbackOffer;
  const selectedRate = selectedOffer.rate ?? clamp(baseRate + loanOffers[0].spread, minRate, maxRate);
  const selectedPayment = estimateWeeklyLoanPayment({
    principal: selectedOffer?.principal ?? 0,
    annualRate: selectedRate,
    termWeeks: selectedOffer?.termWeeks ?? 1,
  });

  const [loanBusy, setLoanBusy] = React.useState(false);
  const [loanMessage, setLoanMessage] = React.useState<string | null>(null);
  const [repayAmountByLoanId, setRepayAmountByLoanId] = React.useState<Record<string, string>>({});
  const [repayBusyId, setRepayBusyId] = React.useState<string | null>(null);
  const [repayMessage, setRepayMessage] = React.useState<string | null>(null);

  const onTakeLoan = async () => {
    setLoanMessage(null);
    if (!worldId || !holdingId) {
      setLoanMessage("World or holding is not ready yet.");
      return;
    }
    if (!selectedOffer) {
      setLoanMessage("Select a loan offer first.");
      return;
    }

    setLoanBusy(true);
    try {
      await financeRepo.createHoldingLoan({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        principal: selectedOffer.principal,
        interestRate: selectedRate,
        termWeeks: selectedOffer.termWeeks,
        lenderName: selectedOffer.lenderName,
      });

      setLoanMessage("Loan funded. Capital added to your holding.");
      await Promise.all([loadLoans(), refreshHolding()]);
    } catch (error: any) {
      setLoanMessage(error?.message ?? "Failed to take loan.");
    } finally {
      setLoanBusy(false);
    }
  };

  const onRepayLoan = async (loan: Loan) => {
    setRepayMessage(null);
    if (!worldId || !holdingId) {
      setRepayMessage("World or holding is not ready yet.");
      return;
    }

    const raw = repayAmountByLoanId[String(loan.id)] ?? "";
    const requested = Number(raw);
    if (!Number.isFinite(requested) || requested <= 0) {
      setRepayMessage("Enter a valid repayment amount.");
      return;
    }

    const outstanding = Number(loan.outstandingBalance ?? 0);
    if (outstanding <= 0) {
      setRepayMessage("This loan is already paid off.");
      return;
    }

    if (cash <= 0) {
      setRepayMessage("Not enough cash to repay right now.");
      return;
    }

    const amount = Math.min(requested, outstanding, cash);
    if (amount <= 0) {
      setRepayMessage("Repayment amount is too small.");
      return;
    }

    setRepayBusyId(String(loan.id));
    try {
      await decisionService.submitHoldingDecision({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        year: currentYear as any,
        week: currentWeek as any,
        source: "PLAYER" as any,
        payload: {
          type: "REPAY_HOLDING_LOAN",
          loanId: loan.id,
          amount,
        } as any,
      });

      setRepayMessage("Repayment queued for the next tick.");
      setRepayAmountByLoanId((prev) => ({ ...prev, [String(loan.id)]: "" }));
    } catch (error: any) {
      setRepayMessage(error?.message ?? "Failed to queue repayment.");
    } finally {
      setRepayBusyId(null);
    }
  };

  const onSendOffer = async (row: MarketRow) => {
    setOfferMessage(null);
    if (!worldId || !holdingId) {
      setOfferMessage("World or holding is missing.");
      return;
    }

    const raw = offerDrafts[row.id];
    const offerPrice = Number(raw ?? row.price);
    if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
      setOfferMessage("Enter a valid offer price.");
      return;
    }

    if (cash < offerPrice) {
      setOfferMessage("Not enough cash to make a binding offer.");
      return;
    }

    setMarketSubmittingId(row.id);
    try {
      await decisionService.submitHoldingDecision({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        year: currentYear as any,
        week: currentWeek as any,
        source: "PLAYER" as any,
        payload: {
          type: "SUBMIT_ACQUISITION_OFFER",
          companyId: row.id,
          offerPrice,
        } as any,
      });

      setOfferMessage("Offer submitted for review.");
      await loadOffers();
    } catch (error: any) {
      setOfferMessage(error?.message ?? "Failed to place offer.");
    } finally {
      setMarketSubmittingId(null);
    }
  };

  const onAcceptOffer = async (offer: AcquisitionOffer) => {
    setOfferMessage(null);
    if (!worldId || !holdingId) {
      setOfferMessage("World or holding is missing.");
      return;
    }
    try {
      await decisionService.submitHoldingDecision({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        year: currentYear as any,
        week: currentWeek as any,
        source: "PLAYER" as any,
        payload: {
          type: "ACCEPT_ACQUISITION_OFFER",
          offerId: offer.id,
        } as any,
      });
      setOfferMessage("Acceptance queued for the next tick.");
      await loadOffers();
    } catch (error: any) {
      setOfferMessage(error?.message ?? "Failed to accept offer.");
    }
  };

  const onRejectOffer = async (offer: AcquisitionOffer) => {
    setOfferMessage(null);
    if (!worldId || !holdingId) {
      setOfferMessage("World or holding is missing.");
      return;
    }
    try {
      await decisionService.submitHoldingDecision({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        year: currentYear as any,
        week: currentWeek as any,
        source: "PLAYER" as any,
        payload: {
          type: "REJECT_ACQUISITION_OFFER",
          offerId: offer.id,
        } as any,
      });
      setOfferMessage("Rejection queued for the next tick.");
      await loadOffers();
    } catch (error: any) {
      setOfferMessage(error?.message ?? "Failed to reject offer.");
    }
  };

  const onWithdrawOffer = async (offer: AcquisitionOffer) => {
    setOfferMessage(null);
    if (!worldId || !holdingId) {
      setOfferMessage("World or holding is missing.");
      return;
    }
    try {
      await decisionService.submitHoldingDecision({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        year: currentYear as any,
        week: currentWeek as any,
        source: "PLAYER" as any,
        payload: {
          type: "WITHDRAW_ACQUISITION_OFFER",
          offerId: offer.id,
        } as any,
      });
      setOfferMessage("Withdrawal queued for the next tick.");
      await loadOffers();
    } catch (error: any) {
      setOfferMessage(error?.message ?? "Failed to withdraw offer.");
    }
  };

  const onCounterOffer = async (offer: AcquisitionOffer) => {
    setOfferMessage(null);
    if (!worldId || !holdingId) {
      setOfferMessage("World or holding is missing.");
      return;
    }

    const raw = counterDrafts[String(offer.id)];
    const counterPrice = Number(raw ?? offer.offerPrice);
    if (!Number.isFinite(counterPrice) || counterPrice <= 0) {
      setOfferMessage("Enter a valid counter price.");
      return;
    }

    try {
      await decisionService.submitHoldingDecision({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        year: currentYear as any,
        week: currentWeek as any,
        source: "PLAYER" as any,
        payload: {
          type: "COUNTER_ACQUISITION_OFFER",
          offerId: offer.id,
          counterPrice,
        } as any,
      });
      setOfferMessage("Counter offer queued for the next tick.");
      await loadOffers();
    } catch (error: any) {
      setOfferMessage(error?.message ?? "Failed to counter offer.");
    }
  };

  const filteredMarketRows = React.useMemo(() => {
    const query = marketQuery.trim().toLowerCase();
    if (!query) return marketRows;
    return marketRows.filter((row) => row.name.toLowerCase().includes(query));
  }, [marketRows, marketQuery]);

  const incomingOffers = React.useMemo(
    () => offers.filter((offer) => String(offer.sellerHoldingId) === String(holdingId)),
    [offers, holdingId]
  );

  const outgoingOffers = React.useMemo(
    () => offers.filter((offer) => String(offer.buyerHoldingId) === String(holdingId)),
    [offers, holdingId]
  );

  const openOfferByCompanyId = React.useMemo(() => {
    const map = new Map<string, AcquisitionOffer>();
    for (const offer of outgoingOffers) {
      if (offer.status !== "OPEN" && offer.status !== "COUNTERED") continue;
      const key = String(offer.companyId);
      if (!map.has(key)) map.set(key, offer);
    }
    return map;
  }, [outgoingOffers]);

  const onTabChange = (nextTab: (typeof TAB_OPTIONS)[number]["key"]) => {
    setParams(nextTab === "overview" ? {} : { tab: nextTab });
  };

  const onRefresh = async () => {
    setLoanMessage(null);
    setOfferMessage(null);
    setRepayMessage(null);
    await Promise.all([loadPortfolio(), loadPortfolioSeries(), loadLoans(), loadOffers(), loadHoldingMarketShare()]);
    if (activeTab === "acquisitions") {
      await loadMarketplace();
    }
  };

  const loansOutstanding = loans.reduce((sum, loan) => sum + Number(loan.outstandingBalance ?? 0), 0);
  const loanPrincipal = Number(selectedOffer?.principal ?? 0);
  const loanCashAfter = cash + loanPrincipal;
  const loanDebtAfter = debt + loanPrincipal;
  const loanNetWorthAfter = loanCashAfter + equity - loanDebtAfter;
  const leverageBase = Math.max(1, equity + cash);
  const loanLeverageAfter = loanDebtAfter / leverageBase;
  const revenueStats = seriesStats(portfolioSeries.revenue);
  const profitStats = seriesStats(portfolioSeries.netProfit);
  const assetStats = seriesStats(portfolioSeries.assets);
  const sharePalette = ["#2a7f62", "#3566a8", "#b57b2b", "#7a5fa8", "#b05b5b", "#4d8f9a"];
  const sharePieData = React.useMemo(
    () =>
      holdingShareRows.map((row, idx) => ({
        label: row.sectorName,
        value: row.share,
        color: sharePalette[idx % sharePalette.length],
      })),
    [holdingShareRows]
  );

  return (
    <motion.div className="space-y-4" initial="hidden" animate="show" variants={MOTION.page.variants}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">Finance</div>
          <div className="text-sm text-[var(--text-muted)]">
            {world?.name ?? "World"} · Year {currentYear} Week {currentWeek}
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={onRefresh}
          loading={portfolioLoading || loansLoading || marketLoading}
        >
          Refresh
        </Button>
      </div>

      <Card className="rounded-3xl p-4">
        <div className="flex flex-wrap gap-2">
          {TAB_OPTIONS.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={activeTab === tab.key ? "primary" : "secondary"}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="mt-2 text-xs text-[var(--text-muted)]">
          {TAB_OPTIONS.find((tab) => tab.key === activeTab)?.description}
        </div>
      </Card>

      {activeTab === "overview" ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="rounded-3xl p-5">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Wallet className="h-4 w-4" />
                <div className="text-sm font-semibold text-[var(--text)]">Holding</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <KPIChip label="Cash" value={formatMoney(cash)} trend="neutral" />
                <KPIChip label="Debt" value={formatMoney(debt)} trend="neutral" subtle />
                <KPIChip label="Net worth" value={formatMoney(netWorth)} trend="neutral" />
                <KPIChip label="Companies" value={String(companies.length)} trend="neutral" subtle />
              </div>
            </Card>

            <Card className="rounded-3xl p-5">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Building2 className="h-4 w-4" />
                <div className="text-sm font-semibold text-[var(--text)]">Portfolio</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <KPIChip label="Revenue" value={money.compact(portfolioTotals.revenue)} trend="neutral" />
                <KPIChip
                  label="Net profit"
                  value={money.compact(portfolioTotals.netProfit)}
                  trend={portfolioTotals.netProfit >= 0 ? "up" : "down"}
                  subtle
                />
                <KPIChip
                  label="Cash change"
                  value={money.compact(portfolioTotals.cashChange)}
                  trend={portfolioTotals.cashChange >= 0 ? "up" : "down"}
                  subtle
                />
              </div>
              {portfolioError ? (
                <div className="mt-3 text-xs text-rose-600">{portfolioError}</div>
              ) : null}
            </Card>

            <Card className="rounded-3xl p-5">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <CreditCard className="h-4 w-4" />
                <div className="text-sm font-semibold text-[var(--text)]">Loans</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <KPIChip label="Outstanding" value={formatMoney(loansOutstanding)} trend="neutral" />
                <KPIChip label="Active loans" value={String(loans.length)} trend="neutral" subtle />
              </div>
              {loansError ? <div className="mt-3 text-xs text-rose-600">{loansError}</div> : null}
            </Card>
          </div>

          <Card className="rounded-3xl p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Portfolio trends</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">Last 26 weeks across your companies.</div>
            {portfolioSeriesError ? (
              <div className="mt-3 text-xs text-rose-600">{portfolioSeriesError}</div>
            ) : null}
            {portfolioSeriesLoading ? (
              <div className="mt-3 text-xs text-[var(--text-muted)]">Loading trends...</div>
            ) : portfolioSeries.revenue.length > 1 ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                  <div className="text-xs text-[var(--text-muted)]">Revenue</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {money.compact(revenueStats.last)}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Range {money.compact(revenueStats.min)} - {money.compact(revenueStats.max)}
                  </div>
                  <div className="mt-2">
                    <Sparkline data={portfolioSeries.revenue} />
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                  <div className="text-xs text-[var(--text-muted)]">Net profit</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {money.compact(profitStats.last)}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Margin {revenueStats.last !== 0 ? `${Math.round((profitStats.last / revenueStats.last) * 1000) / 10}%` : "0%"}
                  </div>
                  <div className="mt-2">
                    <Sparkline data={portfolioSeries.netProfit} stroke="var(--success)" />
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                  <div className="text-xs text-[var(--text-muted)]">Assets</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {money.compact(assetStats.last)}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Range {money.compact(assetStats.min)} - {money.compact(assetStats.max)}
                  </div>
                  <div className="mt-2">
                    <Sparkline data={portfolioSeries.assets} stroke="var(--accent)" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-[var(--text-muted)]">No trend data yet.</div>
            )}
          </Card>

          <Card className="rounded-3xl p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Market share snapshot</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Your holding share by sector (latest tick).
            </div>
            {holdingShareError ? (
              <div className="mt-3 text-xs text-rose-600">{holdingShareError}</div>
            ) : null}
            {holdingShareLoading ? (
              <div className="mt-3 text-xs text-[var(--text-muted)]">Loading market share...</div>
            ) : holdingShareRows.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                <div className="flex items-center justify-center">
                  <PieChart data={sharePieData} size={160} innerRadius={48} />
                </div>
                <div className="space-y-2">
                  {holdingShareRows.map((row, idx) => (
                    <div
                      key={row.sectorId}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: sharePalette[idx % sharePalette.length] }}
                        />
                        <span className="font-semibold text-[var(--text)]">{row.sectorName}</span>
                      </div>
                      <div className="text-[var(--text-muted)]">
                        {Math.round(row.share * 1000) / 10}% - {money.compact(row.holdingRevenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-[var(--text-muted)]">
                No market share data yet.
              </div>
            )}
          </Card>

          <Table
            caption={`Active loans (${loans.length})`}
            isEmpty={!loansLoading && loans.length === 0}
            emptyMessage="No loans yet. Take one from the Loans tab."
          >
            <THead>
              <TR>
                <TH>Lender</TH>
                <TH className="text-right">Principal</TH>
                <TH className="text-right">Balance</TH>
                <TH className="text-right">Rate</TH>
                <TH className="text-right">Remaining</TH>
              </TR>
            </THead>
            <TBody>
              {loans.map((loan) => (
                <TR key={String(loan.id)}>
                  <TD className="font-semibold">{loan.lenderName ?? "Lender"}</TD>
                  <TD className="text-right" mono>
                    {formatMoney(Number(loan.principal ?? 0))}
                  </TD>
                  <TD className="text-right" mono>
                    {formatMoney(Number(loan.outstandingBalance ?? 0))}
                  </TD>
                  <TD className="text-right" mono>
                    {Math.round(Number(loan.interestRate ?? 0) * 1000) / 10}%
                  </TD>
                  <TD className="text-right" mono>
                    {loan.remainingWeeks ?? 0}w
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </>
      ) : null}

      {activeTab === "loans" ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="rounded-3xl p-5 lg:col-span-2">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Banknote className="h-4 w-4" />
                <div className="text-sm font-semibold text-[var(--text)]">Loan offers</div>
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">Offer</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm outline-none"
                    value={selectedOfferId}
                    onChange={(e) => setSelectedOfferId(e.target.value)}
                    disabled={loanBusy}
                  >
                    {loanOffersWithRates.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.label} ({Math.round((offer.rate ?? 0) * 1000) / 10}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                    <div className="text-xs text-[var(--text-muted)]">Principal</div>
                    <div className="font-semibold text-[var(--text)]">
                      {formatMoney(selectedOffer.principal)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                    <div className="text-xs text-[var(--text-muted)]">Rate (credit adjusted)</div>
                    <div className="font-semibold text-[var(--text)]">
                      {Math.round(selectedRate * 1000) / 10}%
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                    <div className="text-xs text-[var(--text-muted)]">Weekly payment</div>
                    <div className="font-semibold text-[var(--text)]">
                      {formatMoney(selectedPayment.weeklyPayment)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                    <div className="text-xs text-[var(--text-muted)]">Term</div>
                    <div className="font-semibold text-[var(--text)]">{selectedOffer.termWeeks} weeks</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                    <div className="text-xs text-[var(--text-muted)]">Weekly interest</div>
                    <div className="font-semibold text-[var(--text)]">
                      {formatMoney(selectedPayment.weeklyInterest)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                    <div className="text-xs text-[var(--text-muted)]">Weekly principal</div>
                    <div className="font-semibold text-[var(--text)]">
                      {formatMoney(selectedPayment.weeklyPrincipal)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                    <div className="text-xs text-[var(--text-muted)]">Total interest (est.)</div>
                    <div className="font-semibold text-[var(--text)]">
                      {formatMoney(selectedPayment.totalInterestEstimate)}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                  <div className="text-xs text-[var(--text-muted)]">Story impact</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <KPIChip label="Cash after" value={formatMoney(loanCashAfter)} trend="up" />
                    <KPIChip label="Debt after" value={formatMoney(loanDebtAfter)} trend="down" subtle />
                    <KPIChip label="Net worth after" value={formatMoney(loanNetWorthAfter)} trend="neutral" subtle />
                    <KPIChip
                      label="Leverage"
                      value={`${Math.round(loanLeverageAfter * 100) / 100}x`}
                      trend={loanLeverageAfter > 2 ? "down" : "neutral"}
                      subtle
                    />
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    Credit rating: <span className="text-[var(--text)]">{creditTier.label}</span> (
                    {creditTier.note}). Rate adj:{" "}
                    {creditTier.rateDelta >= 0 ? "+" : ""}
                    {Math.round(creditTier.rateDelta * 1000) / 10}%.
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-[var(--text-muted)]">
                    Lender: <span className="text-[var(--text)]">{selectedOffer.lenderName}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onTakeLoan}
                    loading={loanBusy}
                    disabled={!holdingId || !worldId}
                  >
                    Take loan
                  </Button>
                </div>

                {loanMessage ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs">
                    {loanMessage}
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="rounded-3xl p-5">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <CreditCard className="h-4 w-4" />
                <div className="text-sm font-semibold text-[var(--text)]">Debt snapshot</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <KPIChip label="Outstanding" value={formatMoney(loansOutstanding)} trend="neutral" />
                <KPIChip label="Cash" value={formatMoney(cash)} trend="neutral" subtle />
                <KPIChip label="Credit" value={creditTier.label} trend="neutral" subtle />
              </div>

              <div className="mt-3 text-xs text-[var(--text-muted)]">
                Loan terms respond to world interest rates and your credit reputation.
              </div>
            </Card>
          </div>

          <Table
            caption={`Active loans (${loans.length})`}
            isEmpty={!loansLoading && loans.length === 0}
            emptyMessage="No loans yet."
          >
            <THead>
              <TR>
                <TH>Lender</TH>
                <TH className="text-right">Principal</TH>
                <TH className="text-right">Balance</TH>
                <TH className="text-right">Rate</TH>
                <TH className="text-right">Remaining</TH>
                <TH className="text-right">Repay</TH>
              </TR>
            </THead>
            <TBody>
              {loans.map((loan) => (
                <TR key={String(loan.id)}>
                  <TD className="font-semibold">{loan.lenderName ?? "Lender"}</TD>
                  <TD className="text-right" mono>
                    {formatMoney(Number(loan.principal ?? 0))}
                  </TD>
                  <TD className="text-right" mono>
                    {formatMoney(Number(loan.outstandingBalance ?? 0))}
                  </TD>
                  <TD className="text-right" mono>
                    {Math.round(Number(loan.interestRate ?? 0) * 1000) / 10}%
                  </TD>
                  <TD className="text-right" mono>
                    {loan.remainingWeeks ?? 0}w
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        min={0}
                        step={100}
                        placeholder="Amount"
                        className={cn(
                          "w-24 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-2 py-1 text-xs outline-none",
                          "text-[var(--text)]"
                        )}
                        value={repayAmountByLoanId[String(loan.id)] ?? ""}
                        onChange={(e) =>
                          setRepayAmountByLoanId((prev) => ({
                            ...prev,
                            [String(loan.id)]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onRepayLoan(loan)}
                        loading={repayBusyId === String(loan.id)}
                        disabled={!worldId || !holdingId || Number(loan.outstandingBalance ?? 0) <= 0}
                      >
                        Repay
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {repayMessage ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs">
              {repayMessage}
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === "acquisitions" ? (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Store className="h-4 w-4" />
              <div className="text-sm font-semibold text-[var(--text)]">Company marketplace</div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
              <input
                className="w-full bg-transparent text-sm outline-none text-[var(--text)]"
                placeholder="Search companies"
                value={marketQuery}
                onChange={(e) => setMarketQuery(e.target.value)}
              />
            </div>
          </div>

          <Table
            caption={`Listings (${filteredMarketRows.length})`}
            isEmpty={!marketLoading && filteredMarketRows.length === 0}
            emptyMessage="No listings available yet."
          >
            <THead>
              <TR>
                <TH>Company</TH>
                <TH>Sector</TH>
                <TH>Niche</TH>
                <TH className="text-right">Revenue</TH>
                <TH className="text-right">Profit</TH>
                <TH className="text-right">Indicative</TH>
                <TH className="text-right">Offer</TH>
                <TH className="text-right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {filteredMarketRows.map((row) => {
                const existingOffer = openOfferByCompanyId.get(row.id);
                const offerValue = offerDrafts[row.id] ?? "";
                const parsedOffer = Number(offerValue || row.price);
                const canAfford = cash >= parsedOffer;
                const sector = sectorById.get(String(row.sectorId ?? ""));
                const niche = nicheById.get(String(row.nicheId ?? ""));
                return (
                  <TR key={row.id}>
                    <TD className="font-semibold">{row.name}</TD>
                    <TD>
                      <div className="text-xs text-[var(--text-muted)]">
                        {sector?.name ?? row.sectorId}
                      </div>
                      {sector?.description ? (
                        <div className="text-[10px] text-[var(--text-muted)]">{sector.description}</div>
                      ) : null}
                    </TD>
                    <TD>
                      <div className="text-xs text-[var(--text-muted)]">
                        {niche?.name ?? row.nicheId}
                      </div>
                      {niche?.description ? (
                        <div className="text-[10px] text-[var(--text-muted)]">{niche.description}</div>
                      ) : null}
                    </TD>
                    <TD className="text-right" mono>
                      {money.compact(row.revenue)}
                    </TD>
                    <TD
                      className={cn(
                        "text-right",
                        row.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}
                      mono
                    >
                      {row.netProfit >= 0 ? <ArrowUpRight className="inline h-3 w-3" /> : <ArrowDownRight className="inline h-3 w-3" />}{" "}
                      {money.compact(Math.abs(row.netProfit))}
                    </TD>
                    <TD className="text-right" mono>
                      {formatMoney(row.price)}
                    </TD>
                    <TD className="text-right">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        className={cn(
                          "w-28 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-2 py-1 text-xs outline-none",
                          "text-[var(--text)] text-right"
                        )}
                        value={offerValue}
                        onChange={(e) =>
                          setOfferDrafts((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                      />
                      {existingOffer ? (
                        <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                          {existingOffer.status}
                        </div>
                      ) : null}
                    </TD>
                    <TD className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSendOffer(row)}
                        disabled={!canAfford || !worldId || !holdingId}
                        loading={marketSubmittingId === row.id}
                      >
                        {canAfford ? (existingOffer ? "Update offer" : "Make offer") : "Insufficient cash"}
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          {marketError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {marketError}
            </div>
          ) : null}

          {offerMessage ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm">
              {offerMessage}
            </div>
          ) : null}

          <Table
            caption={`Incoming offers (${incomingOffers.length})`}
            isEmpty={incomingOffers.length === 0}
            emptyMessage="No inbound offers yet."
          >
            <THead>
              <TR>
                <TH>Company</TH>
                <TH>Status</TH>
                <TH className="text-right">Offer</TH>
                <TH className="text-right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {incomingOffers.map((offer) => {
                const company = companyDirectory[String(offer.companyId)];
                const canRespond =
                  (offer.status === "OPEN" || offer.status === "COUNTERED") && offer.turn === "SELLER";
                return (
                  <TR key={String(offer.id)}>
                    <TD className="font-semibold">{company?.name ?? String(offer.companyId)}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">
                      {offer.status} • turn: {offer.turn}
                    </TD>
                    <TD className="text-right" mono>
                      {formatMoney(Number(offer.offerPrice ?? 0))}
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          placeholder={String(Math.round(Number(offer.offerPrice ?? 0)))}
                          className={cn(
                            "w-24 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-2 py-1 text-xs outline-none",
                            "text-[var(--text)] text-right"
                          )}
                          value={counterDrafts[String(offer.id)] ?? ""}
                          onChange={(e) =>
                            setCounterDrafts((prev) => ({
                              ...prev,
                              [String(offer.id)]: e.target.value,
                            }))
                          }
                          disabled={!canRespond}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onAcceptOffer(offer)}
                          disabled={!canRespond}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onCounterOffer(offer)}
                          disabled={!canRespond}
                        >
                          Counter
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRejectOffer(offer)}
                          disabled={!canRespond}
                        >
                          Reject
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          <Table
            caption={`Your offers (${outgoingOffers.length})`}
            isEmpty={outgoingOffers.length === 0}
            emptyMessage="No offers sent yet."
          >
            <THead>
              <TR>
                <TH>Company</TH>
                <TH>Status</TH>
                <TH className="text-right">Offer</TH>
                <TH className="text-right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {outgoingOffers.map((offer) => {
                const company = companyDirectory[String(offer.companyId)];
                const canRespond =
                  (offer.status === "OPEN" || offer.status === "COUNTERED") && offer.turn === "BUYER";
                const canWithdraw = offer.status === "OPEN" || offer.status === "COUNTERED";
                return (
                  <TR key={String(offer.id)}>
                    <TD className="font-semibold">{company?.name ?? String(offer.companyId)}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">
                      {offer.status} • turn: {offer.turn}
                    </TD>
                    <TD className="text-right" mono>
                      {formatMoney(Number(offer.offerPrice ?? 0))}
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          placeholder={String(Math.round(Number(offer.offerPrice ?? 0)))}
                          className={cn(
                            "w-24 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-2 py-1 text-xs outline-none",
                            "text-[var(--text)] text-right"
                          )}
                          value={counterDrafts[String(offer.id)] ?? ""}
                          onChange={(e) =>
                            setCounterDrafts((prev) => ({
                              ...prev,
                              [String(offer.id)]: e.target.value,
                            }))
                          }
                          disabled={!canRespond}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onAcceptOffer(offer)}
                          disabled={!canRespond}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onCounterOffer(offer)}
                          disabled={!canRespond}
                        >
                          Counter
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onWithdrawOffer(offer)}
                          disabled={!canWithdraw}
                        >
                          Withdraw
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </>
      ) : null}
    </motion.div>
  );
};

export default FinancePanel;
