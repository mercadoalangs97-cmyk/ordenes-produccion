import { downloadFile, exportToPDF, MATERIAL_STATUS, SHIPPING_STATUS, PURCHASE_DOC_TYPES, CLIENT_DOC_TYPES } from "./helpers.js";
import { StatusBadge, MaterialBadge, ShippingBadge, PaymentBadge, Section, Grid, IR, DocsList } from "./ui.jsx";

export default function DetailView({ order, role, onEdit, onBack, onStatusChange }) {
  const total = order.productos?.reduce((a,p)=>a+(parseInt(p.cantidad)||0),0);
  const s     = order.shipping || {};
  const ms    = MATERIAL_STATUS[order.materialStatus] || MATERIAL_STATUS.por_comprar;
  const ss    = SHIPPING_STATUS[s.status]            || SHIPPING_STATUS.pendiente;

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800 }}>{order.folio}</h2>
          <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" }}>
            <StatusBadge status={order.status} />
            <MaterialBadge status={order.materialStatus} />
            <PaymentBadge anticipo={order.paymentAnticipo} finiquito={order.paymentFiniquito} />
            <ShippingBadge status={s.status} />
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-outline" onClick={()=>onEdit(order)}>✏️ Editar</button>
          <button className="btn btn-primary" style={{ background:"#059669" }} onClick={()=>exportToPDF(order)}>📄 Exportar PDF</button>
        </div>
      </div>

      <div style={{ display:"grid", gap:16 }}>

        {/* General */}
        <div style={{ background:"white", border:"1.5px solid #E5E3F0", borderRadius:14, padding:22 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:900, color:"#2D2B55" }}>ORDEN DE PRODUCCIÓN</h1>
              <div style={{ fontFamily:"monospace", fontSize:16, fontWeight:700, color:"#7C3AED", marginTop:2 }}>{order.folio}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, color:"#6B6B8A" }}>Fecha: <b>{order.fecha}</b></div>
              {order.fechaEntrega && <div style={{ fontSize:12, color:"#6B6B8A" }}>Entrega: <b>{order.fechaEntrega}</b></div>}
              {role==="admin" && onStatusChange && (
                <select value={order.status} onChange={e=>onStatusChange(order.id,e.target.value)} style={{ marginTop:6, padding:"3px 8px", borderRadius:8, border:"1px solid #E5E3F0", fontSize:12, cursor:"pointer" }}>
                  {["Pendiente","En Producción","Control de Calidad","Terminado","Listo para Envío","Enviado","Entregado en Sucursal","Entregado","Cancelado"].map(s=><option key={s}>{s}</option>)}
                </select>
              )}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:14, background:"#F8F7F4", borderRadius:10, padding:"12px 16px" }}>
            <IR l="Cliente"     v={order.cliente} />
            <IR l="Empresa"     v={order.empresa} />
            <IR l="Teléfono"    v={order.telefono} />
            <IR l="Email"       v={order.email} />
            <IR l="Responsable" v={order.creadoPor} />
          </div>
        </div>

        {/* Productos */}
        <Section title={`📦 Productos — ${total} pzas`}>
          {order.productos?.map((p,i)=>(
            <div key={p.id||i} style={{ border:"1.5px solid #E5E3F0", borderRadius:10, padding:16, marginBottom:12 }}>
              <div style={{ display:"flex", gap:16 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:125 }}>
                  {p.fotoProducto && <div><div style={{ fontSize:9, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:3 }}>Foto</div><img src={p.fotoProducto.data} alt="" style={{ width:115, height:85, objectFit:"contain", border:"1px solid #eee", borderRadius:8, background:"#fafafa" }} /></div>}
                  {p.mockup && <div><div style={{ fontSize:9, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:3 }}>Mockup</div><img src={p.mockup.data} alt="" style={{ width:115, height:85, objectFit:"contain", border:"1px solid #eee", borderRadius:8, background:"#fafafa" }} /></div>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:10 }}>{p.descripcion||`Producto ${i+1}`}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <IR l="Cantidad"  v={p.cantidad?`${p.cantidad} pzas`:""} />
                    <IR l="Talla"     v={p.talla} />
                    <IR l="Color"     v={p.color} />
                    <IR l="Técnica"   v={p.tecnica} />
                    <IR l="Posición"  v={p.posicion} />
                    <IR l="Colores"   v={p.coloresImpresion} />
                    {p.notas && <div style={{ gridColumn:"span 2" }}><IR l="Notas" v={p.notas} /></div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Section>

        {/* Logos */}
        {order.logos?.length>0 && (
          <Section title="🖼 Archivos de Logo">
            <DocsList docs={order.logos} onDownload={downloadFile} />
          </Section>
        )}

        {/* Materiales */}
        <Section title="🛒 Compra de Materiales">
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <span style={{ fontWeight:600, fontSize:13 }}>Estatus:</span>
            <span style={{ background:ms.bg, color:ms.color, border:`1px solid ${ms.color}40`, borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 }}>{ms.label}</span>
          </div>
          {order.purchaseDocs?.length>0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#6B6B8A", textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>Documentos proveedor</div>
              <DocsList docs={order.purchaseDocs} docTypes={PURCHASE_DOC_TYPES} onDownload={downloadFile} />
            </div>
          )}
        </Section>

        {/* Pagos */}
        <Section title="💰 Pagos del Cliente">
          <Grid cols={2}>
            {[
              { label:"Anticipo",  val:order.paymentAnticipo  },
              { label:"Finiquito", val:order.paymentFiniquito },
            ].map(({ label, val })=>(
              <div key={label} style={{ background:"#F8F7F4", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>💰 {label}</div>
                {val?.paid
                  ? <>
                      <div style={{ color:"#059669", fontWeight:700, fontSize:13 }}>✓ Pagado</div>
                      {val.amount && <div style={{ fontSize:13, fontWeight:600 }}>Monto: ${val.amount}</div>}
                      {val.date   && <div style={{ fontSize:12, color:"#6B7280" }}>Fecha: {val.date}</div>}
                      {val.file   && <button onClick={()=>downloadFile(val.file)} style={{ background:"#2D2B55", color:"white", border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", marginTop:6 }}>⬇ Comprobante</button>}
                    </>
                  : <div style={{ color:"#D97706", fontWeight:600, fontSize:13 }}>⏳ Pendiente</div>
                }
              </div>
            ))}
          </Grid>
        </Section>

        {/* Docs cliente */}
        {order.clientDocs?.length>0 && (
          <Section title="🧾 Documentos del Cliente">
            <DocsList docs={order.clientDocs} docTypes={CLIENT_DOC_TYPES} onDownload={downloadFile} />
          </Section>
        )}

        {/* Envío */}
        <Section title="📦 Envío y Logística">
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <span style={{ fontWeight:600, fontSize:13 }}>Estatus:</span>
            <span style={{ background:ss.bg, color:ss.color, border:`1px solid ${ss.color}40`, borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 }}>{ss.label}</span>
            {s.trackingNumber && <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, background:"#F0EFF9", padding:"3px 10px", borderRadius:8 }}>N° {s.trackingNumber}</span>}
          </div>

          {s.recipientName && (
            <div style={{ background:"#F8F7F4", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#6B6B8A", textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>Destinatario</div>
              <Grid cols={2}>
                <IR l="Nombre"   v={s.recipientName} />
                <IR l="Teléfono" v={s.recipientPhone} />
                <IR l="Dirección" v={s.recipientStreet} />
                <IR l="Ciudad"   v={s.recipientCity?(s.recipientCity+(s.recipientState?", "+s.recipientState:"")):""} />
                <IR l="C.P."     v={s.recipientZip} />
                <IR l="País"     v={s.recipientCountry} />
              </Grid>
            </div>
          )}

          {(s.boxLength||s.boxWeight) && (
            <div style={{ background:"#F8F7F4", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#6B6B8A", textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>Paquete</div>
              <div style={{ fontSize:13, fontWeight:600 }}>
                {s.boxLength && s.boxWidth && s.boxHeight && `${s.boxLength}×${s.boxWidth}×${s.boxHeight} cm`}
                {s.boxWeight && ` · ${s.boxWeight} kg`}
                {s.carrier   && ` · ${s.carrier}`}
              </div>
            </div>
          )}

          {s.guideFile && (
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button onClick={()=>downloadFile(s.guideFile)} style={{ background:"#2D2B55", color:"white", border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>🖨 Imprimir / Descargar Guía</button>
              {s.labelUrl && <a href={s.labelUrl} target="_blank" rel="noreferrer" style={{ fontSize:13, color:"#0891B2", fontWeight:600 }}>Ver en Skydropx ↗</a>}
            </div>
          )}
          {s.labelUrl && !s.guideFile && (
            <a href={s.labelUrl} target="_blank" rel="noreferrer" style={{ display:"inline-block", background:"#2D2B55", color:"white", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:700, textDecoration:"none" }}>🖨 Ver / Imprimir Guía Skydropx ↗</a>
          )}
        </Section>

        {/* Notes */}
        {order.notasGenerales && (
          <div style={{ background:"#FFFBEB", border:"1.5px solid #FCD34D", borderRadius:10, padding:16 }}>
            <div style={{ fontWeight:700, fontSize:12, color:"#92400E", marginBottom:6 }}>📝 NOTAS GENERALES</div>
            <p style={{ fontSize:13, color:"#78350F", lineHeight:1.6 }}>{order.notasGenerales}</p>
          </div>
        )}

        {/* Signatures */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginTop:8, paddingTop:16, borderTop:"1px solid #E5E3F0" }}>
          {["Elaboró","Revisó","Autorizó"].map(l=>(
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ borderTop:"1.5px solid #2D2B55", paddingTop:8, fontSize:11, color:"#6B6B8A", fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
