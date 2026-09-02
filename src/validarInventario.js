/**
Integrante 2: Verificación de disponibilidad de productos
*/

const tiempoAzar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export function consultarInventarioProducto(nombreProducto, cantidad) {
  return new Promise((resolve, reject) => {
    const tiempo = tiempoAzar(500, 1500);
    setTimeout(() => {
      if (Math.random() < 0.15) {
        reject({
          etapa: "2. Validar Inventario",
          motivo: `El producto '${nombreProducto}' está agotado.`,
          detalle: { producto: nombreProducto, cantidad }
        });
      } else {
        resolve({ producto: nombreProducto, disponible: true });
      }
    }, tiempo);
  });
}