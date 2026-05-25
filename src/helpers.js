import JSZip from "jszip";

// ─── CONSTANTS ────────────────────────────────────────────────────
export const TECHNIQUES = ["Serigrafía","Bordado","DTF / Vinil","Grabado Láser","Impresión Directa","Otra"];

export const STATUS_CONFIG = {
  "Pendiente":             { color:"#D97706", bg:"#FEF3C7" },
  "En Producción":         { color:"#2563EB", bg:"#DBEAFE" },
  "Control de Calidad":    { color:"#7C3AED", bg:"#EDE9FE" },
  "Terminado":             { color:"#059669", bg:"#D1FAE5" },
  "Listo para Envío":      { color:"#0891B2", bg:"#CFFAFE" },
  "Enviado":               { color:"#0F766E", bg:"#CCFBF1" },
  "Entregado en Sucursal": { color:"#9333EA", bg:"#F3E8FF" },
  "Entregado":             { color:"#6B7280", bg:"#F3F4F6" },
  "Cancelado":             { color:"#DC2626", bg:"#FEE2E2" },
};

export const MATERIAL_STATUS = {
  "por_comprar": { color:"#D97706", bg:"#FEF3C7", label:"Por comprar" },
  "comprado":    { color:"#2563EB", bg:"#DBEAFE", label:"Comprado"    },
  "en_bodega":   { color:"#059669", bg:"#D1FAE5", label:"En bodega"   },
};

export const SHIPPING_STATUS = {
  "pendiente":          { color:"#D97706", bg:"#FEF3C7", label:"Pendiente"       },
  "guia_generada":      { color:"#7C3AED", bg:"#EDE9FE", label:"Guía generada"   },
  "enviado":            { color:"#0F766E", bg:"#CCFBF1", label:"Enviado"         },
  "entregado_sucursal": { color:"#9333EA", bg:"#F3E8FF", label:"En sucursal"     },
  "entregado":          { color:"#059669", bg:"#D1FAE5", label:"Entregado"       },
};

export const PURCHASE_DOC_TYPES = [
  { value:"cotizacion_proveedor",   label:"Cotización proveedor" },
  { value:"orden_compra",           label:"Orden de compra"      },
  { value:"factura_proveedor",      label:"Factura proveedor"    },
  { value:"comprobante_pago_prov",  label:"Comprobante de pago"  },
];

export const CLIENT_DOC_TYPES = [
  { value:"cotizacion_cliente", label:"Cotización al cliente" },
  { value:"factura_cliente",    label:"Factura emitida"       },
  { value:"complemento_pago",   label:"Complemento de pago"   },
  { value:"otro_cliente",       label:"Otro"                  },
];

// ─── DB CONVERTERS ────────────────────────────────────────────────
export function orderToDb(order) {
  return {
    folio:           order.folio,
    fecha:           order.fecha,
    fecha_entrega:   order.fechaEntrega   || null,
    cliente:         order.cliente,
    empresa:         order.empresa,
    telefono:        order.telefono,
    email:           order.email,
    client_dir_id:   order.clientDirId   || null,
    client_dir_name: order.clientDirName || null,
    worker_id:       order.workerId      || null,
    productos:       order.productos,
    logos:           order.logos,
    notas_generales: order.notasGenerales,
    status:          order.status,
    creado_por:      order.creadoPor,
    material_status: order.materialStatus || "por_comprar",
    purchase_docs:   order.purchaseDocs  || [],
    payment_anticipo:  order.paymentAnticipo  || {},
    payment_finiquito: order.paymentFiniquito || {},
    client_docs:     order.clientDocs    || [],
    shipping:        order.shipping      || {},
    supplier_docs:   order.supplierDocs  || [],
  };
}

export function dbToOrder(row) {
  const defAnticipo  = { paid:false, amount:"", date:"", file:null };
  const defFiniquito = { paid:false, amount:"", date:"", file:null };
  const defShipping  = { status:"pendiente", recipientName:"", recipientPhone:"", recipientEmail:"", recipientStreet:"", recipientCity:"", recipientState:"", recipientZip:"", recipientCountry:"MX", boxLength:"", boxWidth:"", boxHeight:"", boxWeight:"", carrier:"", service:"", trackingNumber:"", guideFile:null, skydropxShipmentId:null, labelUrl:null, quotes:[], selectedQuote:null };
  return {
    id:              row.id,
    folio:           row.folio           || "",
    fecha:           row.fecha           || new Date().toISOString().split("T")[0],
    fechaEntrega:    row.fecha_entrega   || "",
    cliente:         row.cliente         || "",
    empresa:         row.empresa         || "",
    telefono:        row.telefono        || "",
    email:           row.email           || "",
    clientDirId:     row.client_dir_id   || null,
    clientDirName:   row.client_dir_name || "",
    workerId:        row.worker_id       || null,
    productos:       row.productos       || [],
    logos:           row.logos           || [],
    notasGenerales:  row.notas_generales || "",
    status:          row.status          || "Pendiente",
    creadoPor:       row.creado_por      || "",
    materialStatus:  row.material_status || "por_comprar",
    purchaseDocs:    row.purchase_docs   || [],
    paymentAnticipo:  row.payment_anticipo  && Object.keys(row.payment_anticipo).length  ? row.payment_anticipo  : defAnticipo,
    paymentFiniquito: row.payment_finiquito && Object.keys(row.payment_finiquito).length ? row.payment_finiquito : defFiniquito,
    clientDocs:      row.client_docs     || [],
    shipping:        row.shipping        && Object.keys(row.shipping).length ? { ...defShipping, ...row.shipping } : defShipping,
    supplierDocs:    row.supplier_docs   || [],
  };
}

