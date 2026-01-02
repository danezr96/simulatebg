import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CompanyDecisionPayload } from "../../core/domain";

export type DraftUpgradeItem = {
  companyId: string;
  upgradeId: string;
};

export type DecisionDraftState = {
  draftCompanyDecisions: Record<string, CompanyDecisionPayload[]>;
  draftHoldingAllocations: Record<string, number>;
  draftUpgradeQueue: DraftUpgradeItem[];
  softCommitted: boolean;
};

type DraftSnapshot = DecisionDraftState;

const STORAGE_PREFIX = "simulatebg:decisionDraft:v1";
const HISTORY_LIMIT = 20;

const EXCLUSIVE_DECISION_TYPES = new Set<string>([
  "SET_PRICE",
  "SET_MARKETING",
  "SET_STAFFING",
  "INVEST_CAPACITY",
  "INVEST_QUALITY",
  "SET_PRODUCT_PLAN",
  "SET_CARWASH_OPERATIONS",
  "SET_CARWASH_WAREHOUSE",
  "SET_CARWASH_PROCUREMENT",
  "SET_CARWASH_MARKETING",
  "SET_CARWASH_HR",
  "SET_CARWASH_PRICING",
  "SET_CARWASH_FINANCE",
]);

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function storageKey(worldId: string) {
  return `${STORAGE_PREFIX}:${worldId}`;
}

