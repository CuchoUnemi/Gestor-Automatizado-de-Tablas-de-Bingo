# 🚀 Plan de Despliegue y Solución de Memoria (OOM)

El servidor gratuito de Render (512 MB de RAM) se queda sin memoria porque `gunicorn` (el servidor web de Python) crea múltiples trabajadores por defecto. Cada trabajador carga una copia de la app (Django + OpenCV + PyMuPDF), saturando la memoria rápidamente.

Para resolver esto de forma gratuita, vamos a optimizar el entorno de Render:

---

## Solución: Optimizar Render (Recomendada)
Vamos a forzar a Render a usar un solo trabajador para que el consumo baje a ~150 MB y encaje en el plan gratuito.

1. Ve a tu cuenta de **[Render](https://render.com/)**.
2. Selecciona tu Web Service (`bingo-app`).
3. Ve a la pestaña **Settings** (Configuración) en el menú lateral izquierdo.
4. Busca la sección **Start Command** (Comando de inicio).
5. Cambia el comando actual por este:
   ```bash
   cd backend && gunicorn core.wsgi:application --workers 1 --threads 2
   ```
6. Guarda los cambios. Render reiniciará automáticamente la aplicación.

*Nota: Al usar `--workers 1`, le decimos a Python que solo cargue una copia del procesador de imágenes en memoria, evitando así sobrepasar el límite de 512 MB de RAM del plan gratuito.*
