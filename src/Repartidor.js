function normalizarTexto(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function asignarRepartidor(zonaEntrega, intento = 1) {
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

        if (intento < 2) {
          console.error(error.message);
          console.log("Reintentando automáticamente...");
          resolve(asignarRepartidor(zonaEntrega, intento + 1));
          return;
        }

        console.error("Se envió a soporte y se hará un reporte.");
        reject(new Error("Se envió a soporte y se hará un reporte."));
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

asignarRepartidor("NOrté")
  .then((repartidor) => {
    console.log("Repartidor asignado:", repartidor);
  })
  .catch((error) => {
    console.error("Error:", error.message);
  });