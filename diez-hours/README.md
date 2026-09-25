# diez hours

Estado abierto/cerrado de diez.gallery. Sin dependencias, plan gratuito de Vercel.

## 1. Airtable

Tabla **Opening Hours** (`tbloucTRBYsmiafAo`) ya creada en la base `appkTmFvjmDLOQS4p`:

| Campo  | Tipo                 | Notas                            |
|--------|----------------------|----------------------------------|
| Date   | Date (ISO, sin hora) | Campo principal                  |
| Status | Single select        | Opciones: `Open`, `Closed`       |
| From   | Single line text     | `HH:MM`, solo si Status = Open   |
| Until  | Single line text     | `HH:MM`, solo si Status = Open   |
| Note   | Single line text     | Público: sale en la web          |

La tabla solo guarda excepciones. El horario habitual está en `lib/schedule.js` (`REGULAR_HOURS`).

Token: crea un Personal Access Token nuevo, scopes `data.records:read` y `data.records:write`, acceso solo a esa base.

## 2. Vercel

Proyecto nuevo (Framework: Other). Variables de entorno:

- `AIRTABLE_TOKEN`
- `AIRTABLE_BASE_ID` = `appkTmFvjmDLOQS4p`
- `AIRTABLE_TABLE` = `tbloucTRBYsmiafAo` (ID de la tabla: sigue funcionando aunque la renombres)
- `ADMIN_KEY` = una frase larga (es la única llave de la mini app)

Opcional: dominio `hours.diez.gallery`.

## 3. Cargo 3

**Custom HTML global** (al final, después del enlace de la newsletter):

```html
<div class="diez-hours-slot diez-hours-mobile" data-clock="false"></div>
<script src="https://hours.diez.gallery/embed.js"></script>
<style>
  .diez-hours-mobile { display: none; }
  @media (max-width: 768px) {
    .diez-hours-mobile {
      display: block; position: fixed; left: 0; right: 0; bottom: 38px;
      text-align: center; font-family: 'Replica'; font-size: 1.2rem; z-index: 1000;
    }
  }
</style>
```

**Página fijada Footer**, en vista de código, sustituir el texto del horario por:

```html
<div class="diez-hours-slot">Open Fri 13:00-18:00, Sat-Sun 12:00-17:00 or by appointment</div>
```

El texto de dentro es el respaldo: se ve mientras carga y si la API falla.
Clases para estilar: `.diez-hours`, `.is-open`, `.dh-clock`, `.dh-state`, `.dh-note`.

## 4. Móvil

Abre `https://hours.diez.gallery/admin` en Safari, Compartir, Añadir a pantalla de inicio. Introduce la `ADMIN_KEY` una vez.

## Cómo funciona

- `/api/status` devuelve el calendario de los próximos 60 días, cacheado 60 s en el CDN (Airtable recibe como mucho una petición por minuto).
- El navegador calcula abierto/cerrado cada 20 s con la hora de Ámsterdam, así que el cambio a "Closed" a las 18:00 es exacto aunque la respuesta esté cacheada.
- Una excepción por fecha. Guardar otra para el mismo día la sustituye.

## 5. Google Maps (opcional)

Tras cada cambio en la mini app, las excepciones futuras se envían como horas especiales
a la ficha de Google Business Profile. Se activa sola cuando existen estas variables en Vercel:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN` (scope `https://www.googleapis.com/auth/business.manage`)
- `GOOGLE_LOCATION_ID` (solo el número del Business Profile ID)

Importante: la sincronización sustituye todas las horas especiales de la ficha.
Desde que esté activa, gestiona cierres y aperturas extra solo desde la mini app.
