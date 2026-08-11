# 🎱 Proyecto: Lector y Gestor Automatizado de Tablas de Bingo

## 1. Descripción del Proyecto
Aplicativo web diseñado para automatizar el seguimiento y validación de tablas de bingo. El sistema permite cargar múltiples tablas a través de imágenes o archivos PDF, extraer los números de cada cartón y, mediante un panel de control, registrar los números cantados en tiempo real. El aplicativo marcará automáticamente los aciertos en todas las tablas cargadas en el navegador y emitirá una alerta inmediata al detectar una tabla ganadora según el modo de juego establecido.

## 2. Objetivos
* **Automatización:** Eliminar el error humano al revisar múltiples cartones de bingo simultáneamente.
* **Digitalización:** Extraer datos precisos de formatos no estructurados (imágenes y PDFs) de forma masiva.
* **Agilidad:** Proveer una herramienta de respuesta instantánea para gestionar rondas consecutivas con los mismos cartones.

## 3. Características y Funcionalidades Principales
* **Módulo de Ingesta de Tablas:** 
  * Carga masiva mediante imágenes (JPG/PNG) o documentos PDF.
  * Extracción de la cuadrícula de números mediante Visión por Computadora/OCR.
  * Asignación de un ID/Folio único a cada tabla cargada.
* **Panel de Control (El Locutor):**
  * Interfaz ultra rápida para ingresar los números sorteados (solo se digita el número, omitiendo la letra B, I, N, G, O).
  * Selector del "Modo de Juego" activo.
  * Visualización en tiempo real de las tablas que están a "un número" de ganar.
* **Motor de Validación Automática:**
  * Búsqueda algorítmica y marcado instantáneo en la memoria local del navegador.
  * Escaneo de patrones ganadores en milisegundos.
* **Sistema de Alertas:**
  * Notificación visual y sonora cuando una o más tablas cumplen el patrón ganador.
  * Muestra en pantalla de la tabla ganadora para su verificación física contra el cartón real.

## 4. Modos de Juego Soportados
El motor de validación soporta los siguientes patrones clásicos:
* **Tabla Llena (Cartón Lleno):** Todos los números del cartón marcados.
* **Línea Horizontal:** 5 números consecutivos en cualquier fila.
* **Línea Vertical:** 5 números consecutivos en cualquier columna.
* **Línea Diagonal:** Las dos diagonales principales.
* **Cuatro Esquinas:** Los números de los 4 extremos del cartón.
* **Letra "X":** Ambas diagonales cruzadas.
* **Cuadro Pequeño / Cuadro Grande:** Patrones perimetrales.

## 5. Arquitectura y Almacenamiento Local (Local-First)
Para optimizar el rendimiento y permitir un uso rápido sin depender de una base de datos pesada consultando constantemente, el aplicativo funcionará bajo un modelo *Local-First*:
* **Almacenamiento en LocalStorage/IndexedDB:** Las estructuras de las tablas escaneadas (IDs y matrices de números) se guardarán directamente en el almacenamiento del navegador del usuario.
* **Procesamiento en Cliente:** La validación de los modos de juego y el cruce de los números cantados contra las tablas guardadas se ejecutará utilizando los recursos del navegador, garantizando respuestas sin latencia de red.
* **Rol del Backend:** El servidor de backend solo actuará como un procesador de ingesta. Recibe el PDF/Imagen, extrae los números mediante IA/OCR y devuelve los datos limpios al navegador. A partir de ahí, la partida transcurre 100% en local.

## 6. Gestión de Rondas y Reciclaje de Tablas
Diseñado para eventos donde se juegan múltiples rondas con el mismo lote de cartones:
* **Selección por Lotes:** Capacidad de seleccionar todas las tablas cargadas para incluirlas en la ronda actual.
* **Reseteo Rápido de Ronda:** Un botón de "Nueva Ronda" que elimina todos los aciertos (números marcados) del juego anterior, pero conserva intacta la estructura y los números base de las tablas guardadas en el navegador para iniciar inmediatamente el siguiente juego.

## 7. Stack Tecnológico Sugerido
* **Frontend (Interfaz de Usuario):** React (preferido frente a Vue.js) para construir una interfaz altamente dinámica y veloz, gestionando los estados complejos del juego en el navegador. Se estilizará con Tailwind CSS.
* **Backend (Servicio de OCR/Extracción):** Python utilizando Django. Ideal para conectar fácilmente con bibliotecas de IA.
* **Procesamiento de Imágenes (CV/OCR):** Arquitecturas de visión por computadora para identificar la estructura del cartón, combinadas con motores OCR (como EasyOCR o Tesseract).

## 8. Casos Especiales y Lógica Específica del Bingo
* **El "Comodín" (Espacio Libre):** El motor debe identificar y marcar automáticamente el centro de las matrices (si el cartón lo incluye) desde que inicia la partida.
* **Control de Series:** El módulo de visión por computadora debe intentar capturar el "Número de Serie" impreso en el cartón para propósitos de auditoría rápida y evitar fraudes.

## 9. Resiliencia y Manejo de Errores
* **Revisión Manual de Confianza (OCR):** Bandeja de "Tablas en Duda" donde la IA notifique si hay números ilegibles (por fotos borrosas), permitiendo al usuario corregirlos manualmente antes de iniciar.
* **Botón "Deshacer" (Rollback):** Si el locutor marca un número por error, el panel permite borrar el último número ingresado, desmarcándolo instantáneamente en todas las tablas y recalculando si se revierte algún estado ganador.

## 10. Flujo de Usuario Principal
1. **Carga y Extracción:** Se suben las imágenes o PDFs de los cartones al servidor. El servidor procesa, extrae los datos y los envía al navegador del usuario (LocalStorage).
2. **Configuración de Ronda:** El usuario selecciona el "Modo de Juego" (ej. Letra X).
3. **El Juego:** El usuario ingresa únicamente el número cantado (ej. "45" + Enter).
4. **Validación:** El frontend busca el "45" en todas las tablas guardadas en local y lo marca.
5. **Victoria:** El sistema detecta el patrón, pausa el juego y alerta mostrando el ID del cartón ganador en pantalla.
6. **Reciclaje:** Se entrega el premio, se presiona "Limpiar Tablas", se elige el nuevo Modo de Juego y comienza la siguiente ronda con los mismos cartones.