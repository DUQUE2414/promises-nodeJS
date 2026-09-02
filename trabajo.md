# Proyecto Integrador — "RápidoYa": Simulador de Plataforma de Pedidos a Domicilio

**Modalidad:** individual o parejas · **Tecnología:** JavaScript (Node.js, sin librerías externas) · **Entregables:** código fuente + documento de análisis técnico

---

## 1. Contexto del negocio

La startup **RápidoYa** conecta clientes con restaurantes locales. Su primer prototipo fue escrito hace años por un equipo que ya no está en la empresa, y ahora ustedes son el nuevo equipo de desarrollo contratado para construir el **motor de procesamiento de pedidos**: el corazón del sistema que recibe un pedido y lo lleva desde "recibido" hasta "en camino".

El gerente técnico es muy claro con dos cosas:

1. **La plataforma nunca puede "caerse".** Un banco que no responde, un restaurante cerrado o un repartidor que no aparece son situaciones normales del negocio, no motivos para que el programa termine abruptamente.
2. **Todo en este negocio toma tiempo.** El banco tarda en confirmar, el restaurante tarda en responder, el repartidor tarda en aceptar. Nada es instantáneo, y el sistema debe reflejar esa realidad.

Como no tienen acceso a servicios reales, **todas las operaciones externas se simularán** con retardos artificiales (entre 500 ms y 3000 ms) y con fallos aleatorios según las probabilidades indicadas más adelante.

---

## 2. Flujo del pedido

Un pedido contiene: identificador, nombre del cliente, restaurante, lista de productos (cada uno con nombre y cantidad), monto total y canales de contacto del cliente (correo, SMS y notificación push).

El pedido atraviesa **cinco etapas**, en este orden lógico:

```
[1] Verificar restaurante → [2] Validar inventario → [3] Procesar pago → [4] Asignar repartidor → [5] Notificar al cliente
```

---

## 3. Requisitos funcionales

### RF-1. Verificación del restaurante (módulo heredado)

El equipo anterior dejó escrito el módulo `verificarRestaurante`, que **no puede modificarse** (deben escribirlo ustedes tal como se describe y tratarlo como caja negra a partir de ahí). Su firma es la siguiente:

> `verificarRestaurante(nombreRestaurante, alTerminar)`

El segundo parámetro es **una función que el módulo ejecutará cuando la verificación termine**, siguiendo la convención antigua de la empresa: si algo salió mal, esa función se invoca con el error como primer argumento; si todo salió bien, se invoca con `null` como primer argumento y la información del restaurante (nombre, tiempo estimado de preparación, si está abierto) como segundo.

- Retardo simulado: entre 1000 y 2000 ms.
- Probabilidad de fallo: **20 %** (restaurante cerrado o fuera de cobertura).

**Reto adicional:** el resto del sistema fue diseñado con un estilo moderno, así que necesitarán construir un "adaptador" o "envoltorio" sobre este módulo heredado para que se integre de forma natural con las demás etapas, sin romper la regla de no modificarlo.

### RF-2. Validación de inventario

Por cada producto del pedido debe consultarse la función `consultarProducto(nombre, cantidad)`, que simula preguntarle al restaurante si tiene existencias.

- Retardo simulado por producto: entre 500 y 1500 ms.
- Probabilidad de fallo por producto: **15 %** (producto agotado).
- **Regla de negocio crítica:** las consultas de los productos son independientes entre sí; **no hay ninguna razón para esperar la respuesta de un producto antes de preguntar por el siguiente**. Un pedido de 5 productos no puede tardar 5 veces más que uno de 1 producto.
- **Regla de cancelación:** si **un solo producto** está agotado, el pedido completo debe cancelarse de inmediato, sin importar el estado de las demás consultas. No tiene sentido cobrar un pedido incompleto.

### RF-3. Procesamiento del pago

El nuevo proveedor de pagos entrega la función `procesarPago(monto, datosCliente)`, que **retorna inmediatamente un objeto** que representa una operación aún en curso: sobre ese objeto se pueden **encadenar** las acciones a ejecutar cuando el banco confirme, y las acciones a ejecutar cuando el banco rechace la transacción.

- Retardo simulado: entre 1500 y 3000 ms.
- Fallos posibles (probabilidad conjunta del **25 %**): fondos insuficientes, tiempo de espera del banco agotado, o tarjeta bloqueada. Cada uno debe distinguirse del otro.
- El pago **solo** puede intentarse si el restaurante fue verificado y el inventario quedó confirmado.

### RF-4. Asignación de repartidor

