document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("mesas-container")) loadMesas();
  if (document.getElementById("tabla-pedidos")) {
      loadPedidos();
      setupPedidoForm();
      setupPagarButton();
  }
  if (document.getElementById("tabla-ventas")) {
      cargarVentas();
      setupFechaVentas();
  }
});

/* ===================== MESAS ===================== */
async function loadMesas() {
  const container = document.getElementById("mesas-container");
  if (!container) return;
  container.innerHTML = `<p class="loading">Cargando mesas...</p>`;

  try {
      const res = await fetch("/api/mesas");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const mesas = await res.json();

      // If API returns an object with data property, tolerate it:
      const list = Array.isArray(mesas) ? mesas : (Array.isArray(mesas.data) ? mesas.data : []);

      container.innerHTML = "";
      if (!list.length) {
        container.innerHTML = `<div style="color:var(--muted);padding:18px">No hay mesas registradas.</div>`;
        return;
      }

      list.forEach(mesa => {
          // tolerate different field names:
          const id = mesa.id ?? mesa.mesaId ?? mesa.number ?? mesa.numero ?? 'N/A';
          const ocupada = !!(mesa.ocupada ?? mesa.occupied ?? mesa.isBusy);
          const total = Number(mesa.total ?? mesa.amount ?? mesa.totalAmount ?? 0) || 0;
          const itemsCount = Number(mesa.itemsCount ?? mesa.count ?? mesa.items ?? 0) || 0;
          
          // Título del estado y clases CSS
          const statusText = ocupada ? "Ocupado" : "Disponible";
          const statusPillClass = ocupada ? "pill-occupied" : "pill-free";
          const cardClass = ocupada ? "mesa-card ocupada" : "mesa-card";


          const card = document.createElement("div");
          card.className = cardClass;
          // open mesa page when clicking the card:
          card.addEventListener('click', () => { window.location.href = `/pedir?mesaId=${encodeURIComponent(id)}`; });

          // Build inner HTML with the new modern design
          card.innerHTML = `
            <div class="mesa-icon-wrapper">
                <span class="material-symbols-outlined">table_restaurant</span>
            </div>
            
            <div class="mesa-meta">
              <div class="mesa-title">Mesa ${id}</div>
              
              <div class="mesa-desc">
                <span class="status-pill ${statusPillClass}">
                    ${statusText}
                </span>
              </div>
            </div>
            
            <div class="mesa-right">
              ${ocupada ? `<div class="mesa-total">S/ ${total.toFixed(2)}</div>` : ''}
              
              <div style="font-size:12px; color:var(--muted); ${ocupada ? '' : 'visibility:hidden;'}">
                ${itemsCount} plato${itemsCount===1 ? '' : 's'}
              </div>
            </div>
          `;
          
          container.appendChild(card);
      });

  } catch (err) {
      console.error("Error cargando mesas:", err);
      container.innerHTML = "<p style='color:var(--red)'>Error al cargar las mesas.</p>";
  }
}