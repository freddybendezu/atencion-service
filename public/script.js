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
          const subtitle = ocupada ? `${itemsCount} plato${itemsCount===1 ? '' : 's'}` : 'Disponible';

          const card = document.createElement("div");
          card.className = "mesa-card";
          // open mesa page when clicking the card:
          card.addEventListener('click', () => { window.location.href = `/pedidos?mesaId=${encodeURIComponent(id)}`; });

          // Build inner HTML like the platos design
          card.innerHTML = `
            <div class="mesa-thumb">Mesa</div>
            <div class="mesa-meta">
              <div class="mesa-title">Mesa ${id}</div>
              <div class="mesa-desc">${subtitle}</div>
            </div>
            <div class="mesa-right">
              <div class="mesa-total">S/ ${total.toFixed(2)}</div>
      
            </div>
          `;

        

          container.appendChild(card);
      });

  } catch (err) {
      console.error("Error cargando mesas:", err);
      container.innerHTML = "<p style='color:var(--red)'>Error al cargar las mesas.</p>";
  }
}
