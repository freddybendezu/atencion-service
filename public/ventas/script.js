document.addEventListener("DOMContentLoaded", () => {
  //const hoy = new Date().toISOString().split("T")[0];

  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

  document.getElementById("fechaInicio").value = hoy;
  document.getElementById("fechaFin").value = hoy;
  document.getElementById("btn-filtrar").addEventListener("click", filtrarVentas);

  filtrarVentas(); // carga inicial
});

async function filtrarVentas() {
  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;

  try {
    // Agregamos un indicador de carga
    document.querySelector("#tabla-ventas tbody").innerHTML = `
      <tr><td colspan="7" style="text-align:center; color:var(--muted);">Cargando ventas...</td></tr>
    `;

    const res = await fetch(`/api/ventas/${fechaInicio}/${fechaFin}`);
    const ventas = await res.json();
    mostrarVentas(ventas);
  } catch (err) {
    console.error("Error cargando ventas:", err);
    document.querySelector("#tabla-ventas tbody").innerHTML = `
      <tr><td colspan="7" style="text-align:center; color:var(--red);">Error al cargar los datos.</td></tr>
    `;
  }
}

function mostrarVentas(ventas) {
  const tbody = document.querySelector("#tabla-ventas tbody");
  tbody.innerHTML = "";
  let totalGeneral = 0;

  if (ventas.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; color:var(--muted);">No se encontraron ventas en el rango seleccionado.</td></tr>
      `;
  }

  ventas.forEach(v => {
    const tr = document.createElement("tr");
    const total = v.cantidad * v.precio;
    totalGeneral += total;
    
    const pagadoStatus = v.pagado ? "Si" : "No";
    const pagadoClass = v.pagado ? "si" : "no";

    // ➡️ IMPORTANTE: Añadimos data-label a cada <td>
    tr.innerHTML = `
      <td data-label="Mesa">${v.mesaId}</td>
      <td data-label="Plato">${v.plato}</td>
      <td data-label="Cantidad" style="text-align:right;">${v.cantidad}</td>
      <td data-label="Precio Unitario">S/ ${v.precio.toFixed(2)}</td>
      <td data-label="Total" class="col-total">S/ ${total.toFixed(2)}</td>
      <td data-label="Pagado" class="col-pagado">
        <span class="badge-status ${pagadoClass}">${pagadoStatus}</span>
      </td> 
      <td data-label="Fecha">${v.fecha}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("total-general").textContent = totalGeneral.toFixed(2);
}