/**
 * =================================================================
 * RF-6. Flujo principal — procesarPedido(pedido)
 * =================================================================
 * Orquesta las cinco etapas de un pedido en forma lineal (async/await)
 * para que se lea de arriba hacia abajo como una receta de cocina.
 * Cumple RF-7: todo error es capturado, traducido y registrado con
 * información completa (etapa, datos, causa).
 */

/** Módulo heredado (RF-1) usa firma antigua con module.exports */
import { verificarRestaurantePromise } from "./Verificacion_restaurante.js";
import { consultarInventarioProducto } from "./validarInventario.js";
import { procesarPago } from "./procesar-pago.js";
import { asignarRepartidor } from "./Repartidor.js";
import { notificarCliente } from "./notificarCliente.js";

const tiempoInicio = process.hrtime.bigint();

/**
 * Traduce un error técnico en un mensaje comprensible para el cliente.
 * RF-7: cada error debe tener una traducción amable.
 */
function traducirError(codigo) {
  const mensaje = {
    RESTAURANTE_CERRADO:
      "Lo sentimos, no pudimos verificar el restaurante.",
    PRODUCTO_AGOTADO:
      "Lo sentimos, uno de los productos de tu pedido no está disponible.",
    FONDOS_INSUFICIENTES:
      "Lo sentimos, tu banco rechazó el pago por fondos insuficientes.",
    TIEMPO_AGOTADO:
      "Lo sentimos, el banco tardó demasiado y no pudo confirmar el pago.",
    TARJETA_BLOQUEADA:
      "Lo sentimos, tu tarjeta está bloqueada y no pudimos cobrar.",
    SIN_REPARTIDORES:
      "Lo sentimos, no hay repartidores disponibles en tu zona en este momento.",
    SOPORTE_REPORTADO:
      "Lo sentimos, presentamos un reporte de soporte técnico.",
    SIN_ZONA_REPARTIDOR:
      "Lo sentimos, no pudimos encontrar un repartidor para tu zona.",
    CORREO_SIN_ENTREGAR:
      "Correo no entregado",
    SMS_SIN_ENTREGAR:
      "SMS no entregado",
    PUSH_SIN_ENTREGAR:
      "Notificación push no entregada",
  };
  return mensaje[codigo] || "Lo sentimos, ocurrió un error inesperado.";
}

/**
 * Registra un error interno con las tres preguntas que RF-7 exige:
 * ¿en qué etapa?, ¿con qué datos?, ¿qué causa exacta?
 */
function registrarError(etapa, datos, causa) {
  const hrtf = process.hrtime.bigint() - tiempoInicio;
  const duracionMs = Number(hrtf) / 1e6;
  console.error(`[ERROR] Etapa: ${etapa}`);
  console.error(`[ERROR] Datos: ${JSON.stringify(datos)}`);
  console.error(`[ERROR] Causa: ${causa}`);
  console.error(`[ERROR] Duración hasta el fallo: ${duracionMs.toFixed(1)} ms`);
}