export function emptyOrder() {
  return {
    id: "new_" + Date.now(),
    folio:"", fecha: new Date().toISOString().split("T")[0], fechaEntrega:"",
    cliente:"", empresa:"", telefono:"", email:"",
    clientDirId:null, clientDirName:"", workerId:null, creadoPor:"",
    productos:[{ id:Date.now().toString(), descripcion:"", cantidad:"", talla:"", color:"", tecnica:"", posicion:"", coloresImpresion:"", notas:"", fotoProducto:null, mockup:null }],
    logos:[], notasGenerales:"", status:"Pendiente",
    materialStatus:"por_comprar", purchaseDocs:[],
    paymentAnticipo:{ paid:false, amount:"", date:"", file:null },
    paymentFiniquito:{ paid:false, amount:"", date:"", file:null },
    clientDocs:[], supplierDocs:[],
    shipping:{ status:"pendiente", recipientName:"", recipientPhone:"", recipientEmail:"", recipientStreet:"", recipientCity:"", recipientState:"", recipientZip:"", recipientCountry:"MX", boxLength:"", boxWidth:"", boxHeight:"", boxWeight:"", carrier:"", service:"", trackingNumber:"", guideFile:null, skydropxShipmentId:null, labelUrl:null, quotes:[], selectedQuote:null },
  };
}

// ─── FILE UTILITIES ───────────────────────────────────────────────
export function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res({ name:file.name, type:file.type, size:file.size, data:r.result });
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function downloadFile(file) {
  const a = document.createElement("a");
  a.href = file.data;
  a.download = file.name;
  a.click();
}

