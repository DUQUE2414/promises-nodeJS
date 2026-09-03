function normalizarTexto(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Intenta asignar un repartidor a la zona indicada.
 * Si no hay repartidores disponibles y el pago ya fue confirmado,
 * el llamador debe encargarse de reversed el pago (ver RF-4).
 * 
 * Firma: asignarRepartidor(zonaEntrega) -> Promise<repartidor | error>
 */
function asignarRepartidor(zonaEntrega) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const repartidores = [
        { id: 1, nombre: "Juan", zona: "Norte" },
        { id: 2, nombre: "Maria", zona: "Sur" },
        { id: 3, nombre: "Pedro", zona: "Este" },
        { id: 4, nombre: "Ana", zona: "Oeste" },
      ];

      const zonaNormalizada = normalizarTexto(zonaEntrega);
      const repartidor = repartidores.find(
        (r) => normalizarTexto(r.zona) === zonaNormalizada,
      );

      const repartidorDisponible = Math.random() < 0.9;

      if (!repartidorDisponible) {
        const error = new Error("No hay repartidores disponibles en este momento.");
        console.error(error.message);
        reject(error);
        return;
      }

      if (!repartidor) {
        reject(new Error("No se encontró un repartidor para la zona de entrega."));
        return;
      }

      resolve(repartidor);
    }, 1000);
  });
}

export { asignarRepartidor };