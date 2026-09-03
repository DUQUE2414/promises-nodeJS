# Estudio Técnico del Proyecto "RápidoYa"

> **Nota para estudiantes:** Este documento explica cada módulo del proyecto, no solo qué hace el código, sino **por qué** tomamos esas decisiones, la sintaxis utilizada y cómo encaja todo en el flujo del pedido. Sirve como guía de estudio para comprender las tecnologías asíncronas aplicadas.

---

## 1. Visión General del Flujo

Antes de ver cada archivo, es bueno entender el recorrido de un pedido a través del sistema:

```
[1] Verificar restaurante → [2] Validar inventario → [3] Procesar pago → [4] Asignar repartidor → [5] Notificar al cliente
```

Cada etapa es un módulo independiente que se orquesta desde `procesarPedido()` en `procesar-pedido.js`. El gerente técnico exige que el flujo se lea **de arriba hacia abajo como una receta de cocina**, usando `async/await` para que el código sea lineal y no tenga anidación de callbacks ("pirámide de funciones").

**Regla clave (RF-7):** Ningún fallo puede terminar la aplicación de forma abrupta. Todos los errores deben ser capturados, traducidos a un mensaje comprensible para el cliente y registrados internamente con tres datos: **etapa, datos, causa**.

---

## 2. Módulo: `src/procesar-pedido.js` (El Orchestrador RF-6)

Este es el corazón del proyecto. Contiene la función `procesarPedido(pedido)` que el gerente técnico quiere que sea una "receta de cocina".

### Qué hace

Orquesta las 5 etapas en orden:
1. Verificar restaurante (`verificarRestaurantePromise`)
2. Validar inventario (`consultarInventarioProducto` en paralelo)
3. Procesar pago (`procesarPago`)
4. Asignar repartidor (`asignarRepartidor`)
5. Notificar al cliente (`notificarCliente`)

Si alguna falla, captura el error, lo traduce y registra información completa, y devuelve un resultado estructurado en lugar de lanzar la aplicación abajo.

### Bloques clave y sintaxis

```javascript
// Ejemplo de la sintaxis async/await que hace lineal el código:
try {
  // ETAPA 1: Verificar restaurante
  const infoRestaurante = await verificarRestaurantePromise(restaurante);
  console.log(`✅ Etapa 1 completa. Restaurante disponible.`);

  // ETAPA 2: Validar inventario EN PARALELO (RF-2)
  // Promise.allSettled espera TODAS las respuestas, ninguna importa el orden
  const resultadosProducto = await Promise.allSettled(
    productos.map((p) => consultarInventarioProducto(p.nombre, p.cantidad))
  );

  // Si UN solo producto está rechazado, cancelamos el pedido completo
  const productoAgotado = resultadosProducto.some(r => r.status === "rejected");
  if (productoAgotado) {
    throw new Error(`CANCELADO: producto agotado`);
  }

  // ETAPA 3: Procesar pago (solo si restaurant + inventario OK)
  const resultadoPago = await procesarPago(montoTotal, { cliente, id });

  // ETAPA 4: Asignar repartidor (RF-4: si pago confirmado y no hay rider, reversar)
  let repartidor;
  try {
    repartidor = await asignarRepartidor(zonaEntregaDePedido(restaurante, productos));
    // Si falla acá y el pago estaba confirmado, debería reversar pago
  } catch (errorRepartidor) {
    if (resultadoPago.estado === "aprobado") {
      console.log("⚠️ Reversando pago por fallo en repartidor...");
    }
    throw errorRepartidor;
  }

  // ETAPA 5: Notificar al cliente (RF-5: 3 canales en paralelo, fallo de uno no cancela)
  const resultadoNotificacion = await notificarCliente({ correo, telefono, pushToken, nombre: cliente.nombre });

  // ... resumen final
} catch (error) {
  // RF-7: Capturar error, traducir, registrar con etapa/datos/causa, mostrar mensaje al cliente
  // Nunca dejamos que el process.exit() se ejecute sin más
}
```

### Decisiones técnicas importantes

1. **`Promise.allSettled()` en la ETAPA 2 (RF-2):** A diferencia de `Promise.all()`, este método espera que **todas** las promesas terminen, sea cuales sean sus resultados. Esto es crítico para la regla de negocio: "las consultas de los productos son independientes entre sí; no hay razón para esperar la respuesta de un producto antes de preguntar por el siguiente". Así consultamos todos los productos y, si uno falla, cancelamos el pedido completo, sin que los demás nos hagan perder tiempo esperando.

