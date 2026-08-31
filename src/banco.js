/**
 * ARCHIVO 3: PROCESAMIENTO DE PAGOS Y DEVOLUCIONES (ES Modules)
 * Integrante 3: Transacciones bancarias e inversión de cobros
 */

const tiempoAzar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Cobro principal
export function cobrarConBanco(monto, cliente) {
  return new Promise((resolver, rechazar) => {
    const tiempo = tiempoAzar(1500, 3000);
    setTimeout(() => {
      const azar = Math.random();
      if (azar < 0.10) {
        rechazar({
          etapa: "3. Procesar Pago",
          motivo: "Fondos insuficientes en la cuenta del cliente.",
          detalle: { monto, cliente: cliente.nombre }
        });
      } else if (azar < 0.18) {
        rechazar({
          etapa: "3. Procesar Pago",
          motivo: "Tiempo de espera agotado con el banco.",
          detalle: { monto, cliente: cliente.nombre }
        });
      } else if (azar < 0.25) {
        rechazar({
          etapa: "3. Procesar Pago",
          motivo: "La tarjeta de crédito está bloqueada.",
          detalle: { monto, cliente: cliente.nombre }
        });
      } else {
        resolver({
          codigoTransaccion: `PAGO-${Math.floor(100000 + Math.random() * 900000)}`,
          montoTotal: monto
        });
      }
    }, tiempo);
  });
}

// Cancelación de pago (Compensación)
export function cancelarCobroBanco(codigoTransaccion) {
  return new Promise((resolver) => {
    const tiempo = tiempoAzar(500, 1000);
    setTimeout(() => {
      console.log(` ↩️ [DEVOLUCIÓN] Dinero devuelto para la transacción ${codigoTransaccion}.`);
      resolver({ codigoTransaccion, estado: "DEVUELTO" });
    }, tiempo);
  });
}