function readStorage(worldId: string): DraftSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(worldId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(worldId: string, snapshot: DraftSnapshot) {
  try {
    localStorage.setItem(storageKey(worldId), JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

export function useDecisionDraft(input: {
  worldId?: string | null;
  baselineCompanyDecisions?: Record<string, CompanyDecisionPayload[]>;
  baselineHoldingAllocations?: Record<string, number>;
  baselineUpgradeQueue?: DraftUpgradeItem[];
}) {
  const worldId = input.worldId ?? null;

  const baselineRef = useRef<DecisionDraftState>({
    draftCompanyDecisions: input.baselineCompanyDecisions ?? {},
    draftHoldingAllocations: input.baselineHoldingAllocations ?? {},
    draftUpgradeQueue: input.baselineUpgradeQueue ?? [],
    softCommitted: false,
  });

  const [draftCompanyDecisions, setDraftCompanyDecisions] = useState<
    Record<string, CompanyDecisionPayload[]>
  >(input.baselineCompanyDecisions ?? {});
  const [draftHoldingAllocations, setDraftHoldingAllocations] = useState<Record<string, number>>(
    input.baselineHoldingAllocations ?? {}
  );
  const [draftUpgradeQueue, setDraftUpgradeQueue] = useState<DraftUpgradeItem[]>(
    input.baselineUpgradeQueue ?? []
  );
  const [softCommitted, setSoftCommitted] = useState(false);
  const [history, setHistory] = useState<DraftSnapshot[]>([]);

  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    baselineRef.current = {
      draftCompanyDecisions: input.baselineCompanyDecisions ?? {},
      draftHoldingAllocations: input.baselineHoldingAllocations ?? {},
      draftUpgradeQueue: input.baselineUpgradeQueue ?? [],
      softCommitted: false,
    };
  }, [input.baselineCompanyDecisions, input.baselineHoldingAllocations, input.baselineUpgradeQueue]);

  useEffect(() => {
    if (!worldId) return;
    if (hydratedRef.current === worldId) return;

    const stored = readStorage(worldId);
    const baseline = baselineRef.current;

    hydratedRef.current = worldId;
    if (stored) {
      setDraftCompanyDecisions(stored.draftCompanyDecisions ?? {});
      setDraftHoldingAllocations(stored.draftHoldingAllocations ?? {});
      setDraftUpgradeQueue(stored.draftUpgradeQueue ?? []);
      setSoftCommitted(!!stored.softCommitted);
      setHistory([]);
    } else {
      setDraftCompanyDecisions(clone(baseline.draftCompanyDecisions));
      setDraftHoldingAllocations(clone(baseline.draftHoldingAllocations));
      setDraftUpgradeQueue(clone(baseline.draftUpgradeQueue));
      setSoftCommitted(false);
      setHistory([]);
    }
  }, [worldId]);

  useEffect(() => {
    if (!worldId) return;
    const snapshot: DraftSnapshot = {
      draftCompanyDecisions,
      draftHoldingAllocations,
      draftUpgradeQueue,
      softCommitted,
    };
    writeStorage(worldId, snapshot);
  }, [worldId, draftCompanyDecisions, draftHoldingAllocations, draftUpgradeQueue, softCommitted]);

  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const snapshot: DraftSnapshot = {
        draftCompanyDecisions: clone(draftCompanyDecisions),
        draftHoldingAllocations: clone(draftHoldingAllocations),
        draftUpgradeQueue: clone(draftUpgradeQueue),
        softCommitted,
      };
      return [...prev, snapshot].slice(-HISTORY_LIMIT);
    });
  }, [draftCompanyDecisions, draftHoldingAllocations, draftUpgradeQueue, softCommitted]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      const next = [...prev];
      const snapshot = next.pop();
      if (!snapshot) return prev;
      setDraftCompanyDecisions(snapshot.draftCompanyDecisions ?? {});
      setDraftHoldingAllocations(snapshot.draftHoldingAllocations ?? {});
      setDraftUpgradeQueue(snapshot.draftUpgradeQueue ?? []);
      setSoftCommitted(!!snapshot.softCommitted);
      return next;
    });
  }, []);

  const resetToBaseline = useCallback(() => {
    const baseline = baselineRef.current;
    setDraftCompanyDecisions(clone(baseline.draftCompanyDecisions));
    setDraftHoldingAllocations(clone(baseline.draftHoldingAllocations));
    setDraftUpgradeQueue(clone(baseline.draftUpgradeQueue));
    setSoftCommitted(false);
    setHistory([]);
  }, []);

  const setCompanyDecisions = useCallback(
    (companyId: string, payloads: CompanyDecisionPayload[]) => {
      pushHistory();
      setDraftCompanyDecisions((prev) => ({
        ...prev,
        [companyId]: payloads,
      }));
      setSoftCommitted(false);
    },
    [pushHistory]
  );

  const setCompanyDecision = useCallback(
    (companyId: string, payload: CompanyDecisionPayload) => {
      pushHistory();
      setDraftCompanyDecisions((prev) => {
        const list = [...(prev[companyId] ?? [])];
        const type = typeof payload?.type === "string" ? payload.type : "";
        if (EXCLUSIVE_DECISION_TYPES.has(type)) {
          const filtered = list.filter((item) => item.type !== type);
          filtered.push(payload);
          return { ...prev, [companyId]: filtered };
        }
        return { ...prev, [companyId]: [...list, payload] };
      });
      setSoftCommitted(false);
    },
    [pushHistory]
  );

  const setHoldingAllocation = useCallback(
    (companyId: string, amount: number) => {
      pushHistory();
      setDraftHoldingAllocations((prev) => {
        const next = { ...prev };
        if (!Number.isFinite(amount) || amount === 0) {
          delete next[companyId];
        } else {
          next[companyId] = amount;
        }
        return next;
      });
      setSoftCommitted(false);
    },
    [pushHistory]
  );

  const toggleUpgrade = useCallback(
    (companyId: string, upgradeId: string) => {
      pushHistory();
      setDraftUpgradeQueue((prev) => {
        const exists = prev.some(
          (item) => item.companyId === companyId && item.upgradeId === upgradeId
        );
        if (exists) {
          return prev.filter(
            (item) => !(item.companyId === companyId && item.upgradeId === upgradeId)
          );
        }
        return [...prev, { companyId, upgradeId }];
      });
      setSoftCommitted(false);
    },
    [pushHistory]
  );

  const setSoftCommit = useCallback((value: boolean) => {
    setSoftCommitted(value);
  }, []);

  return useMemo(
    () => ({
      draftCompanyDecisions,
      draftHoldingAllocations,
      draftUpgradeQueue,
      softCommitted,
      historyDepth: history.length,
      setCompanyDecision,
      setCompanyDecisions,
      setHoldingAllocation,
      toggleUpgrade,
      undo,
      resetToBaseline,
      setSoftCommit,
    }),
    [
      draftCompanyDecisions,
      draftHoldingAllocations,
      draftUpgradeQueue,
      softCommitted,
      history.length,
      setCompanyDecision,
      setCompanyDecisions,
      setHoldingAllocation,
      toggleUpgrade,
      undo,
      resetToBaseline,
      setSoftCommit,
    ]
  );
}

export default useDecisionDraft;