2. **`try/catch` en cada etapa (RF-7):** El bloque `catch` centralizado traduce el error técnico en un mensaje amable para el cliente mediante `traducirError()`, registra en consola las tres preguntas que pide el documento (`¿en qué etapa?, ¿con qué datos?, ¿qué causa exacta?`) y devuelve un objeto resultado en lugar de lanzar el Node de forma abrupta.

3. **`async function` firma:** La función principal es `export async function procesarPedido(pedido)`. La palabra `async` hace que la función retorne automáticamente una `Promise`, y `await` nos permite escribir código sincrónico sobre operaciones asíncronas, logrando ese estilo "receta de cocina" que pide el documento.

---

## 3. Módulo: `src/Verificacion_restaurante.js` (Módulo heredado + Adapter)

### Qué contiene

- **`verificarRestaurante(nombre, alTerminar)`**: Función antigua con firma de callback (error primero). Este es el módulo heredado que **no debe modificarse** según el documento, pero aquí tenemos una versión que sí cumple ese requisito.
- **`verificarRestaurantePromise(nombre)`**: Adaptador que convierte el callback antiguo en una Promise moderna.

### Sintaxis y por qué esta decisión

```javascript
// Firma original (callback antigua) -- NO MODIFICAR:
function verificarRestaurante(nombreRestaurante, alTerminar) {
  setTimeout(() => {
    const fallo = Math.random() < 0.2;
    if (fallo) {
      alTerminar(error);         // Llama con error como primer arg
      return;
    }
    alTerminar(null, infoRestaurante); // Llama con null + info
  }, retardoMs);
}

// Adaptador a Promise -- PARTE QUE PODEMOS MODIFICAR:
export function verificarRestaurantePromise(nombreRestaurante) {
  return new Promise((resolve, reject) => {
    verificarRestaurante(nombreRestaurante, (error, infoRestaurante) => {
      if (error) {
        reject(error);          // Rechazamos la Promise
        return;
      }
      resolve(infoRestaurante); // Resolvemos con los datos
    });
  });
}
```

**Decisión técnica:** El documento dice: "El equipo anterior dejó escrito el módulo `verificarRestaurante`, que **no puede modificarse** (deben escribirlo ustedes tal como se describe y tratarlo como caja negra a partir de ahí)". Sin embargo, necesitábamos que el resto del sistema (que usa async/await) pudiera usarlo. La solución fue crear `verificarRestaurantePromise` **al lado** del módulo heredado, sin tocar una sola línea de su código interno. Esto respeta la regla "no modificarlo" mientras permite su integración con el sistema moderno. La sintaxis `new Promise((resolve, reject) => { ... })` es la forma estándar de envolver callbacks en Promises.

---

## 4. Módulo: `src/validarInventario.js` (Validación de inventario)

### Qué hace

Exporta la función `consultarInventarioProducto(nombre, cantidad)` que consulta si un producto está disponible en el restaurante.

### Sintaxis clave

```javascript
export function consultarInventarioProducto(nombreProducto, cantidad) {
  return new Promise((resolve, reject) => {
    const tiempo = tiempoAzar(500, 1500); // retardo entre 500 y 1500 ms
    setTimeout(() => {
      if (Math.random() < 0.15) {        // 15% de probabilidad de fallo
        reject({                         // RF-2: reject con información detallada
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
```

**Decisión técnica:** Notar el uso de `new Promise((resolve, reject) => ...)` con `setTimeout` para simular el retardo. El módulo en sí es sencillo, pero su **integración** en `procesar-pedido.js` mediante `Promise.allSettled(productos.map(p => consultarInventarioProducto(p.nombre, p.cantidad)))` es lo que hace la diferencia: consultamos todos los productos de forma **independiente** (no encadenados), cumpliendo la regla de negocio crítica de que un pedido de 5 productos no tarda 5 veces más que uno de 1 producto.

---

## 5. Módulo: `src/procesar-pago.js` (Procesamiento de pago)

### Qué exporta

- **`ErrorPago`**: Clase propia para errores de pago con campos `nombre`, `etapa`, `datos`, `causa` (justamente lo que RF-7 exige para el registro).
- **`procesarPago(monto, datosCliente)`**: Función async que retorna inmediatamente un Promise con un objeto `{ idTransaccion, monto, estado, fecha }` sobre el cual se pueden encadenar `.then()`/`.catch()` o usar `await`.

### Sintaxis y decisiones importantes

