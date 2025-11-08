
// --- configuración ---
const TAX = 0;
let mesaId = null;
let menu = [];
// ped = pedidos cargados desde /api/pedidos/{mesaId}
let pedidos = [];

const menuGrid = document.getElementById('menuGrid');
const orderList = document.getElementById('orderList');
const orderTotalEl = document.getElementById('orderTotal');

function formatPrice(v){return 'S/ ' + Number(v).toFixed(2)}

// obtener mesaId de la URL
function readMesaId(){
  const params = new URLSearchParams(location.search);
  mesaId = params.get('mesaId') || null;
  document.getElementById('numero-mesa').textContent = mesaId || '-';
  document.getElementById('imgMesa').textContent = mesaId || '-';
}

// CARGAR PLATOS (usa /api/platos)
async function loadPlatos(){
  try{
    const res = await fetch('/api/platos');
    if(!res.ok) throw new Error('Error cargando platos');
    menu = await res.json();
  }catch(e){
    console.error(e);
    // fallback: array vacío
    menu = [];
  }
  renderMenu(menu);
}

// CARGAR PEDIDOS DE LA MESA (usa /api/pedidos/{mesaId})
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

// RENDER MENU estilo DISEÑO 1 (cards)
function renderMenu(items){
  menuGrid.innerHTML = '';
  items.forEach(it =>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="thumb">Foto</div>
      <div class="meta">
        <div class="title">${escapeHtml(it.nombre || it.name || '')}</div>
        <div class="desc">${escapeHtml(it.descripcion || it.desc || it.categoria || '')}</div>
      </div>
      <div class="right">
        <div class="price">${formatPrice(Number(it.precio || it.price || 0))}</div>
        <div>
          <button class="btn" data-id="${encodeURIComponent(it.id || it._id || it.nombre)}">Agregar</button>
        </div>
      </div>
    `;
    menuGrid.appendChild(card);
  });

  // attach events
  menuGrid.querySelectorAll('button[data-id]').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = decodeURIComponent(e.currentTarget.dataset.id);
      addToOrderByMenuId(id, 1);
    });
  });
}

// agrega al pedido usando la API /api/pedido
async function addToOrderByMenuId(menuId, qty){
  // encontrar información del plato en 'menu' (por id o nombre)
  const plat = menu.find(m => String(m.id) === String(menuId) || String(m._id) === String(menuId) || String(m.nombre) === String(menuId));
  if(!plat){ alert('Plato no encontrado'); return; }
  const payload = {
    mesaId,
    plato: plat.nombre || plat.name,
    cantidad: qty,
    precio: Number(plat.precio || plat.price || 0),
    pagado: false,
    fecha: new Date().toISOString().split('T')[0]
    //fecha: new Date().toISOString()
  };

  try{
    const res = await fetch('/api/pedido', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('Error agregando pedido');
    await loadPedidos();
  }catch(e){
    console.error(e); alert('No se pudo agregar el pedido');
  }
}

// renderizar pedidos obtenidos desde API
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
          <button data-action="dec" data-id="${p.id || p._id}" title="Reducir">-</button>
          <div style="min-width:26px;text-align:center">${p.cantidad}</div>
          <button data-action="inc" data-id="${p.id || p._id}" title="Aumentar">+</button>
        </div>
        <div style="width:70px;text-align:right">${formatPrice(subtotalItem)}</div>
      </div>
    `;
    orderList.appendChild(tr);
  });

  // attach qty events
  orderList.querySelectorAll('button[data-action]').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.currentTarget.dataset.id; const act = e.currentTarget.dataset.action;
      const ped = pedidosApi.find(x => String(x.id) === String(id) || String(x._id) === String(id));
      if(!ped) return;
      const nueva = act==='inc' ? Number(ped.cantidad) + 1 : Number(ped.cantidad) - 1;
      updatePedidoCantidad(ped, nueva);
    });
  });

  const tax = subtotal * TAX;
  const total = subtotal + tax;
  orderTotalEl.textContent = formatPrice(total);

  // estado mesa
  const estado = subtotal > 0 ? 'Ocupada' : 'Libre';
  document.getElementById('estado-mesa').textContent = `Estado: ${estado}`;

  // preparar tarjeta de imagen
  populateImageCard(pedidosApi, subtotal, tax, total);
}

// actualizar cantidad: PUT /api/pedido/{id}
async function updatePedidoCantidad(pedido, nuevaCantidad){
  if(nuevaCantidad <= 0){
    if(!confirm('¿Deseas eliminar este plato?')) return;
    await deletePedido(pedido.id || pedido._id);
    return;
  }
  try{
    const body = {...pedido, cantidad: nuevaCantidad};
    const id = pedido.id || pedido._id;
    const res = await fetch(`/api/pedido/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error('Error actualizando pedido');
    await loadPedidos();
  }catch(e){
    console.error(e); alert('No se pudo actualizar la cantidad');
  }
}

// borrar pedido: DELETE /api/pedido/{id}
async function deletePedido(id){
  try{
    const res = await fetch(`/api/pedido/${id}`, { method: 'DELETE' });
    if(!res.ok) throw new Error('Error borrando pedido');
    await loadPedidos();
  }catch(e){
    console.error(e); alert('No se pudo eliminar el pedido');
  }
}

// marcar pagado: POST /api/pagar/{mesaId}
async function marcarPagado(){
  if(!mesaId) return alert('Mesa no definida');
  if(!confirm('¿Marcar todos los pedidos de la mesa como pagados?')) return;
  try{
    const res = await fetch(`/api/pagar/${mesaId}`, { method: 'POST' });
    if(!res.ok) throw new Error('Error marcando pagado');
    await loadPedidos();
  }catch(e){
    console.error(e); alert('No se pudo marcar como pagado');
  }
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
  let text = `Pedido - Mesa ${mesaId}%0A`;
  let subtotal = 0;
  pedidos.forEach(it=>{ text += encodeURIComponent(`${it.cantidad} x ${it.plato} - S/ ${ (it.cantidad * it.precio).toFixed(2)}\n`); subtotal += it.cantidad * it.precio; });
  const tax = subtotal * TAX; const total = subtotal + tax;
  text += encodeURIComponent(`\nSubtotal: S/ ${subtotal.toFixed(2)}\nIGV (18%): S/ ${tax.toFixed(2)}\nTotal: S/ ${total.toFixed(2)}\n`);

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

// BUSCAR
document.getElementById('searchInput').addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();
  renderMenu(menu.filter(m=> (m.nombre||m.name||'').toString().toLowerCase().includes(q) || (m.descripcion||m.desc||'').toString().toLowerCase().includes(q)));
});
document.getElementById('clearSearch').addEventListener('click', ()=>{ document.getElementById('searchInput').value=''; renderMenu(menu); });

// botones
document.getElementById('downloadImg').addEventListener('click', generateImage);
document.getElementById('shareWhats').addEventListener('click', shareWhats);
document.getElementById('viewOrderBtn').addEventListener('click', ()=>{ document.querySelector('.order-panel').scrollIntoView({behavior:'smooth'}); });
document.getElementById('marcarPagado').addEventListener('click', marcarPagado);

// util
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

// INIT
(async function init(){ readMesaId(); await loadPlatos(); await loadPedidos(); })();
