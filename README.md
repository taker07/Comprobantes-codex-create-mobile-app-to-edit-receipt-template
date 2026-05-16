# Comprobantes

Aplicación móvil web (PWA) para editar recibos desde una plantilla, elegir entre varios diseños y añadir plantillas personalizadas a las opciones disponibles.

## Funciones

- Interfaz mobile-first con barra superior fija y acciones inferiores para descargar o generar PDF desde el teléfono.
- Formulario para capturar emisor, cliente, fecha, concepto, importe, método de pago y notas.
- Vista previa en tiempo real del recibo.
- Selector con plantillas incluidas: clásica, moderna y compacta.
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
