/**
 * ARCHIVO 1: MÓDULO HEREDADO DE RESTAURANTE Y ADAPTADOR (ES Modules)
 * Integrante 1: Manejo de callbacks y patrón Adapter
 */

const tiempoAzar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Módulo heredado (Caja Negra con Callback antiguo)
function verificarRestaurante(nombreRestaurante, funcionRespuesta) {
  const tiempo = tiempoAzar(1000, 2000);
  setTimeout(() => {
    if (Math.random() < 0.20) {
      funcionRespuesta(`El restaurante '${nombreRestaurante}' está cerrado o fuera de zona.`);
    } else {
      funcionRespuesta(null, { nombre: nombreRestaurante, abierto: true });
    }
  }, tiempo);
}

// Adaptador: Convierte Callback a Promesa
export function adaptarRestauranteAntiguo(nombreRestaurante) {
  return new Promise((resolver, rechazar) => {
    verificarRestaurante(nombreRestaurante, (error, respuesta) => {
      if (error) {
        rechazar({
          etapa: "1. Verificar Restaurante",
          motivo: error,
          detalle: { restaurante: nombreRestaurante }
        });
      } else {
        resolver(respuesta);
      }
    });
  });
}