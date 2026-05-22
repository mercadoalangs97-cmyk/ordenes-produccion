import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// ─── Constants ────────────────────────────────────────────────────
const TECHNIQUES = ["Serigrafía","Bordado","DTF / Vinil","Grabado Láser","Impresión Directa","Otra"];
const STATUS_CONFIG = {
  "Pendiente":          { color: "#D97706", bg: "#FEF3C7" },
  "En Producción":      { color: "#2563EB", bg: "#DBEAFE" },
  "Control de Calidad": { color: "#7C3AED", bg: "#EDE9FE" },
  "Terminado":          { color: "#059669", bg: "#D1FAE5" },
  "Entregado":          { color: "#6B7280", bg: "#F3F4F6" },
};

// ─── DB helpers ───────────────────────────────────────────────────
function orderToDb(order) {
  return {
    folio: order.folio,
    fecha: order.fecha,
    fecha_entrega: order.fechaEntrega || null,
    cliente: order.cliente,
    empresa: order.empresa,
    telefono: order.telefono,
    email: order.email,
    client_id: order.clientId || null,
    client_code: order.clientCode || null,
    productos: order.productos,
    logos: order.logos,
    notas_generales: order.notasGenerales,
    status: order.status,
    creado_por: order.creadoPor,
  };
}

