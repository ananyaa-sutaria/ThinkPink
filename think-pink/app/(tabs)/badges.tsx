// app/(tabs)/badges.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Linking, ScrollView, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { useProgress } from "../../lib/progressContext";
import { awardBadge } from "../../lib/solanaClient";
import { API_BASE } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

const KEY_WALLET = "tp_wallet_address";

function BadgePill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badgePill, { backgroundColor: color }]}>
      <Text style={styles.badgePillText}>{label}</Text>
    </View>
  );
}

type Submission = {
  _id: string;
  userId: string;
  walletAddress?: string;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  photoUrl?: string;
  imageUrl?: string;
  proofHash?: string;
  status: "pending" | "approved" | "rejected";
  impactMint?: string;
  txMint?: string;
  txFreeze?: string;
  createdAt?: string;
  updatedAt?: string;
};

function absolutePhotoUrl(url?: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

function mintExplorerUrl(tx?: string) {
  if (!tx) return "";
  if (/^https?:\/\//i.test(tx)) return tx;
  return `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
}

export default function BadgesRewardsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const {
    points,
    lifetimePoints,
    addPoints,
    setPointsLive,

    cycleBadgeUnlocked,
    cycleBadgeMinted,
    setCycleBadgeMintedLive,

    impactBadgeUnlocked,
    impactBadgeMinted,
    setImpactBadgeUnlockedLive,
    setImpactBadgeMintedLive,
  } = useProgress();

  const [wallet, setWallet] = useState<string>("");
  const [minting, setMinting] = useState(false);
  const [redeemingCost, setRedeemingCost] = useState<number | null>(null);
  const [mintResult, setMintResult] = useState<any>(null);
  const [err, setErr] = useState<string>("");
  const [showRedeem, setShowRedeem] = useState(false);

  const [loadingImpact, setLoadingImpact] = useState(false);
  const [impactLatest, setImpactLatest] = useState<Submission | null>(null);
  const [impactTx, setImpactTx] = useState<string>("");
  const [impactCardOpen, setImpactCardOpen] = useState(false);
  const [completedQuizLevels, setCompletedQuizLevels] = useState<number[]>([]);

async function openExternal(rawUrl: string) {
  if (!rawUrl) {
    Alert.alert("Link unavailable", "No link found for this item yet.");
    return;
  }

  try {
    await Linking.openURL(rawUrl);
  } catch {
    Alert.alert("Cannot open link", rawUrl);
  }
}

  useEffect(() => {
    (async () => {
      const w = (await AsyncStorage.getItem(KEY_WALLET)) || "";
      setWallet(w);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const uid = (user as any)?.userId || (user as any)?.id;
      if (!uid) {
        setCompletedQuizLevels([]);
        return;
      }
      const raw = await AsyncStorage.getItem(`learn:levels:${uid}`);
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        setCompletedQuizLevels(Array.isArray(parsed) ? parsed.filter((n) => Number.isFinite(n)) : []);
      } catch {
        setCompletedQuizLevels([]);
      }
    })();
  }, [user]);

  async function refreshImpactStatus() {
    const uid = (user as any)?.userId || (user as any)?.id;
    if (!uid) {
      setImpactLatest(null);
      setImpactTx("");
      await setImpactBadgeUnlockedLive(false);
      await setImpactBadgeMintedLive(false);
      return;
    }

    setLoadingImpact(true);
    try {
      const res = await fetch(`${API_BASE}/impact/mine/${encodeURIComponent(uid)}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();

      const subs: Submission[] = (data?.submissions || []) as Submission[];
      const latest = subs[0] || null;
      setImpactLatest(latest);

      const anyApproved = subs.some((s) => s.status === "approved");
      const minted = subs.find((s) => s.status === "approved" && !!s.txMint);

      await setImpactBadgeUnlockedLive(anyApproved);
      await setImpactBadgeMintedLive(!!minted);

      setImpactTx(minted?.txMint || "");
    } catch {
      setImpactLatest(null);
      setImpactTx("");
      await setImpactBadgeUnlockedLive(false);
      await setImpactBadgeMintedLive(false);
    } finally {
      setLoadingImpact(false);
    }
  }

  // auto-refresh when user changes + when page mounts
  useEffect(() => {
    refreshImpactStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const cycleBadgeStatus = useMemo(() => {
    if (cycleBadgeMinted) return { label: "Minted", color: "#2E7D32" };
    if (cycleBadgeUnlocked) return { label: "Unlocked", color: "#D81B60" };
    return { label: "Locked", color: "#8E8E8E" };
  }, [cycleBadgeUnlocked, cycleBadgeMinted]);

  const impactBadgeStatus = useMemo(() => {
    if (impactBadgeMinted) return { label: "Minted", color: "#2E7D32" };
    if (impactBadgeUnlocked) return { label: "Unlocked", color: "#D81B60" };
    return { label: "Locked", color: "#8E8E8E" };
  }, [impactBadgeUnlocked, impactBadgeMinted]);

  const statusLevel = useMemo(() => {
    if (lifetimePoints <= 100) return { name: "Jellyfish", icon: "🪼", nextAt: 200 };
    if (lifetimePoints <= 200) return { name: "Seahorse", icon: "🐠", nextAt: 300 };
    if (lifetimePoints <= 300) return { name: "Manatee", icon: "🦭", nextAt: 400 };
    if (lifetimePoints <= 400) return { name: "Stingray", icon: "🐟", nextAt: 500 };
    return { name: "Dolphin", icon: "🐬", nextAt: null as number | null };
  }, [lifetimePoints]);

  const pointsToNext = useMemo(() => {
    if (!statusLevel.nextAt) return 0;
    return Math.max(0, statusLevel.nextAt - lifetimePoints);
  }, [statusLevel, lifetimePoints]);

  const quizLevel2Unlocked = completedQuizLevels.includes(2);
  const quizLevel3Unlocked = completedQuizLevels.includes(3);
  const quizLevel2Status = quizLevel2Unlocked
    ? { label: "Unlocked", color: "#D81B60" }
    : { label: "Locked", color: "#8E8E8E" };
  const quizLevel3Status = quizLevel3Unlocked
    ? { label: "Unlocked", color: "#D81B60" }
    : { label: "Locked", color: "#8E8E8E" };

  const incompleteBadges = useMemo(() => {
    const rows: Array<{ name: string; note: string }> = [];
    if (!cycleBadgeMinted) {
      rows.push({
        name: "Cycle Literacy Level 1",
        note: cycleBadgeUnlocked ? "Unlocked, ready to mint." : "Complete the Learn quiz to unlock.",
      });
    }
    if (!impactBadgeMinted) {
      rows.push({
        name: "Period Equity Supporter",
        note: impactBadgeUnlocked ? "Unlocked, waiting for mint confirmation." : "Submit and get a donation approved in Impact.",
      });
    }
    if (!quizLevel2Unlocked) {
      rows.push({
        name: "Cycle Literacy Level 2",
        note: "Pass Level 2 quiz in Learn to unlock.",
      });
    }
    if (!quizLevel3Unlocked) {
      rows.push({
        name: "Cycle Literacy Level 3",
        note: "Pass Level 3 quiz in Learn to unlock.",
      });
    }
    return rows;
  }, [
    cycleBadgeMinted,
    cycleBadgeUnlocked,
    impactBadgeMinted,
    impactBadgeUnlocked,
    quizLevel2Unlocked,
    quizLevel3Unlocked,
  ]);

  async function onMintCycleBadge() {
    setErr("");
    setMintResult(null);

    if (!cycleBadgeUnlocked) {
      setErr("Complete the quiz in Learn to unlock this badge.");
      return;
    }
    if (cycleBadgeMinted) {
      setErr("This badge is already minted for this device.");
      return;
    }
    if (!wallet) {
      setErr("Add your Solana wallet in Account first.");
      return;
    }

    setMinting(true);
    try {
      const r = await awardBadge(wallet);
      setMintResult(r);
      await setCycleBadgeMintedLive(true);
    } catch (e: any) {
      setErr(e?.message || "Mint failed");
    } finally {
      setMinting(false);
    }
  }

  async function onQuickEarnDemo() {
    const uid = (user as any)?.userId || (user as any)?.id;
    if (!uid) {
      await addPoints(25);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/points/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ userId: uid, delta: 25 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not add demo points");
      await setPointsLive(Number(data?.points || points + 25));
    } catch (e: any) {
      setErr(e?.message || "Could not add demo points");
    }
  }

  async function redeem(cost: number) {
    setErr("");
    setMintResult(null);

    if (points < cost) {
      setErr("Not enough points yet.");
      return;
    }
    const uid = (user as any)?.userId || (user as any)?.id;
    if (!uid) {
      setErr("Log in to redeem.");
      return;
    }
    if (!wallet) {
      setErr("Add your Solana wallet in Account first.");
      return;
    }

    setRedeemingCost(cost);
    try {
      const res = await fetch(`${API_BASE}/solana/redeem-points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          userId: uid,
          walletAddress: wallet,
          pointsCost: cost,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 120)}`);
      }
      if (!res.ok) throw new Error(data?.error || `Redeem failed (${res.status})`);

      await setPointsLive(Number(data?.pointsAfter ?? Math.max(0, points - cost)));
      setMintResult({
        signature: data.signature,
        explorer: data.explorer,
        note: `Redeemed ${cost} points -> sent ${Number(data?.solSent || 0).toFixed(6)} SOL (devnet)`,
      });
    } catch (e: any) {
      setErr(e?.message || "Redeem failed");
    } finally {
      setRedeemingCost(null);
    }
  }

  const impactSubtitle = useMemo(() => {
    if (!user) return "Log in to sync approvals.";
    if (loadingImpact) return "Checking your submissions…";
    if (!impactLatest) return "Log a donation to unlock.";
    if (impactLatest.status === "pending") return "Submitted. Waiting for approval.";
    if (impactLatest.status === "rejected") return "Rejected. Try submitting again.";
    if (impactLatest.status === "approved" && !impactLatest.txMint)
      return "Approved. Minting may still be processing.";
    if (impactLatest.status === "approved" && impactLatest.txMint) return "Approved and minted on devnet.";
    return "Log a donation to unlock.";
  }, [user, loadingImpact, impactLatest]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, styles.statusCard]}>
        <Text style={styles.statusIcon}>{statusLevel.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>Status: {statusLevel.name}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.lifetimePoints}>Lifetime points: {lifetimePoints}</Text>
            <Text style={styles.pointsToNext}>
            {statusLevel.nextAt ? `${pointsToNext} points until next level` : "Max level reached"}
          </Text>
        </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Your impact balance</Text>
        <Text style={styles.balanceText}>{points} PNK points</Text>
        <Text style={styles.subText}>Earn points by passing quizzes and logging impact.</Text>

        <View style={styles.rowWrap}>
          <Pressable
            onPress={() => setShowRedeem((s) => !s)}
            style={styles.secondaryPillBtn}
          >
            <Text style={styles.secondaryPillBtnText}>{showRedeem ? "Hide rewards" : "Redeem rewards"}</Text>
          </Pressable>

          <Pressable onPress={onQuickEarnDemo} style={styles.primaryPillBtn}>
            <Text style={styles.primaryPillBtnText}>Demo: +25 points</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        {/* Cycle badge */}
        {cycleBadgeUnlocked || cycleBadgeMinted ? (
          <View style={[styles.card, styles.badgeCardBlue]}>
            <View style={styles.headerRow}>
              <Text style={styles.badgeTitle}>Cycle Literacy Level 1</Text>
              <BadgePill label={cycleBadgeStatus.label} color={cycleBadgeStatus.color} />
            </View>

            {cycleBadgeUnlocked && !cycleBadgeMinted ? (
              <Pressable
                onPress={onMintCycleBadge}
                disabled={minting}
                style={[styles.primaryBtn, minting && styles.primaryBtnDisabled]}
              >
                <Text style={styles.primaryBtnText}>{minting ? "Minting…" : "Mint Unlocked Badge"}</Text>
              </Pressable>
            ) : null}

            {cycleBadgeMinted ? (
              <View style={styles.okBox}>
                <Text style={styles.okText}>Minted on-chain.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Impact badge */}
        {impactBadgeUnlocked || impactBadgeMinted ? (
          <View style={[styles.card, styles.badgeCardBlue]}>
            <Pressable onPress={() => setImpactCardOpen((v) => !v)} style={styles.headerRow}>
              <Text style={styles.badgeTitle}>Period Equity Supporter</Text>
              <BadgePill label={impactBadgeStatus.label} color={impactBadgeStatus.color} />
            </Pressable>

            {impactCardOpen ? (
              <>
                <View style={styles.rowWrap}>
                  <Pressable onPress={() => router.push("/(tabs)/impact")} style={styles.secondaryPillBtn}>
                    <Text style={styles.secondaryPillBtnText}>Go to Impact</Text>
                  </Pressable>

                  <Pressable
                    onPress={refreshImpactStatus}
                    style={[styles.primaryPillBtn, loadingImpact && { opacity: 0.7 }]}
                    disabled={loadingImpact}
                  >
                    <Text style={styles.primaryPillBtnText}>{loadingImpact ? "Refreshing…" : "Refresh status"}</Text>
                  </Pressable>
                </View>

                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>
                    {impactLatest
                      ? `Latest: ${impactLatest.locationName || "Donation"} (${impactLatest.status})`
                      : impactSubtitle}
                  </Text>

                  {impactLatest?.photoUrl || impactLatest?.imageUrl ? (
                    <Pressable onPress={() => openExternal(absolutePhotoUrl(impactLatest.photoUrl || impactLatest.imageUrl))}>
                      <Text style={styles.linkText}>View uploaded photo</Text>
                    </Pressable>
                  ) : null}

                  {impactLatest?.status === "approved" && (impactLatest.txMint || impactTx) ? (
                    <Pressable onPress={() => openExternal(mintExplorerUrl(impactLatest.txMint || impactTx))}>
                      <Text style={styles.linkText}>View mint tx</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Quiz level 2 badge */}
        {quizLevel2Unlocked ? (
          <View style={[styles.card, styles.badgeCardBlue]}>
            <View style={styles.headerRow}>
              <Text style={styles.badgeTitle}>Cycle Literacy Level 2</Text>
              <BadgePill label={quizLevel2Status.label} color={quizLevel2Status.color} />
            </View>
            <Text style={styles.subText}>Level 2 quiz completed.</Text>
          </View>
        ) : null}

        {/* Quiz level 3 badge */}
        {quizLevel3Unlocked ? (
          <View style={[styles.card, styles.badgeCardBlue]}>
            <View style={styles.headerRow}>
              <Text style={styles.badgeTitle}>Cycle Literacy Level 3</Text>
              <BadgePill label={quizLevel3Status.label} color={quizLevel3Status.color} />
            </View>
            <Text style={styles.subText}>Level 3 quiz completed.</Text>
          </View>
        ) : null}
      </View>

      {incompleteBadges.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.badgeTitle}>Incomplete badges</Text>
          {incompleteBadges.map((item) => (
            <View key={item.name} style={styles.incompleteRow}>
              <Text style={styles.incompleteName}>{item.name}</Text>
              <Text style={styles.incompleteNote}>{item.note}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {showRedeem ? (
        <View style={styles.card}>
          <Text style={styles.badgeTitle}>Rewards</Text>
          <Text style={styles.subText}>Redeem points for real devnet payout from treasury wallet.</Text>

          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => redeem(100)}
              disabled={redeemingCost !== null}
              style={[styles.primaryBtn, !(points >= 100 && redeemingCost === null) && styles.primaryBtnDisabled]}
            >
              <Text style={styles.primaryBtnText}>
                {redeemingCost === 100 ? "Redeeming…" : "Redeem 100 points (~0.001 SOL devnet)"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => redeem(250)}
              disabled={redeemingCost !== null}
              style={[styles.primaryBtn, !(points >= 250 && redeemingCost === null) && styles.primaryBtnDisabled]}
            >
              <Text style={styles.primaryBtnText}>
                {redeemingCost === 250 ? "Redeeming…" : "Redeem 250 points (~0.0025 SOL devnet)"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {err ? (
        <View style={styles.card}>
          <Text style={{ color: "#C62828" }}>{err}</Text>
        </View>
      ) : null}

      {mintResult ? (
        <View style={styles.card}>
          <Text style={styles.badgeTitle}>Latest</Text>

          {mintResult.note ? <Text style={styles.subText}>{mintResult.note}</Text> : null}

          {mintResult.signature && mintResult.signature !== "demo" ? (
            <>
              <Text style={styles.subText}>Tx: {mintResult.signature}</Text>
              {mintResult.explorer ? (
                <Pressable onPress={() => Linking.openURL(mintResult.explorer)}>
                  <Text style={styles.linkText}>View in Solana Explorer</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      <View style={{ paddingBottom: 24 }}>
        <Text style={styles.footerNote}>
          Cycle badge minting uses your server wallet on devnet. Impact badge is minted when an admin approves the
          donation.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF" },
  content: { padding: 16, gap: 12, paddingBottom: 110 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ea9ab2",
    shadowColor: "#ea9ab2",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    padding: 16,
    gap: 10,
  },
  badgeCardBlue: { backgroundColor: "#D8ECF0" },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusIcon: { fontSize: 36 },
  statusTitle: { color: "#250921", fontFamily: "Onest-Bold", fontSize: 34 / 2 },
  statusRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 3 },
  lifetimePoints: { color: "#D81B60", fontFamily: "Onest-Bold", fontSize: 14 },
  pointsToNext: { color: "#555", fontFamily: "Onest", fontSize: 12 },
  sectionLabel: { color: "#333", fontFamily: "Onest", fontSize: 14 },
  balanceText: { color: "#D81B60", fontFamily: "Onest-Bold", fontSize: 30 },
  subText: { color: "#555", fontFamily: "Onest", fontSize: 14 },
  rowWrap: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  badgeTitle: { color: "#250921", fontFamily: "Onest-Bold", fontSize: 24 / 2 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  incompleteRow: {
    backgroundColor: "#FDECEF",
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  incompleteName: { color: "#250921", fontFamily: "Onest-Bold", fontSize: 14 },
  incompleteNote: { color: "#555", fontFamily: "Onest", fontSize: 12 },
  primaryBtn: {
    backgroundColor: "#BA5D84",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { backgroundColor: "#F48FB1" },
  primaryBtnText: { color: "#FFF", fontFamily: "Onest-Bold", fontSize: 18 / 1.25 },
  primaryPillBtn: {
    backgroundColor: "#D81B60",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryPillBtnText: { color: "#FFF", fontFamily: "Onest-Bold", fontSize: 14 },
  secondaryPillBtn: {
    backgroundColor: "#FDECEF",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryPillBtnWide: {
    backgroundColor: "#FDECEF",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  secondaryPillBtnText: { color: "#333", fontFamily: "Onest-Bold", fontSize: 14 },
  tipBox: { backgroundColor: "#FDECEF", padding: 12, borderRadius: 16, gap: 6 },
  tipText: { color: "#333", fontFamily: "Onest", fontSize: 14 },
  okBox: { backgroundColor: "#E8F5E9", padding: 12, borderRadius: 16 },
  okText: { color: "#2E7D32", fontFamily: "Onest-Bold", fontSize: 14 },
  linkText: { color: "#D81B60", fontFamily: "Onest-Bold", fontSize: 14 },
  footerNote: { color: "#777", fontFamily: "Onest", fontSize: 12 },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgePillText: { color: "#fff", fontFamily: "Onest-Bold", fontSize: 12 },
});
