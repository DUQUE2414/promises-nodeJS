/**
 * =================================================================
 * 1) MÓDULO HEREDADO — NO MODIFICAR
 * =================================================================
 * Escrito por el equipo anterior. Se implementa aquí exactamente
 * como fue descrito (callback de error primero) y a partir de este
 * punto se trata como caja negra: no se toca su código interno,
 * solo se lo envuelve desde afuera.
 *
 * Firma: verificarRestaurante(nombreRestaurante, alTerminar)
 *   - alTerminar(error)                    -> si algo salió mal
 *   - alTerminar(null, infoRestaurante)     -> si todo salió bien
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
 * =================================================================
 * 2) ADAPTADOR / ENVOLTORIO (código nuevo)
 * =================================================================
 * Convierte el estilo callback-antiguo en una Promise, para que
 * encaje con el resto del sistema (que usa async/await). No altera
 * ni una línea del módulo heredado: solo lo invoca respetando su
 * firma original.
 */

function verificarRestaurantePromise(nombreRestaurante) {
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

/**
 * =================================================================
 * 3) EJEMPLO DE INTEGRACIÓN
 * =================================================================
 * Así consume el resto del sistema (moderno) el módulo heredado,
 * a través del adaptador, sin saber que por debajo hay callbacks.
 */

async function procesarPedido(nombreRestaurante) {
  try {
    const info = await verificarRestaurantePromise(nombreRestaurante);
    console.log(`✅ "${info.nombre}" está disponible.`);
    console.log(
      `Tiempo estimado: ${info.tiempoEstimadoPreparacionMin} min.`,
    ); // Aquí seguirían las siguientes etapas del pedido...
  } catch (error) {
    console.log(`❌ No se pudo verificar el restaurante: ${error.message}`);
  }
}

procesarPedido("La Trattoria del Sol");

module.exports = { verificarRestaurante, verificarRestaurantePromise };