function dbToOrder(row) {
  return {
    id: row.id,
    folio: row.folio || "",
    fecha: row.fecha || new Date().toISOString().split("T")[0],
    fechaEntrega: row.fecha_entrega || "",
    cliente: row.cliente || "",
    empresa: row.empresa || "",
    telefono: row.telefono || "",
    email: row.email || "",
    clientId: row.client_id || null,
    clientCode: row.client_code || null,
    productos: row.productos || [],
    logos: row.logos || [],
    notasGenerales: row.notas_generales || "",
    status: row.status || "Pendiente",
    creadoPor: row.creado_por || "",
  };
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res({ name: file.name, type: file.type, data: r.result });
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function emptyOrder() {
  return {
    id: "new_" + Date.now(),
    folio: "", fecha: new Date().toISOString().split("T")[0], fechaEntrega: "",
    cliente: "", empresa: "", telefono: "", email: "",
    clientId: null, clientCode: null,
    productos: [{ id: Date.now().toString(), descripcion: "", cantidad: "", talla: "", color: "", tecnica: "", posicion: "", coloresImpresion: "", notas: "", fotoProducto: null, mockup: null }],
    logos: [], notasGenerales: "", status: "Pendiente", creadoPor: "",
  };
}

// ─── CSS ──────────────────────────────────────────────────────────
const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#F8F7F4}
input,select,textarea,button{font-family:inherit}
button{cursor:pointer}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}
.input-field{width:100%;padding:9px 12px;border:1.5px solid #E5E3F0;border-radius:9px;font-size:14px;background:white;outline:none;color:#1A1A2E;transition:border .15s}
.input-field:focus{border-color:#4F46E5}
.label{font-size:11px;font-weight:700;color:#6B6B8A;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px;display:block}
.btn{border:none;border-radius:10px;padding:10px 22px;font-weight:700;font-size:14px;cursor:pointer;transition:all .15s}
.btn-primary{background:#2D2B55;color:#fff}.btn-primary:hover{background:#3D3A72}
.btn-outline{background:#fff;color:#2D2B55;border:1.5px solid #2D2B55}.btn-outline:hover{background:#F0EFF9}
.btn-red{background:#FEE2E2;color:#DC2626;border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer}
.card{background:white;border:1.5px solid #E5E3F0;border-radius:14px;padding:22px}
.hover-lift:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.07)}
`;

// ══════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [mode, setMode]         = useState(null);
  const [adminReady, setAdminReady] = useState(false);
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", "admin_password").maybeSingle();
      setAdminReady(!!data?.value);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Splash />;
  if (mode === null) return <Landing onAdmin={() => setMode("login-admin")} onClient={() => setMode("login-client")} />;
  if (mode === "login-admin") return <LoginAdmin isFirst={!adminReady} onSuccess={() => { setAdminReady(true); setMode("admin"); }} onBack={() => setMode(null)} />;
  if (mode === "login-client") return <LoginClient onSuccess={(info) => { setClientInfo(info); setMode("client"); }} onBack={() => setMode(null)} />;
  if (mode === "admin") return <AdminApp onLogout={() => setMode(null)} />;
  if (mode === "client") return <ClientApp client={clientInfo} onLogout={() => { setClientInfo(null); setMode(null); }} />;
  return null;
}

// ── SPLASH ────────────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"'DM Sans',sans-serif", color:"#888" }}>
      <style>{BASE_CSS}</style>
      Cargando...
    </div>
  );
}

// ── LANDING ───────────────────────────────────────────────────────
function Landing({ onAdmin, onClient }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#4C1D95 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{BASE_CSS}</style>
      <div style={{ textAlign:"center", maxWidth:480, width:"100%" }}>
        <div style={{ width:64, height:64, background:"rgba(255,255,255,.15)", borderRadius:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 20px" }}>🏭</div>
        <h1 style={{ color:"white", fontSize:30, fontWeight:800, letterSpacing:-1, marginBottom:8 }}>Órdenes de Producción</h1>
        <p style={{ color:"rgba(255,255,255,.6)", fontSize:15, marginBottom:40 }}>Selecciona tu tipo de acceso para continuar</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <AccessCard icon="🔐" title="Admin / Equipo" desc="Gestiona todas las órdenes, clientes y producción" color="#A78BFA" onClick={onAdmin} />
          <AccessCard icon="🧑‍💼" title="Cliente" desc="Crea órdenes y consulta el estatus de las tuyas" color="#34D399" onClick={onClient} />
        </div>
      </div>
    </div>
  );
}

function AccessCard({ icon, title, desc, color, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:"rgba(255,255,255,.08)", border:`1.5px solid ${color}40`, borderRadius:16, padding:24, cursor:"pointer", transition:"all .2s", backdropFilter:"blur(8px)" }}
      onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.15)"; e.currentTarget.style.transform="translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.transform="none"; }}>
      <div style={{ fontSize:32, marginBottom:10 }}>{icon}</div>
      <div style={{ color:"white", fontWeight:700, fontSize:16, marginBottom:6 }}>{title}</div>
      <div style={{ color:"rgba(255,255,255,.55)", fontSize:13, lineHeight:1.5 }}>{desc}</div>
    </div>
  );
}

// ── LOGIN ADMIN ───────────────────────────────────────────────────
function LoginAdmin({ isFirst, onSuccess, onBack }) {
  const [pass, setPass]   = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handle() {
    setErr(""); setLoading(true);
    if (isFirst) {
      if (pass.length < 4) { setErr("Mínimo 4 caracteres."); setLoading(false); return; }
      if (pass !== pass2)  { setErr("Las contraseñas no coinciden."); setLoading(false); return; }
      const { error } = await supabase.from("settings").upsert({ key: "admin_password", value: pass });
      if (error) { setErr("Error al guardar. Intenta de nuevo."); setLoading(false); return; }
      onSuccess();
    } else {
      const { data } = await supabase.from("settings").select("value").eq("key", "admin_password").maybeSingle();
      if (data?.value === pass) onSuccess();
      else setErr("Contraseña incorrecta.");
    }
    setLoading(false);
  }

  return (
    <AuthScreen icon="🔐" title={isFirst ? "Crear contraseña Admin" : "Acceso Admin"} onBack={onBack}>
      {isFirst && <p style={{ fontSize:13, color:"#6B7280", marginBottom:16, lineHeight:1.6 }}>Primera vez — crea una contraseña para proteger el panel.</p>}
      <label className="label">Contraseña</label>
      <input className="input-field" type="password" placeholder="••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()} style={{ marginBottom:12 }} />
      {isFirst && <>
        <label className="label">Confirmar contraseña</label>
        <input className="input-field" type="password" placeholder="••••••" value={pass2} onChange={e => setPass2(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()} style={{ marginBottom:12 }} />
      </>}
      {err && <div style={{ color:"#DC2626", fontSize:13, marginBottom:10, fontWeight:600 }}>{err}</div>}
      <button className="btn btn-primary" style={{ width:"100%" }} onClick={handle} disabled={loading}>
        {loading ? "Verificando..." : isFirst ? "Crear y entrar" : "Entrar"}
      </button>
    </AuthScreen>
  );
}

// ── LOGIN CLIENT ──────────────────────────────────────────────────
function LoginClient({ onSuccess, onBack }) {
  const [code, setCode]   = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handle() {
    setErr(""); setLoading(true);
    const { data } = await supabase.from("clients").select("*").eq("code", code.trim().toUpperCase()).maybeSingle();
    if (data) onSuccess(data);
    else setErr("Código no encontrado. Verifica con tu proveedor.");
    setLoading(false);
  }

  return (
    <AuthScreen icon="🧑‍💼" title="Acceso de Cliente" onBack={onBack}>
      <p style={{ fontSize:13, color:"#6B7280", marginBottom:16, lineHeight:1.6 }}>Ingresa el código que te proporcionó tu proveedor.</p>
      <label className="label">Código de Cliente</label>
      <input className="input-field" placeholder="Ej: CLI-001" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key==="Enter" && handle()} style={{ marginBottom:12, fontFamily:"monospace", fontWeight:700, letterSpacing:2 }} />
      {err && <div style={{ color:"#DC2626", fontSize:13, marginBottom:10, fontWeight:600 }}>{err}</div>}
      <button className="btn btn-primary" style={{ width:"100%" }} onClick={handle} disabled={loading}>
        {loading ? "Verificando..." : "Entrar"}
      </button>
    </AuthScreen>
  );
}

function AuthScreen({ icon, title, onBack, children }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1E1B4B,#312E81,#4C1D95)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{BASE_CSS}</style>
      <div style={{ background:"white", borderRadius:20, padding:36, width:"100%", maxWidth:400, boxShadow:"0 24px 60px rgba(0,0,0,.3)" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#9CA3AF", fontSize:13, fontWeight:600, marginBottom:20, padding:0 }}>← Volver</button>
        <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:20, color:"#1A1A2E" }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADMIN APP
// ══════════════════════════════════════════════════════════════════
function AdminApp({ onLogout }) {
  const [tab, setTab] = useState("orders");

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#F8F7F4", color:"#1A1A2E" }}>
      <style>{BASE_CSS}</style>
      <div style={{ background:"#2D2B55", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>🏭</span>
          <span style={{ color:"white", fontWeight:700, fontSize:15 }}>Admin — Órdenes de Producción</span>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[{id:"orders",label:"📋 Órdenes"},{id:"clients",label:"👥 Clientes"}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background:tab===t.id?"rgba(255,255,255,.18)":"transparent", color:"white", border:"none", borderRadius:8, padding:"6px 14px", fontSize:13, fontWeight:tab===t.id?700:500, cursor:"pointer" }}>
              {t.label}
            </button>
          ))}
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,.1)", color:"rgba(255,255,255,.7)", border:"none", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, marginLeft:8 }}>Salir</button>
        </div>
      </div>
      <div style={{ padding:"28px", maxWidth:1200, margin:"0 auto" }}>
        {tab === "orders" ? <AdminOrders /> : <AdminClients />}
      </div>
    </div>
  );
}

// ── ADMIN ORDERS ──────────────────────────────────────────────────
function AdminOrders() {
  const [orders, setOrders]   = useState([]);
  const [view, setView]       = useState("list");
  const [editing, setEditing] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [fStatus, setFStatus] = useState("Todos");
  const [toast, setToast]     = useState("");

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data || []).map(dbToOrder));
    setLoading(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function handleSave(order) {
    const isNew = !order.id || order.id.startsWith("new_");
    const dbData = orderToDb(order);
    if (isNew) {
      const { data } = await supabase.from("orders").insert(dbData).select().single();
      if (data) setOrders(prev => [dbToOrder(data), ...prev]);
    } else {
      await supabase.from("orders").update(dbData).eq("id", order.id);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...order } : o));
    }
    showToast("✓ Orden guardada correctamente");
    setView("list");
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar esta orden?")) return;
    await supabase.from("orders").delete().eq("id", id);
    setOrders(prev => prev.filter(o => o.id !== id));
  }

  async function handleStatusChange(id, status) {
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }

  function newOrder() {
    const o = emptyOrder();
    o.folio = `OP-${(orders.length + 1).toString().padStart(4, "0")}`;
    setEditing(o); setView("form");
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (!q || o.folio?.toLowerCase().includes(q) || o.cliente?.toLowerCase().includes(q) || o.empresa?.toLowerCase().includes(q))
      && (fStatus === "Todos" || o.status === fStatus);
  });

  if (view === "form" && editing) return <OrderForm order={editing} onSave={handleSave} onCancel={() => setView("list")} />;
  if (view === "detail" && detail) {
    const live = orders.find(o => o.id === detail.id) || detail;
    return <DetailView order={live} onEdit={o => { setEditing(o); setView("form"); }} onBack={() => setView("list")} />;
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:-.5 }}>Órdenes de Producción</h1>
          <p style={{ color:"#6B6B8A", fontSize:13, marginTop:2 }}>{orders.length} órdenes registradas</p>
        </div>
        <button className="btn btn-primary" onClick={newOrder}>+ Nueva Orden</button>
      </div>

      {toast && <div style={{ background:"#D1FAE5", border:"1px solid #6EE7B7", color:"#065F46", borderRadius:10, padding:"9px 16px", marginBottom:14, fontWeight:700, fontSize:13 }}>{toast}</div>}

      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {["Todos", ...Object.keys(STATUS_CONFIG)].map(s => (
          <button key={s} onClick={() => setFStatus(s)}
            style={{ padding:"4px 14px", borderRadius:20, border:"1.5px solid", fontSize:12, fontWeight:700, cursor:"pointer",
              borderColor: fStatus===s?"#2D2B55":"#E5E3F0", background: fStatus===s?"#2D2B55":"white", color: fStatus===s?"white":"#6B6B8A" }}>
            {s}
          </button>
        ))}
      </div>
      <input className="input-field" style={{ maxWidth:300, marginBottom:18 }} placeholder="🔍 Buscar folio, cliente..." value={search} onChange={e => setSearch(e.target.value)} />

      {loading
        ? <p style={{ color:"#888", textAlign:"center", padding:40 }}>Cargando órdenes...</p>
        : filtered.length === 0
          ? <EmptyState icon="📋" msg="No hay órdenes aún" sub="Crea la primera orden de producción" />
          : filtered.map(order => (
            <OrderCard key={order.id} order={order}
              onView={o => { setDetail(o); setView("detail"); }}
              onEdit={o => { setEditing(o); setView("form"); }}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))
      }
    </div>
  );
}

// ── ADMIN CLIENTS ─────────────────────────────────────────────────
function AdminClients() {
  const [clients, setClients] = useState([]);
  const [form, setForm]       = useState({ name:"", empresa:"", email:"" });
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const { data } = await supabase.from("clients").select("*").order("created_at");
    setClients(data || []);
    setLoading(false);
  }

  function genCode() {
    return `CLI-${(clients.length + 1).toString().padStart(3, "0")}`;
  }

  async function addClient() {
    if (!form.name.trim()) return setErr("El nombre es requerido.");
    setSaving(true); setErr("");
    const code = genCode();
    const { data, error } = await supabase.from("clients").insert({ code, name: form.name.trim(), empresa: form.empresa.trim(), email: form.email.trim() }).select().single();
    if (error) { setErr("Error al guardar. Intenta de nuevo."); }
    else { setClients(prev => [...prev, data]); setForm({ name:"", empresa:"", email:"" }); }
    setSaving(false);
  }

  async function removeClient(id) {
    if (!confirm("¿Eliminar cliente? Sus órdenes quedarán sin cliente asignado.")) return;
    await supabase.from("clients").delete().eq("id", id);
    setClients(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div>
      <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:-.5, marginBottom:6 }}>Gestión de Clientes</h1>
      <p style={{ color:"#6B6B8A", fontSize:13, marginBottom:24 }}>Genera códigos de acceso para que tus clientes puedan subir sus órdenes sin cuenta de Claude.</p>

      <div className="card" style={{ marginBottom:24 }}>
        <h3 style={{ fontWeight:700, fontSize:13, color:"#2D2B55", textTransform:"uppercase", letterSpacing:.5, marginBottom:16 }}>➕ Nuevo Cliente</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div><label className="label">Nombre *</label><input className="input-field" placeholder="Juan Pérez" value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></div>
          <div><label className="label">Empresa</label><input className="input-field" placeholder="Empresa S.A." value={form.empresa} onChange={e => setForm({...form, empresa:e.target.value})} /></div>
          <div><label className="label">Email</label><input className="input-field" placeholder="correo@ejemplo.com" value={form.email} onChange={e => setForm({...form, email:e.target.value})} /></div>
          <button className="btn btn-primary" onClick={addClient} disabled={saving}>{saving ? "..." : "Agregar"}</button>
        </div>
        {err && <p style={{ color:"#DC2626", fontSize:13, marginTop:8, fontWeight:600 }}>{err}</p>}
      </div>

      {loading
        ? <p style={{ color:"#888", textAlign:"center", padding:40 }}>Cargando clientes...</p>
        : clients.length === 0
          ? <EmptyState icon="👥" msg="Sin clientes registrados" sub="Agrega clientes para que puedan acceder sin cuenta de Claude" />
          : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {clients.map(c => (
                <div key={c.id} className="card" style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:44, height:44, background:"#EDE9FE", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🧑‍💼</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>{c.name}</div>
                    <div style={{ fontSize:13, color:"#6B6B8A" }}>{c.empresa}{c.email && ` • ${c.email}`}</div>
                  </div>
                  <div style={{ background:"#1E1B4B", borderRadius:10, padding:"8px 16px", textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", fontWeight:700, letterSpacing:1, marginBottom:2 }}>CÓDIGO DE ACCESO</div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:18, color:"#A78BFA", letterSpacing:2 }}>{c.code}</div>
                  </div>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>{c.created_at?.split("T")[0]}</div>
                  <button className="btn-red" onClick={() => removeClient(c.id)}>🗑</button>
                </div>
              ))}
            </div>
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CLIENT APP
// ══════════════════════════════════════════════════════════════════
function ClientApp({ client, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [view, setView]     = useState("list");
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState("");

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    const { data } = await supabase.from("orders").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
    setOrders((data || []).map(dbToOrder));
    setLoading(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function handleSave(order) {
    const tagged = { ...order, clientId: client.id, clientCode: client.code, cliente: client.name, empresa: client.empresa };
    const isNew = !order.id || order.id.startsWith("new_");
    const dbData = orderToDb(tagged);
    if (isNew) {
      const { data } = await supabase.from("orders").insert(dbData).select().single();
      if (data) setOrders(prev => [dbToOrder(data), ...prev]);
    } else {
      await supabase.from("orders").update(dbData).eq("id", order.id);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...tagged } : o));
    }
    showToast("✓ Orden enviada correctamente");
    setView("list");
  }

  function newOrder() {
    const o = emptyOrder();
    o.cliente = client.name;
    o.empresa = client.empresa || "";
    o.email = client.email || "";
    o.folio = `${client.code}-${(orders.length + 1).toString().padStart(3, "0")}`;
    setView({ type:"form", order:o });
  }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#F8F7F4", color:"#1A1A2E" }}>
      <style>{BASE_CSS}</style>
      <div style={{ background:"#064E3B", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>🧑‍💼</span>
          <span style={{ color:"white", fontWeight:700, fontSize:15 }}>Portal de Cliente</span>
          <span style={{ background:"rgba(255,255,255,.15)", color:"rgba(255,255,255,.8)", borderRadius:8, padding:"2px 10px", fontSize:12, fontFamily:"monospace", fontWeight:700, letterSpacing:1 }}>{client.code}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ color:"rgba(255,255,255,.7)", fontSize:13 }}>{client.name}</span>
          {view !== "list" && <button onClick={() => setView("list")} style={{ background:"rgba(255,255,255,.15)", color:"white", border:"none", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>← Volver</button>}
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", border:"none", borderRadius:8, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>Salir</button>
        </div>
      </div>

      <div style={{ padding:"28px", maxWidth:1100, margin:"0 auto" }}>
        {toast && <div style={{ background:"#D1FAE5", border:"1px solid #6EE7B7", color:"#065F46", borderRadius:10, padding:"9px 16px", marginBottom:14, fontWeight:700, fontSize:13 }}>{toast}</div>}

        {loading ? <p style={{ color:"#888", textAlign:"center", padding:40 }}>Cargando tus órdenes...</p>
          : view === "list" ? (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
                <div>
                  <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:-.5 }}>Mis Órdenes</h1>
                  <p style={{ color:"#6B6B8A", fontSize:13, marginTop:2 }}>{orders.length} órdenes enviadas</p>
                </div>
                <button className="btn btn-primary" style={{ background:"#059669" }} onClick={newOrder}>+ Nueva Orden</button>
              </div>
              {orders.length === 0
                ? <EmptyState icon="📬" msg="Aún no tienes órdenes" sub="Crea tu primera orden de producción" />
                : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {orders.map(o => (
                      <div key={o.id} className="card hover-lift" style={{ display:"flex", alignItems:"center", gap:16, transition:"all .15s" }}>
                        <div style={{ minWidth:100 }}>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:13, color:"#2D2B55" }}>{o.folio}</div>
                          <div style={{ fontSize:11, color:"#9CA3AF", marginTop:1 }}>{o.fecha}</div>
                        </div>
                        <div style={{ flex:1 }}>
                          {o.productos?.map(p => p.descripcion).filter(Boolean).slice(0,2).map((d,i) => (
                            <div key={i} style={{ fontSize:14, fontWeight:600, color:"#374151" }}>{d}</div>
                          ))}
                          <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{o.productos?.reduce((a,p) => a+(parseInt(p.cantidad)||0),0)} piezas totales</div>
                        </div>
                        {o.fechaEntrega && <div style={{ fontSize:13, color:"#6B6B8A" }}>📅 {o.fechaEntrega}</div>}
                        <StatusBadge status={o.status} />
                      </div>
                    ))}
                  </div>
              }
            </div>
          ) : view.type === "form" ? (
            <OrderForm order={view.order} isClient onSave={handleSave} onCancel={() => setView("list")} />
          ) : null
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ORDER FORM
// ══════════════════════════════════════════════════════════════════
function OrderForm({ order, isClient, onSave, onCancel }) {
  const [form, setForm] = useState(order);
  const [saving, setSaving] = useState(false);
  const logoRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setProd = (i, k, v) => { const p = [...form.productos]; p[i] = { ...p[i], [k]: v }; set("productos", p); };

  async function imgUpload(i, k, file) { if (!file) return; const b = await fileToBase64(file); setProd(i, k, b); }
  async function logoUpload(files) { const arr = await Promise.all(Array.from(files).map(fileToBase64)); set("logos", [...form.logos, ...arr]); }

  async function handleSubmit() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <style>{BASE_CSS}</style>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <h2 style={{ fontSize:22, fontWeight:800 }}>{order.folio || "Nueva Orden"}</h2>
      </div>
      <div style={{ display:"grid", gap:18 }}>

        <Section title="📋 Información General">
          <Grid cols={3}>
            <Field l="Folio"><input className="input-field" value={form.folio} onChange={e => set("folio", e.target.value)} readOnly={isClient} style={isClient?{background:"#f3f4f6"}:{}} /></Field>
            <Field l="Fecha de Orden"><input className="input-field" type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} /></Field>
            <Field l="Fecha de Entrega Solicitada"><input className="input-field" type="date" value={form.fechaEntrega} onChange={e => set("fechaEntrega", e.target.value)} /></Field>
            {!isClient && <>
              <Field l="Cliente"><input className="input-field" value={form.cliente} onChange={e => set("cliente", e.target.value)} /></Field>
              <Field l="Empresa"><input className="input-field" value={form.empresa} onChange={e => set("empresa", e.target.value)} /></Field>
            </>}
            <Field l="Teléfono"><input className="input-field" placeholder="+52 55 0000 0000" value={form.telefono} onChange={e => set("telefono", e.target.value)} /></Field>
            {!isClient && <Field l="Responsable"><input className="input-field" value={form.creadoPor} onChange={e => set("creadoPor", e.target.value)} /></Field>}
            {!isClient && <Field l="Estatus"><select className="input-field" value={form.status} onChange={e => set("status", e.target.value)}>{Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}</select></Field>}
          </Grid>
        </Section>

        <Section title="📦 Productos a Personalizar">
          {form.productos.map((prod, idx) => (
            <div key={prod.id} style={{ background:"#F8F7F4", border:"1.5px solid #E5E3F0", borderRadius:12, padding:18, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <span style={{ fontWeight:700, fontSize:13, color:"#2D2B55" }}>Producto {idx + 1}</span>
                {form.productos.length > 1 && <button className="btn-red" onClick={() => set("productos", form.productos.filter((_,i) => i!==idx))}>Eliminar</button>}
              </div>
              <Grid cols={3}>
                <Field l="Descripción" style={{ gridColumn:"span 2" }}><input className="input-field" placeholder="Polo manga corta, Taza cerámica..." value={prod.descripcion} onChange={e => setProd(idx,"descripcion",e.target.value)} /></Field>
                <Field l="Cantidad"><input className="input-field" type="number" min="1" value={prod.cantidad} onChange={e => setProd(idx,"cantidad",e.target.value)} /></Field>
                <Field l="Talla / Medida"><input className="input-field" placeholder="M, L, XL / 15x20cm" value={prod.talla} onChange={e => setProd(idx,"talla",e.target.value)} /></Field>
                <Field l="Color del Producto"><input className="input-field" placeholder="Blanco, Negro..." value={prod.color} onChange={e => setProd(idx,"color",e.target.value)} /></Field>
                <Field l="Técnica">
                  <select className="input-field" value={prod.tecnica} onChange={e => setProd(idx,"tecnica",e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {TECHNIQUES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field l="Posición / Área"><input className="input-field" placeholder="Pecho izq., Espalda..." value={prod.posicion} onChange={e => setProd(idx,"posicion",e.target.value)} /></Field>
                <Field l="Colores de Impresión"><input className="input-field" placeholder="Pantone, CMYK..." value={prod.coloresImpresion} onChange={e => setProd(idx,"coloresImpresion",e.target.value)} /></Field>
                <Field l="Notas" style={{ gridColumn:"span 3" }}><textarea className="input-field" rows={2} value={prod.notas} onChange={e => setProd(idx,"notas",e.target.value)} style={{ resize:"vertical" }} /></Field>
              </Grid>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:12 }}>
                <ImageUpload label="📸 Foto del Producto" image={prod.fotoProducto} onChange={f => imgUpload(idx,"fotoProducto",f)} onRemove={() => setProd(idx,"fotoProducto",null)} />
                <ImageUpload label="🎨 Mockup / Visual" image={prod.mockup} onChange={f => imgUpload(idx,"mockup",f)} onRemove={() => setProd(idx,"mockup",null)} />
              </div>
            </div>
          ))}
          <button onClick={() => set("productos", [...form.productos, { id:Date.now().toString(), descripcion:"", cantidad:"", talla:"", color:"", tecnica:"", posicion:"", coloresImpresion:"", notas:"", fotoProducto:null, mockup:null }])}
            style={{ background:"white", border:"1.5px dashed #A78BFA", borderRadius:10, padding:"10px 20px", color:"#7C3AED", fontWeight:700, fontSize:14, width:"100%", cursor:"pointer" }}>
            + Agregar producto
          </button>
        </Section>

        <Section title="🖼 Archivos de Logos">
          <p style={{ fontSize:13, color:"#6B7280", marginBottom:12 }}>Sube los archivos para personalización (.png, .jpg, .pdf, etc.)</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:12 }}>
            {form.logos.map((logo, i) => (
              <div key={i} style={{ background:"#F0EFF9", border:"1.5px solid #E5E3F0", borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, maxWidth:180 }}>
                {logo.type?.startsWith("image") ? <img src={logo.data} alt={logo.name} style={{ width:36, height:36, objectFit:"contain", borderRadius:6 }} /> : <div style={{ width:36, height:36, background:"#DDD6FE", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📄</div>}
                <div style={{ flex:1, minWidth:0, fontSize:12, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{logo.name}</div>
                <button onClick={() => set("logos", form.logos.filter((_,j) => j!==i))} style={{ background:"none", border:"none", color:"#DC2626", fontWeight:700, fontSize:16, cursor:"pointer" }}>×</button>
              </div>
            ))}
          </div>
          <input ref={logoRef} type="file" multiple accept="image/*,.pdf,.ai,.eps,.svg,.cdr" style={{ display:"none" }} onChange={e => logoUpload(e.target.files)} />
          <button className="btn btn-outline" onClick={() => logoRef.current?.click()}>📎 Subir archivos</button>
        </Section>

        <Section title="📝 Notas Generales">
          <textarea className="input-field" rows={3} placeholder="Instrucciones especiales, observaciones de entrega..." value={form.notasGenerales} onChange={e => set("notasGenerales", e.target.value)} style={{ resize:"vertical" }} />
        </Section>

        <div style={{ display:"flex", gap:12, justifyContent:"flex-end", paddingBottom:20 }}>
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando..." : isClient ? "💾 Enviar Orden" : "💾 Guardar Orden"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DETAIL VIEW + PDF EXPORT
// ══════════════════════════════════════════════════════════════════
function exportToPDF(order) {
  const total = order.productos?.reduce((a,p)=>a+(parseInt(p.cantidad)||0),0);
  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG["Pendiente"];

  const imgBlock = (label, img) => img
    ? `<div style="margin-bottom:8px"><div style="font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;margin-bottom:3px">${label}</div><img src="${img.data}" style="width:110px;height:80px;object-fit:contain;border:1px solid #eee;border-radius:6px;background:#fafafa"/></div>` : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orden ${order.folio}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:white;padding:28px;color:#1A1A2E;font-size:13px}
    @page{size:A4;margin:18mm}
    @media print{.no-print{display:none!important}}
  </style></head><body>
  <div class="no-print" style="margin-bottom:16px;display:flex;gap:10px;align-items:center">
    <button onclick="window.print()" style="background:#2D2B55;color:white;border:none;border-radius:8px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer">🖨 Guardar como PDF / Imprimir</button>
    <span style="font-size:12px;color:#9CA3AF">Selecciona "Guardar como PDF" como destino en el diálogo de impresión</span>
  </div>
  <div style="border-bottom:3px solid #2D2B55;padding-bottom:16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1 style="font-size:24px;font-weight:900;color:#2D2B55;letter-spacing:-1px">ORDEN DE PRODUCCIÓN</h1>
      <div style="font-family:'DM Mono',monospace;font-size:16px;font-weight:700;color:#7C3AED;margin-top:3px">${order.folio}</div>
    </div>
    <div style="text-align:right">
      <span style="background:${sc.bg};color:${sc.color};border:1px solid ${sc.color}40;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700">${order.status}</span>
      <div style="font-size:12px;color:#6B6B8A;margin-top:7px">Fecha: <b>${order.fecha}</b></div>
      ${order.fechaEntrega?`<div style="font-size:12px;color:#6B6B8A">Entrega: <b>${order.fechaEntrega}</b></div>`:""}
    </div>
  </div>
  <div style="background:#F8F7F4;border-radius:8px;padding:12px 16px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
    ${[["Cliente",order.cliente],["Empresa",order.empresa],["Teléfono",order.telefono],["Email",order.email],["Responsable",order.creadoPor]].filter(([,v])=>v).map(([l,v])=>`<div><span style="font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase">${l}: </span><b>${v}</b></div>`).join("")}
  </div>
  <h3 style="font-size:12px;font-weight:700;color:#2D2B55;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📦 Productos — ${total} pzas totales</h3>
  ${(order.productos||[]).map((p,i)=>`
    <div style="border:1.5px solid #E5E3F0;border-radius:8px;padding:14px;margin-bottom:12px;page-break-inside:avoid">
      <div style="font-weight:700;font-size:14px;margin-bottom:10px">${p.descripcion||"Producto "+(i+1)}</div>
      <div style="display:flex;gap:14px">
        <div style="min-width:120px">${imgBlock("Foto",p.fotoProducto)}${imgBlock("Mockup",p.mockup)}</div>
        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:12px">
          ${[["Cantidad",p.cantidad?p.cantidad+" pzas":""],["Talla",p.talla],["Color",p.color],["Técnica",p.tecnica],["Posición",p.posicion],["Colores Impresión",p.coloresImpresion]].filter(([,v])=>v).map(([l,v])=>`<div><span style="font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase">${l}: </span><b>${v}</b></div>`).join("")}
          ${p.notas?`<div style="grid-column:span 2"><span style="font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase">Notas: </span>${p.notas}</div>`:""}
        </div>
      </div>
    </div>`).join("")}
  ${order.logos?.length?`
    <h3 style="font-size:12px;font-weight:700;color:#2D2B55;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🖼 Archivos de Logo</h3>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      ${order.logos.map(l=>`<div style="background:#F0EFF9;border-radius:8px;padding:7px;display:flex;flex-direction:column;align-items:center;gap:4px;width:80px">
        ${l.type?.startsWith("image")?`<img src="${l.data}" style="width:50px;height:50px;object-fit:contain"/>`:`<div style="width:50px;height:50px;background:#DDD6FE;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:20px">📄</div>`}
        <div style="font-size:8px;text-align:center;color:#4C4A8A;font-weight:600;word-break:break-all">${l.name}</div>
      </div>`).join("")}
    </div>`:""}
  ${order.notasGenerales?`<div style="background:#FFFBEB;border:1.5px solid #FCD34D;border-radius:8px;padding:12px;margin-bottom:18px"><div style="font-weight:700;font-size:11px;color:#92400E;margin-bottom:4px">📝 NOTAS GENERALES</div><p style="font-size:12px;color:#78350F;line-height:1.6">${order.notasGenerales}</p></div>`:""}
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:36px;padding-top:16px;border-top:1px solid #E5E3F0">
    ${["Elaboró","Revisó","Autorizó"].map(l=>`<div style="text-align:center"><div style="border-top:1.5px solid #2D2B55;padding-top:7px;font-size:10px;color:#6B6B8A;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${l}</div></div>`).join("")}
  </div>
  </body></html>`;

  const w = window.open("","_blank","width=900,height=700");
  w.document.write(html);
  w.document.close();
}

function downloadFile(file) {
  const a = document.createElement("a");
  a.href = file.data;
  a.download = file.name;
  a.click();
}

function DetailView({ order, onEdit, onBack }) {
  const total = order.productos?.reduce((a,p) => a+(parseInt(p.cantidad)||0), 0);
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <style>{BASE_CSS}</style>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <h2 style={{ fontSize:22, fontWeight:800 }}>{order.folio}</h2>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-outline" onClick={() => onEdit(order)}>✏️ Editar</button>
          <button className="btn btn-primary" style={{ background:"#059669" }} onClick={() => exportToPDF(order)}>📄 Exportar PDF</button>
        </div>
      </div>

      <div style={{ background:"white", borderRadius:16, border:"1.5px solid #E5E3F0", padding:32 }}>
        <div style={{ borderBottom:"3px solid #2D2B55", paddingBottom:18, marginBottom:22, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#2D2B55", letterSpacing:-1 }}>ORDEN DE PRODUCCIÓN</h1>
            <div style={{ fontFamily:"monospace", fontSize:18, fontWeight:700, color:"#7C3AED", marginTop:4 }}>{order.folio}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <StatusBadge status={order.status} />
            <div style={{ fontSize:13, color:"#6B6B8A", marginTop:8 }}>Fecha: <b>{order.fecha}</b></div>
            {order.fechaEntrega && <div style={{ fontSize:13, color:"#6B6B8A" }}>Entrega: <b>{order.fechaEntrega}</b></div>}
          </div>
        </div>

        <div style={{ background:"#F8F7F4", borderRadius:10, padding:"14px 18px", marginBottom:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <IR l="Cliente" v={order.cliente} /><IR l="Empresa" v={order.empresa} />
          <IR l="Teléfono" v={order.telefono} /><IR l="Email" v={order.email} />
          {order.creadoPor && <IR l="Responsable" v={order.creadoPor} />}
        </div>

        <h3 style={{ fontWeight:700, color:"#2D2B55", marginBottom:12, fontSize:14, textTransform:"uppercase", letterSpacing:.5 }}>📦 Productos — {total} pzas</h3>
        {order.productos?.map((p,i) => (
          <div key={p.id||i} style={{ border:"1.5px solid #E5E3F0", borderRadius:10, padding:18, marginBottom:14 }}>
            <div style={{ display:"flex", gap:18 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:10, minWidth:135 }}>
                {p.fotoProducto && <div><div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:3 }}>Foto</div><img src={p.fotoProducto.data} alt="" style={{ width:120, height:90, objectFit:"contain", border:"1px solid #eee", borderRadius:8, background:"#fafafa" }} /></div>}
                {p.mockup && <div><div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:3 }}>Mockup</div><img src={p.mockup.data} alt="" style={{ width:120, height:90, objectFit:"contain", border:"1px solid #eee", borderRadius:8, background:"#fafafa" }} /></div>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:16, marginBottom:10 }}>{p.descripcion||`Producto ${i+1}`}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <IR l="Cantidad" v={p.cantidad?`${p.cantidad} pzas`:""} /><IR l="Talla" v={p.talla} />
                  <IR l="Color" v={p.color} /><IR l="Técnica" v={p.tecnica} />
                  <IR l="Posición" v={p.posicion} /><IR l="Colores Impresión" v={p.coloresImpresion} />
                  {p.notas && <div style={{ gridColumn:"span 2" }}><IR l="Notas" v={p.notas} /></div>}
                </div>
              </div>
            </div>
          </div>
        ))}

        {order.logos?.length > 0 && (
          <div style={{ marginBottom:18 }}>
            <h3 style={{ fontWeight:700, color:"#2D2B55", marginBottom:10, fontSize:14, textTransform:"uppercase", letterSpacing:.5 }}>🖼 Archivos de Logo</h3>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {order.logos.map((l,i) => (
                <div key={i} style={{ background:"#F0EFF9", border:"1.5px solid #E5E3F0", borderRadius:10, padding:"10px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, width:100 }}>
                  {l.type?.startsWith("image") ? <img src={l.data} alt="" style={{ width:60, height:60, objectFit:"contain", borderRadius:6 }} /> : <div style={{ width:60, height:60, background:"#DDD6FE", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>📄</div>}
                  <div style={{ fontSize:9, textAlign:"center", color:"#4C4A8A", fontWeight:600, wordBreak:"break-all", lineHeight:1.3 }}>{l.name}</div>
                  <button onClick={() => downloadFile(l)} style={{ background:"#2D2B55", color:"white", border:"none", borderRadius:6, padding:"3px 10px", fontSize:10, fontWeight:700, cursor:"pointer", width:"100%" }}>⬇ Descargar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {order.notasGenerales && (
          <div style={{ background:"#FFFBEB", border:"1.5px solid #FCD34D", borderRadius:10, padding:14, marginBottom:20 }}>
            <div style={{ fontWeight:700, fontSize:12, color:"#92400E", marginBottom:5 }}>📝 NOTAS GENERALES</div>
            <p style={{ fontSize:13, color:"#78350F", lineHeight:1.6 }}>{order.notasGenerales}</p>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginTop:32, paddingTop:18, borderTop:"1px solid #E5E3F0" }}>
          {["Elaboró","Revisó","Autorizó"].map(l => (
            <div key={l} style={{ textAlign:"center" }}><div style={{ borderTop:"1.5px solid #2D2B55", paddingTop:8, fontSize:11, color:"#6B6B8A", fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>{l}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SHARED CARD + HELPERS
// ══════════════════════════════════════════════════════════════════
function OrderCard({ order, onView, onEdit, onDelete, onStatusChange }) {
  const total = order.productos?.reduce((a,p) => a+(parseInt(p.cantidad)||0), 0);
  return (
    <div className="hover-lift" style={{ background:"white", border:"1.5px solid #E5E3F0", borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"all .15s", marginBottom:8 }}
      onClick={() => onView(order)}>
      <div style={{ minWidth:92 }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:13, color:"#2D2B55" }}>{order.folio}</div>
        <div style={{ fontSize:11, color:"#9CA3AF", marginTop:1 }}>{order.fecha}</div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{order.cliente||"—"}</div>
        <div style={{ fontSize:12, color:"#6B6B8A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{order.empresa}</div>
      </div>
      <div style={{ minWidth:60, textAlign:"center" }}>
        <div style={{ fontWeight:800, fontSize:17, color:"#2D2B55" }}>{total}</div>
        <div style={{ fontSize:10, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:.5 }}>pzas</div>
      </div>
      <div style={{ minWidth:110 }}>
        {[...new Set(order.productos?.map(p=>p.tecnica).filter(Boolean))].slice(0,2).map(t => (
          <span key={t} style={{ fontSize:10, background:"#F0EFF9", color:"#4C4A8A", borderRadius:6, padding:"2px 7px", display:"inline-block", marginRight:3, marginBottom:2, fontWeight:700 }}>{t}</span>
        ))}
      </div>
      {order.fechaEntrega && <div style={{ fontSize:12, color:"#6B6B8A", minWidth:80 }}>📅 {order.fechaEntrega}</div>}
      <div onClick={e => e.stopPropagation()} style={{ minWidth:160 }}>
        <select value={order.status} onChange={e => onStatusChange(order.id, e.target.value)}
          style={{ padding:"4px 10px", borderRadius:20, border:`1.5px solid ${STATUS_CONFIG[order.status]?.color||"#ccc"}40`,
            background:STATUS_CONFIG[order.status]?.bg, color:STATUS_CONFIG[order.status]?.color,
            fontWeight:700, fontSize:11, cursor:"pointer", outline:"none" }}>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div onClick={e => e.stopPropagation()} style={{ display:"flex", gap:6 }}>
        <button onClick={() => onEdit(order)} style={{ background:"#F0EFF9", border:"none", borderRadius:8, padding:"5px 10px", fontSize:12, color:"#2D2B55", fontWeight:700, cursor:"pointer" }}>✏️</button>
        <button className="btn-red" onClick={() => onDelete(order.id)}>🗑</button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Pendiente"];
  return <span style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40`, borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700, letterSpacing:.3 }}>{status}</span>;
}

function Section({ title, children }) {
  return (
    <div className="card">
      <h3 style={{ fontWeight:700, fontSize:13, color:"#2D2B55", textTransform:"uppercase", letterSpacing:.5, marginBottom:16 }}>{title}</h3>
      {children}
    </div>
  );
}

function Grid({ cols=2, children }) {
  return <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:12 }}>{children}</div>;
}

