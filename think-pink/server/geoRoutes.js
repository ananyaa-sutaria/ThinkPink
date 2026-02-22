import express from "express";

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 3) return res.json({ ok: true, results: [] });

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    function haversineKm(lat1, lon1, lat2, lon2) {
      const toRad = (d) => (d * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    }

    let url =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=12&countrycodes=us`;

    if (hasCoords) {
      const delta = 0.25; // ~25km box
      const left = lng - delta;
      const right = lng + delta;
      const top = lat + delta;
      const bottom = lat - delta;
      url += `&viewbox=${left},${top},${right},${bottom}&bounded=1`;
    }

    const r = await fetch(url, {
      headers: { "User-Agent": "ThinkPink/1.0", Accept: "application/json" },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: `Geo provider error: ${text.slice(0, 200)}` });
    }

    const data = await r.json();

    let results = (data || [])
      .map((item) => {
        const ilat = Number(item.lat);
        const ilng = Number(item.lon);
        const distanceKm = hasCoords ? haversineKm(lat, lng, ilat, ilng) : null;
        return { name: item.display_name, lat: ilat, lng: ilng, distanceKm };
      })
      .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));

    if (hasCoords) {
      results.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));

      const radii = [10, 25, 60, 150];
      let filtered = [];
      for (const radius of radii) {
        filtered = results.filter((x) => (x.distanceKm ?? 1e9) <= radius);
        if (filtered.length >= 3) break;
      }
      if (filtered.length) results = filtered;
    }

    res.json({ ok: true, results: results.map(({ name, lat, lng }) => ({ name, lat, lng })) });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Geo search failed" });
  }
});

export default router;