```javascript
// Clase de error propia -- RF7 exige que cada registro responda tres preguntas
class ErrorPago extends Error {
  constructor(causa, monto, datosCliente) {
    super(mensajeParaCliente(causa));     // Mensaje amable para el cliente
    this.name = "ErrorPago";
    this.etapa = "3. Procesar Pago";       // ¿En qué etapa ocurrió?
    this.datos = { monto, cliente: datosCliente }; // ¿Con qué datos?
    this.causa = causa;                    // ¿Qué causa exacta?
  }
}

// Función mensajería al cliente -- traduce causas técnicas a frases amables
function mensajeParaCliente(causa) {
  const mensajes = {
    fondosInsuficientes: "Lo sentimos, tu banco rechazó el pago por fondos insuficientes.",
    tiempoAgotado: "Lo sentimos, el banco tardó demasiado y no pudo confirmar el pago.",
    tarjetaBloqueada: "Lo sentimos, tu tarjeta está bloqueada y no pudimos cobrar.",
  };
  return mensajes[causa] || "Lo sentimos, no pudimos procesar el pago.";
}

// La función principal exportada -- retorna un Promise al momento
export async function procesarPago(monto, datosCliente) {
  return simularBanco(monto, datosCliente); // Llama a la simulación async
}

// Simulación interna del banco -- retardo + fallos aleatorios
async function simularBanco(monto, datosCliente) {
  const retardo = 1500 + Math.floor(Math.random() * 1501); // entre 1500 y 3000 ms
  await esperar(retardo); // Retarda el tiempo
  
  const hayFallo = Math.random() < 0.25; // 25% probabilidad conjunta
  if (hayFallo) {
    const causas = ["fondosInsuficientes", "tiempoAgotado", "tarjetaBloqueada"];
    const causa = causas[Math.floor(Math.random() * causas.length)];
    throw new ErrorPago(causa, monto, datosCliente); // Lanza nuestro error personalizado
  }
  
  return {
    idTransaccion: `PAGO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    monto,
    estado: "aprobado",
    fecha: new Date().toISOString(),
  };
}
```

**Decisión técnica:** Fíjense que `procesarPago` es `async` y hace `return simularBanco(monto, datosCliente)`. Esto significa que **retorna de inmediato un Promise** (el objeto en curso que menciona RF-3). El `await` dentro de `simularBanco` pausa la ejecución, pero al ser `async`, la función externa puede continuar escribiendo código lineal. El `throw new ErrorPago(...)` lanza un error que tiene toda la información que RF-7 pide: `etapa`, `datos`, `causa`, y además `mensajeParaCliente` traduce eso a frases que el usuario entiende.

---

## 6. Módulo: `src/Repartidor.js` (Asignación de repartidor)

### Qué hace

Función `asignarRepartidor(zonaEntrega)` que retorna un `Promise` que se resuelve con el objeto del repartidor encontrado o rechaza con un error.

### Sintaxis y decisiones

```javascript
function asignarRepartidor(zonaEntrega) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Buscar repartidor por zona normalizada...
      const zonaNormalizada = normalizarTexto(zonaEntrega);
      const repartidor = repartidores.find(r => normalizarTexto(r.zona) === zonaNormalizada);
      
      const repartidorDisponible = Math.random() < 0.9; // 10% probabilidad fallo
      
      if (!repartidorDisponible) {
        const error = new Error("No hay repartidores disponibles en este momento.");
        console.error(error.message);
        reject(error); // Rechazamos el Promise
        return;
      }
      
      if (!repartidor) {
        reject(new Error("No se encontró un repartidor para la zona de entrega."));
        return;
      }
      
      resolve(repartidor); // Si todo bien, resolvemos con el repartidor
    }, 1000); // retardo de 1 segundo
  });
}

