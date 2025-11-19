// Función para agrupar los datos de la API y calcular métricas clave
function agruparPedidos(data) {
    const grupos = {};
    const ventasPorFecha = {}; 
  
    data.forEach(item => {
      const id = item.codigoPedido;
  
      if (!grupos[id]) {
        // Creamos el pedido si no existe
        grupos[id] = {
          codigoPedido: id,
          mesaId: item.mesaId,
          pagado: item.pagado, 
          fecha: item.fecha.split('T')[0], // Usar solo la fecha (YYYY-MM-DD)
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
      
      // Sumamos el subtotal a las ventas diarias de la fecha del pedido, solo si está pagado
      if (item.pagado) {
          const fecha = grupos[id].fecha;
          ventasPorFecha[fecha] = (ventasPorFecha[fecha] || 0) + subtotal;
      }
    });
  
    return { 
        pedidos: Object.values(grupos), 
        ventasDiarias: ventasPorFecha 
    };
  }
  
  
  document.addEventListener("DOMContentLoaded", () => {
    // Inicialización de fechas al día actual
    const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
    document.getElementById("fechaInicio").value = hoy;
    document.getElementById("fechaFin").value = hoy;
  
    document.getElementById("btn-filtrar").addEventListener("click", cargarDashboard);
    
    cargarDashboard();
  });
  
  let ventasDiariasChartInstance = null;
  let platosVendidosChartInstance = null;
  
  async function cargarDashboard() {
    const btn = document.getElementById("btn-filtrar");
    const loadingMsg = document.getElementById("loading-msg");
  
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">sync</span> Cargando...';
    loadingMsg.textContent = "Cargando datos...";
  
    try {
      const fechaInicio = document.getElementById("fechaInicio").value;
      const fechaFin = document.getElementById("fechaFin").value;
      
      // Ruta API de ejemplo: debe coincidir con la de tu servidor
      const res = await fetch(`/api/ventas/${fechaInicio}/${fechaFin}`);
      
      if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
      }
  
      const data = await res.json();
      const { pedidos, ventasDiarias } = agruparPedidos(data);
      
      calcularYMostrarKPIs(pedidos);
      mostrarVentasDiarias(ventasDiarias);
      mostrarPlatosVendidos(data);
  
      loadingMsg.textContent = "";
  
    } catch (error) {
      console.error("Error al cargar el Dashboard:", error);
      loadingMsg.innerHTML = "❌ Error al cargar los datos. Intente de nuevo o revise la consola para más detalles.";
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">refresh</span> Actualizar';
    }
  }
  
  function calcularYMostrarKPIs(pedidos) {
      let totalVentas = 0;
      let pagadosCount = 0;
      let pendientesCount = 0;
      
      pedidos.forEach(p => {
          totalVentas += p.total;
          
          if (p.pagado) {
              pagadosCount++;
          } else {
              pendientesCount++;
          }
      });
      
      // Mesa promedio calculada como: Total vendido / Cantidad de pedidos pagados
      const mesaPromedio = pagadosCount > 0 ? totalVentas / pagadosCount : 0;
  
      // Actualizar el DOM
      document.getElementById("totalVentas").textContent = `S/ ${totalVentas.toFixed(2)}`;
      document.getElementById("pedidosPagados").textContent = pagadosCount.toString();
      document.getElementById("pedidosPendientes").textContent = pendientesCount.toString();
      document.getElementById("mesaPromedio").textContent = `S/ ${mesaPromedio.toFixed(2)}`;
  }
  
  function mostrarVentasDiarias(ventasDiarias) {
      // Ordenar por fecha (claves del objeto)
      const fechas = Object.keys(ventasDiarias).sort();
      const ventas = fechas.map(fecha => ventasDiarias[fecha]);
  
      const ctx = document.getElementById('ventasDiariasChart').getContext('2d');
      
      // Destruir la instancia anterior si existe
      if (ventasDiariasChartInstance) {
          ventasDiariasChartInstance.destroy();
      }
  
      ventasDiariasChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
              labels: fechas,
              datasets: [{
                  label: 'Ventas (S/)',
                  data: ventas,
                  borderColor: 'rgb(30, 102, 255)', 
                  backgroundColor: 'rgba(30, 102, 255, 0.2)',
                  tension: 0.1,
                  fill: true
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: true,
              scales: {
                  y: {
                      beginAtZero: true
                  }
              }
          }
      });
  }
  
  
  function mostrarPlatosVendidos(data) {
      const conteoPlatos = {};
      
      data.forEach(item => {
          // Contar la cantidad total vendida por plato (sumando 'cantidad')
          conteoPlatos[item.plato] = (conteoPlatos[item.plato] || 0) + item.cantidad;
      });
  
      const nombresPlatos = Object.keys(conteoPlatos);
      const cantidades = nombresPlatos.map(nombre => conteoPlatos[nombre]);
      
      // Preparamos la data para el gráfico de dona, solo mostrando los Top 8
      const platoData = nombresPlatos.map((nombre, index) => ({
          nombre,
          cantidad: cantidades[index]
      })).sort((a, b) => b.cantidad - a.cantidad);
      
      const topPlatos = platoData.slice(0, 8);
      const labels = topPlatos.map(p => p.nombre);
      const dataCantidad = topPlatos.map(p => p.cantidad);
  
      const ctx = document.getElementById('platosVendidosChart').getContext('2d');
      
      if (platosVendidosChartInstance) {
          platosVendidosChartInstance.destroy();
      }
      
      // Colores para el gráfico de dona
      const backgroundColors = [
          '#1e66ff', '#12b885', '#f7b534', '#e03131', 
          '#6c757d', '#5c7cfa', '#37b24d', '#fcc419'
      ];
  
      platosVendidosChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
              labels: labels,
              datasets: [{
                  label: 'Cant. Vendida',
                  data: dataCantidad,
                  backgroundColor: backgroundColors.slice(0, dataCantidad.length),
                  hoverOffset: 4
              }]
          },
          options: {
              responsive: true,
              plugins: {
                  legend: {
                      position: 'right',
                  },
                  title: {
                      display: false
                  }
              }
          }
      });
  }