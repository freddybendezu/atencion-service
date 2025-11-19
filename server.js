// server.js
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import * as ds from "./datastore.js";





const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

/* Inicializar datos si es necesario */
ds.initMesas();
ds.initPlatos();



ds.initMozos(); // <--- AÑADIR ESTO



/* ========== RUTAS API ========== */
app.get("/api/mesas", async (req, res) => {
  const mesas = await ds.getMesas();
  res.json(mesas);
});

app.get("/api/platos", async (req, res) => {
  const platos = await ds.getPlatos();
  res.json(platos);
});

app.get("/api/pedidos/:mesaId", async (req, res) => {
  const pedidos = await ds.getPedidos(req.params.mesaId);
  res.json(pedidos);
});

// crear pedido
app.post("/api/pedido", async (req, res) => {
  try {
    // If same plato exists for same mesa and not pagado -> increment quantity
    const body = req.body;
    if (!body.mesaId || !body.plato) return res.status(400).json({ error: "mesaId y plato requeridos" });

    // buscar pedidos iguales (mismo mesa y plato y no pagado) para sumar cantidad
    const existentes = await ds.getPedidos(body.mesaId);
    const igual = existentes.find(p => p.plato === body.plato && !p.pagado);
    if (igual) {
      // sumar cantidad
      igual.cantidad = Number(igual.cantidad) + Number(body.cantidad || 1);
      await ds.savePedido(igual);
      return res.json({ updated: true, id: igual.id });
    } else {
      const id = await ds.savePedido(body);
      return res.json({ created: true, id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error guardando pedido" });
  }
});

// actualizar pedido (cantidad / pagado)
app.put("/api/pedido/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;
    // read current (we can just overwrite using savePedido)
    const pedido = { id, ...body };
    await ds.savePedido(pedido);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error actualizando pedido" });
  }
});

// borrar pedido
app.delete("/api/pedido/:id", async (req, res) => {
  try {
    await ds.deletePedido(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error eliminando pedido" });
  }
});

app.post("/api/pagar/:mesaId", async (req, res) => {
  try {
    await ds.pagarMesa(req.params.mesaId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error marcando pagado" });
  }
});

app.get("/api/ventas/:fecha", async (req, res) => {
  const ventas = await ds.ventasDia(req.params.fecha);
  res.json(ventas);
});


// Ruta para actualizar una entidad
app.post("/api/mesa/update", async (req, res) => {
  try {
    const { kind, data } = req.body;

    // Validación básica
    if (!kind || !data || !data.id) {
      return res.status(400).json({ error: "Faltan parámetros: kind o data.id" });
    }

    const updated = await ds.updateEntity(kind, data);
    res.json({ message: "Registro actualizado correctamente", updated });
  } catch (err) {
    console.error("Error al actualizar:", err);
    res.status(500).json({ error: err.message });
  }
});




// Obtener ventas del rango de fechas
app.get("/api/ventas/:inicio/:fin", async (req, res) => {
  try {
    const { inicio, fin } = req.params;
    const ventas = await ds.queryByDateRange("Pedido", inicio, fin);
    res.json(ventas);
  } catch (err) {
    console.error("Error obteniendo ventas:", err);
    res.status(500).json({ error: "Error en servidor" });
  }
});

// Obtener todas las ventas (sin filtro)
app.get("/api/ventas", async (req, res) => {
  try {
    const ventas = await ds.getAll("Pedido");
    res.json(ventas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});











/* ========== RUTAS API para MOZOS ========== */
app.get("/api/mozos", async (req, res) => {
  const mozos = await ds.getMozos();
  res.json(mozos);
});

// crear/actualizar mozo (saveMozo maneja ambos)
app.post("/api/mozo", async (req, res) => {
  try {
    const id = await ds.saveMozo(req.body);
    return res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error guardando mozo" });
  }
});

// borrar mozo
app.delete("/api/mozo/:id", async (req, res) => {
  try {
    await ds.deleteMozo(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error eliminando mozo" });
  }
});










/* ========== SERVIR PÁGINAS ========== */
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/mesa", (req, res) => res.sendFile(path.join(__dirname, "public/mesa/index.html")));
app.get("/ventas", (req, res) => res.sendFile(path.join(__dirname, "public/ventas/index.html")));
app.get("/mozos", (req, res) => res.sendFile(path.join(__dirname, "public/mozos/index.html"))); // <--- AÑADIR ESTO

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
