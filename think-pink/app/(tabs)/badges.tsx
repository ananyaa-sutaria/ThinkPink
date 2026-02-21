import { useEffect, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { awardBadge } from "../../lib/solanaClient";
import { getWalletAddress } from "../../lib/walletStore";
import { useProgress } from "../../lib/progressContext";
export default function Badges() {
  const { cycleBadgeUnlocked } = useProgress();
  const [wallet, setWallet] = useState<string>("");
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    getWalletAddress().then((w) => setWallet(w || ""));
  }, []);

  async function onMint() {
    setErr("");
    setMintResult(null);

    if (!wallet) {
      setErr("Add your Solana wallet in Account first.");
      return;
    }

    setMinting(true);
    try {
      const r = await awardBadge(wallet);
      setMintResult(r);
    } catch (e: any) {
      setErr(e?.message || "Mint failed");
    } finally {
      setMinting(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: "#FDECEF" }}>
      <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20 }}>
        <Text style={{ color: "#333", fontWeight: "800", fontSize: 18 }}>Badges</Text>
        <Text style={{ color: "#555", marginTop: 6 }}>
          Cycle Literacy Level 1
        </Text>
        <Text style={{ color: cycleBadgeUnlocked ? "#2E7D32" : "#C62828", marginTop: 6 }}>
          {cycleBadgeUnlocked ? "Unlocked" : "Locked — pass the quiz in Learn"}
        </Text>
      </View>

      {cycleBadgeUnlocked && (
        <Pressable
          onPress={onMint}
          disabled={minting}
          style={{
            backgroundColor: minting ? "#F48FB1" : "#D81B60",
            borderRadius: 999,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700" }}>
            {minting ? "Minting…" : "Mint Badge on Solana (Devnet)"}
          </Text>
        </Pressable>
      )}

      {err ? (
        <View style={{ backgroundColor: "#FFF", padding: 12, borderRadius: 16 }}>
          <Text style={{ color: "#C62828" }}>{err}</Text>
        </View>
      ) : null}

      {mintResult && (
        <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 6 }}>
          <Text style={{ color: "#333", fontWeight: "800" }}>Minted</Text>
          <Text style={{ color: "#333" }}>Tx: {mintResult.signature}</Text>
          <Pressable onPress={() => Linking.openURL(mintResult.explorer)}>
            <Text style={{ color: "#D81B60" }}>Open in Solana Explorer</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}