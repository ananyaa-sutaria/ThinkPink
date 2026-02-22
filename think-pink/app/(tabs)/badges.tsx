// app/(tabs)/badges.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Linking, ScrollView, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { useProgress } from "../../lib/progressContext";
import { awardBadge } from "../../lib/solanaClient";
import { API_BASE } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

const KEY_WALLET = "tp_wallet_address";

function BadgePill({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: color,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 12 }}>{label}</Text>
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
  const [mintResult, setMintResult] = useState<any>(null);
  const [err, setErr] = useState<string>("");
  const [showRedeem, setShowRedeem] = useState(false);

  const [loadingImpact, setLoadingImpact] = useState(false);
  const [impactLatest, setImpactLatest] = useState<Submission | null>(null);
  const [impactTx, setImpactTx] = useState<string>("");

  async function openExternal(rawUrl: string) {
    if (!rawUrl) {
      Alert.alert("Link unavailable", "No link found for this item yet.");
      return;
    }

    try {
      const supported = await Linking.canOpenURL(rawUrl);
      if (!supported) {
        Alert.alert("Cannot open link", rawUrl);
        return;
      }
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

  async function refreshImpactStatus() {
    const uid = (user as any)?.userId || (user as any)?.id;
    if (!uid) {
      setImpactLatest(null);
      setImpactTx("");
      await setImpactBadgeUnlockedLive(false);
      await setImpactBadgeMintedLive(false);
      // 🔥 Sync server points
        const pointsRes = await fetch(
        `${API_BASE}/points/${encodeURIComponent(uid)}`,
        { headers: { "ngrok-skip-browser-warning": "true" } }
        );

        const pointsData = await pointsRes.json();
        if (pointsData?.ok) {
        await setPointsLive(pointsData.points);
        }
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
    await addPoints(25);
  }

  async function redeem(cost: number) {
    setErr("");
    setMintResult(null);

    if (points < cost) {
      setErr("Not enough points yet.");
      return;
    }

    await addPoints(-cost);
    setMintResult({ signature: "demo", explorer: "", note: `Redeemed ${cost} points` });
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
      style={{ flex: 1, backgroundColor: "#FDECEF" }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}
    >
      <View
        style={{
          backgroundColor: "#FFF",
          padding: 16,
          borderRadius: 20,
          gap: 8,
          borderWidth: 1,
          borderColor: "#F48FB1",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 36 }}>{statusLevel.icon}</Text>
        <Text style={{ color: "#333", fontSize: 20 }}>Status: {statusLevel.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Text style={{ color: "#D81B60", fontSize: 16 }}>Lifetime points: {lifetimePoints}</Text>
          <Text style={{ color: "#555", fontSize: 13 }}>
            {statusLevel.nextAt ? `${pointsToNext} points until next level` : "Max level reached"}
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: "#FFF",
          padding: 16,
          borderRadius: 20,
          gap: 10,
          borderWidth: 1,
          borderColor: "#F48FB1",
        }}
      >
        <Text style={{ color: "#333" }}>Your impact balance</Text>
        <Text style={{ color: "#D81B60", fontSize: 28 }}>{points} PNK points</Text>
        <Text style={{ color: "#555" }}>Earn points by passing quizzes and logging impact.</Text>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => setShowRedeem((s) => !s)}
            style={{
              backgroundColor: "#fff",
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Text style={{ color: "#333" }}>{showRedeem ? "Hide rewards" : "Redeem rewards"}</Text>
          </Pressable>

          <Pressable
            onPress={onQuickEarnDemo}
            style={{
              backgroundColor: "#D81B60",
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Text style={{ color: "#FFF" }}>Demo: +25 points</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        {/* Cycle badge */}
        <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#333", fontSize: 16 }}>Cycle Literacy Level 1</Text>
            <BadgePill label={cycleBadgeStatus.label} color={cycleBadgeStatus.color} />
          </View>

          <Text style={{ color: "#555" }}>Complete the quiz to unlock. Mint once to verify on Solana devnet.</Text>

          {!wallet ? (
            <Pressable
              onPress={() => router.push("/account")}
              style={{
                backgroundColor: "#FDECEF",
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={{ color: "#333" }}>Add wallet in Account</Text>
            </Pressable>
          ) : (
            <Text style={{ color: "#777", fontSize: 12 }}>Wallet: {wallet}</Text>
          )}

          {cycleBadgeUnlocked && !cycleBadgeMinted ? (
            <Pressable
              onPress={onMintCycleBadge}
              disabled={minting}
              style={{
                backgroundColor: minting ? "#F48FB1" : "#D81B60",
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={{ color: "#FFF" }}>{minting ? "Minting…" : "Mint unlocked badge"}</Text>
            </Pressable>
          ) : null}

          {!cycleBadgeUnlocked ? (
            <View style={{ backgroundColor: "#FDECEF", padding: 12, borderRadius: 16 }}>
              <Text style={{ color: "#333" }}>Tip: Pass the quiz in Learn to unlock.</Text>
            </View>
          ) : null}

          {cycleBadgeMinted ? (
            <View style={{ backgroundColor: "#E8F5E9", padding: 12, borderRadius: 16 }}>
              <Text style={{ color: "#2E7D32" }}>Minted on-chain.</Text>
            </View>
          ) : null}
        </View>

        {/* Impact badge */}
        <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#333", fontSize: 16 }}>Period Equity Supporter</Text>
            <BadgePill label={impactBadgeStatus.label} color={impactBadgeStatus.color} />
          </View>

          <Text style={{ color: "#555" }}>{impactSubtitle}</Text>

          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => router.push("/(tabs)/impact")}
              style={{
                backgroundColor: "#FDECEF",
                borderRadius: 999,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ color: "#333" }}>Go to Impact</Text>
            </Pressable>

            <Pressable
              onPress={refreshImpactStatus}
              style={{
                backgroundColor: "#D81B60",
                borderRadius: 999,
                paddingVertical: 10,
                paddingHorizontal: 14,
                opacity: loadingImpact ? 0.7 : 1,
              }}
              disabled={loadingImpact}
            >
              <Text style={{ color: "#FFF" }}>{loadingImpact ? "Refreshing…" : "Refresh status"}</Text>
            </Pressable>
          </View>

          {impactLatest ? (
            <View style={{ backgroundColor: "#FDECEF", padding: 12, borderRadius: 16, gap: 6 }}>
              <Text style={{ color: "#333" }}>
                Latest: {impactLatest.locationName || "Donation"} ({impactLatest.status})
              </Text>

              {impactLatest.photoUrl ? (
                <Pressable onPress={() => openExternal(absolutePhotoUrl(impactLatest.photoUrl))}>
                  <Text style={{ color: "#D81B60" }}>View uploaded photo</Text>
                </Pressable>
              ) : null}

              {impactLatest.status === "approved" && (impactLatest.txMint || impactTx) ? (
                <Pressable
                  onPress={() => openExternal(mintExplorerUrl(impactLatest.txMint || impactTx))}
                >
                  <Text style={{ color: "#D81B60" }}>View mint tx</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {showRedeem ? (
        <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 10 }}>
          <Text style={{ color: "#333", fontSize: 16 }}>Rewards</Text>
          <Text style={{ color: "#555" }}>Redeem points for impact perks (demo mode).</Text>

          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => redeem(100)}
              style={{
                backgroundColor: points >= 100 ? "#D81B60" : "#F48FB1",
                borderRadius: 16,
                padding: 12,
              }}
            >
              <Text style={{ color: "#FFF" }}>Redeem 100 points: donate 1 kit (demo)</Text>
            </Pressable>

            <Pressable
              onPress={() => redeem(250)}
              style={{
                backgroundColor: points >= 250 ? "#D81B60" : "#F48FB1",
                borderRadius: 16,
                padding: 12,
              }}
            >
              <Text style={{ color: "#FFF" }}>Redeem 250 points: donate 3 kits (demo)</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {err ? (
        <View style={{ backgroundColor: "#FFF", padding: 12, borderRadius: 16 }}>
          <Text style={{ color: "#C62828" }}>{err}</Text>
        </View>
      ) : null}

      {mintResult ? (
        <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 8 }}>
          <Text style={{ color: "#333" }}>Latest</Text>

          {mintResult.note ? <Text style={{ color: "#333" }}>{mintResult.note}</Text> : null}

          {mintResult.signature && mintResult.signature !== "demo" ? (
            <>
              <Text style={{ color: "#333" }}>Tx: {mintResult.signature}</Text>
              {mintResult.explorer ? (
                <Pressable onPress={() => Linking.openURL(mintResult.explorer)}>
                  <Text style={{ color: "#D81B60" }}>View in Solana Explorer</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      <View style={{ paddingBottom: 24 }}>
        <Text style={{ color: "#777", fontSize: 12 }}>
          Cycle badge minting uses your server wallet on devnet. Impact badge is minted when an admin approves the
          donation.
        </Text>
      </View>
    </ScrollView>
  );
}
