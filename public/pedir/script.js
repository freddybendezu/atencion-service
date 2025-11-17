const TAX = 0; // 18% para cálculo de IGV
let mesaId = null;
let menu = [];
let pedidos = [];

const menuGrid = document.getElementById('menuGrid');
const orderList = document.getElementById('orderList');
const orderTotalEl = document.getElementById('orderTotal');
const orderSubtotalEl = document.getElementById('orderSubtotal');
const orderTaxEl = document.getElementById('orderTax');
const fabTotalEl = document.getElementById('fabTotal');
const orderPanelContainer = document.getElementById('orderPanelContainer'); // Contenedor del modal
const viewOrderFAB = document.getElementById('viewOrderFAB'); // FAB
const closeOrderPanelBtn = document.getElementById('closeOrderPanel'); // Botón de cierre

let nroPedido = document.getElementById('nro-pedido');

function formatPrice(v){ return 'S/ ' + Number(v).toFixed(2); }

function readMesaId(){
  const params = new URLSearchParams(location.search);
  mesaId = params.get('mesaId') || null;
  document.getElementById('imgMesa').textContent = mesaId || '-';
}

async function loadPlatos(){
  try{
    const res = await fetch('/api/platos');
    if(!res.ok) throw new Error('Error cargando platos');
    menu = await res.json();
  }catch(e){
    console.error(e);
    menu = [];
  }
  renderMenu(menu);
}

function groupByCategory(items){
  const grouped = {};
  items.forEach(it=>{
    const cat = it.categoria || 'Sin categoría';
    if(!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  });
  return grouped;
}

function renderMenu(items){
  menuGrid.innerHTML = '';
  const grouped = groupByCategory(items);

  Object.entries(grouped).forEach(([cat, platos])=>{
    const catHeader = document.createElement('h3');
    catHeader.textContent = cat;
    catHeader.className = 'category-title';
    menuGrid.appendChild(catHeader);

    platos.forEach(it =>{
      const card = document.createElement('div');
      card.className='card';
      // Ajuste en el thumb para usar el CSS con ícono unicode
      card.innerHTML = `
        <div class="thumb"></div> 
        <div class="meta">
          <div class="title">${escapeHtml(it.nombre || it.name || '')}</div>
          <div class="desc">${escapeHtml(it.categoria || '')}</div>
        </div>
        <div class="right">
          <div class="price">${formatPrice(it.precio || 0)}</div>
          <button class="btn" data-id="${encodeURIComponent(it.id || it.nombre)}">Agregar</button>
        </div>
      `;
      menuGrid.appendChild(card);
    });
  });

  menuGrid.querySelectorAll('button[data-id]').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = decodeURIComponent(e.currentTarget.dataset.id);
      addToOrderByMenuId(id, 1);
    });
  });
}

async function loadPedidos(){
  if(!mesaId) return;
  try{
    const res = await fetch(`/api/pedidos/${mesaId}`);
    if(!res.ok) throw new Error('Error cargando pedidos');
    pedidos = await res.json();
  }catch(e){
    console.error(e);
    pedidos = [];
  }
   
  renderOrderFromApi(pedidos);
}

async function addToOrderByMenuId(menuId, qty){
  const plat = menu.find(m => String(m.id) === String(menuId) || String(m.nombre) === String(menuId));
  if(!plat){ alert('Plato no encontrado'); return; }
  
  const fechaPeru = new Date().toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace(" ", "T");
  
  const payload = {
    mesaId,
    plato: plat.nombre,
    cantidad: qty,
    precio: Number(plat.precio || 0),
    pagado: false,
    codigoPedido: nroPedido,
    fecha: fechaPeru
  };

  try{
    const res = await fetch('/api/pedido', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('Error agregando pedido');
    await loadPedidos();
  }catch(e){ console.error(e); alert('No se pudo agregar el pedido'); }
}

function renderOrderFromApi(pedidosApi){
  orderList.innerHTML = '';
  let subtotal = 0;
  if(!pedidosApi || pedidosApi.length===0){
    orderList.innerHTML = '<div style="color:var(--muted);padding:8px">No hay platos seleccionados</div>';
  }
  pedidosApi.forEach(p =>{
    const tr = document.createElement('div'); tr.className = 'order-item';
    const subtotalItem = Number(p.cantidad) * Number(p.precio);
    subtotal += subtotalItem;
    tr.innerHTML = `
      <div style="flex:1">
        <div style="font-weight:600">${escapeHtml(p.plato)}</div>
        <div style="font-size:13px;color:var(--muted)">S/ ${Number(p.precio).toFixed(2)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="qty">
          <button data-action="dec" data-id="${p.id}" title="Reducir">-</button>
          <div style="min-width:26px;text-align:center">${p.cantidad}</div>
          <button data-action="inc" data-id="${p.id}" title="Aumentar">+</button>
        </div>
        <div style="width:70px;text-align:right">${formatPrice(subtotalItem)}</div>
      </div>
    `;
    orderList.appendChild(tr);
  });

  orderList.querySelectorAll('button[data-action]').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.currentTarget.dataset.id;
      const act = e.currentTarget.dataset.action;
      const ped = pedidosApi.find(x => String(x.id) === String(id));
      if(!ped) return;
      const nueva = act==='inc' ? Number(ped.cantidad)+1 : Number(ped.cantidad)-1;
      updatePedidoCantidad(ped, nueva);
    });
  });

  const tax = subtotal * TAX;
  const total = subtotal + tax;
  
  // Actualización de los totales en el panel
  orderSubtotalEl.textContent = formatPrice(subtotal);
  orderTaxEl.textContent = formatPrice(tax);
  orderTotalEl.textContent = formatPrice(total);
  
  // Actualización del FAB
  fabTotalEl.textContent = formatPrice(total);
  
  if(pedidosApi[0]?.codigoPedido){
    nroPedido=pedidosApi[0].codigoPedido;
  }else{
    nroPedido=new Date().toISOString().replace(/[-:.TZ]/g, "");
  }

  document.getElementById('nro-pedido').textContent = nroPedido;
  
  const estadoMesa = subtotal > 0 ? true : false;
  actualizarMesa(mesaId, estadoMesa, subtotal);
  
  // preparar tarjeta de imagen
  populateImageCard(pedidosApi, subtotal, tax, total);

}

