# Comprobantes

Aplicación móvil web (PWA) para editar recibos desde una plantilla, elegir entre varios diseños y añadir plantillas personalizadas a las opciones disponibles.

## Funciones

- Interfaz mobile-first con barra superior fija y acciones inferiores para descargar o generar PDF desde el teléfono.
- Formulario para capturar emisor, cliente, fecha, concepto, importe, método de pago y notas.
- Vista previa en tiempo real del recibo.
- Selector con BBVA estándar y dos formatos Banorte sobre imagen.
- Formulario contextual que muestra únicamente los campos utilizados por el diseño seleccionado.
- Creación, actualización y eliminación de plantillas personalizadas desde la app.
- Personalización de nombre, título, texto auxiliar, etiqueta de firma, estilo visual y color de cada plantilla.
- Guardado automático local del borrador y de las plantillas personalizadas en el navegador.
- Descarga del recibo generado como archivo HTML.
- Opción de imprimir o guardar como PDF desde el navegador.
- Manifest y service worker para instalación como aplicación móvil.

## Ejecutar localmente

No requiere dependencias. Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 4173
```

Luego abre `http://localhost:4173` en el navegador.

En Windows también puedes hacer doble clic en `Abrir editor.bat`. El acceso inicia el servidor local en segundo plano y abre directamente el editor de plantillas.

## Herramienta de desarrollo de plantillas

La app principal (`index.html`) es para usuarios finales. Para ajustar visualmente coordenadas de plantillas con imagen de fondo, abre directamente:

```text
template-designer.html
```

Desde esa herramienta puedes cargar `templates/defaults/banorte.detail.json`, mover campos encima del fondo y corregir geometría, color y tipografía. El editor permite elegir la fuente general o la de un campo, cambiar peso, escala horizontal e interlineado, ajustar por separado las tres partes del importe e incrustar archivos `.ttf`, `.otf`, `.woff` o `.woff2` dentro del JSON.

El editor y la descarga final de la app usan `template-renderer.js`. Por eso, **Descargar prueba JPG** no es una aproximación: genera el archivo con el mismo canvas, dimensiones y compresión que usa la aplicación.

Flujo recomendado:

1. Carga la plantilla y, si hace falta, una imagen de fondo de trabajo.
2. Ajusta visualmente cada campo; usa las flechas para la corrección fina.
3. Usa **Descargar prueba JPG** para validar el resultado real.
4. Pulsa **Aplicar y abrir en la app** para probar la edición sin tocar el archivo original. La app guarda esa anulación local y también recibe cambios desde otra pestaña.
5. Cuando la corrección esté lista, pulsa **Actualizar JSON de la aplicación** y elige el archivo anterior, por ejemplo `templates/defaults/banorte.detail.json`. En navegadores sin acceso directo a archivos se descargará el JSON con el nombre correcto para reemplazarlo manualmente.

El editor conserva deshacer/rehacer, duplicado y eliminación de campos, movimiento fino con las flechas (10 px con `Shift`) y edición directa del JSON.

Si el navegador bloquea la carga automática al abrir el archivo directamente, ejecútala desde el mismo servidor local de la app o carga el JSON manualmente con el selector de archivo.

## Tipografía de Banorte detalle

La plantilla usa una copia local de Montserrat Variable para que la vista previa y la exportación mantengan las mismas métricas. Montserrat se distribuye bajo SIL Open Font License 1.1; el texto de la licencia está incluido en `templates/assets/fonts/Montserrat-OFL.txt`.
