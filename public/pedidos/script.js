document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

  document.getElementById("fechaInicio").value = hoy;
  document.getElementById("fechaFin").value = hoy;

  document.getElementById("btn-filtrar").addEventListener("click", filtrar);

  filtrar();
});

async function filtrar() {
  const res = await fetch(`/api/ventas/${fechaInicio.value}/${fechaFin.value}`);
  const data = await res.json();
  const agrupado = agruparPedidos(data);
  mostrarPedidos(agrupado);
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

  let totalGeneral = 0;

  pedidos.forEach(p => {
    totalGeneral += p.total;

    const card = document.createElement("div");
    card.className = "pedido-card";

    card.innerHTML = `
      <div class="pedido-header">
        
        <div class="pedido-info">
          <div class="pedido-codigo">Pedido #${p.codigoPedido}</div>

          <div class="pedido-mesa">
            Mesa ${p.mesaId} • ${p.platos.length} plato(s) • ${p.fecha}
          </div>

          <span class="badge ${p.pagado}">
             ${p.pagado.toUpperCase()}
          </span>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <div class="pedido-total">S/ ${p.total.toFixed(2)}</div>
          <div class="chevron">▶</div>
        </div>
      </div>

      <div class="pedido-detalle">
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

    card.addEventListener("click", () => {
      detalle.classList.toggle("open");
      arrow.classList.toggle("open");
    });

    cont.appendChild(card);
  });

  document.getElementById("total-general").textContent =
  `S/ ${totalGeneral.toFixed(2)}`;
}
