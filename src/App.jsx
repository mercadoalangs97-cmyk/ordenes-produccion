import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { BASE_CSS } from "./ui.jsx";
import AdminApp from "./AdminApp.jsx";
import WorkerApp from "./WorkerApp.jsx";

export default function App() {
  const [mode, setMode]       = useState(null);
  const [adminReady, setAdminReady] = useState(false);
  const [worker, setWorker]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      const { data } = await supabase.from("settings").select("value").eq("key","admin_password").maybeSingle();
      setAdminReady(!!data?.value);
      setLoading(false);
    })();
  },[]);

  if (loading) return <Splash />;
  if (mode===null)          return <Landing onAdmin={()=>setMode("login-admin")} onWorker={()=>setMode("login-worker")} />;
  if (mode==="login-admin") return <LoginAdmin isFirst={!adminReady} onSuccess={()=>setMode("admin")} onBack={()=>setMode(null)} />;
  if (mode==="login-worker") return <LoginWorker onSuccess={w=>{setWorker(w);setMode("worker");}} onBack={()=>setMode(null)} />;
  if (mode==="admin")  return <AdminApp  onLogout={()=>setMode(null)} />;
  if (mode==="worker") return <WorkerApp worker={worker} onLogout={()=>{setWorker(null);setMode(null);}} />;
  return null;
}

function Splash() {
  return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"'DM Sans',sans-serif", color:"#888" }}><style>{BASE_CSS}</style>Cargando...</div>;
}

function Landing({ onAdmin, onWorker }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1E1B4B,#312E81,#4C1D95)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{BASE_CSS}</style>
      <div style={{ textAlign:"center", maxWidth:520, width:"100%" }}>
        <div style={{ width:64, height:64, background:"rgba(255,255,255,.15)", borderRadius:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 20px" }}>🏭</div>
        <h1 style={{ color:"white", fontSize:28, fontWeight:800, letterSpacing:-1, marginBottom:8 }}>Órdenes de Producción</h1>
        <p style={{ color:"rgba(255,255,255,.6)", fontSize:14, marginBottom:40 }}>Sistema de gestión para tu equipo de producción</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <AccessCard icon="🔐" title="Admin" desc="Acceso total al sistema, gestión de equipo y contabilidad" color="#A78BFA" onClick={onAdmin} />
          <AccessCard icon="👷" title="Trabajador" desc="Producción y ventas — accede con tu código de empleado" color="#34D399" onClick={onWorker} />
        </div>
      </div>
    </div>
  );
}

function AccessCard({ icon, title, desc, color, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:"rgba(255,255,255,.08)", border:`1.5px solid ${color}40`, borderRadius:16, padding:24, cursor:"pointer", transition:"all .2s" }}
      onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.16)";e.currentTarget.style.transform="translateY(-2px)";}}
      onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)";e.currentTarget.style.transform="none";}}>
      <div style={{ fontSize:32, marginBottom:10 }}>{icon}</div>
      <div style={{ color:"white", fontWeight:700, fontSize:16, marginBottom:6 }}>{title}</div>
      <div style={{ color:"rgba(255,255,255,.55)", fontSize:12, lineHeight:1.5 }}>{desc}</div>
    </div>
  );
}

function LoginAdmin({ isFirst, onSuccess, onBack }) {
  const [pass, setPass]   = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);

  async function handle() {
    setErr(""); setBusy(true);
    if (isFirst) {
      if (pass.length<4) { setErr("Mínimo 4 caracteres."); setBusy(false); return; }
      if (pass!==pass2)  { setErr("Las contraseñas no coinciden."); setBusy(false); return; }
      await supabase.from("settings").upsert({ key:"admin_password", value:pass });
      onSuccess();
    } else {
      const { data } = await supabase.from("settings").select("value").eq("key","admin_password").maybeSingle();
      if (data?.value===pass) onSuccess();
      else setErr("Contraseña incorrecta.");
    }
    setBusy(false);
  }

  return (
    <AuthScreen icon="🔐" title={isFirst?"Crear contraseña Admin":"Acceso Admin"} onBack={onBack}>
      {isFirst && <p style={{ fontSize:13, color:"#6B7280", marginBottom:16, lineHeight:1.6 }}>Primera vez — crea una contraseña para el panel de administración.</p>}
      <label className="label">Contraseña</label>
      <input className="input-field" type="password" placeholder="••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} style={{ marginBottom:12 }} />
      {isFirst && <>
        <label className="label">Confirmar contraseña</label>
        <input className="input-field" type="password" placeholder="••••••" value={pass2} onChange={e=>setPass2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} style={{ marginBottom:12 }} />
      </>}
      {err && <p style={{ color:"#DC2626", fontSize:13, marginBottom:10, fontWeight:600 }}>{err}</p>}
      <button className="btn btn-primary" style={{ width:"100%" }} onClick={handle} disabled={busy}>{busy?"...":isFirst?"Crear y entrar":"Entrar"}</button>
    </AuthScreen>
  );
}