La función `asignarRepartidor(zonaEntrega)` sigue el mismo estilo moderno del proveedor de pagos.

- Retardo simulado: entre 1000 y 2500 ms.
- Probabilidad de fallo: **10 %** (no hay repartidores disponibles en la zona).
- **Regla de negocio importante:** si el pago ya fue confirmado pero no hay repartidor, el sistema debe **reversar el pago** (simular la devolución con `reversarPago(idTransaccion)`) antes de reportar el fallo al cliente. Piensen bien dónde vive esta lógica de compensación.

### RF-5. Notificación al cliente

Confirmado el repartidor, el cliente debe ser notificado por **tres canales a la vez**: correo (`enviarCorreo`), SMS (`enviarSMS`) y push (`enviarPush`).

- Retardo simulado por canal: entre 300 y 1000 ms.
- Probabilidad de fallo por canal: **30 %** (sí, los servicios de notificación son poco confiables).
- **Regla de negocio crítica (léanla dos veces):** a diferencia del inventario, aquí el fallo de un canal **no cancela nada**. El pedido ya está pago y en camino. Lo que el sistema necesita es un **informe completo**: saber, canal por canal, cuáles notificaciones llegaron y cuáles fallaron, para registrarlo. El pedido se considera exitoso si **al menos un canal** funcionó.

### RF-6. Flujo principal

La función `procesarPedido(pedido)` debe orquestar las cinco etapas. Exigencia del gerente técnico, textual:

> "Quiero abrir esa función y poder leerla **de arriba hacia abajo como una receta de cocina**: paso 1, paso 2, paso 3. Nada de código que se lea en zigzag ni pirámides de funciones anidadas, aunque por debajo todo sea diferido en el tiempo."

Al final, la consola debe mostrar un resumen del pedido: estado final, duración total de cada etapa y resultado de cada canal de notificación.

### RF-7. Manejo y registro de fallos

- **Ningún fallo, en ninguna etapa, puede terminar el proceso de Node de forma abrupta.** Todo error debe ser capturado, traducido a un mensaje entendible para el cliente ("Lo sentimos, tu banco rechazó el pago") y registrado internamente.
- Cada registro interno de error debe responder tres preguntas: **¿en qué etapa ocurrió?, ¿con qué datos se estaba trabajando?, ¿qué causa exacta lo produjo?** Un registro que solo diga "Error" hará que el equipo de soporte los odie. Consideren crear sus propios tipos de error para cada etapa del negocio.
- Prueben su sistema procesando **al menos 5 pedidos de ejemplo** con distintos tamaños, de modo que los fallos aleatorios aparezcan y se evidencie el manejo de cada escenario.

---

## 4. Restricciones técnicas

1. Solo JavaScript nativo sobre Node.js. Sin paquetes de npm.
2. Los retardos se simulan con temporizadores; los fallos, con `Math.random()` y las probabilidades indicadas.
3. El módulo heredado de RF-1 conserva su firma antigua; el resto del sistema usa el estilo del proveedor de pagos. La convivencia de ambos estilos es parte del reto.
4. El código debe estar comentado justificando las decisiones de diseño, no describiendo lo obvio.

---

## 5. Parte B — Documento de análisis técnico

Además del código, entregarán un documento (1 a 3 páginas) donde respondan, **con referencias a su propio código**, las siguientes preguntas:

1. ¿Dónde pueden producirse excepciones?
2. ¿Cómo podría solucionarse utilizando *callbacks*?
3. ¿Cómo podría escribirse utilizando *Promises*?
4. ¿Cómo podría refactorizarse utilizando *async/await*?
5. ¿Dónde debería incorporarse *try/catch*?
6. ¿Qué operaciones podrían ejecutarse simultáneamente?
7. ¿Conviene `Promise.all()` o `Promise.allSettled()`? Justifiquen para **cada caso** del proyecto donde haya operaciones simultáneas.
8. ¿Cómo garantizarían que los errores proporcionen información útil?

> **Nota:** varias de estas preguntas ya tienen su respuesta escondida entre las reglas de negocio de este documento. Parte de la evaluación es descubrir cuáles.

---

## 6. Criterios de evaluación sugeridos

| Criterio | Peso |
|---|---|
| El flujo completo funciona y sobrevive a todos los fallos simulados | 30 % |
| Elección correcta de las técnicas asincrónicas que cada etapa exige | 25 % |
| Legibilidad del flujo principal (la "receta de cocina") | 15 % |
| Calidad y trazabilidad de los errores registrados | 15 % |