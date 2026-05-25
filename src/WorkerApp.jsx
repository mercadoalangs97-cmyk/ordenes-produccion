import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { dbToOrder, orderToDb, emptyOrder, exportToPDF, STATUS_CONFIG } from "./helpers.js";
import { BASE_CSS, OrderCard, EmptyState, Toast } from "./ui.jsx";
import OrderForm from "./OrderForm.jsx";
import DetailView from "./DetailView.jsx";

export default function WorkerApp({ worker, onLogout }) {
  const [tab, setTab] = useState("orders");
  const isVentas = worker.role === "ventas";
  const isProd   = worker.role === "produccion";

  const tabs = [
    { id:"orders", label:"📋 Órdenes" },
    ...(isVentas ? [{ id:"clients", label:"📒 Mis Clientes" }] : []),
  ];

  const roleColor = isProd ? "#0891B2" : "#059669";
  const roleLabel = isProd ? "🔧 Producción" : "💼 Ventas";

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#F8F7F4", color:"#1A1A2E" }}>
      <style>{BASE_CSS}</style>
      <div style={{ background: isProd?"#0C4A6E":"#064E3B", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:54 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>{isProd?"🔧":"💼"}</span>
          <span style={{ color:"white", fontWeight:700, fontSize:14 }}>{roleLabel}</span>
          <span style={{ background:"rgba(255,255,255,.15)", color:"rgba(255,255,255,.85)", borderRadius:8, padding:"2px 10px", fontSize:11, fontFamily:"monospace", fontWeight:700, letterSpacing:1 }}>{worker.code}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:"rgba(255,255,255,.75)", fontSize:13 }}>{worker.name}</span>
          {tabs.length>1 && tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ background:tab===t.id?"rgba(255,255,255,.2)":"transparent", color:"white", border:"none", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:tab===t.id?700:400, cursor:"pointer" }}>
              {t.label}
            </button>
          ))}
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", border:"none", borderRadius:8, padding:"4px 9px", fontSize:11, cursor:"pointer", marginLeft:4 }}>Salir</button>
        </div>
      </div>
      <div style={{ padding:"24px", maxWidth:1200, margin:"0 auto" }}>
        {tab==="orders"  && <WorkerOrders  worker={worker} />}
        {tab==="clients" && <WorkerClients worker={worker} />}
      </div>
    </div>
  );
}

// ── WORKER ORDERS ─────────────────────────────────────────────────
function WorkerOrders({ worker }) {
  const [orders, setOrders]   = useState([]);
  const [view, setView]       = useState("list");
  const [editing, setEditing] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [fStatus, setFStatus] = useState("Todos");
  const [toast, setToast]     = useState("");

  const isProd   = worker.role === "produccion";
  const isVentas = worker.role === "ventas";

  useEffect(()=>{ load(); },[]);

  async function load() {
    let q = supabase.from("orders").select("*").order("created_at",{ascending:false});
    // Ventas only sees own orders
    if (isVentas) q = q.eq("worker_id", worker.id);
    const { data } = await q;
    setOrders((data||[]).map(dbToOrder)); setLoading(false);
  }

  function showToast(m){ setToast(m); setTimeout(()=>setToast(""),2500); }

  async function handleSave(order) {
    const isNew = !order.id || order.id.startsWith("new_");
    const db = orderToDb({ ...order, workerId: order.workerId || worker.id, creadoPor: order.creadoPor || worker.name });
    if (isNew) {
      const { data } = await supabase.from("orders").insert(db).select().single();
      if (data) setOrders(p=>[dbToOrder(data),...p]);
    } else {
      await supabase.from("orders").update(db).eq("id",order.id);
      setOrders(p=>p.map(o=>o.id===order.id?{...order}:o));
    }
    showToast("✓ Orden guardada"); setView("list");
  }

  async function handleStatus(id, status) {
    await supabase.from("orders").update({status}).eq("id",id);
    setOrders(p=>p.map(o=>o.id===id?{...o,status}:o));
  }

  function newOrder() {
    const o = emptyOrder();
    o.workerId  = worker.id;
    o.creadoPor = worker.name;
    o.folio     = `${worker.code}-${(orders.length+1).toString().padStart(3,"0")}`;
    setEditing(o); setView("form");
  }

  const filtered = orders.filter(o=>{
    const q=search.toLowerCase();
    return (!q||o.folio?.toLowerCase().includes(q)||o.cliente?.toLowerCase().includes(q)||o.empresa?.toLowerCase().includes(q))
      &&(fStatus==="Todos"||o.status===fStatus);
  });

  if (view==="form"&&editing) return <OrderForm order={editing} role={worker.role} worker={worker} onSave={handleSave} onCancel={()=>setView("list")} />;
  if (view==="detail"&&detail) {
    const live = orders.find(o=>o.id===detail.id)||detail;
    return <DetailView order={live} role={worker.role} onEdit={o=>{setEditing(o);setView("form");}} onBack={()=>setView("list")} onStatusChange={handleStatus} />;
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:-.5 }}>{isVentas?"Mis Órdenes":"Órdenes de Producción"}</h1>
          <p style={{ color:"#6B6B8A", fontSize:13 }}>{orders.length} órdenes{isVentas?" a tu nombre":""}</p>
        </div>
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
        : filtered.length===0 ? <EmptyState icon="📋" msg="Sin órdenes" sub="Crea tu primera orden" />
        : filtered.map(o=><OrderCard key={o.id} order={o}
            canDelete={false}
            onView={o=>{setDetail(o);setView("detail");}}
            onEdit={o=>{setEditing(o);setView("form");}}
            onDelete={()=>{}}
            onStatusChange={handleStatus} />)
      }
    </div>
  );
}

