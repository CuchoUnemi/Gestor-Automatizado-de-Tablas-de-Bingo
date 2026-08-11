# 🗺️ Plan de Desarrollo Paso a Paso: Gestor Automatizado de Tablas de Bingo

Este documento desglosa el proyecto en fases modulares. El objetivo es que cada fase pueda ser ejecutada de manera independiente por diferentes "agentes" o en sesiones separadas para no sobrecargar la memoria de contexto.

## Fase 1: Inicialización y Estructura Base del Backend (Django)
**Objetivo:** Crear la base del servidor que se encargará exclusivamente de procesar las imágenes y extraer los datos.
* **Paso 1.1:** Inicializar un proyecto de Django y configurar Django REST Framework.
* **Paso 1.2:** Crear una aplicación (app) dedicada al procesamiento de documentos (ej. `ocr_service`).
* **Paso 1.3:** Configurar el enrutamiento y un endpoint básico (POST `/api/upload/`) para recibir archivos (PDF y JPG/PNG).

## Fase 2: Motor de Visión por Computadora y OCR (Python)
**Objetivo:** Implementar la lógica para leer las tablas de bingo desde los archivos subidos.
* **Paso 2.1:** Integrar librerías de procesamiento de imágenes (OpenCV) para detectar la cuadrícula del cartón de bingo.
* **Paso 2.2:** Integrar el motor OCR (EasyOCR o Tesseract) para extraer los números de las celdas detectadas.
* **Paso 2.3:** Implementar la lógica para identificar casos especiales: detectar el "Comodín" (centro) y el "Número de Serie".
* **Paso 2.4:** Estructurar la respuesta del servidor para que devuelva un JSON limpio con el ID del cartón, la matriz de números y una bandera de "confianza" para las lecturas dudosas.

## Fase 3: Configuración del Frontend y Almacenamiento Local (React)
**Objetivo:** Crear la estructura de la aplicación cliente bajo el enfoque *Local-First*.
* **Paso 3.1:** Inicializar el proyecto con React (Vite es recomendado por velocidad) y configurar Tailwind CSS.
* **Paso 3.2:** Diseñar el sistema de almacenamiento local (usando LocalStorage o IndexedDB) para guardar los cartones extraídos sin depender del backend durante el juego.
* **Paso 3.3:** Crear el servicio o *store* global (ej. con Zustand o Context API) para manejar el estado del juego (números cantados, tablas guardadas, modo de juego activo).

## Fase 4: Interfaz de Ingesta y Revisión Manual
**Objetivo:** Interfaz gráfica para cargar los cartones y corregir errores de lectura.
* **Paso 4.1:** Crear la vista de carga de archivos (Drag & Drop para imágenes/PDFs).
* **Paso 4.2:** Conectar el frontend con el endpoint `/api/upload/` del backend y procesar la respuesta JSON.
* **Paso 4.3:** Crear la bandeja de "Tablas en Duda": una interfaz para que el usuario pueda revisar visualmente y corregir manualmente los números que el OCR no leyó con alta confianza.

## Fase 5: Panel del Locutor y Motor de Juego Local
**Objetivo:** Desarrollar el corazón de la aplicación, donde se desarrolla la partida.
* **Paso 5.1:** Crear el selector de "Modo de Juego" (Líneas, Cuatro Esquinas, Tabla Llena, Letra X, etc.).
* **Paso 5.2:** Construir la interfaz de ingreso rápido para el locutor (un *input* enfocado que acepte solo números y la tecla Enter).
* **Paso 5.3:** Implementar el algoritmo de validación: al ingresar un número, se busca y marca instantáneamente en todas las tablas almacenadas en memoria.
* **Paso 5.4:** Implementar el botón de "Deshacer" (Rollback) para eliminar el último número cantado en caso de error y recalcular el estado.

## Fase 6: Sistema de Alertas y Reciclaje de Rondas
**Objetivo:** Notificaciones de victoria y gestión de nuevas partidas.
* **Paso 6.1:** Crear un componente visual para mostrar las tablas que están "a un número" de ganar (funcionalidad de emoción/tensión).
* **Paso 6.2:** Desarrollar el sistema de alertas (visual y sonora) que se dispare cuando el motor detecte un cartón ganador. Mostrar el cartón ganador en pantalla para verificación física.
* **Paso 6.3:** Implementar la lógica de "Nueva Ronda": limpiar los números cantados y estados ganadores, pero mantener la base de datos local de cartones intacta para comenzar el siguiente juego inmediatamente.

## Fase 7: Pulido y Diseño Premium (UI/UX)
**Objetivo:** Asegurar que la aplicación tenga un aspecto profesional, moderno y dinámico.
* **Paso 7.1:** Aplicar paletas de colores armoniosas (modo oscuro sugerido), tipografías modernas y micro-animaciones en los botones y validaciones.
* **Paso 7.2:** Optimizar la responsividad (especialmente para tablets o pantallas de portátiles típicas de eventos).
* **Paso 7.3:** Pruebas de rendimiento de frontend simulando 1,000+ cartones cargados para asegurar que la búsqueda iterativa en local ocurra en milisegundos.

---
**Instrucciones para Agentes Futuros:** 
* Cuando se asigne una tarea, indicar la Fase y Paso específico (ej. "Ejecutar Paso 1.1 y 1.2").
* Revisar siempre la salida del agente anterior para mantener la continuidad.
