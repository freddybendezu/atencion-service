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
    const res = await fetch(`/api/ventas/${fechaInicio}/${fechaFin}`);
    const ventas = await res.json();
    mostrarVentas(ventas);
  } catch (err) {
    console.error("Error cargando ventas:", err);
  }
}

function mostrarVentas(ventas) {
  const tbody = document.querySelector("#tabla-ventas tbody");
  tbody.innerHTML = "";
  let totalGeneral = 0;

  ventas.forEach(v => {
    const tr = document.createElement("tr");
    const total = v.cantidad * v.precio;
    totalGeneral += total;

    tr.innerHTML = `
      <td>${v.mesaId}</td>
      <td>${v.plato}</td>
      <td>${v.cantidad}</td>
      <td>S/ ${v.precio.toFixed(2)}</td>
      <td>S/ ${total.toFixed(2)}</td>
      <td>${v.pagado ? "Si" : "No"}</td> 
      <td>${v.fecha}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("total-general").textContent = totalGeneral.toFixed(2);
}
