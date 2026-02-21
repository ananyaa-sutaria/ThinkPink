import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCycleBadgeUnlocked, setCycleBadgeUnlocked } from "./progressStore";
import { getPoints, setPoints } from "./pointsStore";

type ProgressContextValue = {
  cycleBadgeUnlocked: boolean;
  hydrated: boolean;
  points: number;
  setCycleBadgeUnlockedLive: (v: boolean) => Promise<void>;
  addPoints: (n: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [cycleBadgeUnlockedState, setCycleBadgeUnlockedState] = useState(false);
  const [pointsState, setPointsState] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const [badge, pts] = await Promise.all([getCycleBadgeUnlocked(), getPoints()]);
    setCycleBadgeUnlockedState(badge);
    setPointsState(pts);
    setHydrated(true);
  }, []);

  const setCycleBadgeUnlockedLive = useCallback(async (v: boolean) => {
    setCycleBadgeUnlockedState(v);
    setHydrated(true);
    await setCycleBadgeUnlocked(v);
  }, []);

  const addPoints = useCallback(async (n: number) => {
    const current = await getPoints();
    const updated = Math.max(0, current + n);
    await setPoints(updated);
    setPointsState(updated);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      cycleBadgeUnlocked: cycleBadgeUnlockedState,
      hydrated,
      points: pointsState,
      setCycleBadgeUnlockedLive,
      addPoints,
      refresh,
    }),
    [cycleBadgeUnlockedState, hydrated, pointsState, setCycleBadgeUnlockedLive, addPoints, refresh]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}