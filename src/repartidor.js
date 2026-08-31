/**
 * ARCHIVO 4: ASIGNACIÓN DE REPARTIDORES (ES Modules)
 * Integrante 4: Búsqueda de domiciliarios en zona
 */

const tiempoAzar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export function buscarRepartidor(barrioEntrega) {
  return new Promise((resolver, rechazar) => {
    const tiempo = tiempoAzar(1000, 2500);
    setTimeout(() => {
      if (Math.random() < 0.10) {
        rechazar({
          etapa: "4. Asignar Repartidor",
          motivo: `Sin domiciliarios disponibles en el barrio ${barrioEntrega}.`,
          detalle: { barrioEntrega }
        });
      } else {
        resolver({ nombreRepartidor: "Carlos Mendoza", vehiculo: "Motocicleta" });
      }
    }, tiempo);
  });
}