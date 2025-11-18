document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

  document.getElementById("fechaInicio").value = hoy;
  document.getElementById("fechaFin").value = hoy;

  document.getElementById("btn-filtrar").addEventListener("click", filtrar);

  filtrar();
});

async function filtrar() {
  const btn = document.getElementById("btn-filtrar");
  const cont = document.getElementById("pedidos-container");

  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined">sync</span> Cargando...';
  cont.classList.add('loading');
  cont.innerHTML = "";

  try {
    const res = await fetch(`/api/ventas/${fechaInicio.value}/${fechaFin.value}`);
    
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    let agrupado = agruparPedidos(data);
    
    agrupado.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); 

    mostrarPedidos(agrupado);

  } catch (error) {
    console.error("Error al filtrar:", error);
    cont.innerHTML = '<p class="error-msg">❌ Error al cargar los pedidos. Intente de nuevo o revise la consola para más detalles.</p>';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined">filter_list</span> Filtrar';
    cont.classList.remove('loading');
  }
}

function agruparPedidos(data) {
  const grupos = {};

  data.forEach(item => {
    const id = item.codigoPedido;

    if (!grupos[id]) {
      grupos[id] = {
        codigoPedido: id,
        mesaId: item.mesaId,
        pagado: item.pagado ? "pagado" : "pendiente", 
        fecha: item.fecha,
        platos: [],
        total: 0
      };
    }

    const subtotal = item.cantidad * item.precio;

    grupos[id].platos.push({
      plato: item.plato,
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal
    });

    grupos[id].total += subtotal;
  });

  return Object.values(grupos);
}

function mostrarPedidos(pedidos) {
  const cont = document.getElementById("pedidos-container");
  cont.innerHTML = "";

  if (pedidos.length === 0) {
      cont.innerHTML = '<p style="text-align:center; padding: 20px; grid-column: 1 / -1;">No se encontraron pedidos para el rango de fechas seleccionado.</p>';
  }

  let totalGeneral = 0;

  pedidos.forEach(p => {
    totalGeneral += p.total;

    const card = document.createElement("div");
    card.className = "pedido-card";

    card.innerHTML = `
      <div class="pedido-header">
        
        <div class="pedido-info">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div class="pedido-codigo">#${p.codigoPedido}</div>
            <span class="badge ${p.pagado}">
               ${p.pagado.toUpperCase()}
            </span>
          </div>

          <div class="pedido-meta">
            <div class="pedido-meta-item">
              <span class="material-symbols-outlined">table_restaurant</span> 
              <span>Mesa <strong>${p.mesaId}</strong></span>
            </div>
            <div class="pedido-meta-item">
              <span class="material-symbols-outlined">restaurant</span> 
              <span><strong>${p.platos.length}</strong> plato(s)</span>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:flex-end;">
          <div class="pedido-total">S/ ${p.total.toFixed(2)}</div>
          <span class="chevron material-symbols-outlined">chevron_right</span>
        </div>
      </div>

      <div class="pedido-detalle">
        <p style="font-size: 12px; color: var(--muted); margin-bottom: 5px;">Detalles del pedido (${p.fecha}):</p>
        <table>
          <thead>
            <tr>
              <th>Plato</th>
              <th>Cant</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${p.platos.map(pl => `
              <tr>
                <td>${pl.plato}</td>
                <td>${pl.cantidad}</td>
                <td>S/ ${pl.precio.toFixed(2)}</td>
                <td>S/ ${pl.subtotal.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    const detalle = card.querySelector(".pedido-detalle");
    const arrow = card.querySelector(".chevron");

    card.addEventListener("click", (e) => {
      if (e.target.classList.contains('badge')) return; 
      
      if (detalle.classList.contains("open")) {
          // Cierre: Establecer a null para que transicione a max-height: 0
          detalle.style.maxHeight = null; 
          detalle.classList.remove("open");
      } else {
          // Apertura: Calcular la altura real + 30px de padding (15px top + 15px bottom)
          const heightWithPadding = detalle.scrollHeight + 30; 
          detalle.style.maxHeight = heightWithPadding + "px";
          detalle.classList.add("open");
      }

      arrow.classList.toggle("open");
    });

    cont.appendChild(card);
  });

  document.getElementById("total-general").textContent =
  `S/ ${totalGeneral.toFixed(2)}`;
}