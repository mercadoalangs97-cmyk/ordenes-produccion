import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase.js";
import { fileToBase64, TECHNIQUES, MATERIAL_STATUS, SHIPPING_STATUS, PURCHASE_DOC_TYPES, CLIENT_DOC_TYPES } from "./helpers.js";
import { Section, Grid, Field, ImageUpload, FileUploadBtn, DocsList } from "./ui.jsx";
import { generateContract } from "./helpers.js";

export default function OrderForm({ order, role, worker, onSave, onCancel }) {
  const [form, setForm] = useState(order);
  const [tab, setTab]   = useState("general");
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [geminiKey, setGeminiKey] = useState(()=>localStorage.getItem("gk_orders")||"");

  const isAdmin   = role === "admin";
  const isVentas  = role === "ventas";
  const isProd    = role === "produccion";

  useEffect(()=>{
    if (isAdmin || isVentas) loadClients();
  },[]);

  async function loadClients() {
    let q = supabase.from("clients_directory").select("id,name,empresa,email,phone");
    if (isVentas && worker?.id) q = q.eq("created_by", worker.id);
    const { data } = await q.order("name");
    setClients(data||[]);
  }

  const set  = (k,v) => setForm(f=>({...f,[k]:v}));
  const setS = (k,v) => setForm(f=>({...f,shipping:{...f.shipping,[k]:v}}));
  const setAnt = (k,v) => setForm(f=>({...f,paymentAnticipo:{...f.paymentAnticipo,[k]:v}}));
  const setFin = (k,v) => setForm(f=>({...f,paymentFiniquito:{...f.paymentFiniquito,[k]:v}}));
  const setProd = (i,k,v) => { const p=[...form.productos]; p[i]={...p[i],[k]:v}; set("productos",p); };

  async function imgUpload(i,k,file) { if(!file)return; const b=await fileToBase64(file); setProd(i,k,b); }

  async function addDocs(key, files, docType) {
    const arr = await Promise.all(Array.from(files).map(fileToBase64));
    const tagged = arr.map(f=>({...f, docType}));
    set(key, [...(form[key]||[]), ...tagged]);
  }

  async function uploadPaymentFile(type, file) {
    if (!file) return;
    const b = await fileToBase64(file);
    if (type==="anticipo") setAnt("file", b);
    else setFin("file", b);
  }

  async function uploadGuide(file) {
    if (!file) return;
    const b = await fileToBase64(file);
    setS("guideFile", b);
    setS("status", "guia_generada");
  }

  function selectClient(id) {
    const c = clients.find(c=>c.id===id);
    if (!c) return;
    set("clientDirId", c.id);
    set("clientDirName", c.name);
    set("cliente", c.name);
    set("empresa", c.empresa||"");
    set("email", c.email||"");
    set("telefono", c.phone||"");
  }

  async function handleSubmit() {
    setSaving(true); await onSave(form); setSaving(false);
  }

  const TABS = [
    { id:"general",   label:"📋 General"    },
    { id:"productos",  label:"📦 Productos"  },
    { id:"logos",      label:"🖼 Logos"      },
    { id:"materiales", label:"🛒 Materiales" },
    { id:"pagos",      label:"💰 Pagos"      },
    { id:"doccliente", label:"🧾 Doc Cliente"},
    { id:"envio",      label:"📦 Envío"      },
    { id:"notas",      label:"📝 Notas"      },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <h2 style={{ fontSize:20, fontWeight:800 }}>{order.folio||"Nueva Orden"}</h2>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving?"Guardando...":"💾 Guardar"}</button>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"5px 12px", borderRadius:20, border:"1.5px solid", fontSize:12, fontWeight:700, cursor:"pointer",
              borderColor:tab===t.id?"#4F46E5":"#E5E3F0", background:tab===t.id?"#4F46E5":"white", color:tab===t.id?"white":"#6B6B8A" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* GENERAL */}
      {tab==="general" && (
        <Section title="📋 Información General">
          <Grid cols={3}>
            <Field l="Folio"><input className="input-field" value={form.folio} onChange={e=>set("folio",e.target.value)} readOnly={isProd} style={isProd?{background:"#f3f4f6"}:{}} /></Field>
            <Field l="Fecha de Orden"><input className="input-field" type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)} /></Field>
            <Field l="Fecha de Entrega"><input className="input-field" type="date" value={form.fechaEntrega} onChange={e=>set("fechaEntrega",e.target.value)} /></Field>

            {(isAdmin||isVentas) && clients.length>0 && (
              <Field l="Seleccionar Cliente del Directorio" style={{ gridColumn:"span 2" }}>
                <select className="input-field" value={form.clientDirId||""} onChange={e=>selectClient(e.target.value)}>
                  <option value="">— Seleccionar cliente —</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.empresa?` — ${c.empresa}`:""}</option>)}
                </select>
              </Field>
            )}

            {!isProd && <>
              <Field l="Cliente"><input className="input-field" placeholder="Nombre del cliente" value={form.cliente} onChange={e=>set("cliente",e.target.value)} /></Field>
              <Field l="Empresa"><input className="input-field" placeholder="Razón social" value={form.empresa} onChange={e=>set("empresa",e.target.value)} /></Field>
              <Field l="Teléfono"><input className="input-field" placeholder="+52 55 0000 0000" value={form.telefono} onChange={e=>set("telefono",e.target.value)} /></Field>
              <Field l="Email"><input className="input-field" placeholder="correo@cliente.com" value={form.email} onChange={e=>set("email",e.target.value)} /></Field>
            </>}

            {isAdmin && <>
              <Field l="Responsable"><input className="input-field" value={form.creadoPor} onChange={e=>set("creadoPor",e.target.value)} /></Field>
              <Field l="Estatus">
                <select className="input-field" value={form.status} onChange={e=>set("status",e.target.value)}>
                  {["Pendiente","En Producción","Control de Calidad","Terminado","Listo para Envío","Enviado","Entregado en Almacén","Entregado","Cancelado"].map(s=><option key={s}>{s}</option>)}
                </select>
              </Field>
            </>}
            {isProd && (
              <Field l="Estatus">
                <select className="input-field" value={form.status} onChange={e=>set("status",e.target.value)}>
                  {["Pendiente","En Producción","Control de Calidad","Terminado","Listo para Envío","Enviado","Entregado en Almacén","Entregado"].map(s=><option key={s}>{s}</option>)}
                </select>
              </Field>
            )}
          </Grid>
        </Section>
      )}

      {/* PRODUCTOS */}
      {tab==="productos" && (
        <Section title="📦 Productos a Personalizar">
          {form.productos.map((prod,idx)=>(
            <div key={prod.id||idx} style={{ background:"#F8F7F4", border:"1.5px solid #E5E3F0", borderRadius:12, padding:16, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <span style={{ fontWeight:700, fontSize:13, color:"#2D2B55" }}>Producto {idx+1}</span>
                {form.productos.length>1 && <button className="btn-red" onClick={()=>set("productos",form.productos.filter((_,i)=>i!==idx))}>Eliminar</button>}
              </div>
              <Grid cols={3}>
                <Field l="Descripción" style={{ gridColumn:"span 2" }}><input className="input-field" placeholder="Polo manga corta, Taza cerámica..." value={prod.descripcion} onChange={e=>setProd(idx,"descripcion",e.target.value)} /></Field>
                <Field l="Cantidad"><input className="input-field" type="number" min="1" value={prod.cantidad} onChange={e=>setProd(idx,"cantidad",e.target.value)} /></Field>
                <Field l="Talla / Medida"><input className="input-field" placeholder="M, L, XL / 15x20cm" value={prod.talla} onChange={e=>setProd(idx,"talla",e.target.value)} /></Field>
                <Field l="Color del Producto"><input className="input-field" placeholder="Blanco, Negro..." value={prod.color} onChange={e=>setProd(idx,"color",e.target.value)} /></Field>
                <Field l="Técnica">
                  <select className="input-field" value={prod.tecnica} onChange={e=>setProd(idx,"tecnica",e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {TECHNIQUES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field l="Posición / Área"><input className="input-field" placeholder="Pecho izq., Espalda..." value={prod.posicion} onChange={e=>setProd(idx,"posicion",e.target.value)} /></Field>
                <Field l="Colores de Impresión"><input className="input-field" placeholder="Pantone, CMYK..." value={prod.coloresImpresion} onChange={e=>setProd(idx,"coloresImpresion",e.target.value)} /></Field>
                <Field l="Notas" style={{ gridColumn:"span 3" }}><textarea className="input-field" rows={2} value={prod.notas} onChange={e=>setProd(idx,"notas",e.target.value)} style={{ resize:"vertical" }} /></Field>
              </Grid>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:10 }}>
                <ImageUpload label="📸 Foto del Producto" image={prod.fotoProducto} onChange={f=>imgUpload(idx,"fotoProducto",f)} onRemove={()=>setProd(idx,"fotoProducto",null)} />
                <ImageUpload label="🎨 Mockup / Visual" image={prod.mockup} onChange={f=>imgUpload(idx,"mockup",f)} onRemove={()=>setProd(idx,"mockup",null)} />
              </div>
            </div>
          ))}
          <button onClick={()=>set("productos",[...form.productos,{id:Date.now().toString(),descripcion:"",cantidad:"",talla:"",color:"",tecnica:"",posicion:"",coloresImpresion:"",notas:"",fotoProducto:null,mockup:null}])}
            style={{ background:"white", border:"1.5px dashed #A78BFA", borderRadius:10, padding:"9px 18px", color:"#7C3AED", fontWeight:700, fontSize:13, width:"100%", cursor:"pointer" }}>
            + Agregar producto
          </button>
        </Section>
      )}

      {/* LOGOS */}
      {tab==="logos" && (
        <Section title="🖼 Archivos de Logos">
          <p style={{ fontSize:13, color:"#6B7280", marginBottom:12 }}>Sube los archivos de diseño para personalización.</p>
          <DocsList docs={form.logos} onRemove={i=>set("logos",form.logos.filter((_,j)=>j!==i))} onDownload={f=>{ const a=document.createElement("a"); a.href=f.data; a.download=f.name; a.click(); }} />
          <div style={{ marginTop:12 }}>
            <FileUploadBtn label="📎 Subir archivos" multiple onFiles={async files=>{ const arr=await Promise.all(Array.from(files).map(f=>fileToBase64(f))); set("logos",[...(form.logos||[]),...arr]); }} />
          </div>
        </Section>
      )}

      {/* MATERIALES */}
      {tab==="materiales" && (
        <Section title="🛒 Compra de Materiales" accent="#FCD34D">
          <div style={{ marginBottom:16 }}>
            <label className="label">Estatus de materiales</label>
            <div style={{ display:"flex", gap:8 }}>
              {Object.entries(MATERIAL_STATUS).map(([k,v])=>(
                <button key={k} onClick={()=>set("materialStatus",k)}
                  style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${v.color}`, background:form.materialStatus===k?v.color:"white", color:form.materialStatus===k?"white":v.color, fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <h4 style={{ fontSize:12, fontWeight:700, color:"#6B6B8A", textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>Documentos de Compra al Proveedor</h4>
          <DocsList docs={form.purchaseDocs} docTypes={PURCHASE_DOC_TYPES} onRemove={i=>set("purchaseDocs",form.purchaseDocs.filter((_,j)=>j!==i))} onDownload={f=>{ const a=document.createElement("a"); a.href=f.data; a.download=f.name; a.click(); }} />

          <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
            {PURCHASE_DOC_TYPES.map(dt=>(
              <div key={dt.value} style={{ position:"relative" }}>
                <FileUploadBtn label={`+ ${dt.label}`} multiple onFiles={files=>addDocs("purchaseDocs",files,dt.value)} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* PAGOS */}
      {tab==="pagos" && (
        <Section title="💰 Pagos del Cliente" accent="#6EE7B7">
          {[
            { key:"paymentAnticipo", label:"Anticipo", set:setAnt, val:form.paymentAnticipo },
            { key:"paymentFiniquito", label:"Finiquito", set:setFin, val:form.paymentFiniquito },
          ].map(({ key, label, set:s, val })=>(
            <div key={key} style={{ background:"#F8F7F4", border:"1.5px solid #E5E3F0", borderRadius:12, padding:16, marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <span style={{ fontWeight:700, fontSize:14 }}>💰 {label}</span>
                <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13 }}>
                  <input type="checkbox" checked={val.paid||false} onChange={e=>s("paid",e.target.checked)} />
                  <span style={{ fontWeight:600, color:val.paid?"#059669":"#6B7280" }}>{val.paid?"✓ Pagado":"Pendiente"}</span>
                </label>
              </div>
              {val.paid && (
                <Grid cols={3}>
                  <Field l="Monto"><input className="input-field" placeholder="$0.00" value={val.amount||""} onChange={e=>s("amount",e.target.value)} /></Field>
                  <Field l="Fecha de pago"><input className="input-field" type="date" value={val.date||""} onChange={e=>s("date",e.target.value)} /></Field>
                  <Field l="Comprobante">
                    {val.file
                      ? <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:12, color:"#059669", fontWeight:600 }}>✓ {val.file.name}</span>
                          <button onClick={()=>{ const a=document.createElement("a"); a.href=val.file.data; a.download=val.file.name; a.click(); }} style={{ background:"#2D2B55", color:"white", border:"none", borderRadius:6, padding:"3px 8px", fontSize:10, cursor:"pointer" }}>⬇</button>
                          <button onClick={()=>s("file",null)} style={{ background:"#FEE2E2", color:"#DC2626", border:"none", borderRadius:6, padding:"3px 6px", fontSize:10, cursor:"pointer" }}>×</button>
                        </div>
                      : <input type="file" accept="image/*,.pdf,.xml" onChange={e=>uploadPaymentFile(key==="paymentAnticipo"?"anticipo":"finiquito",e.target.files[0])} style={{ fontSize:12 }} />
                    }
                  </Field>
                </Grid>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* DOCS CLIENTE */}
      {tab==="doccliente" && (
        <Section title="🧾 Documentos del Cliente" accent="#BFDBFE">
          <p style={{ fontSize:13, color:"#6B7280", marginBottom:12 }}>Factura emitida al cliente, complemento de pago, cotización.</p>
          <DocsList docs={form.clientDocs} docTypes={CLIENT_DOC_TYPES} onRemove={i=>set("clientDocs",form.clientDocs.filter((_,j)=>j!==i))} onDownload={f=>{ const a=document.createElement("a"); a.href=f.data; a.download=f.name; a.click(); }} />
          <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
            {CLIENT_DOC_TYPES.map(dt=>(
              <FileUploadBtn key={dt.value} label={`+ ${dt.label}`} multiple onFiles={files=>addDocs("clientDocs",files,dt.value)} />
            ))}
          </div>

          {/* AI Contract Generator */}
          <div style={{ marginTop:20, background:"linear-gradient(135deg,#EDE9FE,#E0E7FF)", border:"1.5px solid #A78BFA", borderRadius:14, padding:18 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#4C1D95", marginBottom:4 }}>✨ Generar Contrato de Compraventa con IA</div>
            <p style={{ fontSize:12, color:"#5B21B6", marginBottom:12, lineHeight:1.5 }}>Genera automáticamente un contrato profesional con los datos del cliente y los productos de esta orden.</p>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:700, color:"#6D28D9", textTransform:"uppercase", letterSpacing:.5 }}>API Key de Gemini (aistudio.google.com)</label>
              <input
                style={{ width:"100%", padding:"8px 11px", border:"1.5px solid #A78BFA", borderRadius:8, fontSize:13, marginTop:4, fontFamily:"monospace", background:"#FAF8FF" }}
                type="password" placeholder="AIza..."
                value={geminiKey}
                onChange={e=>{ setGeminiKey(e.target.value); localStorage.setItem("gk_orders",e.target.value); }}
              />
            </div>
            <button
              onClick={async()=>{
                if(!geminiKey){ alert("Ingresa tu API Key de Gemini primero."); return; }
                setGeneratingContract(true);
                try{
                  const text = await generateContract(form, geminiKey);
                  if(!text){ alert("No se pudo generar el contrato. Intenta de nuevo."); setGeneratingContract(false); return; }
                  // Save as a text file in clientDocs
                  const blob = new Blob([text],{type:"text/plain"});
                  const reader = new FileReader();
                  reader.onload = e=>{
                    const doc = { name:`Contrato_${form.folio||"orden"}_${new Date().toISOString().split("T")[0]}.txt`, type:"text/plain", size:blob.size, data:e.target.result, docType:"contrato_compraventa" };
                    set("clientDocs",[...(form.clientDocs||[]),doc]);
                  };
                  reader.readAsDataURL(blob);
                  alert("✅ Contrato generado y agregado a los documentos del cliente.");
                }catch(err){ alert("Error al generar: "+err.message); }
                setGeneratingContract(false);
              }}
              disabled={generatingContract}
              style={{ background:"#7C3AED", color:"white", border:"none", borderRadius:9, padding:"9px 20px", fontWeight:700, fontSize:13, cursor:"pointer", opacity:generatingContract?.6:1, width:"100%" }}>
              {generatingContract?"✨ Generando contrato...":"✨ Generar contrato con IA"}
            </button>
          </div>
        </Section>
      )}

      {/* ENVÍO */}
      {tab==="envio" && <EnvioSection form={form} setS={setS} uploadGuide={uploadGuide} />}

      {/* NOTAS */}
      {tab==="notas" && (
        <Section title="📝 Notas Generales">
          <textarea className="input-field" rows={5} placeholder="Instrucciones especiales, observaciones de entrega, notas internas..." value={form.notasGenerales} onChange={e=>set("notasGenerales",e.target.value)} style={{ resize:"vertical" }} />
        </Section>
      )}

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16, paddingBottom:24 }}>
        <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving?"Guardando...":"💾 Guardar Orden"}</button>
      </div>
    </div>
  );
}

// ─── ENVÍO SECTION ────────────────────────────────────────────────
function EnvioSection({ form, setS, uploadGuide }) {
  const s = form.shipping || {};
  const [quoting, setQuoting]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [quotesErr, setQuotesErr] = useState("");
  const guideRef = useRef();

  async function getQuotes() {
    setQuoting(true); setQuotesErr("");
    try {
      // Get origin address from settings
      const { data: setting } = await supabase.from("settings").select("value").eq("key","origin_address").maybeSingle();
      const origin = setting?.value ? JSON.parse(setting.value) : null;
      if (!origin?.zip) { setQuotesErr("Configura la dirección de origen en Admin → Configuración."); setQuoting(false); return; }
      if (!s.recipientZip) { setQuotesErr("Ingresa el código postal del destinatario."); setQuoting(false); return; }
      if (!s.boxWeight)    { setQuotesErr("Ingresa el peso del paquete."); setQuoting(false); return; }

      const res = await fetch("/api/skydropx", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ action:"get_quotes", payload:{
          zip_from: origin.zip,
          zip_to:   s.recipientZip,
          parcel: { weight: parseFloat(s.boxWeight)||1, height: parseFloat(s.boxHeight)||10, width: parseFloat(s.boxWidth)||10, length: parseFloat(s.boxLength)||10 }
        }})
      });
      const data = await res.json();
      if (data.error) { setQuotesErr(data.error); setQuoting(false); return; }
      const quotes = data.data || data.rates || data.quotes || [];
      setS("quotes", quotes);
      if (quotes.length===0) setQuotesErr("No se encontraron tarifas para esta ruta. Verifica los datos.");
    } catch(e) { setQuotesErr("Error de conexión con Skydropx: "+e.message); }
    setQuoting(false);
  }

  async function createShipment() {
    if (!s.selectedQuote) return;
    setCreating(true); setQuotesErr("");
    try {
      const { data: setting } = await supabase.from("settings").select("value").eq("key","origin_address").maybeSingle();
      const origin = setting?.value ? JSON.parse(setting.value) : {};
      const res = await fetch("/api/skydropx", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ action:"create_shipment", payload:{
          shipment:{
            consignee_name:    s.recipientName,
            consignee_phone:   s.recipientPhone,
            consignee_email:   s.recipientEmail,
            consignee_street1: s.recipientStreet,
            consignee_city:    s.recipientCity,
            consignee_state:   s.recipientState,
            consignee_country: s.recipientCountry||"MX",
            consignee_zip:     s.recipientZip,
            parcel_weight:     parseFloat(s.boxWeight)||1,
            parcel_length:     parseFloat(s.boxLength)||10,
            parcel_width:      parseFloat(s.boxWidth)||10,
            parcel_height:     parseFloat(s.boxHeight)||10,
            carrier:           s.selectedQuote.carrier,
            service:           s.selectedQuote.service,
          }
        }})
      });
      const data = await res.json();
      if (data.error) { setQuotesErr("Error al crear guía: "+data.error); setCreating(false); return; }
      const shipment = data.data || data.shipment || data;
      setS("skydropxShipmentId", shipment.id||shipment.shipment_id||null);
      setS("trackingNumber", shipment.tracking_number||shipment.label_url||"");
      setS("labelUrl", shipment.label_url||shipment.label||null);
      setS("status", "guia_generada");
      alert("✓ Guía creada exitosamente en Skydropx.\nN° de rastreo: "+(shipment.tracking_number||"Ver en Skydropx"));
    } catch(e) { setQuotesErr("Error: "+e.message); }
    setCreating(false);
  }

  const ssConfig = SHIPPING_STATUS[s.status]||SHIPPING_STATUS.pendiente;

  return (
    <Section title="📦 Envío y Logística" accent="#CFFAFE">
      {/* Status */}
      <div style={{ marginBottom:16 }}>
        <label className="label">Estatus de envío</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {Object.entries(SHIPPING_STATUS).map(([k,v])=>(
            <button key={k} onClick={()=>setS("status",k)}
              style={{ padding:"5px 12px", borderRadius:20, border:`1.5px solid ${v.color}`, background:s.status===k?v.color:"white", color:s.status===k?"white":v.color, fontWeight:700, fontSize:11, cursor:"pointer" }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipient */}
      <h4 style={{ fontSize:12, fontWeight:700, color:"#6B6B8A", textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>Datos del Destinatario</h4>
      <Grid cols={3}>
        <Field l="Nombre"><input className="input-field" value={s.recipientName||""} onChange={e=>setS("recipientName",e.target.value)} /></Field>
        <Field l="Teléfono"><input className="input-field" value={s.recipientPhone||""} onChange={e=>setS("recipientPhone",e.target.value)} /></Field>
        <Field l="Email"><input className="input-field" value={s.recipientEmail||""} onChange={e=>setS("recipientEmail",e.target.value)} /></Field>
        <Field l="Calle y Número" style={{ gridColumn:"span 2" }}><input className="input-field" value={s.recipientStreet||""} onChange={e=>setS("recipientStreet",e.target.value)} /></Field>
        <Field l="Código Postal"><input className="input-field" value={s.recipientZip||""} onChange={e=>setS("recipientZip",e.target.value)} /></Field>
        <Field l="Ciudad"><input className="input-field" value={s.recipientCity||""} onChange={e=>setS("recipientCity",e.target.value)} /></Field>
        <Field l="Estado"><input className="input-field" value={s.recipientState||""} onChange={e=>setS("recipientState",e.target.value)} /></Field>
        <Field l="País"><input className="input-field" value={s.recipientCountry||"MX"} onChange={e=>setS("recipientCountry",e.target.value)} /></Field>
      </Grid>

      {/* Package */}
      <h4 style={{ fontSize:12, fontWeight:700, color:"#6B6B8A", textTransform:"uppercase", letterSpacing:.5, margin:"16px 0 10px" }}>Dimensiones del Paquete</h4>
      <Grid cols={4}>
        <Field l="Largo (cm)"><input className="input-field" type="number" min="1" placeholder="0" value={s.boxLength||""} onChange={e=>setS("boxLength",e.target.value)} /></Field>
        <Field l="Ancho (cm)"><input className="input-field" type="number" min="1" placeholder="0" value={s.boxWidth||""} onChange={e=>setS("boxWidth",e.target.value)} /></Field>
        <Field l="Alto (cm)"><input className="input-field" type="number" min="1" placeholder="0" value={s.boxHeight||""} onChange={e=>setS("boxHeight",e.target.value)} /></Field>
        <Field l="Peso (kg)"><input className="input-field" type="number" min="0.1" step="0.1" placeholder="0.0" value={s.boxWeight||""} onChange={e=>setS("boxWeight",e.target.value)} /></Field>
      </Grid>

      {/* Skydropx */}
      <div style={{ background:"#F0F9FF", border:"1.5px solid #BAE6FD", borderRadius:12, padding:16, marginTop:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"#0C4A6E" }}>🚀 Skydropx — Generación Automática</div>
            <div style={{ fontSize:12, color:"#0369A1" }}>Cotiza y genera tu guía de envío directamente</div>
          </div>
          <button className="btn btn-primary" onClick={getQuotes} disabled={quoting} style={{ background:"#0891B2", fontSize:13, padding:"8px 16px" }}>
            {quoting?"Cotizando...":"Cotizar envío"}
          </button>
        </div>

        {quotesErr && <div style={{ background:"#FEE2E2", border:"1px solid #FCA5A5", color:"#DC2626", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:10 }}>{quotesErr}</div>}

        {s.quotes?.length>0 && (
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:"#0C4A6E", marginBottom:8 }}>Selecciona una tarifa:</p>
            {s.quotes.map((q,i)=>(
              <div key={i} onClick={()=>setS("selectedQuote",q)}
                style={{ background:s.selectedQuote===q?"#DBEAFE":"white", border:`1.5px solid ${s.selectedQuote===q?"#3B82F6":"#E5E3F0"}`, borderRadius:8, padding:"10px 14px", marginBottom:6, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{q.carrier||q.provider} — {q.service||q.service_name}</div>
                  <div style={{ fontSize:11, color:"#6B7280" }}>Entrega estimada: {q.days||q.estimated_days||"?"} días</div>
                </div>
                <div style={{ fontWeight:800, fontSize:15, color:"#2D2B55" }}>${q.total_pricing||q.price||q.total||"—"}</div>
              </div>
            ))}
            {s.selectedQuote && (
              <button className="btn btn-green" onClick={createShipment} disabled={creating} style={{ marginTop:8, width:"100%", fontSize:13 }}>
                {creating?"Generando guía...":"✓ Generar guía en Skydropx"}
              </button>
            )}
          </div>
        )}

        {s.skydropxShipmentId && (
          <div style={{ background:"#D1FAE5", border:"1px solid #6EE7B7", borderRadius:8, padding:"10px 14px", marginTop:10 }}>
            <div style={{ fontWeight:700, color:"#065F46", fontSize:13 }}>✓ Guía generada exitosamente</div>
            {s.trackingNumber && <div style={{ fontSize:12, color:"#047857", fontFamily:"monospace" }}>N° {s.trackingNumber}</div>}
            {s.labelUrl && <a href={s.labelUrl} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#0891B2", fontWeight:600 }}>🖨 Imprimir guía</a>}
          </div>
        )}
      </div>

      {/* Manual upload */}
      <div style={{ marginTop:14 }}>
        <h4 style={{ fontSize:12, fontWeight:700, color:"#6B6B8A", textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>O bien — Subir guía manualmente</h4>
        <Grid cols={2}>
          <Field l="N° de guía / Tracking">
            <input className="input-field" placeholder="Número de rastreo" value={s.trackingNumber||""} onChange={e=>setS("trackingNumber",e.target.value)} />
          </Field>
          <Field l="Carrier / Paquetería">
            <input className="input-field" placeholder="DHL, FedEx, Estafeta..." value={s.carrier||""} onChange={e=>setS("carrier",e.target.value)} />
          </Field>
        </Grid>
        <div style={{ marginTop:10 }}>
          {s.guideFile
            ? <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:13, color:"#059669", fontWeight:600 }}>✓ {s.guideFile.name}</span>
                <button onClick={()=>{ const a=document.createElement("a"); a.href=s.guideFile.data; a.download=s.guideFile.name; a.click(); }} style={{ background:"#2D2B55", color:"white", border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer" }}>⬇ Descargar</button>
                <button onClick={()=>setS("guideFile",null)} style={{ background:"#FEE2E2", color:"#DC2626", border:"none", borderRadius:6, padding:"4px 8px", fontSize:11, cursor:"pointer" }}>× Quitar</button>
              </div>
            : <>
                <input ref={guideRef} type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>uploadGuide(e.target.files[0])} />
                <button className="btn btn-outline" onClick={()=>guideRef.current?.click()} style={{ fontSize:13 }}>📎 Subir guía de envío</button>
              </>
          }
        </div>
      </div>
    </Section>
  );
}
