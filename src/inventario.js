/**
 * ARCHIVO 2: VALIDACIÓN DE INVENTARIO (ES Modules)
 * Integrante 2: Verificación de disponibilidad de productos
 */

const tiempoAzar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export function consultarInventarioProducto(nombreProducto, cantidad) {
  return new Promise((resolver, rechazar) => {
    const tiempo = tiempoAzar(500, 1500);
    setTimeout(() => {
      if (Math.random() < 0.15) {
        rechazar({
          etapa: "2. Validar Inventario",
          motivo: `El producto '${nombreProducto}' está agotado.`,
          detalle: { producto: nombreProducto, cantidad }
        });
      } else {
        resolver({ producto: nombreProducto, disponible: true });
      }
    }, tiempo);
  });
}