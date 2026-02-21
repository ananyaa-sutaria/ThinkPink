// lib/progressContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getCycleBadgeUnlocked,
  setCycleBadgeUnlocked,
  getCycleBadgeMinted,
  setCycleBadgeMinted,
  getPoints,
  setPoints,
} from "./progressStore";

type ProgressContextValue = {
  cycleBadgeUnlocked: boolean;
  cycleBadgeMinted: boolean;
  points: number;

  setCycleBadgeUnlockedLive: (v: boolean) => Promise<void>;
  setCycleBadgeMintedLive: (v: boolean) => Promise<void>;

  addPoints: (delta: number) => Promise<void>;
  setPointsLive: (n: number) => Promise<void>;

  refresh: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [cycleBadgeUnlockedState, setCycleBadgeUnlockedState] = useState(false);
  const [cycleBadgeMintedState, setCycleBadgeMintedState] = useState(false);
  const [pointsState, setPointsState] = useState(0);

  async function refresh() {
    const [u, m, p] = await Promise.all([
      getCycleBadgeUnlocked(),
      getCycleBadgeMinted(),
      getPoints(),
    ]);
    setCycleBadgeUnlockedState(u);
    setCycleBadgeMintedState(m);
    setPointsState(p);
  }

  async function setCycleBadgeUnlockedLive(v: boolean) {
    setCycleBadgeUnlockedState(v);
    await setCycleBadgeUnlocked(v);
  }

  async function setCycleBadgeMintedLive(v: boolean) {
    setCycleBadgeMintedState(v);
    await setCycleBadgeMinted(v);
  }

  async function setPointsLive(n: number) {
    const fixed = Math.max(0, Math.floor(n));
    setPointsState(fixed);
    await setPoints(fixed);
  }

  async function addPoints(delta: number) {
    const next = Math.max(0, Math.floor(pointsState + delta));
    setPointsState(next);
    await setPoints(next);
  }

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({
      cycleBadgeUnlocked: cycleBadgeUnlockedState,
      cycleBadgeMinted: cycleBadgeMintedState,
      points: pointsState,
      setCycleBadgeUnlockedLive,
      setCycleBadgeMintedLive,
      addPoints,
      setPointsLive,
      refresh,
    }),
    [cycleBadgeUnlockedState, cycleBadgeMintedState, pointsState]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}