// ── VENTAS CLIENTS ────────────────────────────────────────────────
function WorkerClients({ worker }) {
  const [clients, setClients] = useState([]);
  const [form, setForm]       = useState({ name:"", empresa:"", rfc:"", email:"", phone:"", address:"" });
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(()=>{ load(); },[]);
  async function load() {
    const { data } = await supabase.from("clients_directory").select("*").eq("created_by",worker.id).order("created_at",{ascending:false});
    setClients(data||[]); setLoading(false);
  }

  async function add() {
    if (!form.name.trim()) return setErr("El nombre es requerido.");
    const { data, error } = await supabase.from("clients_directory").insert({ name:form.name.trim(), empresa:form.empresa.trim(), rfc:form.rfc.trim(), email:form.email.trim(), phone:form.phone.trim(), address:form.address.trim(), created_by:worker.id }).select().single();
    if (error) setErr("Error al guardar."); else { setClients(p=>[data,...p]); setForm({ name:"", empresa:"", rfc:"", email:"", phone:"", address:"" }); setErr(""); }
  }

  const filtered = clients.filter(c=>{
    const q=search.toLowerCase();
    return !q||c.name?.toLowerCase().includes(q)||c.empresa?.toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:-.5, marginBottom:6 }}>Mis Clientes</h1>
      <p style={{ color:"#6B6B8A", fontSize:13, marginBottom:20 }}>Clientes que tú has registrado — solo tú los puedes ver.</p>

      <div className="card" style={{ marginBottom:22 }}>
        <h3 style={{ fontWeight:700, fontSize:13, color:"#2D2B55", textTransform:"uppercase", letterSpacing:.5, marginBottom:14 }}>➕ Nuevo Cliente</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          {[["name","Nombre *","Nombre completo"],["empresa","Empresa","Razón social"],["rfc","RFC","RFC del cliente"],["email","Email","correo@cliente.com"],["phone","Teléfono","+52 55 0000 0000"],["address","Dirección","Calle, ciudad, estado"]].map(([k,l,ph])=>(
            <div key={k}><label className="label">{l}</label><input className="input-field" placeholder={ph} value={form[k]} onChange={e=>setForm({...form,[k]:k==="rfc"?e.target.value.toUpperCase():e.target.value})} /></div>
          ))}
        </div>
        {err && <p style={{ color:"#DC2626", fontSize:13, marginTop:8, fontWeight:600 }}>{err}</p>}
        <div style={{ marginTop:14 }}><button className="btn btn-primary" onClick={add}>Agregar cliente</button></div>
      </div>

      <input className="input-field" style={{ maxWidth:300, marginBottom:16 }} placeholder="🔍 Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />

      {loading ? <p style={{ color:"#888", textAlign:"center", padding:30 }}>Cargando...</p>
        : filtered.length===0 ? <EmptyState icon="📒" msg="Sin clientes registrados" sub="Agrega tus clientes aquí" />
        : filtered.map(c=>(
          <div key={c.id} className="card hover-lift" style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
            <div style={{ width:40, height:40, background:"#DBEAFE", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏢</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
              <div style={{ fontSize:12, color:"#6B6B8A" }}>{c.empresa}{c.rfc?` · RFC: ${c.rfc}`:""}</div>
              <div style={{ fontSize:11, color:"#9CA3AF" }}>{c.email}{c.phone?` · ${c.phone}`:""}</div>
            </div>
          </div>
        ))
      }
    </div>
  );
}
