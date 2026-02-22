// app/(tabs)/badges.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Linking, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { useProgress } from "../../lib/progressContext";
import { awardBadge } from "../../lib/solanaClient";

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

export default function BadgesRewardsScreen() {
  const router = useRouter();

  const {
    cycleBadgeUnlocked,
    cycleBadgeMinted,
    points,
    addPoints,
    setCycleBadgeMintedLive,
  } = useProgress();

  const [wallet, setWallet] = useState<string>("");
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<any>(null);
  const [err, setErr] = useState<string>("");
  const [showRedeem, setShowRedeem] = useState(false);

  useEffect(() => {
    (async () => {
      const w = (await AsyncStorage.getItem(KEY_WALLET)) || "";
      setWallet(w);
    })();
  }, []);

  const badgeStatus = useMemo(() => {
    if (cycleBadgeMinted) return { label: "Minted", color: "#2E7D32" };
    if (cycleBadgeUnlocked) return { label: "Unlocked", color: "#D81B60" };
    return { label: "Locked", color: "#8E8E8E" };
  }, [cycleBadgeUnlocked, cycleBadgeMinted]);

  async function onMintBadge() {
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
      const r = await awardBadge(wallet); // server mints, no Phantom needed
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
    setMintResult({
      signature: "demo",
      explorer: "",
      note: `Redeemed ${cost} points`,
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 8 }}>
        <Text style={{ color: "#333", fontSize: 18 }}>Badges + Rewards</Text>
        <Text style={{ color: "#555" }}>Learn, earn points, mint verified badges.</Text>
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
        <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#333", fontSize: 16 }}>Cycle Literacy Level 1</Text>
            <BadgePill label={badgeStatus.label} color={badgeStatus.color} />
          </View>

          <Text style={{ color: "#555" }}>
            Complete the quiz to unlock. Mint once to verify on Solana devnet.
          </Text>

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
              onPress={onMintBadge}
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

        <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 8, opacity: 0.85 }}>
          <Text style={{ color: "#333", fontSize: 16 }}>Period Equity Supporter</Text>
          <Text style={{ color: "#555" }}>Log a donation to unlock.</Text>
          <BadgePill label="Locked" color="#8E8E8E" />
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
          Minting uses your server wallet on devnet. No Phantom required.
        </Text>
      </View>
    </ScrollView>
  );
}