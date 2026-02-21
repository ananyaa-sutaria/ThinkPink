import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { getCycleBadgeUnlocked, setCycleBadgeUnlocked } from "./progressStore";

type ProgressContextValue = {
  cycleBadgeUnlocked: boolean;
  hydrated: boolean;
  setCycleBadgeUnlockedLive: (v: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [cycleBadgeUnlockedState, setCycleBadgeUnlockedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const v = await getCycleBadgeUnlocked();
    setCycleBadgeUnlockedState(v);
    setHydrated(true);
  }, []);

  const setCycleBadgeUnlockedLive = useCallback(async (v: boolean) => {
    setCycleBadgeUnlockedState(v);
    setHydrated(true);
    await setCycleBadgeUnlocked(v);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      cycleBadgeUnlocked: cycleBadgeUnlockedState,
      hydrated,
      setCycleBadgeUnlockedLive,
      refresh,
    }),
    [cycleBadgeUnlockedState, hydrated, setCycleBadgeUnlockedLive, refresh]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}