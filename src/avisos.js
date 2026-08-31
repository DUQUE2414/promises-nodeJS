/**
 * ARCHIVO 5: CANALES DE NOTIFICACIÓN MULTICANAL (ES Modules)
 * Integrante 5: Envío redundante de mensajes al cliente
 */

const tiempoAzar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export function notificarPorCorreo(correo) {
  return new Promise((resolver, rechazar) => {
    setTimeout(() => {
      if (Math.random() < 0.30) rechazar({ canal: "Correo", motivo: "Fallo servidor SMTP." });
      else resolver({ canal: "Correo", estado: "ENVIADO", destino: correo });
    }, tiempoAzar(300, 1000));
  });
}

export function notificarPorSMS(telefono) {
  return new Promise((resolver, rechazar) => {
    setTimeout(() => {
      if (Math.random() < 0.30) rechazar({ canal: "SMS", motivo: "Sin señal celular." });
      else resolver({ canal: "SMS", estado: "ENVIADO", destino: telefono });
    }, tiempoAzar(300, 1000));
  });
}

export function notificarPorPush(tokenApp) {
  return new Promise((resolver, rechazar) => {
    setTimeout(() => {
      if (Math.random() < 0.30) rechazar({ canal: "Push App", motivo: "Token app expirado." });
      else resolver({ canal: "Push App", estado: "ENVIADO", destino: tokenApp });
    }, tiempoAzar(300, 1000));
  });
}