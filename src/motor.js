/**
 * ARCHIVO 6: MOTOR PRINCIPAL Y PRUEBAS (ES Modules)
 * Integrante 6: Orquestación con async/await, Promise.all y ejecuciones
 */

import { adaptarRestauranteAntiguo } from './restaurante.js';
import { consultarInventarioProducto } from './inventario.js';
import { cobrarConBanco, cancelarCobroBanco } from './banco.js';
import { buscarRepartidor } from './repartidor.js';
import { notificarPorCorreo, notificarPorSMS, notificarPorPush } from './avisos.js';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function procesarPedido(pedido) {
  const tiempoInicio = Date.now();
  console.log(`\n==================================================`);
  console.log(`📦 PROCESANDO PEDIDO #${pedido.id} - Cliente: ${pedido.cliente.nombre}`);
  console.log(`==================================================`);

  let datosPago = null;

  try {
    // 1. Restaurante (Adaptador Promesa)
    console.log(`[Paso 1] Verificando restaurante '${pedido.restaurante}'...`);
    const restauranteInfo = await adaptarRestauranteAntiguo(pedido.restaurante);
    console.log(` ✅ Restaurante disponible: ${restauranteInfo.nombre}`);

    // 2. Inventario (Concurrencia con Promise.all)
    console.log(`[Paso 2] Consultando inventario de ${pedido.productos.length} productos...`);
    const consultas = pedido.productos.map(p => consultarInventarioProducto(p.nombre, p.cantidad));
    await Promise.all(consultas);
    console.log(` ✅ Todos los productos están disponibles.`);

    // 3. Cobro Bancario
    console.log(`[Paso 3] Realizando cobro de $${pedido.montoTotal}...`);
    datosPago = await cobrarConBanco(pedido.montoTotal, pedido.cliente);
    console.log(` ✅ Cobro aprobado. Código: ${datosPago.codigoTransaccion}`);

    // 4. Repartidor (con reverso de pago si falla)
    console.log(`[Paso 4] Buscando repartidor en el barrio '${pedido.barrio}'...`);
    let repartidor;
    try {
      repartidor = await buscarRepartidor(pedido.barrio);
    } catch (errorRepartidor) {
      console.log(` ⚠️ No se encontró repartidor. Devolviendo dinero al cliente...`);
      await cancelarCobroBanco(datosPago.codigoTransaccion);
      throw errorRepartidor;
    }
    console.log(` ✅ Repartidor asignado: ${repartidor.nombreRepartidor}`);

    // 5. Notificaciones (Resiliencia con Promise.allSettled)
    console.log(`[Paso 5] Enviando notificaciones al cliente...`);
    const avisos = [
      notificarPorCorreo(pedido.cliente.correo),
      notificarPorSMS(pedido.cliente.telefono),
      notificarPorPush(pedido.cliente.tokenApp)
    ];

    const resultados = await Promise.allSettled(avisos);
    const reporteCanales = resultados.map((res) => {
      if (res.status === 'fulfilled') {
        return { canal: res.value.canal, estado: "ENVIADO" };
      } else {
        return { canal: res.reason.canal, estado: "FALLÓ", problema: res.reason.motivo };
      }
    });

    const alMenosUno = resultados.some(res => res.status === 'fulfilled');
    if (!alMenosUno) {
      throw {
        etapa: "5. Notificar al Cliente",
        motivo: "Fallaron todos los medios de notificación.",
        detalle: { cliente: pedido.cliente.nombre }
      };
    }

    // ÉXITO
    console.log(`\n🎉 ¡PEDIDO #${pedido.id} COMPLETADO CON ÉXITO!`);
    console.log(`⏱️ Tiempo transcurrido: ${Date.now() - tiempoInicio} ms`);
    console.log(`📢 Reporte de notificaciones:`, reporteCanales);

  } catch (error) {
    // ERROR GLOBAL
    console.error(`\n❌ [EL PEDIDO #${pedido.id} NO PUDO COMPLETARSE]`);
    if (error.etapa) {
      console.error(`📍 Etapa: ${error.etapa}`);
      console.error(`💬 Motivo: ${error.motivo}`);
      console.error(`🔍 Detalle:`, error.detalle);
    } else {
      console.error(`💥 Error imprevisto:`, error);
    }
    console.log(`⏱️ Tiempo hasta la cancelación: ${Date.now() - tiempoInicio} ms`);
  }
}

// DATOS DE PRUEBA (5 Pedidos)
const pedidosDePrueba = [
  {
    id: 1,
    cliente: { nombre: "Daniel Duque", correo: "daniel@email.com", telefono: "3001234567", tokenApp: "token1" },
    restaurante: "Pizzería Italia",
    barrio: "El Poblado",
    montoTotal: 45000,
    productos: [{ nombre: "Pizza Pepperoni", cantidad: 1 }, { nombre: "Gaseosa 1.5L", cantidad: 1 }]
  },
  {
    id: 2,
    cliente: { nombre: "Jerónimo Pulgarín", correo: "jero@email.com", telefono: "3119876543", tokenApp: "token2" },
    restaurante: "Hamburguesas El Corral",
    barrio: "Laureles",
    montoTotal: 62000,
    productos: [{ nombre: "Hamburguesa Doble", cantidad: 2 }, { nombre: "Papas Fritas", cantidad: 2 }]
  },
  {
    id: 3,
    cliente: { nombre: "Samuel Morales", correo: "samuel.m@email.com", telefono: "3205551234", tokenApp: "token3" },
    restaurante: "Sushi Market",
    barrio: "Envigado",
    montoTotal: 89000,
    productos: [{ nombre: "Roll Filadelfia", cantidad: 2 }]
  },
  {
    id: 4,
    cliente: { nombre: "Samuel Estrada", correo: "samuel.e@email.com", telefono: "3154449988", tokenApp: "token4" },
    restaurante: "Tacos El Pastor",
    barrio: "Bello",
    montoTotal: 35000,
    productos: [{ nombre: "Tacos al Pastor", cantidad: 3 }]
  },
  {
    id: 5,
    cliente: { nombre: "Saúl Ramírez", correo: "saul@email.com", telefono: "3017773322", tokenApp: "token5" },
    restaurante: "Asados Doña Rosa",
    barrio: "Sabaneta",
    montoTotal: 120000,
    productos: [{ nombre: "Bandeja Paisa", cantidad: 2 }]
  }
];

async function iniciarSimulacion() {
  for (const pedido of pedidosDePrueba) {
    await procesarPedido(pedido);
    await esperar(1000);
  }
}

iniciarSimulacion();