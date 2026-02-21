// server/geoRoutes.js (or inside server/index.js)
import express from "express";

const router = express.Router();

// Haversine distance in km
function haversineKm(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

router.get("/geo/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const lat = req.query.lat != null ? Number(req.query.lat) : null;
    const lng = req.query.lng != null ? Number(req.query.lng) : null;

    if (!q) return res.status(400).json({ error: "q is required" });

    // Nominatim requires a User-Agent / Referer header
    // (Node fetch is global in Node 18+, if not, npm i node-fetch and import it)
    const params = new URLSearchParams({
      q,
      format: "json",
      addressdetails: "0",
      limit: "12",
    });

    // Bias locally if we have user coords:
    // A ~20km bounding box. Adjust if you want wider results.
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      const delta = 0.18; // ~20km-ish latitude span (rough)
      const left = lng - delta;
      const right = lng + delta;
      const top = lat + delta;
      const bottom = lat - delta;

      // viewbox order: left,top,right,bottom
      params.set("viewbox", `${left},${top},${right},${bottom}`);
      params.set("bounded", "1"); // force results inside box
    }

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    const r = await fetch(url, {
      headers: {
        "User-Agent": "ThinkPink/1.0 (student project)",
        "Accept-Language": "en",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: `Geocoder failed: ${text.slice(0, 120)}` });
    }

    const raw = await r.json();

    let results = (raw || []).map((x) => ({
      name: x.display_name,
      lat: Number(x.lat),
      lng: Number(x.lon),
      // compute distance if we can
      distanceKm:
        lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
          ? haversineKm(lat, lng, Number(x.lat), Number(x.lon))
          : null,
    }));

    // sort nearest first when we have distance
    if (results.length && results[0].distanceKm != null) {
      results.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    // return only what the app expects
    res.json({
      ok: true,
      results: results.map(({ name, lat, lng }) => ({ name, lat, lng })),
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Geo search failed" });
  }
});

export default router;