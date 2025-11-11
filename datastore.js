// datastore.js
import { Datastore } from "@google-cloud/datastore";

export const datastore = new Datastore({ 
    namespace: "perumar",
    keyFilename: './softwareintegration-44d242d0deea.json'
  });

/* ========== INICIALIZACIÓN ========== */
export async function initMesas() {
  const [mesas] = await datastore.runQuery(datastore.createQuery("Mesa"));
  if (mesas.length === 0) {
    for (let i = 1; i <= 8; i++) {
      const key = datastore.key(["Mesa"]);
      await datastore.save({ key, data: { id: i, ocupada: false } });
    }
    console.log("Mesas inicializadas");
  }
}

export async function initPlatos() {
  const [platos] = await datastore.runQuery(datastore.createQuery("Plato"));
  if (platos.length === 0) {
    const lista = [
      { nombre: "Ceviche simple", precio: 15, categoria: "Ceviches" },
      { nombre: "Ceviche mixto", precio: 18, categoria: "Ceviches"  },
      { nombre: "Leche de tigre", precio: 9, categoria: "Ceviches"  },
      { nombre: "Leche Peru Mar (Especial)", precio: 15, categoria: "Ceviches"  },
      { nombre: "Chaufa de pescado", precio: 18, categoria: "Arroces"  },
      { nombre: "Chaufa de mariscos", precio: 20, categoria: "Arroces" },
      { nombre: "Arroz con mariscos", precio: 20, categoria: "Arroces" },
      { nombre: "Caldo arrecho", precio: 10, categoria: "Caldos y sudados" },
      { nombre: "Caldo Peru Mar (Especial)", precio: 15, categoria: "Caldos y sudados" },
      { nombre: "Sudado de filete", precio: 20, categoria: "Caldos y sudados" },
      { nombre: "Chicharron de pescado", precio: 20, categoria: "Frituras y jaleas" },
      { nombre: "Chicharron mixto", precio: 25, categoria: "Frituras y jaleas" },
      { nombre: "Jalea mixta", precio: 30, categoria: "Frituras y jaleas" },
      { nombre: "Milanesa de pescado", precio: 15, categoria: "Frituras y jaleas" },
      { nombre: "Tortilla de langostino", precio: 18, categoria: "Frituras y jaleas" },
      { nombre: "Trio marino (ceviche + chicharrón + chaufa)", precio: 30,  categoria: "Duos y trios marinos"  },
      { nombre: "Duo marino", precio: 25,  categoria: "Duos y trios marinos"  },
      { nombre: "Puca con chicharrón", precio: 10,  categoria: "Otros platos"  },
      { nombre: "Cuy chactado", precio: 30,  categoria: "Otros platos"  },
      { nombre: "Trucha frita", precio: 20,  categoria: "Otros platos"  },
      { nombre: "Gaseosa 1L", precio: 7,  categoria: "Gaseosas" },
      { nombre: "Gaseosa 1.5L", precio: 9,  categoria: "Gaseosas" },
      { nombre: "Gaseosa 3L", precio: 14,  categoria: "Gaseosas" },
      { nombre: "Gaseosa gordita", precio: 4,  categoria: "Gaseosas" },
      { nombre: "Gaseosa personal", precio: 2,  categoria: "Gaseosas" },
      { nombre: "Agua mineral", precio: 2,  categoria: "Gaseosas" },
      { nombre: "Chicha Morada", precio: 8,  categoria: "Refrescos" },
      { nombre: "Chicha Maracuya", precio: 8,  categoria: "Refrescos" },
      { nombre: "Limonada", precio: 8,  categoria: "Refrescos" },
      { nombre: "Cerveza trigo", precio: 9,  categoria: "Cervezas" },
      { nombre: "Cerveza pilsen", precio: 8,  categoria: "Cervezas" },
      { nombre: "Cerveza cristal", precio: 8,  categoria: "Cervezas" },
      { nombre: "Cerveza negra", precio: 9,  categoria: "Cervezas" }

    ];
    for (const plato of lista) {
      const key = datastore.key(["Plato"]);
      await datastore.save({ key, data: plato });
    }
    console.log("Platos inicializados");
  }
}

/* ========== MESAS ========== */
export async function getMesas() {
  const query = datastore.createQuery("Mesa").order('id', { descending: false });;
  const [mesas] = await datastore.runQuery(query);
  return mesas;
}

