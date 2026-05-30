import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { dbToOrder, orderToDb, emptyOrder, downloadZip, downloadFile, exportToPDF, STATUS_CONFIG, PURCHASE_DOC_TYPES, CLIENT_DOC_TYPES } from "./helpers.js";
import { BASE_CSS, OrderCard, Section, Grid, Field, IR, EmptyState, Toast, DocsList, StatusBadge } from "./ui.jsx";
import OrderForm from "./OrderForm.jsx";
import DetailView from "./DetailView.jsx";

export default function AdminApp({ onLogout }) {
  const [tab, setTab] = useState("orders");
  const TABS = [
    { id:"orders",      label:"📋 Órdenes"      },
    { id:"workers",     label:"👷 Trabajadores"  },
    { id:"clients",     label:"📒 Clientes"      },
    { id:"accounting",  label:"📁 Contabilidad"  },
    { id:"config",      label:"⚙️ Configuración" },
  ];
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#F8F7F4", color:"#1A1A2E" }}>
      <style>{BASE_CSS}</style>
      <div style={{ background:"#2D2B55", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:54 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>🏭</span>
          <span style={{ color:"white", fontWeight:700, fontSize:14 }}>Admin</span>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ background:tab===t.id?"rgba(255,255,255,.2)":"transparent", color:"white", border:"none", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:tab===t.id?700:400, cursor:"pointer" }}>
              {t.label}
            </button>
          ))}
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", border:"none", borderRadius:8, padding:"5px 10px", fontSize:11, marginLeft:8, cursor:"pointer" }}>Salir</button>
        </div>
      </div>
      <div style={{ padding:"24px", maxWidth:1200, margin:"0 auto" }}>
        {tab==="orders"     && <AdminOrders />}
        {tab==="workers"    && <AdminWorkers />}
        {tab==="clients"    && <AdminClients />}
        {tab==="accounting" && <AdminAccounting />}
        {tab==="config"     && <AdminConfig />}
      </div>
    </div>
  );
}

// ── ORDERS ────────────────────────────────────────────────────────
function AdminOrders() {
  const [orders, setOrders]   = useState([]);
  const [view, setView]       = useState("list");
  const [editing, setEditing] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [fStatus, setFStatus] = useState("Todos");
  const [toast, setToast]     = useState("");

  useEffect(()=>{ load(); },[]);
  async function load() {
    const { data } = await supabase.from("orders").select("*").order("created_at",{ascending:false});
    setOrders((data||[]).map(dbToOrder)); setLoading(false);
  }
  function showToast(m){ setToast(m); setTimeout(()=>setToast(""),2500); }

  async function handleSave(order) {
    const isNew = !order.id || order.id.startsWith("new_");
    const db = orderToDb(order);
    if (isNew) {
      const { data } = await supabase.from("orders").insert(db).select().single();
      if (data) setOrders(p=>[dbToOrder(data),...p]);
    } else {
      await supabase.from("orders").update(db).eq("id",order.id);
      setOrders(p=>p.map(o=>o.id===order.id?{...order}:o));
    }
    showToast("✓ Orden guardada"); setView("list");
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar esta orden?")) return;
    await supabase.from("orders").delete().eq("id",id);
    setOrders(p=>p.filter(o=>o.id!==id));
  }

  async function handleStatus(id, status) {
    await supabase.from("orders").update({status}).eq("id",id);
    setOrders(p=>p.map(o=>o.id===id?{...o,status}:o));
  }

  function newOrder() {
    const o = emptyOrder();
    o.folio = `OP-${(orders.length+1).toString().padStart(4,"0")}`;
    setEditing(o); setView("form");
  }

  const filtered = orders.filter(o=>{
    const q=search.toLowerCase();
    return (!q||o.folio?.toLowerCase().includes(q)||o.cliente?.toLowerCase().includes(q)||o.empresa?.toLowerCase().includes(q))
      &&(fStatus==="Todos"||o.status===fStatus);
  });

  if (view==="form"&&editing) return <OrderForm order={editing} role="admin" onSave={handleSave} onCancel={()=>setView("list")} />;
  if (view==="detail"&&detail) {
    const live = orders.find(o=>o.id===detail.id)||detail;
    return <DetailView order={live} role="admin" onEdit={o=>{setEditing(o);setView("form");}} onBack={()=>setView("list")} onStatusChange={handleStatus} />;
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div><h1 style={{ fontSize:22, fontWeight:800, letterSpacing:-.5 }}>Órdenes de Producción</h1><p style={{ color:"#6B6B8A", fontSize:13 }}>{orders.length} órdenes</p></div>
        <button className="btn btn-primary" onClick={newOrder}>+ Nueva Orden</button>
      </div>
      <Toast msg={toast} />
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {["Todos",...Object.keys(STATUS_CONFIG)].map(s=>(
          <button key={s} onClick={()=>setFStatus(s)}
            style={{ padding:"3px 12px", borderRadius:20, border:"1.5px solid", fontSize:11, fontWeight:700, cursor:"pointer",
              borderColor:fStatus===s?"#2D2B55":"#E5E3F0", background:fStatus===s?"#2D2B55":"white", color:fStatus===s?"white":"#6B6B8A" }}>
            {s}
          </button>
        ))}
      </div>
      <input className="input-field" style={{ maxWidth:300, marginBottom:16 }} placeholder="🔍 Buscar folio, cliente..." value={search} onChange={e=>setSearch(e.target.value)} />
      {loading ? <p style={{ color:"#888", textAlign:"center", padding:40 }}>Cargando...</p>
        : filtered.length===0 ? <EmptyState icon="📋" msg="Sin órdenes" sub="Crea la primera orden de producción" />
        : filtered.map(o=><OrderCard key={o.id} order={o} canDelete={true}
            onView={o=>{setDetail(o);setView("detail");}}
            onEdit={o=>{setEditing(o);setView("form");}}
            onDelete={handleDelete}
            onStatusChange={handleStatus} />)
      }
    </div>
  );
}

