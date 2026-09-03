/**
 * Integrante 5: Notificación al cliente (RF-5)
 *
 * Tres canales (correo, SMS, push) se ejecutan en paralelo.
 * Cada canal es independiente: un fallo NO cancela los demás.
 * Se usa Promise.allSettled para obtener un informe completo
 * canal por canal. El pedido es exitoso si al menos un canal funcionó.
 */

const tiempoAzar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function enviarCorreo(destinatario) {
  return new Promise((resolve, reject) => {
    const retardo = tiempoAzar(300, 1000);
    setTimeout(() => {
      if (Math.random() < 0.3) {
        reject({ canal: "correo", destinatario, motivo: "Servicio de correo no disponible" });
      } else {
        resolve({ canal: "correo", destinatario, mensaje: "Correo enviado exitosamente" });
      }
    }, retardo);
  });
}

function enviarSMS(destinatario) {
  return new Promise((resolve, reject) => {
    const retardo = tiempoAzar(300, 1000);
    setTimeout(() => {
      if (Math.random() < 0.3) {
        reject({ canal: "SMS", destinatario, motivo: "Gateway SMS no responde" });
      } else {
        resolve({ canal: "SMS", destinatario, mensaje: "SMS enviado exitosamente" });
      }
    }, retardo);
  });
}

function enviarPush(destinatario) {
  return new Promise((resolve, reject) => {
    const retardo = tiempoAzar(300, 1000);
    setTimeout(() => {
      if (Math.random() < 0.3) {
        reject({ canal: "push", destinatario, motivo: "Servicio push no disponible" });
      } else {
        resolve({ canal: "push", destinatario, mensaje: "Notificación push enviada" });
      }
    }, retardo);
  });
}

/**
 * Notifica al cliente por los tres canales en paralelo.
 * Retorna un objeto con el informe completo y si la notificación
 * general fue exitosa (al menos un canal funcionó).
 */
async function notificarCliente(datosCliente) {
  const { correo, telefono, pushToken, nombre } = datosCliente;

  const resultados = await Promise.allSettled([
    enviarCorreo(correo),
    enviarSMS(telefono),
    enviarPush(pushToken)
  ]);

  const informe = resultados.map(r => {
    if (r.status === "fulfilled") {
      return { canal: r.value.canal, estado: "exitoso", detalle: r.value.mensaje };
    } else {
      return { canal: r.reason.canal, estado: "fallido", detalle: r.reason.motivo };
    }
  });

  const alMenosUnoExitoso = informe.some(r => r.estado === "exitoso");

  return {
    cliente: nombre,
    canales: informe,
    exitosoGeneral: alMenosUnoExitoso
  };
}

export { notificarCliente, enviarCorreo, enviarSMS, enviarPush };
