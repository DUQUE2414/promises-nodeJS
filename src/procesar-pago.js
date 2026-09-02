// ===================================================================
// RF-3. Procesamiento del pago
// ===================================================================
// Este módulo simula al nuevo proveedor de pagos. Como en el negocio
// "todo toma tiempo", el banco tarda entre 1.5 y 3 segundos en responder
// y, además, a veces rechaza la transacción. El proveedor entrega la
// función `procesarPago(monto, datosCliente)` que retorna de inmediato
// un objeto sobre el cual se encadenan las acciones de éxito y de rechazo:
// por eso usamos async/await, que es la forma moderna y simple de que esa
// operación "en curso" se consuma con `await` o con `.then()/.catch()`.
//
// Con esta función exportada, las demás etapas (asignar repartidor, etc.)
// solo necesitan hacer `await procesarPago(...)` y olvidarse de los detalles
// internos del banco. El pago solo debe intentarse cuando el restaurante ya
// fue verificado y el inventario quedó confirmado (lo decide quien orquesta
// el pedido, no este módulo: aquí solo se procesa un pago que se nos pidió).
// ===================================================================

// Tipo de error propio del pago.
// RF-7 exige que cada registro interno responda tres preguntas: ¿en qué
// etapa ocurrió?, ¿con qué datos se estaba trabajando?, ¿qué causa exacta
// lo produjo? Por eso el error no es un simple mensaje: también guarda la
// etapa, los datos y la causa, para que el equipo de soporte pueda rastrear
// el fallo sin adivinar.
class ErrorPago extends Error {
  constructor(causa, monto, datosCliente) {
    // El mensaje es el que el cliente final va a entender.
    super(mensajeParaCliente(causa));
    this.name = "ErrorPago";
    this.etapa = "3. Procesar Pago"; // ¿en qué etapa ocurrió?
    this.datos = { monto, cliente: datosCliente }; // ¿con qué datos?
    this.causa = causa; // ¿qué causa exacta?
  }
}

// Sería un error mostrar el código interno al cliente. Aquí vivirá la
// "traducción" de cada causa técnica a una frase amable para el usuario.
function mensajeParaCliente(causa) {
  const mensajes = {
    fondosInsuficientes: "Lo sentimos, tu banco rechazó el pago por fondos insuficientes.",
    tiempoAgotado: "Lo sentimos, el banco tardó demasiado y no pudo confirmar el pago.",
    tarjetaBloqueada: "Lo sentimos, tu tarjeta está bloqueada y no pudimos cobrar.",
  };
  return mensajes[causa] || "Lo sentimos, no pudimos procesar el pago.";
}

// Utilitario: un esperar() que duerme el programa el tiempo dado. Envuelve
// el temporizador en una Promise para que podamos usar `await` y así leer el
// flujo "de arriba hacia abajo" como una receta, sin anidar callbacks.
function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

// La transacción emocionante del banco. Está separada de procesarPago solo
// para mantener la lógica del banco aparte de la "receta" pública. Aquí el
// banco tarda 1.5–3 s y luego decide: aprueba el 75% de las veces, o rechaza
// por una de tres causas distintas (que se guardan como error propio).
async function simularBanco(monto, datosCliente) {
  const retardo = 1500 + Math.floor(Math.random() * 1501); // entre 1500 y 3000 ms
  await esperar(retardo);

  const hayFallo = Math.random() < 0.25; // 25% de probabilidad conjunta

  if (hayFallo) {
    // Cada causa es distinta y equiprobable, para que se evidencie que el
    // sistema distingue un fallo de otro en el registro (RF-3 y RF-7).
    const causas = ["fondosInsuficientes", "tiempoAgotado", "tarjetaBloqueada"];
    const causa = causas[Math.floor(Math.random() * causas.length)];
    throw new ErrorPago(causa, monto, datosCliente);
  }

  // Si el banco aprueba, devolvemos la transacción confirmada. El id es
  // importante porque la etapa de repartidor podría necesitarlo para
  // reversar el pago si no hay repartidor disponible (RF-4).
  return {
    idTransaccion: `PAGO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    monto,
    estado: "aprobado",
    fecha: new Date().toISOString(),
  };
}

// Firma pública pedida por RF-3. Al ser async, retorna de inmediato un
// Promise (el "objeto en curso") sobre el cual se encadenan las acciones:
// con `await` o con .then()/.catch(). El monto y el cliente se guardan en
// los datos del error si algo sale mal.
export async function procesarPago(monto, datosCliente) {
  return simularBanco(monto, datosCliente);
}
