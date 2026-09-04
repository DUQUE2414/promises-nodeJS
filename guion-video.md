# Guion de Video para Socializacion -- Proyecto Integrador "RapidoYa"

Este documento contiene la distribucion y los guiones individuales de 1 minuto por persona (aproximadamente 130 a 150 palabras cada uno) para la presentacion en video de 6 minutos de la solucion del proyecto RápidoYa.

---

## Estructura General del Video (6 Minutos Totales)

| Minuto | Integrante | Tema Principal | Muestra Visual en Pantalla |
|--------|-----------|----------------|---------------------------|
| 0:00 - 1:00 | Integrante 1 | Introduccion, Reto y Modulo Heredado (Callbacks a Promesas) | Codigo de la funcion Adaptador / Wrapper sobre verificarRestaurante |
| 1:00 - 2:00 | Integrante 2 | Orquestacion del Flujo Principal ("Receta de Cocina" con Async/Await) | Funcion procesarPedido completa con async/await |
| 2:00 - 3:00 | Integrante 3 | Concurrencia de Negocio (Promise.allSettled con logicas de negocio distintas) | Codigo de validacion de inventario con Promise.allSettled + verificacion manual de agotados, y notificaciones con Promise.allSettled |
| 3:00 - 4:00 | Integrante 4 | Estrategia de Errores: Clase ErrorPago, Objetos Estructurados y Funciones de Traduccion | Definicion de clase ErrorPago y funciones traducirError / registrarError |
| 4:00 - 5:00 | Integrante 5 | Resiliencia y Mecanismo de Compensacion (Reversion de Pago) | Bloque de captura en etapa 4 con log de simulacion de reversarPago() |
| 5:00 - 6:00 | Integrante 6 | Valor Diferencial y Comparativa Tecnica | Ejecucion en consola de los 5 pedidos de prueba sin errores fatales |

---

## Guiones Individuales por Integrante

### Integrante 1: Modulo Heredado y Adaptacion (0:00 - 1:00)

**Rol:** Explicar la integracion del codigo heredado y el patron Adapter.

"Hola a todos. Para el backend de RapidoYa enfrentamos un reto comun en la industria: integrar modulos heredados. El modulo verificarRestaurante trabajaba con la convencion antigua de callbacks (err, result).

En este punto se producen excepciones cuando el restaurante esta cerrado o fuera de cobertura con un 20% de probabilidad de fallo. Manejar esto con callbacks puros nos obligaria a anidar el resto del flujo, creando un Callback Hell.

Nuestra decision tecnica principal fue aplicar el patron Adapter envolviendo la funcion dentro de una Promise. Con esta promisificacion, capturamos el error en el callback llamando a reject() y el exito llamando a resolve(). Esto nos permite consumir este modulo de forma transparente mediante la sintaxis moderna del resto del sistema."

---

### Integrante 2: Orquestacion del Flujo Principal (1:00 - 2:00)

**Rol:** Presentar la funcion principal procesarPedido(pedido).

"Con el modulo legado adaptado, abordamos el requisito RF-6 del gerente tecnico: leer el flujo de punta a punta como una receta de cocina.

Refactorizamos todo el flujo a async/await. Si hubieramos encadenado .then().catch(), la lectura del codigo se volveria dispersa. Al utilizar async/await, logramos una ejecucion secuencial imperativa sobre codigo asincronico.

En la funcion procesarPedido, cada paso se ejecuta uno tras otro en orden logico: verificar restaurante, consultar inventario, procesar pago, asignar repartidor y notificar. Envolvemos la orquestacion en un bloque try/catch central que garantiza que ante cualquier fallo no controlado, el proceso de Node.js nunca se caiga abruptamente."

---

### Integrante 3: Concurrencia -- Promise.allSettled con Logicas de Negocio Distintas (2:00 - 3:00)

**Rol:** Justificar por que se uso Promise.allSettled en ambas etapas con comportamientos diferentes.

"Para maximizar el rendimiento identificamos dos operaciones que debian ejecutarse en paralelo: el inventario y las notificaciones. En ambos casos utilizamos Promise.allSettled, pero la logica de negocio que aplicamos sobre los resultados es radicalmente opuesta.