function LoginWorker({ onSuccess, onBack }) {
  const [code, setCode] = useState("");
  const [pass, setPass] = useState("");
  const [step, setStep] = useState(1); // 1=code, 2=password
  const [worker, setWorker] = useState(null);
  const [err, setErr]   = useState("");
  const [busy, setBusy] = useState(false);

  async function checkCode() {
    setErr(""); setBusy(true);
    const { data } = await supabase.from("workers").select("*").eq("code", code.trim().toUpperCase()).maybeSingle();
    if (data) { setWorker(data); setStep(2); }
    else setErr("Código no encontrado. Verifica con tu administrador.");
    setBusy(false);
  }

  async function checkPass() {
    setErr(""); setBusy(true);
    if (worker.password === pass) onSuccess(worker);
    else setErr("Contraseña incorrecta.");
    setBusy(false);
  }

  return (
    <AuthScreen icon="👷" title="Acceso Trabajador" onBack={onBack}>
      {step===1 ? <>
        <p style={{ fontSize:13, color:"#6B7280", marginBottom:16, lineHeight:1.6 }}>Ingresa el código de empleado que te asignó tu administrador.</p>
        <label className="label">Código de empleado</label>
        <input className="input-field" placeholder="Ej: PROD-001" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&checkCode()} style={{ marginBottom:12, fontFamily:"monospace", fontWeight:700, letterSpacing:2 }} />
        {err && <p style={{ color:"#DC2626", fontSize:13, marginBottom:10, fontWeight:600 }}>{err}</p>}
        <button className="btn btn-primary" style={{ width:"100%" }} onClick={checkCode} disabled={busy}>{busy?"Buscando...":"Continuar"}</button>
      </> : <>
        <div style={{ background:"#F0EFF9", borderRadius:10, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:24 }}>👋</div>
          <div><div style={{ fontWeight:700, fontSize:15 }}>{worker.name}</div><div style={{ fontSize:12, color:"#6B6B8A" }}>{worker.role==="produccion"?"🔧 Producción":"💼 Ventas"} · {worker.code}</div></div>
        </div>
        <label className="label">Contraseña</label>
        <input className="input-field" type="password" placeholder="••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&checkPass()} style={{ marginBottom:12 }} />
        {err && <p style={{ color:"#DC2626", fontSize:13, marginBottom:10, fontWeight:600 }}>{err}</p>}
        <button className="btn btn-primary" style={{ width:"100%" }} onClick={checkPass} disabled={busy}>{busy?"Verificando...":"Entrar"}</button>
        <button onClick={()=>{setStep(1);setErr("");setPass("");}} style={{ background:"none", border:"none", color:"#9CA3AF", fontSize:13, marginTop:10, width:"100%", cursor:"pointer" }}>← Cambiar código</button>
      </>}
    </AuthScreen>
  );
}

function AuthScreen({ icon, title, onBack, children }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1E1B4B,#312E81,#4C1D95)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{BASE_CSS}</style>
      <div style={{ background:"white", borderRadius:20, padding:36, width:"100%", maxWidth:400, boxShadow:"0 24px 60px rgba(0,0,0,.3)" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#9CA3AF", fontSize:13, fontWeight:600, marginBottom:20, padding:0, cursor:"pointer" }}>← Volver</button>
        <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:20, color:"#1A1A2E" }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