/* ========== PLATOS ========== */
export async function getPlatos() {
  const query = datastore.createQuery("Plato").order('categoria', { descending: false });;
  const [platos] = await datastore.runQuery(query);
  return platos;
}

/* ========== PEDIDOS ========== */
/*
  Pedido entity structure:
  {
    mesaId: Number,
    plato: String,
    cantidad: Number,
    precio: Number,
    pagado: Boolean,
    fecha: "YYYY-MM-DD"
  }
*/

function mapEntitiesWithId(entities) {
  return entities.map(e => {
    const key = e[datastore.KEY];
    const id = key.id || key.name;
    return { id: id.toString(), ...e };
  });
}

export async function getPedidos(mesaId) {
  const q = datastore.createQuery("Pedido").
    filter("mesaId", "=", parseInt(mesaId)).
    filter("pagado", "=", false);
  const [pedidos] = await datastore.runQuery(q);
  return mapEntitiesWithId(pedidos);
}

export async function savePedido(pedido) {
  // If id provided -> update, else create
  let key;
    if (pedido.id) {
    // existing numeric id
    const parsed = isNaN(Number(pedido.id)) ? pedido.id : Number(pedido.id);
    key = datastore.key(["Pedido", parsed]);
  } else {
    key = datastore.key("Pedido"); // auto-id
  }

  // ensure numeric types
  const data = {
    mesaId: parseInt(pedido.mesaId),
    plato: pedido.plato,
    cantidad: parseInt(pedido.cantidad),
    precio: parseFloat(pedido.precio),
    pagado: Boolean(pedido.pagado),
    fecha: pedido.fecha || new Date().toISOString().split("T")[0],
    codigoPedido: pedido.codigoPedido
  };

  await datastore.save({ key, data });
  // return generated key id
  return (key.id || key.name) ?? null;
}

export async function deletePedido(pedidoId) {
  const parsed = isNaN(Number(pedidoId)) ? pedidoId : Number(pedidoId);
  const key = datastore.key(["Pedido", parsed]);
  await datastore.delete(key);
}

export async function pagarMesa(mesaId) {
  const pedidos = await getPedidos(mesaId);
  for (const pedido of pedidos) {
    pedido.pagado = true;
    await savePedido(pedido); // will update because has id
  }
}

/* ========== VENTAS POR FECHA ========== */
export async function ventasDia(fecha) {
  const q = datastore.createQuery("Pedido").filter("fecha", "=", fecha);
  const [pedidos] = await datastore.runQuery(q);
  return mapEntitiesWithId(pedidos);
}

// Guarda un registro
export async function saveEntity(kind, data) {
  const key = datastore.key([kind]);
  await datastore.save({ key, data });
}


// Actualiza un registro existente en Datastore (id puede venir en data)
export async function updateEntity(kind, data) {
  if (!data.id) throw new Error("El campo 'id' es obligatorio");

  // Buscar por el campo id
  const query = datastore.createQuery(kind).filter("id", "=", Number(data.id));
  const [entities] = await datastore.runQuery(query);
  if (!entities.length) throw new Error(`No se encontró un registro con id: ${data.id} en ${kind}`);

  const entity = entities[0];
  const key = entity[datastore.KEY];

  // Forzar tipo numérico en id
  const updatedData = { ...entity, ...data, id: Number(data.id) };

  await datastore.save({ key, data: updatedData });
  return updatedData;
}




// Consulta por rango de fecha
/*
export async function queryByDateRange(kind, fechaInicio, fechaFin) {
  const query = datastore.createQuery(kind)
    .filter("fecha", ">=", fechaInicio)
    .filter("fecha", "<=", fechaFin);
  const [results] = await datastore.runQuery(query);
  return results;
}
*/

export async function queryByDateRange(kind, fechaInicio, fechaFin) {
  const start = `${fechaInicio}T00:00:00`;
  const end = `${fechaFin}T23:59:59`;
  const query = datastore.createQuery(kind)
    .filter("fecha", ">=", start)
    .filter("fecha", "<=", end);

  const [results] = await datastore.runQuery(query);
  return results;
}

// Obtiene todas las entidades
export async function getAll(kind) {
  const query = datastore.createQuery(kind);
  const [results] = await datastore.runQuery(query);
  return results;
}