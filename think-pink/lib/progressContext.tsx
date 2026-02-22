// lib/progressContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getCycleBadgeUnlocked,
  setCycleBadgeUnlocked,
  getCycleBadgeMinted,
  setCycleBadgeMinted,

  getImpactBadgeUnlocked,
  setImpactBadgeUnlocked,
  getImpactBadgeMinted,
  setImpactBadgeMinted,

  getPoints,
  setPoints,
  getLifetimePoints,
  setLifetimePoints,
} from "./progressStore";

type ProgressContextValue = {
  cycleBadgeUnlocked: boolean;
  cycleBadgeMinted: boolean;

  impactBadgeUnlocked: boolean;
  impactBadgeMinted: boolean;

  points: number;
  lifetimePoints: number;

  setCycleBadgeUnlockedLive: (v: boolean) => Promise<void>;
  setCycleBadgeMintedLive: (v: boolean) => Promise<void>;

  setImpactBadgeUnlockedLive: (v: boolean) => Promise<void>;
  setImpactBadgeMintedLive: (v: boolean) => Promise<void>;

  addPoints: (delta: number) => Promise<void>;
  setPointsLive: (n: number) => Promise<void>;
  setLifetimePointsLive: (n: number) => Promise<void>;

  refresh: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [cycleBadgeUnlockedState, setCycleBadgeUnlockedState] = useState(false);
  const [cycleBadgeMintedState, setCycleBadgeMintedState] = useState(false);

  const [impactBadgeUnlockedState, setImpactBadgeUnlockedState] = useState(false);
  const [impactBadgeMintedState, setImpactBadgeMintedState] = useState(false);

  const [pointsState, setPointsState] = useState(0);
  const [lifetimePointsState, setLifetimePointsState] = useState(0);

  async function refresh() {
    const [cu, cm, iu, im, p, lp] = await Promise.all([
      getCycleBadgeUnlocked(),
      getCycleBadgeMinted(),
      getImpactBadgeUnlocked(),
      getImpactBadgeMinted(),
      getPoints(),
      getLifetimePoints(),
    ]);

    setCycleBadgeUnlockedState(cu);
    setCycleBadgeMintedState(cm);

    setImpactBadgeUnlockedState(iu);
    setImpactBadgeMintedState(im);

    setPointsState(p);
    setLifetimePointsState(Math.max(lp, p));
  }

  async function setCycleBadgeUnlockedLive(v: boolean) {
    setCycleBadgeUnlockedState(v);
    await setCycleBadgeUnlocked(v);
  }

  async function setCycleBadgeMintedLive(v: boolean) {
    setCycleBadgeMintedState(v);
    await setCycleBadgeMinted(v);
  }

  async function setImpactBadgeUnlockedLive(v: boolean) {
    setImpactBadgeUnlockedState(v);
    await setImpactBadgeUnlocked(v);
  }

  async function setImpactBadgeMintedLive(v: boolean) {
    setImpactBadgeMintedState(v);
    await setImpactBadgeMinted(v);
  }

  async function setPointsLive(n: number) {
    const fixed = Math.max(0, Math.floor(n));
    setPointsState(fixed);
    await setPoints(fixed);
    if (fixed > lifetimePointsState) {
      setLifetimePointsState(fixed);
      await setLifetimePoints(fixed);
    }
  }

  async function setLifetimePointsLive(n: number) {
    const fixed = Math.max(0, Math.floor(n));
    setLifetimePointsState(fixed);
    await setLifetimePoints(fixed);
  }

  async function addPoints(delta: number) {
    const next = Math.max(0, Math.floor(pointsState + delta));
    setPointsState(next);
    await setPoints(next);
    if (delta > 0) {
      const nextLifetime = Math.max(lifetimePointsState, next);
      setLifetimePointsState(nextLifetime);
      await setLifetimePoints(nextLifetime);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({
      cycleBadgeUnlocked: cycleBadgeUnlockedState,
      cycleBadgeMinted: cycleBadgeMintedState,

      impactBadgeUnlocked: impactBadgeUnlockedState,
      impactBadgeMinted: impactBadgeMintedState,

      points: pointsState,
      lifetimePoints: lifetimePointsState,

      setCycleBadgeUnlockedLive,
      setCycleBadgeMintedLive,
      setImpactBadgeUnlockedLive,
      setImpactBadgeMintedLive,

      addPoints,
      setPointsLive,
      setLifetimePointsLive,
      refresh,
    }),
    [
      cycleBadgeUnlockedState,
      cycleBadgeMintedState,
      impactBadgeUnlockedState,
      impactBadgeMintedState,
      pointsState,
      lifetimePointsState,
    ]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
