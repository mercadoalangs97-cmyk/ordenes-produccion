import { useRef } from "react";
import { STATUS_CONFIG, MATERIAL_STATUS, SHIPPING_STATUS } from "./helpers.js";

export const BASE_CSS = `
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
.btn-green{background:#059669;color:#fff;border:none}.btn-green:hover{background:#047857}
.btn-red{background:#FEE2E2;color:#DC2626;border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer}
.card{background:white;border:1.5px solid #E5E3F0;border-radius:14px;padding:22px}
.hover-lift:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.07)}
`;

export function Section({ title, children, accent }) {
  return (
    <div style={{ background:"white", border:`1.5px solid ${accent||"#E5E3F0"}`, borderRadius:14, padding:22 }}>
      <h3 style={{ fontWeight:700, fontSize:13, color:"#2D2B55", textTransform:"uppercase", letterSpacing:.5, marginBottom:16 }}>{title}</h3>
      {children}
    </div>
  );
}

export function Grid({ cols=2, children }) {
  return <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:12 }}>{children}</div>;
}

export function Field({ l, children, style={} }) {
  return <div style={style}><label className="label">{l}</label>{children}</div>;
}

export function IR({ l, v }) {
  if (!v) return null;
  return <div><span style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:.4 }}>{l}: </span><span style={{ fontSize:13, fontWeight:600, color:"#1A1A2E" }}>{v}</span></div>;
}

export function EmptyState({ icon, msg, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"50px 20px", color:"#9CA3AF" }}>
      <div style={{ fontSize:44, marginBottom:10 }}>{icon}</div>
      <p style={{ fontWeight:700, fontSize:15 }}>{msg}</p>
      <p style={{ fontSize:13, marginTop:4 }}>{sub}</p>
    </div>
  );
}

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color:"#6B7280", bg:"#F3F4F6" };
  return <span style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40`, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{status}</span>;
}

export function MaterialBadge({ status }) {
  const cfg = MATERIAL_STATUS[status] || MATERIAL_STATUS.por_comprar;
  return <span style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40`, borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{cfg.label}</span>;
}