function Field({ l, children, style={} }) {
  return <div style={style}><label className="label">{l}</label>{children}</div>;
}

function IR({ l, v }) {
  if (!v) return null;
  return <div><span style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:.4 }}>{l}: </span><span style={{ fontSize:13, fontWeight:600, color:"#1A1A2E" }}>{v}</span></div>;
}

function EmptyState({ icon, msg, sub }) {
  return <div style={{ textAlign:"center", padding:"50px 20px", color:"#9CA3AF" }}><div style={{ fontSize:44, marginBottom:10 }}>{icon}</div><p style={{ fontWeight:700, fontSize:15 }}>{msg}</p><p style={{ fontSize:13, marginTop:4 }}>{sub}</p></div>;
}

function ImageUpload({ label, image, onChange, onRemove }) {
  const ref = useRef();
  return (
    <div>
      <label className="label">{label}</label>
      {image
        ? <div style={{ position:"relative", display:"inline-block", width:"100%" }}>
            <img src={image.data} alt="" style={{ width:"100%", maxHeight:130, objectFit:"contain", borderRadius:10, border:"1.5px solid #E5E3F0", background:"#fafafa" }} />
            <button onClick={onRemove} style={{ position:"absolute", top:6, right:6, background:"#DC2626", color:"white", border:"none", borderRadius:"50%", width:22, height:22, fontSize:14, fontWeight:700, lineHeight:1, cursor:"pointer" }}>×</button>
          </div>
        : <>
            <input ref={ref} type="file" accept="image/*" style={{ display:"none" }} onChange={e => onChange(e.target.files[0])} />
            <div onClick={() => ref.current?.click()}
              style={{ border:"2px dashed #E5E3F0", borderRadius:10, padding:"18px 12px", textAlign:"center", cursor:"pointer", color:"#9CA3AF", fontSize:13, background:"#FAFAFA", transition:"border .2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="#A78BFA"}
              onMouseLeave={e => e.currentTarget.style.borderColor="#E5E3F0"}>
              <div style={{ fontSize:22, marginBottom:3 }}>📁</div>
              <div style={{ fontWeight:600, fontSize:12 }}>Click para subir</div>
            </div>
          </>
      }
    </div>
  );
}
