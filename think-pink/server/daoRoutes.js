import express from "express";
import Proposal from "./models/Proposal.js";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

export function makeDaoRouter({ connection }) {
  const router = express.Router();

  router.post("/dao/create", async (req, res) => {
    try {
      const { title, description, options } = req.body;
      const p = await Proposal.create({
        title,
        description,
        options: (options || []).map((o) => ({ key: o.key, label: o.label, votes: 0 })),
      });
      res.json({ ok: true, proposal: p });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/dao/list", async (req, res) => {
    try {
      const props = await Proposal.find({}).sort({ createdAt: -1 }).limit(20).lean();
      res.json({ ok: true, proposals: props });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // token-gated vote: must hold >= minPNK
  router.post("/dao/vote", async (req, res) => {
    try {
      const { proposalId, optionKey, walletAddress, minPNK = 1 } = req.body;
      if (!proposalId || !optionKey || !walletAddress) {
        return res.status(400).json({ error: "proposalId, optionKey, walletAddress required" });
      }

      const pointsMint = process.env.POINTS_MINT;
      if (!pointsMint) return res.status(500).json({ error: "POINTS_MINT not set" });

      const owner = new PublicKey(walletAddress);
      const mint = new PublicKey(pointsMint);
      const ata = await getAssociatedTokenAddress(mint, owner);

      let bal = 0;
      try {
        const r = await connection.getTokenAccountBalance(ata);
        bal = Number(r.value.amount || 0);
      } catch {
        bal = 0;
      }

      if (bal < Number(minPNK)) {
        return res.status(403).json({ error: `Need at least ${minPNK} PNK to vote`, balance: bal });
      }

      const p = await Proposal.findById(proposalId);
      if (!p) return res.status(404).json({ error: "proposal not found" });
      if (!p.isOpen) return res.status(400).json({ error: "proposal closed" });

      const opt = p.options.find((o) => o.key === optionKey);
      if (!opt) return res.status(400).json({ error: "invalid option" });

      opt.votes += 1;
      await p.save();

      res.json({ ok: true, proposal: p, balance: bal });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}