export function PaymentBadge({ anticipo, finiquito }) {
  if (!anticipo?.paid && !finiquito?.paid) return null;
  return (
    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
      {anticipo?.paid && <span style={{ background:"#D1FAE5", color:"#059669", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>💰 Anticipo</span>}
      {finiquito?.paid && <span style={{ background:"#D1FAE5", color:"#059669", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>💰 Finiquito</span>}
    </div>
  );
}

export function ShippingBadge({ status }) {
  if (!status || status === "pendiente") return null;
  const cfg = SHIPPING_STATUS[status] || SHIPPING_STATUS.pendiente;
  return <span style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40`, borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{cfg.label}</span>;
}

export function OrderCard({ order, onView, onEdit, onDelete, onStatusChange, canDelete=true }) {
  const total = order.productos?.reduce((a,p)=>a+(parseInt(p.cantidad)||0),0);
  return (
    <div className="hover-lift" onClick={()=>onView(order)}
      style={{ background:"white", border:"1.5px solid #E5E3F0", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", transition:"all .15s", marginBottom:8 }}>
      <div style={{ minWidth:88 }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:12, color:"#2D2B55" }}>{order.folio}</div>
        <div style={{ fontSize:10, color:"#9CA3AF", marginTop:1 }}>{order.fecha}</div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{order.cliente||"—"}</div>
        <div style={{ fontSize:11, color:"#6B6B8A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{order.empresa}</div>
        <div style={{ display:"flex", gap:4, marginTop:3, flexWrap:"wrap" }}>
          <MaterialBadge status={order.materialStatus} />
          <PaymentBadge anticipo={order.paymentAnticipo} finiquito={order.paymentFiniquito} />
          <ShippingBadge status={order.shipping?.status} />
        </div>
      </div>
      <div style={{ minWidth:50, textAlign:"center" }}>
        <div style={{ fontWeight:800, fontSize:16, color:"#2D2B55" }}>{total}</div>
        <div style={{ fontSize:9, color:"#9CA3AF", textTransform:"uppercase" }}>pzas</div>
      </div>
      {order.fechaEntrega && <div style={{ fontSize:11, color:"#6B6B8A", minWidth:72 }}>📅 {order.fechaEntrega}</div>}
      <div onClick={e=>e.stopPropagation()} style={{ minWidth:155 }}>
        <select value={order.status} onChange={e=>onStatusChange(order.id,e.target.value)}
          style={{ padding:"3px 8px", borderRadius:20, border:`1.5px solid ${STATUS_CONFIG[order.status]?.color||"#ccc"}40`,
            background:STATUS_CONFIG[order.status]?.bg, color:STATUS_CONFIG[order.status]?.color,
            fontWeight:700, fontSize:10, cursor:"pointer", outline:"none" }}>
          {Object.keys(STATUS_CONFIG).map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      <div onClick={e=>e.stopPropagation()} style={{ display:"flex", gap:4 }}>
        <button onClick={()=>onEdit(order)} style={{ background:"#F0EFF9", border:"none", borderRadius:8, padding:"4px 9px", fontSize:12, color:"#2D2B55", fontWeight:700, cursor:"pointer" }}>✏️</button>
        {canDelete && <button className="btn-red" onClick={()=>onDelete(order.id)}>🗑</button>}
      </div>
    </div>
  );
}

export function ImageUpload({ label, image, onChange, onRemove }) {
  const ref = useRef();
  return (
    <div>
      <label className="label">{label}</label>
      {image
        ? <div style={{ position:"relative", display:"inline-block", width:"100%" }}>
            <img src={image.data} alt="" style={{ width:"100%", maxHeight:120, objectFit:"contain", borderRadius:10, border:"1.5px solid #E5E3F0", background:"#fafafa" }} />
            <button onClick={onRemove} style={{ position:"absolute", top:6, right:6, background:"#DC2626", color:"white", border:"none", borderRadius:"50%", width:20, height:20, fontSize:12, fontWeight:700, lineHeight:1, cursor:"pointer" }}>×</button>
          </div>
        : <>
            <input ref={ref} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>onChange(e.target.files[0])} />
            <div onClick={()=>ref.current?.click()}
              style={{ border:"2px dashed #E5E3F0", borderRadius:10, padding:"16px 10px", textAlign:"center", cursor:"pointer", color:"#9CA3AF", fontSize:12, background:"#FAFAFA" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#A78BFA"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#E5E3F0"}>
              <div style={{ fontSize:20, marginBottom:2 }}>📁</div>
              <div style={{ fontWeight:600, fontSize:11 }}>Subir imagen</div>
            </div>
          </>
      }
    </div>
  );
}

export function FileUploadBtn({ label, accept="image/*,.pdf,.ai,.eps,.svg,.cdr,.xml", onFiles, multiple=false }) {
  const ref = useRef();
  return (
    <>
      <input ref={ref} type="file" multiple={multiple} accept={accept} style={{ display:"none" }} onChange={e=>onFiles(e.target.files)} />
      <button className="btn btn-outline" onClick={()=>ref.current?.click()} style={{ fontSize:13, padding:"7px 14px" }}>{label}</button>
    </>
  );
}

export function DocsList({ docs, docTypes, onRemove, onDownload }) {
  if (!docs?.length) return <p style={{ fontSize:12, color:"#9CA3AF" }}>Sin archivos adjuntos</p>;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
      {docs.map((doc,i)=>{
        const t = docTypes?.find(t=>t.value===doc.docType);
        return (
          <div key={i} style={{ background:"#F0EFF9", border:"1.5px solid #E5E3F0", borderRadius:10, padding:"8px 10px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, width:100 }}>
            {doc.type?.startsWith("image")
              ? <img src={doc.data} alt="" style={{ width:52, height:52, objectFit:"contain", borderRadius:6 }} />
              : <div style={{ width:52, height:52, background:"#DDD6FE", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>📄</div>}
            <div style={{ fontSize:9, textAlign:"center", color:"#4C4A8A", fontWeight:600, wordBreak:"break-all", lineHeight:1.2 }}>{t?.label||doc.name}</div>
            <div style={{ display:"flex", gap:3 }}>
              <button onClick={()=>onDownload(doc)} style={{ background:"#2D2B55", color:"white", border:"none", borderRadius:5, padding:"2px 6px", fontSize:9, fontWeight:700, cursor:"pointer" }}>⬇</button>
              {onRemove && <button onClick={()=>onRemove(i)} style={{ background:"#FEE2E2", color:"#DC2626", border:"none", borderRadius:5, padding:"2px 6px", fontSize:9, fontWeight:700, cursor:"pointer" }}>×</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Toast({ msg }) {
  if (!msg) return null;
  return <div style={{ background:"#D1FAE5", border:"1px solid #6EE7B7", color:"#065F46", borderRadius:10, padding:"9px 16px", marginBottom:14, fontWeight:700, fontSize:13 }}>{msg}</div>;
}