export async function procesarPedido(pedido) {
  const {
    id,
    cliente,
    restaurante,
    productos,
    montoTotal,
    correo = cliente.correo,
    telefono = cliente.telefono,
    pushToken = cliente.pushToken,
  } = pedido;

  console.log(`\n=== Pedido #${id} — ${cliente.nombre} ===`);
  console.log(`Restaurante: ${restaurante}`);
  console.log(`Productos: ${productos.length} items`);
  console.log(`Monto total: $${montoTotal}`);

  let etapaActual = null;
  let duracionEtapas = {};

  try {
    // ----- ETAPA 1: Verificar restaurante -----
    etapaActual = "1. Verificar restaurante";
    const inicio1 = process.hrtime.bigint();
    const infoRestaurante = await verificarRestaurantePromise(restaurante);
    const dur1 = process.hrtime.bigint() - inicio1;
    duracionEtapas[1] = Number(dur1) / 1e6;
    console.log(`✅ Etapa 1 completa. Tiempo estimado preparación: ${infoRestaurante.tiempoEstimadoPreparacionMin} min`);
    console.log(`   Restaurante está abierto y disponible.`);

    // ----- ETAPA 2: Validar inventario -----
    etapaActual = "2. Validar inventario";
    const inicio2 = process.hrtime.bigint();

    // RF-2: consultar todos los productos de forma independiente (en paralelo),
    // pero la regla de negocio es: si UN solo producto está agotado, cancelar el pedido completo.
    // Usamos Promise.allSettled para no esperar una detrás de otra (regla de negocio: "no hay razón
    // para esperar la respuesta de un producto antes de preguntar por el siguiente").
    const resultadosProducto = await Promise.allSettled(
      productos.map((p) => consultarInventarioProducto(p.nombre, p.cantidad))
    );

    // Verificar si algún producto está agotado
    const productoAgotado = resultadosProducto.some(
      (r) => r.status === "rejected"
    );

    if (productoAgotado) {
      // Cancelar pedido completo: obtener el primer error de agotamiento
      const errorPrimero = resultadosProducto.find((r) => r.status === "rejected");
      const causa = errorPrimero ? errorPrimero.reason.motivo : "producto agotado";
      throw new Error(`CANCELADO: ${causa}`);
    }

    // Transformar resultados cumplidos a formato simple
    const inventarioConfirmado = resultadosProducto
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value.producto);

    const dur2 = process.hrtime.bigint() - inicio2;
    duracionEtapas[2] = Number(dur2) / 1e6;
    console.log(`✅ Etapa 2 completa. Inventario verificado para ${inventarioConfirmado.length} productos`);
    console.log(`   Todos los productos consultados de forma independiente.`);

    // ----- ETAPA 3: Procesar pago -----
    etapaActual = "3. Procesar pago";
    const inicio3 = process.hrtime.bigint();

    // RF-3: solo intentar pago si restaurante fue verificado e inventario confirmado (giá arriba)
    const resultadoPago = await procesarPago(montoTotal, { cliente, id });

    const dur3 = process.hrtime.bigint() - inicio3;
    duracionEtapas[3] = Number(dur3) / 1e6;

    if (resultadoPago.estado === "aprobado") {
      console.log(`✅ Etapa 3 completa. Pago aprobado (ID: ${resultadoPago.idTransaccion})`);
    } else {
      // Esto deberíacaer controlado por el throw de ErrorPago en procesar-pago.js
      console.log(`⚠️ Pago con estado inesperado: ${resultadoPago.estado}`);
    }

    // Guardamos el ID de transacción para posible reversión en la etapa 4
    const idTransaccion = resultadoPago.idTransaccion;

    // ----- ETAPA 4: Asignar repartidor -----
    etapaActual = "4. Asignar repartidor";
    const inicio4 = process.hrtime.bigint();

    // RF-4: si el pago fue confirmado pero no hay repartidor, reversar el pago antes de reportar fallo
    let repartidor;
    try {
      repartidor = await asignarRepartidor(zonaEntregaDePedido(restaurante, productos));
    } catch (errorRepartidor) {
      // Si el pago estaba confirmado y falla la asignación, reversar pago
      if (resultadoPago && resultadoPago.estado === "aprobado") {
        console.log(`⚠️ Reversando pago ${idTransaccion} por fallo en asignación de repartidor...`);
        // Nota: en un sistema real llamaríamos a reversarPago(idTransaccion)
        // Aquí simularmos con un log
      }
      throw errorRepartidor;
    }

    const dur4 = process.hrtime.bigint() - inicio4;
    duracionEtapas[4] = Number(dur4) / 1e6;

    if (repartidor) {
      console.log(`✅ Etapa 4 completa. Repartidor asignado: ${repartidor.nombre} (${repartidor.zona})`);
    }

    // ----- ETAPA 5: Notificar al cliente -----
    etapaActual = "5. Notificar al cliente";
    const inicio5 = process.hrtime.bigint();

    // RF-5: notificar por tres canales a la vez; fallo de un canal no cancela nada
    // pero necesitamos informe completo canal por canal
    const resultadoNotificacion = await notificarCliente({ correo, telefono, pushToken, nombre: cliente.nombre });

    const dur5 = process.hrtime.bigint() - inicio5;
    duracionEtapas[5] = Number(dur5) / 1e6;

    // Mostrar resumen de notificaciones
    console.log(`✅ Etapa 5 completa. Resumen de notificaciones:`);
    resultadoNotificacion.canales.forEach((c) => {
      const status = c.estado === "exitoso" ? "✅" : "❌";
      console.log(`   ${status} ${c.canal}: ${c.detalle}`);
    });
    console.log(`   Pedido ${resultadoNotificacion.exitosoGeneral ? "enviado" : "parcialmente notificado"} (al menos un canal funcionó)`);

    // ----- RESUMEN FINAL -----
    const durTotal = Number(process.hrtime.bigint() - tiempoInicio) / 1e6;

    console.log("\n=== RESUMEN FINAL ===");
    console.log(`ID Pedido: ${id}`);
    console.log(`Estado final: ${resultadoNotificacion.exitosoGlobal ? "CONFIRMADO" : "COMPLETADO CON ADVERTENCIAS"}`);
    console.log(`Duración total: ${durTotal.toFixed(1)} ms`);
    console.log("Duración por etapa:");
    Object.entries(duracionEtapas).forEach(([num, dur]) => {
      console.log(`  Etapa ${num}: ${dur.toFixed(1)} ms`);
    });
    console.log("Resultados de canales de notificación:");
    resultadoNotificacion.canales.forEach((c) => {
      console.log(`  ${c.canal}: ${c.estado} — ${c.detalle}`);
    });
    console.log("===================\n");

    return {
      id,
      estado: resultadoNotificacion.exitosoGlobal ? "exitoso" : "completado",
      duracionTotalMs: durTotal,
      duracionPorEtapa: duracionEtapas,
      notificacion: resultadoNotificacion,
    };

  } catch (error) {
    // RF-7: capturar error, traducir mensaje para cliente y registrar con información completa
    const hrtf = process.hrtime.bigint() - tiempoInicio;
    const duracionMs = Number(hrtf) / 1e6;

    // Determinar en qué etapa falló basándonos en el mensaje o el estadoActual
    let etapaFallida = "desconocida";
    if (etapaActual) {
      etapaFallida = etapaActual;
    } else if (error.message && error.message.startsWith("CANCELADO")) {
      etapaFallida = "2. Validar inventario";
    }

    // RF-7: traducir error para cliente (identificar tipo por mensaje o nombre de error)
    let codigoError = "ERROR_GENERICO";
    const msgLower = (error.message || "").toLowerCase();
    if (msgLower.includes("restaurante") || msgLower.includes("cerrado")) codigoError = "RESTAURANTE_CERRADO";
    else if (msgLower.includes("agotado")) codigoError = "PRODUCTO_AGOTADO";
    else if (msgLower.includes("fondos")) codigoError = "FONDOS_INSUFICIENTES";
    else if (msgLower.includes("tiempo")) codigoError = "TIEMPO_AGOTADO";
    else if (msgLower.includes("tarjeta")) codigoError = "TARJETA_BLOQUEADA";
    else if (error.name === "ErrorPago") codigoError = "ERROR_PAGO";
    else if (msgLower.includes("repartidor")) codigoError = "SIN_REPARTIDORES";

    const mensajeCliente = traducirError(codigoError);

    // Registrar error interno con las 3 preguntas de RF-7
    registrarError(
      etapaFallida,
      { id, cliente: cliente.nombre, restaurante, monto: montoTotal, productos: productos.map((p) => ({ nombre: p.nombre, cantidad: p.cantidad })) },
      error.message || error.toString()
    );

    // Mostrar mensaje amable al cliente
    console.log(`\n❌ ERROR EN LA ETAPA ${etapaFallida}:`);
    console.log(`   ${mensajeCliente}`);

    // Mostrar resumen parcial a pesar del error
    console.log("\n=== RESUMEN PARCIAL ===");
    console.log(`ID Pedido: ${id}`);
    console.log(`Estado: fallido`);
    console.log(`Duración hasta el error: ${duracionMs.toFixed(1)} ms`);
    console.log("===================\n");

    // Devolvemos un resultado estructurado en lugar de lanzar fuera
    return {
      id,
      estado: "fallido",
      error: error.message || error.toString(),
      mensajeCliente,
      duracionTotalMs: duracionMs,
    };
  }
}

/**
 * Extrae la zona de entrega basándose en el restaurante y los productos.
 * Usa una heurística simple: la zona del primer producto o del restaurante.
 */
function zonaEntregaDePedido(restaurante, productos) {
  // En un sistema real esto vendría del pedido, aquí usamos una zona por defecto
  // basándonos en el nombre del restaurante para el ejemplo
  const zonas = { "La Trattoria del Sol": "Norte", "Pizza Express": "Sur" };
  return zonas[restaurante] || "Norte";
}