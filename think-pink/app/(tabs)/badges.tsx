import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Linking, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { awardBadge } from "../../lib/solanaClient";
import { getWalletAddress } from "../../lib/walletStore";
import { useProgress } from "../../lib/progressContext";

type MintResult = {
  signature: string;
  explorer: string;
  badgeMint: string;
  recipientAta: string;
};

export default function Badges() {
  const { cycleBadgeUnlocked, points, addPoints, refresh, hydrated } = useProgress();

  const [wallet, setWallet] = useState<string>("");
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [err, setErr] = useState<string>("");

  async function loadWallet() {
    const w = await getWalletAddress();
    setWallet(w || "");
  }

  useEffect(() => {
    loadWallet();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadWallet();
    }, [refresh])
  );

  async function onMint() {
    setErr("");
    setMintResult(null);

    if (!wallet) {
      setErr("Add your Solana wallet in Account first.");
      return;
    }
    if (!cycleBadgeUnlocked) {
      setErr("Pass the quiz in Learn to unlock this badge first.");
      return;
    }

    setMinting(true);
    try {
      const r = await awardBadge(wallet);
      setMintResult(r);
      // optional bonus for minting on-chain
      await addPoints(25);
    } catch (e: any) {
      setErr(e?.message || "Mint failed");
    } finally {
      setMinting(false);
    }
  }

  async function redeem(cost: number) {
    setErr("");
    if (points < cost) {
      setErr("Not enough points.");
      return;
    }
    await addPoints(-cost);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FDECEF" }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 8 }}>
        <Text style={{ color: "#333", fontWeight: "800", fontSize: 18 }}>Badges + Rewards</Text>

        <Text style={{ color: "#555" }}>
          Points: <Text style={{ color: "#D81B60", fontWeight: "800" }}>{hydrated ? points : "…"}</Text>
        </Text>

        <Text style={{ color: "#777" }}>
          Wallet: {wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "Not set"}
        </Text>
      </View>

      <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 8 }}>
        <Text style={{ color: "#333", fontWeight: "800" }}>Cycle Literacy Level 1</Text>
        <Text style={{ color: cycleBadgeUnlocked ? "#2E7D32" : "#C62828" }}>
          {!hydrated ? "Loading…" : cycleBadgeUnlocked ? "Unlocked" : "Locked — pass the quiz in Learn"}
        </Text>

        <Pressable
          onPress={onMint}
          disabled={minting || !cycleBadgeUnlocked}
          style={{
            backgroundColor: minting ? "#F48FB1" : cycleBadgeUnlocked ? "#D81B60" : "#F7B6C8",
            borderRadius: 999,
            paddingVertical: 12,
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700" }}>
            {minting ? "Minting…" : "Mint badge on Solana (Devnet)"}
          </Text>
        </Pressable>

        {mintResult && (
          <View style={{ backgroundColor: "#FDECEF", padding: 12, borderRadius: 16, gap: 6, marginTop: 8 }}>
            <Text style={{ color: "#333", fontWeight: "800" }}>Minted</Text>
            <Text style={{ color: "#333" }}>Tx: {mintResult.signature}</Text>
            <Pressable onPress={() => Linking.openURL(mintResult.explorer)}>
              <Text style={{ color: "#D81B60", fontWeight: "700" }}>Open in Solana Explorer</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 12 }}>
        <Text style={{ color: "#333", fontWeight: "800", fontSize: 16 }}>Redeem points</Text>

        <View style={{ backgroundColor: "#FDECEF", padding: 12, borderRadius: 16, gap: 6 }}>
          <Text style={{ color: "#333", fontWeight: "800" }}>10% off period products</Text>
          <Text style={{ color: "#555" }}>Cost: 150 points</Text>
          <Pressable
            onPress={() => redeem(150)}
            style={{
              marginTop: 6,
              backgroundColor: "#D81B60",
              borderRadius: 999,
              paddingVertical: 10,
              alignItems: "center",
              opacity: points >= 150 ? 1 : 0.6,
            }}
            disabled={points < 150}
          >
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Redeem</Text>
          </Pressable>
        </View>

        <View style={{ backgroundColor: "#FDECEF", padding: 12, borderRadius: 16, gap: 6 }}>
          <Text style={{ color: "#333", fontWeight: "800" }}>Donate 1 period kit</Text>
          <Text style={{ color: "#555" }}>Cost: 200 points</Text>
          <Pressable
            onPress={() => redeem(200)}
            style={{
              marginTop: 6,
              backgroundColor: "#D81B60",
              borderRadius: 999,
              paddingVertical: 10,
              alignItems: "center",
              opacity: points >= 200 ? 1 : 0.6,
            }}
            disabled={points < 200}
          >
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Redeem</Text>
          </Pressable>
        </View>

        <View style={{ backgroundColor: "#FDECEF", padding: 12, borderRadius: 16, gap: 6 }}>
          <Text style={{ color: "#333", fontWeight: "800" }}>Sponsor gift card (demo)</Text>
          <Text style={{ color: "#555" }}>Cost: 500 points</Text>
          <Pressable
            onPress={() => redeem(500)}
            style={{
              marginTop: 6,
              backgroundColor: "#D81B60",
              borderRadius: 999,
              paddingVertical: 10,
              alignItems: "center",
              opacity: points >= 500 ? 1 : 0.6,
            }}
            disabled={points < 500}
          >
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Redeem</Text>
          </Pressable>
        </View>
      </View>

      {err ? (
        <View style={{ backgroundColor: "#FFF", padding: 12, borderRadius: 16 }}>
          <Text style={{ color: "#C62828" }}>{err}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}