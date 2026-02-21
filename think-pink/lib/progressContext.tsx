import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { getCycleBadgeUnlocked, setCycleBadgeUnlocked } from "./progressStore";
import { getPoints, setPoints } from "./pointsStore";

type ProgressContextValue = {
  cycleBadgeUnlocked: boolean;
  hydrated: boolean;
  points: number;
  addPoints: (n: number) => Promise<void>;
  setCycleBadgeUnlockedLive: (v: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [cycleBadgeUnlockedState, setCycleBadgeUnlockedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [points, setPointsState] = useState(0);
  const refresh = useCallback(async () => {
  const v = await getCycleBadgeUnlocked();
  const p = await getPoints();
  setCycleBadgeUnlockedState(v);
  setPointsState(p);
  setHydrated(true);
}, []);
const addPoints = useCallback(async (n: number) => {
  const current = await getPoints();
  const updated = current + n;
  await setPoints(updated);
  setPointsState(updated);
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
    points,
    addPoints,
    setCycleBadgeUnlockedLive,
    refresh,
  }),
  [cycleBadgeUnlockedState, hydrated, points]
);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}