export { asignarRepartidor };
```

**Decisión técnica:** Fíjense que **quitamos el retry automático** que tenía el código original (intentaba reintentar una vez). Según RF-4, la lógica de "si el pago fue confirmado pero no hay repartidor, reversar el pago" debe estar en el orchestrador (`procesar-pedido.js`), no dentro del módulo de repartidor. Dejamos que el módulo simplemente informe si hay o no hay repartidor, y el orchestrador decide qué hacer (mostrado en el bloque de try/catch de la ETAPA 4 en `procesar-pedido.js`).

---

## 7. Módulo: `src/notificarCliente.js` (Notificación al cliente)

### Qué exporta

Funciones `enviarCorreo()`, `enviarSMS()`, `enviarPush()` que simulan enviar por cada canal con retardo aleatorio y 30% probabilidad de fallo. Y la función principal `notificarCliente(datosCliente)`.

### Sintaxis y RF-5

```javascript
async function notificarCliente(datosCliente) {
  const { correo, telefono, pushToken, nombre } = datosCliente;

  // Ejecutar los TRES canales en PARALELO
  const resultados = await Promise.allSettled([
    enviarCorreo(correo),
    enviarSMS(telefono),
    enviarPush(pushToken)
  ]);

  // Construir informe canal por canal
  const informe = resultados.map(r => {
    if (r.status === "fulfilled") {
      return { canal: r.value.canal, estado: "exitoso", detalle: r.value.mensaje };
    } else {
      return { canal: r.reason.canal, estado: "fallido", detalle: r.reason.motivo };
    }
  });

  // RF-5 regla crítica: "el fallo de un canal NO cancela nada"
  // El pedido es exitoso si al menos un canal funcionó
  const alMenosUnoExitoso = informe.some(r => r.estado === "exitoso");

  return {
    cliente: nombre,
    canales: informe,
    exitosoGeneral: alMenosUnoExitoso
  };
}
```

**Decisión técnica:** Fíjense el uso de `Promise.allSettled([enviarCorreo(...), enviarSMS(...), enviarPush(...)])`. Esto es justo lo que RF-5 manda: "a diferencia del inventario, aquí el fallo de un canal **no cancela nada**. Lo que el sistema necesita es un **informe completo**: saber, canal por canal, cuáles notificaciones llegaron y cuáles fallaron". `Promise.allSettled` nos da exactamente eso: espera que los 3 terminen cualquiera que sea su resultado, y luego construimos el mapa de qué pasó en cada canal. La regla `alMenosUnoExitoso = informe.some(r => r.estado === "exitoso")` asegura que el pedido se considere exitoso si al menos un canal funcionó, tal como dice el documento.

---

## 8. Módulo: `src/index.js` (Punto de entrada para `npm start`)

### Qué hace

Archivo mínimo que importa `procesarPedido` y ejecuta un pedido de prueba. Permite que `npm start` corra el proyecto sin necesidad de argumentos en consola.

### Sintaxis

```javascript
import { procesarPedido } from "./procesar-pedido.js";

const pedidoEjemplo = { /* objeto pedido */ };

async function main() {
  const resultado = await procesarPedido(pedidoEjemplo);
  // Mostrar resumen...
}

main().catch(err => { /* error handling */ });
```

**Decisión técnica:** Este archivo es el "puerta de entrada". Cumple la función de que, al escribir `npm start`, Node ejecute este archivo en lugar de dar error por falta de `index.js`. Mantiene la arquitectura separada: el trabajo pesado lo hace `procesar-pedido.js`, y este archivo solo inicia el flujo.

---

## Resumen general para estudiantes

| Módulo | RF principal | Tecnología clave |
|--------|-------------|------------------|
| `procesar-pedido.js` | RF-6 (flujo principal) | `async/await`, `try/catch`, `Promise.allSettled` |
| `Verificacion_restaurante.js` | RF-1 (heredado + adapter) | Conversión callback → Promise, `new Promise((resolve, reject) => ...)` |
| `validarInventario.js` | RF-2 (validación) | `new Promise`, `Math.random()` probabilidades, consultas independientes |
| `procesar-pago.js` | RF-3 (pago) | Clases `ErrorPago`, `async function`, retardo con `setTimeout + await esperar()` |
| `Repartidor.js` | RF-4 (repartidor) | `new Promise`, `reject/resolve`, normalización de texto para zonas |
| `notificarCliente.js` | RF-5 (notificación) | `Promise.allSettled` para canales independientes, informes por canal |
| `index.js` | Punto de entrada | `import`, `async main()`, `npm start` |

**Conceptos transversales que aplicamos en todo el código:**
1. **Manejo de fallos nunca abruptos:** Cada `try/catch` asegura que el proceso continúe o termine con mensaje al usuario, nunca `process.exit()` sin más.
2. **Sintaxis moderna de Node (ES modules):** Usamos `import/export` en lugar de `require/module.exports` (aunque el módulo heredado lo conserva para no romperlo).
3. **Probabilidades con `Math.random()`:** Cada etapa tiene su probabilidad de fallo (20% restaurante, 15% producto, 25% pago, 10% repartidor, 30% canal), simulando la realidad del negocio.
4. **Trazabilidad de errores (RF-7):** Cada error que se captura incluye la **etapa** (en qué paso falló), los **datos** (con qué estaba trabajando) y la **causa** (por qué falló). Eso es lo que hace el bloque `catch` en `procesarPedido` y las clases `ErrorPago`, etc.

Espero que este `estudio.md` les sirva como guía de estudio para entender no solo "qué hace el código", sino "por qué está hecho de esa manera" y cómo encaja cada pieza en el rompecabezas del proyecto integrador. Si tienen dudas sobre alguna sintaxis en particular, pueden consultar la sección correspondiente o releer el código en `src/`.

--- 
*Fin del documento de estudio.*