/**
 * Módulo heredado RF-1 — No modificar el código interno.
 * Se exportan las funciones para su uso desde el sistema principal.
 * Firma original: verificarRestaurante(nombreRestaurante, alTerminar) con callback de error primero.
 */

function verificarRestaurante(nombreRestaurante, alTerminar) {
  const retardoMs = 1000 + Math.random() * 1000; // entre 1000 y 2000 ms
  const probabilidadDeFallo = 0.2; // 20%

  setTimeout(() => {
    const fallo = Math.random() < probabilidadDeFallo;

    if (fallo) {
      const error = new Error(
        `El restaurante "${nombreRestaurante}" está cerrado o fuera de cobertura.`,
      );
      alTerminar(error);
      return;
    }

    const infoRestaurante = {
      nombre: nombreRestaurante,
      tiempoEstimadoPreparacionMin: Math.floor(10 + Math.random() * 30), // 10-40 min
      abierto: true,
    };

    alTerminar(null, infoRestaurante);
  }, retardoMs);
}

/**
 * Adaptador moderno: convierte el estilo callback heredado en Promise.
 * No altera ni una línea del módulo heredado: solo lo invoca respetando su firma original.
 */

export function verificarRestaurantePromise(nombreRestaurante) {
  return new Promise((resolve, reject) => {
    verificarRestaurante(nombreRestaurante, (error, infoRestaurante) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(infoRestaurante);
    });
  });
}