async function updatePedidoCantidad(pedido, nuevaCantidad){
  if(nuevaCantidad <= 0){
    if(!confirm('¿Deseas eliminar este plato?')) return;
    await deletePedido(pedido.id);
    return;
  }
  try{
    const res = await fetch(`/api/pedido/${pedido.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...pedido,cantidad:nuevaCantidad})
    });
    if(!res.ok) throw new Error('Error actualizando pedido');
    await loadPedidos();
  }catch(e){ console.error(e); alert('No se pudo actualizar'); }
}

async function deletePedido(id){
  try{
    const res = await fetch(`/api/pedido/${id}`, {method:'DELETE'});
    if(!res.ok) throw new Error('Error eliminando pedido');
    await loadPedidos();
  }catch(e){ console.error(e); alert('No se pudo eliminar'); }
}


//actualizar el estado de la mesa y el total de consumo
async function actualizarMesa(id, ocupada, total) {
  const res = await fetch("/api/mesa/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "Mesa",
      data: { id, ocupada, total },
    }),
  });

  const result = await res.json();
  console.log(result);
}


// preparar tarjeta para imagen/whatsapp
function populateImageCard(pedidosApi, subtotal, tax, total){
  const lines = document.getElementById('orderLines'); lines.innerHTML='';
  pedidosApi.forEach(it=>{
    const div = document.createElement('div'); div.className='order-summary-line';
    div.innerHTML = `<div>${it.cantidad} x ${escapeHtml(it.plato)}</div><div>${formatPrice(it.cantidad * it.precio)}</div>`;
    lines.appendChild(div);
  });
  document.getElementById('imgSubtotal').textContent = formatPrice(subtotal);
  document.getElementById('imgTax').textContent = formatPrice(tax);
  document.getElementById('imgTotal').textContent = formatPrice(total);
}



// generar imagen con html2canvas
async function generateImage(){
  if(!pedidos || pedidos.length===0){ alert('El pedido está vacío.'); return; }
  const area = document.getElementById('orderCard');
  const canvas = await html2canvas(area, {scale:2});
  canvas.toBlob(blob=>{
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `pedido_mesa_${mesaId}.png`; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}


// compartir por WhatsApp (texto + intento de compartir imagen si soportado)
async function shareWhats(){
  if(!pedidos || pedidos.length===0){ alert('El pedido está vacío.'); return; }
  let text = `*Perú Mar - Pedido Mesa ${mesaId}*%0A%0A`;
  let subtotal = 0;
  pedidos.forEach(it=>{ text += encodeURIComponent(`- ${it.cantidad} x ${it.plato} - ${formatPrice(it.cantidad * it.precio)}\n`); subtotal += it.cantidad * it.precio; });
  const tax = subtotal * TAX; const total = subtotal + tax;
  text += encodeURIComponent(`\nSubtotal: ${formatPrice(subtotal)}\nIGV (${(TAX * 100).toFixed(0)}%): ${formatPrice(tax)}\n*Total: ${formatPrice(total)}*\n`);

  if(navigator.canShare && navigator.canShare()){
    try{
      const canvas = await html2canvas(document.getElementById('orderCard'), {scale:2});
      const blob = await new Promise(res=>canvas.toBlob(res,'image/png'));
      const file = new File([blob], `pedido_mesa_${mesaId}.png`, {type:'image/png'});
      await navigator.share({files:[file], text: decodeURIComponent(text)});
    }catch(err){
      window.open('https://wa.me/?text=' + text, '_blank');
    }
  }else{
    window.open('https://wa.me/?text=' + text, '_blank');
  }
}


document.getElementById('downloadImg').addEventListener('click', generateImage);
document.getElementById('shareWhats').addEventListener('click', shareWhats);


// Lógica del FAB: Usa toggle para abrir y cerrar el modal
viewOrderFAB.addEventListener('click', ()=>{
  orderPanelContainer.classList.toggle('is-open');
});

// Lógica para cerrar con el nuevo botón '✕'
closeOrderPanelBtn.addEventListener('click', () => {
    orderPanelContainer.classList.remove('is-open');
});

// Lógica para cerrar si se hace clic en el fondo oscuro del modal (opcional, pero útil)
orderPanelContainer.addEventListener('click', (e) => {
    // Si se hace clic en el contenedor (el fondo)
    if (e.target.id === 'orderPanelContainer') {
        orderPanelContainer.classList.remove('is-open');
    }
});


document.getElementById('searchInput').addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();
  renderMenu(menu.filter(m=>
    (m.nombre||'').toLowerCase().includes(q) ||
    (m.categoria||'').toLowerCase().includes(q)
  ));
});
document.getElementById('clearSearch').addEventListener('click', ()=>{
  document.getElementById('searchInput').value='';
  renderMenu(menu);
});

document.getElementById('marcarPagado').addEventListener('click', async ()=>{
  if(!mesaId) return alert('Mesa no definida');
  if(!confirm('¿Marcar todos los pedidos como pagados y limpiar la mesa?')) return;
  await fetch(`/api/pagar/${mesaId}`, {method:'POST'});
  await loadPedidos();
});

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

(async function init(){ readMesaId(); await loadPlatos(); await loadPedidos(); })();