// ── WORKERS ───────────────────────────────────────────────────────
function AdminWorkers() {
  const [workers, setWorkers] = useState([]);
  const [form, setForm]       = useState({ name:"", role:"produccion", email:"", password:"" });
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(()=>{ load(); },[]);
  async function load() {
    const { data } = await supabase.from("workers").select("*").order("created_at");
    setWorkers(data||[]); setLoading(false);
  }

  function genCode(role) {
    const prefix = role==="produccion"?"PROD":"VEN";
    const existing = workers.filter(w=>w.role===role).length;
    return `${prefix}-${(existing+1).toString().padStart(3,"0")}`;
  }

  async function add() {
    setErr("");
    if (!form.name.trim()) return setErr("El nombre es requerido.");
    if (!form.password||form.password.length<4) return setErr("La contraseña debe tener mínimo 4 caracteres.");
    setSaving(true);
    const code = genCode(form.role);
    const { data, error } = await supabase.from("workers").insert({ code, name:form.name.trim(), role:form.role, email:form.email.trim(), password:form.password }).select().single();
    if (error) setErr("Error al guardar. Intenta de nuevo.");
    else { setWorkers(p=>[...p,data]); setForm({ name:"", role:"produccion", email:"", password:"" }); }
    setSaving(false);
  }

  async function remove(id) {
    if (!confirm("¿Eliminar trabajador?")) return;
    await supabase.from("workers").delete().eq("id",id);
    setWorkers(p=>p.filter(w=>w.id!==id));
  }

  const produccion = workers.filter(w=>w.role==="produccion");
  const ventas     = workers.filter(w=>w.role==="ventas");

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:-.5, marginBottom:6 }}>Gestión de Trabajadores</h1>
      <p style={{ color:"#6B6B8A", fontSize:13, marginBottom:20 }}>Crea códigos de acceso para tu equipo según su rol.</p>

      <div className="card" style={{ marginBottom:22 }}>
        <h3 style={{ fontWeight:700, fontSize:13, color:"#2D2B55", textTransform:"uppercase", letterSpacing:.5, marginBottom:14 }}>➕ Nuevo Trabajador</h3>
        <Grid cols={2}>
          <Field l="Nombre *"><input className="input-field" placeholder="Nombre completo" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field l="Rol">
            <select className="input-field" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              <option value="produccion">🔧 Producción</option>
              <option value="ventas">💼 Ventas</option>
            </select>
          </Field>
          <Field l="Email (opcional)"><input className="input-field" placeholder="correo@empresa.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
          <Field l="Contraseña *"><input className="input-field" type="password" placeholder="Mínimo 4 caracteres" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></Field>
        </Grid>
        {err && <p style={{ color:"#DC2626", fontSize:13, marginTop:8, fontWeight:600 }}>{err}</p>}
        <div style={{ marginTop:14 }}>
          <button className="btn btn-primary" onClick={add} disabled={saving}>{saving?"Guardando...":"Agregar trabajador"}</button>
        </div>
      </div>

      {loading ? <p style={{ color:"#888", textAlign:"center", padding:30 }}>Cargando...</p> : (
        <>
          {[{label:"🔧 Producción", list:produccion},{label:"💼 Ventas", list:ventas}].map(({label,list})=>(
            <div key={label} style={{ marginBottom:20 }}>
              <h3 style={{ fontWeight:700, fontSize:14, color:"#374151", marginBottom:10 }}>{label} — {list.length} trabajadores</h3>
              {list.length===0 ? <p style={{ color:"#9CA3AF", fontSize:13 }}>Sin trabajadores en este rol.</p> : list.map(w=>(
                <div key={w.id} className="card hover-lift" style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
                  <div style={{ width:40, height:40, background:"#EDE9FE", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    {w.role==="produccion"?"🔧":"💼"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{w.name}</div>
                    <div style={{ fontSize:12, color:"#6B6B8A" }}>{w.email||"Sin email"} · {w.created_at?.split("T")[0]}</div>
                  </div>
                  <div style={{ background:"#1E1B4B", borderRadius:10, padding:"6px 14px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,.5)", fontWeight:700, letterSpacing:1, marginBottom:1 }}>CÓDIGO</div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:15, color:"#A78BFA", letterSpacing:2 }}>{w.code}</div>
                  </div>
                  <button className="btn-red" onClick={()=>remove(w.id)}>🗑</button>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── CLIENTS DIRECTORY ─────────────────────────────────────────────
function AdminClients() {
  const [clients, setClients] = useState([]);
  const [form, setForm]       = useState({ name:"", empresa:"", rfc:"", email:"", phone:"", address:"" });
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(()=>{ load(); },[]);
  async function load() {
    const { data } = await supabase.from("clients_directory").select("*").order("created_at",{ascending:false});
    setClients(data||[]); setLoading(false);
  }

  async function add() {
    if (!form.name.trim()) return setErr("El nombre es requerido.");
    const { data, error } = await supabase.from("clients_directory").insert({ name:form.name.trim(), empresa:form.empresa.trim(), rfc:form.rfc.trim(), email:form.email.trim(), phone:form.phone.trim(), address:form.address.trim() }).select().single();
    if (error) setErr("Error al guardar."); else { setClients(p=>[data,...p]); setForm({ name:"", empresa:"", rfc:"", email:"", phone:"", address:"" }); setErr(""); }
  }

  async function remove(id) {
    if (!confirm("¿Eliminar cliente del directorio?")) return;
    await supabase.from("clients_directory").delete().eq("id",id);
    setClients(p=>p.filter(c=>c.id!==id));
  }

  const filtered = clients.filter(c=>{
    const q=search.toLowerCase();
    return !q||c.name?.toLowerCase().includes(q)||c.empresa?.toLowerCase().includes(q)||c.rfc?.toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:-.5, marginBottom:6 }}>Directorio de Clientes</h1>
      <p style={{ color:"#6B6B8A", fontSize:13, marginBottom:20 }}>Registro de todos los clientes del negocio.</p>

      <div className="card" style={{ marginBottom:22 }}>
        <h3 style={{ fontWeight:700, fontSize:13, color:"#2D2B55", textTransform:"uppercase", letterSpacing:.5, marginBottom:14 }}>➕ Nuevo Cliente</h3>
        <Grid cols={3}>
          <Field l="Nombre *"><input className="input-field" placeholder="Nombre completo" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field l="Empresa"><input className="input-field" placeholder="Razón social" value={form.empresa} onChange={e=>setForm({...form,empresa:e.target.value})} /></Field>
          <Field l="RFC"><input className="input-field" placeholder="RFC del cliente" value={form.rfc} onChange={e=>setForm({...form,rfc:e.target.value.toUpperCase()})} /></Field>
          <Field l="Email"><input className="input-field" placeholder="correo@cliente.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
          <Field l="Teléfono"><input className="input-field" placeholder="+52 55 0000 0000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></Field>
          <Field l="Dirección"><input className="input-field" placeholder="Calle, ciudad, estado" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></Field>
        </Grid>
        {err && <p style={{ color:"#DC2626", fontSize:13, marginTop:8, fontWeight:600 }}>{err}</p>}
        <div style={{ marginTop:14 }}><button className="btn btn-primary" onClick={add}>Agregar cliente</button></div>
      </div>

      <input className="input-field" style={{ maxWidth:300, marginBottom:16 }} placeholder="🔍 Buscar cliente, empresa, RFC..." value={search} onChange={e=>setSearch(e.target.value)} />

      {loading ? <p style={{ color:"#888", textAlign:"center", padding:30 }}>Cargando...</p>
        : filtered.length===0 ? <EmptyState icon="📒" msg="Sin clientes" sub="Agrega clientes al directorio" />
        : filtered.map(c=>(
          <div key={c.id} className="card hover-lift" style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
            <div style={{ width:40, height:40, background:"#DBEAFE", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🏢</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
              <div style={{ fontSize:12, color:"#6B6B8A" }}>{c.empresa}{c.rfc?` · RFC: ${c.rfc}`:""}</div>
              <div style={{ fontSize:11, color:"#9CA3AF" }}>{c.email}{c.phone?` · ${c.phone}`:""}</div>
            </div>
            {c.address && <div style={{ fontSize:12, color:"#6B6B8A", maxWidth:180 }}>{c.address}</div>}
            <button className="btn-red" onClick={()=>remove(c.id)}>🗑</button>
          </div>
        ))
      }
    </div>
  );
}

// ── ACCOUNTING ────────────────────────────────────────────────────
function AdminAccounting() {
  const [orders, setOrders]   = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("by_order");
  const [search, setSearch]   = useState("");
  const [busy, setBusy]       = useState(null);

  useEffect(()=>{ load(); },[]);
  async function load() {
    const [{ data:o },{ data:c }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at",{ascending:false}),
      supabase.from("clients_directory").select("*").order("name"),
    ]);
    setOrders((o||[]).map(dbToOrder)); setClients(c||[]); setLoading(false);
  }

  async function zipOrder(order) {
    setBusy(order.id);
    const entries = [];
    (order.logos||[]).forEach((f,i)=>entries.push({ path:`logos/${f.name||"logo_"+i}`, file:f }));
    (order.purchaseDocs||[]).forEach((f,i)=>entries.push({ path:`proveedor/${f.name||"doc_"+i}`, file:f }));
    (order.clientDocs||[]).forEach((f,i)=>entries.push({ path:`cliente/${f.name||"doc_"+i}`, file:f }));
    if (order.paymentAnticipo?.file) entries.push({ path:`pagos/anticipo_${order.paymentAnticipo.file.name||"anticipo"}`, file:order.paymentAnticipo.file });
    if (order.paymentFiniquito?.file) entries.push({ path:`pagos/finiquito_${order.paymentFiniquito.file.name||"finiquito"}`, file:order.paymentFiniquito.file });
    if (order.shipping?.guideFile) entries.push({ path:`envio/guia_${order.shipping.guideFile.name||"guia"}`, file:order.shipping.guideFile });
    await downloadZip(entries, `${order.folio}_documentos.zip`);
    setBusy(null);
  }

  async function zipClient(clientName) {
    setBusy(clientName);
    const clientOrders = orders.filter(o=>o.clientDirName===clientName||o.cliente===clientName);
    const entries = [];
    for (const order of clientOrders) {
      const pre = `${order.folio}/`;
      (order.logos||[]).forEach((f,i)=>entries.push({ path:`${pre}logos/${f.name||"logo_"+i}`, file:f }));
      (order.purchaseDocs||[]).forEach((f,i)=>entries.push({ path:`${pre}proveedor/${f.name||"doc_"+i}`, file:f }));
      (order.clientDocs||[]).forEach((f,i)=>entries.push({ path:`${pre}cliente/${f.name||"doc_"+i}`, file:f }));
      if (order.paymentAnticipo?.file) entries.push({ path:`${pre}pagos/anticipo`, file:order.paymentAnticipo.file });
      if (order.paymentFiniquito?.file) entries.push({ path:`${pre}pagos/finiquito`, file:order.paymentFiniquito.file });
      if (order.shipping?.guideFile) entries.push({ path:`${pre}envio/guia`, file:order.shipping.guideFile });
    }
    await downloadZip(entries, `${clientName.replace(/\s/g,"_")}_expediente.zip`);
    setBusy(null);
  }

  const filteredOrders  = orders.filter(o=>!search||(o.folio+o.cliente+o.empresa).toLowerCase().includes(search.toLowerCase()));
  const clientsWithOrders = [...new Set(orders.map(o=>o.clientDirName||o.cliente).filter(Boolean))];
  const filteredClients = clientsWithOrders.filter(n=>!search||n.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:-.5, marginBottom:6 }}>Carpetas Contables</h1>
      <p style={{ color:"#6B6B8A", fontSize:13, marginBottom:20 }}>Descarga todos los documentos de una orden o de un cliente en formato ZIP.</p>

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[{id:"by_order",label:"📋 Por Orden"},{id:"by_client",label:"👤 Por Cliente"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"6px 16px", borderRadius:20, border:"1.5px solid", fontSize:13, fontWeight:700, cursor:"pointer",
              borderColor:tab===t.id?"#2D2B55":"#E5E3F0", background:tab===t.id?"#2D2B55":"white", color:tab===t.id?"white":"#6B6B8A" }}>
            {t.label}
          </button>
        ))}
      </div>
      <input className="input-field" style={{ maxWidth:300, marginBottom:16 }} placeholder="🔍 Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />

      {loading ? <p style={{ color:"#888", textAlign:"center", padding:30 }}>Cargando...</p> : tab==="by_order" ? (
        filteredOrders.map(o=>{
          const docCount = (o.logos?.length||0)+(o.purchaseDocs?.length||0)+(o.clientDocs?.length||0)+(o.paymentAnticipo?.file?1:0)+(o.paymentFiniquito?.file?1:0)+(o.shipping?.guideFile?1:0);
          return (
            <div key={o.id} className="card hover-lift" style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
              <div style={{ minWidth:90 }}><div style={{ fontFamily:"monospace", fontWeight:700, fontSize:13, color:"#2D2B55" }}>{o.folio}</div><div style={{ fontSize:10, color:"#9CA3AF" }}>{o.fecha}</div></div>
              <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:14 }}>{o.cliente||"—"}</div><div style={{ fontSize:12, color:"#6B6B8A" }}>{o.empresa}</div></div>
              <div style={{ fontSize:12, color:"#6B6B8A" }}>{docCount} archivos</div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn btn-outline" onClick={()=>exportToPDF(o)} style={{ fontSize:12, padding:"6px 12px" }}>📄 PDF</button>
                <button className="btn btn-primary" onClick={()=>zipOrder(o)} disabled={busy===o.id} style={{ fontSize:12, padding:"6px 12px" }}>{busy===o.id?"📦 Creando...":"📦 ZIP"}</button>
              </div>
            </div>
          );
        })
      ) : (
        filteredClients.map(name=>{
          const count = orders.filter(o=>o.clientDirName===name||o.cliente===name).length;
          return (
            <div key={name} className="card hover-lift" style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
              <div style={{ width:40, height:40, background:"#DBEAFE", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🏢</div>
              <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:14 }}>{name}</div><div style={{ fontSize:12, color:"#6B6B8A" }}>{count} órdenes</div></div>
              <button className="btn btn-primary" onClick={()=>zipClient(name)} disabled={busy===name} style={{ fontSize:12, padding:"6px 14px" }}>{busy===name?"📦 Creando...":"📦 ZIP Expediente"}</button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── CONFIG ────────────────────────────────────────────────────────
function AdminConfig() {
  const [origin, setOrigin] = useState({ name:"", phone:"", email:"", street:"", city:"", state:"", zip:"", country:"MX" });
  const [geminiKey, setGeminiKey] = useState("");
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      const [{ data:o },{ data:g }] = await Promise.all([
        supabase.from("settings").select("value").eq("key","origin_address").maybeSingle(),
        supabase.from("settings").select("value").eq("key","gemini_api_key").maybeSingle(),
      ]);
      if (o?.value) try{ setOrigin(JSON.parse(o.value)); }catch(_){}
      if (g?.value) setGeminiKey(g.value);
      setLoading(false);
    })();
  },[]);

  async function save() {
    await Promise.all([
      supabase.from("settings").upsert({ key:"origin_address", value:JSON.stringify(origin) }),
      supabase.from("settings").upsert({ key:"gemini_api_key", value:geminiKey }),
    ]);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  }

  const set = (k,v) => setOrigin(p=>({...p,[k]:v}));

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:-.5, marginBottom:6 }}>Configuración</h1>
      <p style={{ color:"#6B6B8A", fontSize:13, marginBottom:20 }}>Configuración general del sistema de órdenes de producción.</p>

      {loading ? <p style={{ color:"#888" }}>Cargando...</p> : (
        <div className="card" style={{ maxWidth:700 }}>
          <h3 style={{ fontWeight:700, fontSize:13, color:"#2D2B55", textTransform:"uppercase", letterSpacing:.5, marginBottom:16 }}>📦 Dirección de Origen (Remitente)</h3>
          <Grid cols={2}>
            <Field l="Nombre / Empresa"><input className="input-field" value={origin.name} onChange={e=>set("name",e.target.value)} /></Field>
            <Field l="Teléfono"><input className="input-field" value={origin.phone} onChange={e=>set("phone",e.target.value)} /></Field>
            <Field l="Email"><input className="input-field" value={origin.email} onChange={e=>set("email",e.target.value)} /></Field>
            <Field l="Calle y Número"><input className="input-field" value={origin.street} onChange={e=>set("street",e.target.value)} /></Field>
            <Field l="Ciudad"><input className="input-field" value={origin.city} onChange={e=>set("city",e.target.value)} /></Field>
            <Field l="Estado"><input className="input-field" value={origin.state} onChange={e=>set("state",e.target.value)} /></Field>
            <Field l="Código Postal"><input className="input-field" value={origin.zip} onChange={e=>set("zip",e.target.value)} /></Field>
            <Field l="País"><input className="input-field" value={origin.country} onChange={e=>set("country",e.target.value)} /></Field>
          </Grid>

          <div style={{ marginTop:20, borderTop:"1px solid #E5E3F0", paddingTop:18 }}>
            <h3 style={{ fontWeight:700, fontSize:13, color:"#2D2B55", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>✨ API Key de Gemini — Contratos con IA</h3>
            <p style={{ fontSize:12, color:"#6B7280", marginBottom:10, lineHeight:1.5 }}>
              Se guarda en la nube — todos los usuarios la reciben automáticamente sin configurar nada.
              Obténla en <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color:"#7C3AED" }}>aistudio.google.com</a>
            </p>
            <input
              className="input-field"
              type="password"
              placeholder="AIza..."
              value={geminiKey}
              onChange={e=>setGeminiKey(e.target.value)}
              style={{ fontFamily:"monospace", maxWidth:500 }}
            />
          </div>

          {saved && <div style={{ background:"#D1FAE5", border:"1px solid #6EE7B7", color:"#065F46", borderRadius:8, padding:"8px 14px", marginTop:14, fontWeight:700, fontSize:13 }}>✓ Guardado</div>}
          <div style={{ marginTop:16 }}><button className="btn btn-primary" onClick={save}>Guardar configuración</button></div>
        </div>
      )}
    </div>
  );
}
