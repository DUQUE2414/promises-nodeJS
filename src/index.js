/**
 * Punto de entrada principal para "npm start"
 * Orquesta el flujo completo de un pedido (RF-6) y muestra un resumen.
 */

import { procesarPedido } from "./procesar-pedido.js";

// Pedido de ejemplo para poder correr el sistema inmediatamente
// Puedes modificar los campos de abajo para probar diferentes escenarios
const pedidoEjemplo = {
  id: "PED-001",
  cliente: {
    nombre: "María González",
    correo: "maria.gonzalez@email.com",
    telefono: "555-1234567",
    pushToken: "device-push-token-123",
  },
  restaurante: "La Trattoria del Sol",
  productos: [
    { nombre: "Pizza Margherita", cantidad: 1 },
    { nombre: "Pasta Carbonara", cantidad: 2 },
  ],
  montoTotal: 45.50,
};

/**
 * Ejecuta el procesamiento del pedido y muestra el resultado.
 */
async function main() {
  console.log("=== Iniciando procesamiento de pedido ===\n");
  const resultado = await procesarPedido(pedidoEjemplo);
  console.log("=== Resultado final ===");
  console.log(`ID Pedido: ${resultado.id}`);
  console.log(`Estado: ${resultado.estado}`);
  console.log(`Duración total: ${resultado.duracionTotalMs.toFixed(1)} ms`);
  if (resultado.notificacion) {
    console.log(
      `Notificaciones: ${resultado.notificacion.canales.length} canales (${resultado.notificacion.exitosoGlobal ? "éxito" : "advertencias"})`
    );
  }
}

main().catch((err) => {
  console.error("Error inesperado en la ejecución principal:", err);
  process.exit(1);
});