En la Validacion de Inventario, usamos Promise.allSettled para consultar todos los productos simultaneamente. Sin embargo, la regla exige que si un solo producto esta agotado, el pedido se cancele de inmediato. Por eso, despues de obtener los resultados completos, verificamos manualmente con .some() si alguno fallo, y cancelamos el pedido. Es un fail-fast implementado sobre un allSettled.

En cambio, en las Notificaciones al Cliente, usamos Promise.allSettled con una logica diferente: como el pedido ya se pago y el repartidor va en camino, el fallo de un SMS o correo no debe cancelar la venta. Simplemente registramos que canales funcionaron y cuales fallaron, y el pedido se considera exitoso si al menos un canal entrego."

---

### Integrante 4: Estrategia de Errores -- Clase ErrorPago, Objetos Estructurados y Funciones de Traduccion (3:00 - 4:00)

**Rol:** Explicar la estrategia real de manejo de errores enriquecidos.

"Un error generico que solo diga 'Error en el sistema' genera costos enormes en soporte. Para cumplir el RF-7, implementamos una estrategia de errores en tres niveles.

Primero, en la etapa de pago definimos la clase ErrorPago que extiende de la clase nativa Error. Esta clase encapsula los tres datos clave que RF-7 exige: la etapa del proceso, los datos contextuales del pedido con los que se operaba, y la causa exacta de la falla. Cada causa se traduce automaticamente a un mensaje amable para el cliente.

Segundo, en la etapa de inventario los rechazos vienen como objetos estructurados con etapa, motivo y detalle, manteniendo la misma trazabilidad sin necesidad de una clase separada.

Tercero, en el orquestador central tenemos traducirError() que mapea codigos tecnicos a mensajes amables, y registrarError() que guarda las tres preguntas de RF-7 con la duracion hasta el fallo."

---

### Integrante 5: Resiliencia y Logica de Compensacion (4:00 - 5:00)

**Rol:** Presentar el mecanismo de compensacion transaccional (reversion de pago).

"La plataforma nunca puede caerse y debe reaccionar ante fallos del mundo real. La regla de negocio mas critica en terminos de coherencia financiera esta entre el cobro y la logistica.

En la etapa 4, si el pago al cliente se proceso con exito pero la funcion asignarRepartidor falla porque no hay personal disponible, el sistema no puede simplemente lanzar un error y quedarse con el dinero.

Incorporamos un bloque try/catch anidado especificamente en la asignacion de repartidor. Si la asignacion falla, el sistema detecta que el pago estaba aprobado y ejecuta la logica de compensacion: registra la reversión del pago con su id de transaccion antes de propagar el error. En nuestro codigo simulamos la llamada a reversarPago() con un log, porque es un proyecto educativo, pero el patron de compensacion transaccional esta correctamente estructurado y listo para integrar con un servicio real de reversiones."

---

### Integrante 6: Valor Diferencial y Conclusion (5:00 - 6:00)

**Rol:** Cerrar la exposicion resaltando los contrastes de la solucion.

"En conclusion, nuestra solucion destaca en tres aspectos principales respecto a otros enfoques posibles:

Primero, frente a un enfoque puramente secuencial con await en cada loop, nuestra solucion reduce la latencia total usando concurrencia en inventario y notificaciones.

Segundo, frente a un uso indiscriminado de Promise.all, protegemos el negocio utilizando Promise.allSettled tanto en el inventario como en las notificaciones, pero aplicando logicas de negocio distintas: cancelacion ante agotamiento en uno, tolerancia ante fallos en el otro.

Y tercero, al combinar promisificacion del modulo legado, resiliencia transaccional con compensacion de pago, y una estrategia de errores con la clase ErrorPago, objetos estructurados y funciones de traduccion, logramos un motor robusto capaz de procesar multiples pedidos con fallos simulados sin interrumpir jamas la ejecucion de Node.js. Muchas gracias."

---

## Recomendaciones para la Grabacion

- **Formato:** Graben una llamada por Teams, Zoom o Google Meet con camaras encendidas. Un integrante comparte pantalla mostrando el codigo en Visual Studio Code.
- **Apoyo visual:** Cuando cada integrante hable, el moderador de la pantalla debe hacer zoom al bloque de codigo que se menciona.
- **Tiempo:** Practiquen 1 vez con cronometro en mano para asegurarse de no sobrepasar el minuto por persona.
