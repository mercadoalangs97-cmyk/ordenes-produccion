export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const CLIENT_ID = process.env.SKYDROPX_API_KEY;
  const CLIENT_SECRET = process.env.SKYDROPX_API_SECRET;
  const BASE = "https://api.skydropx.com/v1";

  async function getToken() {
    const r = await fetch(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    });
    const d = await r.json();
    return d.access_token || null;
  }

  try {
    const { action, payload } = req.body || {};
    if (!action) return res.status(400).json({ error: "Falta action" });

    const token = await getToken();
    if (!token) return res.status(401).json({ error: "No se pudo autenticar con Skydropx. Verifica tus credenciales." });

    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    if (action === "get_quotes") {
      const r = await fetch(`${BASE}/quotes`, { method: "POST", headers, body: JSON.stringify(payload) });
      return res.json(await r.json());
    }

    if (action === "create_shipment") {
      const r = await fetch(`${BASE}/shipments`, { method: "POST", headers, body: JSON.stringify(payload) });
      return res.json(await r.json());
    }

    if (action === "get_shipment") {
      const r = await fetch(`${BASE}/shipments/${payload.id}`, { method: "GET", headers });
      return res.json(await r.json());
    }

    if (action === "get_label") {
      const r = await fetch(`${BASE}/shipments/${payload.id}/label`, { method: "GET", headers });
      return res.json(await r.json());
    }

    return res.status(400).json({ error: "Acción desconocida" });
  } catch (err) {
    console.error("Skydropx error:", err);
    return res.status(500).json({ error: err.message });
  }
}
