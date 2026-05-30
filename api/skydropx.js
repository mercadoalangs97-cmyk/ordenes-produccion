export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const API_KEY = process.env.SKYDROPX_API_KEY;
  const BASE    = "https://api.skydropx.com/v1";

  if (!API_KEY) return res.status(500).json({ error: "SKYDROPX_API_KEY no configurada en Vercel." });

  // Skydropx uses direct Bearer token auth — no OAuth needed
  const headers = {
    "Content-Type":  "application/json",
    "Accept":        "application/json",
    "Authorization": `Bearer ${API_KEY}`,
  };

  try {
    const { action, payload } = req.body || {};
    if (!action) return res.status(400).json({ error: "Falta action" });

    if (action === "get_quotes") {
      const r = await fetch(`${BASE}/quotes`, { method:"POST", headers, body:JSON.stringify(payload) });
      const text = await r.text();
      try { return res.json(JSON.parse(text)); }
      catch { return res.status(r.status).json({ error: `Skydropx respondió: ${text.slice(0,200)}` }); }
    }

    if (action === "create_shipment") {
      const r = await fetch(`${BASE}/shipments`, { method:"POST", headers, body:JSON.stringify(payload) });
      const text = await r.text();
      try { return res.json(JSON.parse(text)); }
      catch { return res.status(r.status).json({ error: `Skydropx respondió: ${text.slice(0,200)}` }); }
    }

    if (action === "get_shipment") {
      const r = await fetch(`${BASE}/shipments/${payload.id}`, { method:"GET", headers });
      const text = await r.text();
      try { return res.json(JSON.parse(text)); }
      catch { return res.status(r.status).json({ error: `Skydropx respondió: ${text.slice(0,200)}` }); }
    }

    if (action === "get_label") {
      const r = await fetch(`${BASE}/shipments/${payload.id}/label`, { method:"GET", headers });
      const text = await r.text();
      try { return res.json(JSON.parse(text)); }
      catch { return res.status(r.status).json({ error: `Skydropx respondió: ${text.slice(0,200)}` }); }
    }

    return res.status(400).json({ error: "Acción desconocida" });
  } catch (err) {
    console.error("Skydropx error:", err);
    return res.status(500).json({ error: err.message });
  }
}