export async function downloadZip(entries, zipName) {
  const zip = new JSZip();
  for (const { path, file } of entries) {
    if (!file?.data) continue;
    const base64 = file.data.split(",")[1];
    if (base64) zip.file(path, base64, { base64:true });
  }
  const blob = await zip.generateAsync({ type:"blob" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF EXPORT ───────────────────────────────────────────────────
export function exportToPDF(order) {
  const total = order.productos?.reduce((a,p)=>a+(parseInt(p.cantidad)||0),0);
  const sc    = STATUS_CONFIG[order.status] || { color:"#6B7280", bg:"#F3F4F6" };
  const ms    = MATERIAL_STATUS[order.materialStatus] || MATERIAL_STATUS.por_comprar;
  const ss    = SHIPPING_STATUS[order.shipping?.status] || SHIPPING_STATUS.pendiente;

  const imgBlock = (label, img) => img
    ? `<div style="margin-bottom:8px"><div style="font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;margin-bottom:3px">${label}</div><img src="${img.data}" style="width:110px;height:80px;object-fit:contain;border:1px solid #eee;border-radius:6px"/></div>` : "";

  const docList = (docs, types) => docs?.map(d => {
    const t = types?.find(t=>t.value===d.docType);
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px">
      ${d.type?.startsWith("image") ? `<img src="${d.data}" style="width:28px;height:28px;object-fit:contain;border-radius:4px"/>` : `<span style="font-size:16px">📄</span>`}
      <span>${t?.label||d.docType||""} — ${d.name}</span>
    </div>`;
  }).join("") || "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orden ${order.folio}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:white;padding:28px;color:#1A1A2E;font-size:12px}
    @page{size:A4;margin:15mm}@media print{.no-print{display:none!important}}
    h3{font-size:12px;font-weight:700;color:#2D2B55;text-transform:uppercase;letter-spacing:.5px;margin:16px 0 8px}
    .badge{border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;display:inline-block}
    .section{border:1px solid #E5E3F0;border-radius:8px;padding:12px;margin-bottom:12px;page-break-inside:avoid}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .lbl{font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase}
    .val{font-size:12px;font-weight:600;color:#1A1A2E}
  </style></head><body>
  <div class="no-print" style="margin-bottom:16px">
    <button onclick="window.print()" style="background:#2D2B55;color:white;border:none;border-radius:8px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer">🖨 Guardar como PDF</button>
    <span style="font-size:11px;color:#9CA3AF;margin-left:10px">Selecciona "Guardar como PDF" en el diálogo de impresión</span>
  </div>

  <div style="border-bottom:3px solid #2D2B55;padding-bottom:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1 style="font-size:22px;font-weight:900;color:#2D2B55;letter-spacing:-1px">ORDEN DE PRODUCCIÓN</h1>
      <div style="font-family:'DM Mono',monospace;font-size:16px;font-weight:700;color:#7C3AED;margin-top:2px">${order.folio}</div>
    </div>
    <div style="text-align:right">
      <span class="badge" style="background:${sc.bg};color:${sc.color}">${order.status}</span>
      <div style="font-size:11px;color:#6B6B8A;margin-top:6px">Orden: <b>${order.fecha}</b></div>
      ${order.fechaEntrega?`<div style="font-size:11px;color:#6B6B8A">Entrega: <b>${order.fechaEntrega}</b></div>`:""}
    </div>
  </div>

  <div class="section grid2" style="margin-bottom:12px">
    ${[["Cliente",order.cliente],["Empresa",order.empresa],["Teléfono",order.telefono],["Email",order.email],["Responsable",order.creadoPor]].filter(([,v])=>v).map(([l,v])=>`<div><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join("")}
  </div>

  <h3>📦 Productos — ${total} pzas</h3>
  ${(order.productos||[]).map((p,i)=>`
    <div class="section" style="display:flex;gap:14px">
      <div style="min-width:110px">${imgBlock("Foto",p.fotoProducto)}${imgBlock("Mockup",p.mockup)}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px;margin-bottom:8px">${p.descripcion||"Producto "+(i+1)}</div>
        <div class="grid2">
          ${[["Cantidad",p.cantidad?p.cantidad+" pzas":""],["Talla",p.talla],["Color",p.color],["Técnica",p.tecnica],["Posición",p.posicion],["Colores",p.coloresImpresion]].filter(([,v])=>v).map(([l,v])=>`<div><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join("")}
          ${p.notas?`<div style="grid-column:span 2"><div class="lbl">Notas</div><div class="val">${p.notas}</div></div>`:""}
        </div>
      </div>
    </div>`).join("")}

  ${(order.purchaseDocs?.length||order.materialStatus)?`
  <h3>🛒 Materiales</h3>
  <div class="section">
    <span class="badge" style="background:${ms.bg};color:${ms.color};margin-bottom:8px;display:inline-block">${ms.label}</span>
    ${docList(order.purchaseDocs, PURCHASE_DOC_TYPES)}
  </div>`:""}

  ${(order.paymentAnticipo?.paid||order.paymentFiniquito?.paid)?`
  <h3>💰 Pagos</h3>
  <div class="section grid2">
    ${order.paymentAnticipo?.paid?`<div><div class="lbl">Anticipo</div><div class="val" style="color:#059669">✓ Pagado${order.paymentAnticipo.amount?" — $"+order.paymentAnticipo.amount:""}</div><div style="font-size:10px;color:#6B6B8A">${order.paymentAnticipo.date||""}</div></div>`:""}
    ${order.paymentFiniquito?.paid?`<div><div class="lbl">Finiquito</div><div class="val" style="color:#059669">✓ Pagado${order.paymentFiniquito.amount?" — $"+order.paymentFiniquito.amount:""}</div><div style="font-size:10px;color:#6B6B8A">${order.paymentFiniquito.date||""}</div></div>`:""}
  </div>`:""}

  ${order.clientDocs?.length?`
  <h3>🧾 Docs del Cliente</h3>
  <div class="section">${docList(order.clientDocs, CLIENT_DOC_TYPES)}</div>`:""}

  ${order.shipping?.trackingNumber||order.shipping?.carrier?`
  <h3>📦 Envío</h3>
  <div class="section">
    <span class="badge" style="background:${ss.bg};color:${ss.color};margin-bottom:8px;display:inline-block">${ss.label}</span>
    <div class="grid2" style="margin-top:6px">
      ${order.shipping.recipientName?`<div><div class="lbl">Destinatario</div><div class="val">${order.shipping.recipientName}</div></div>`:""}
      ${order.shipping.recipientCity?`<div><div class="lbl">Ciudad</div><div class="val">${order.shipping.recipientCity}, ${order.shipping.recipientState}</div></div>`:""}
      ${order.shipping.carrier?`<div><div class="lbl">Carrier</div><div class="val">${order.shipping.carrier}</div></div>`:""}
      ${order.shipping.trackingNumber?`<div><div class="lbl">N° Guía</div><div class="val" style="font-family:monospace">${order.shipping.trackingNumber}</div></div>`:""}
    </div>
  </div>`:""}

  ${order.notasGenerales?`
  <div style="background:#FFFBEB;border:1.5px solid #FCD34D;border-radius:8px;padding:12px;margin-top:12px">
    <div style="font-weight:700;font-size:11px;color:#92400E;margin-bottom:4px">📝 NOTAS GENERALES</div>
    <p style="font-size:12px;color:#78350F;line-height:1.5">${order.notasGenerales}</p>
  </div>`:""}

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:32px;padding-top:14px;border-top:1px solid #E5E3F0">
    ${["Elaboró","Revisó","Autorizó"].map(l=>`<div style="text-align:center"><div style="border-top:1.5px solid #2D2B55;padding-top:7px;font-size:10px;color:#6B6B8A;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${l}</div></div>`).join("")}
  </div>
  </body></html>`;

  const w = window.open("","_blank","width=900,height=700");
  w.document.write(html);
  w.document.close();
}
