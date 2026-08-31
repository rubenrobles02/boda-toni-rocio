# La cámara de los invitados · Boda de Toñi y Rocío

Web para GitHub Pages. Un invitado escanea el QR, ve la bienvenida a la boda
(una vez por visita) y sube fotos que se van acumulando en una colección de
Cloudinary. Cada invitado ve solo **sus** fotos y puede quitarlas.

- Sin login. Cada móvil guarda su lista de fotos en su propio navegador.
- Borrado real durante los primeros 10 minutos tras subir. Después, "quitar"
  solo la esconde de la galería del invitado (la foto sigue en Cloudinary
  para el álbum).
- El botón **Álbum** enseña una pantalla de "Próximamente". El álbum final lo
  montáis vosotros luego con todas las fotos de la carpeta de Cloudinary.

---

## 1. Crear la cuenta de Cloudinary (gratis)

1. Entra en <https://cloudinary.com/users/register_free> y regístrate.
2. Al entrar caes en el **Dashboard**.

### Qué dato necesitas de aquí

Solo el **Cloud name** (nombre del entorno). Está arriba del Dashboard, en
"Product Environment Credentials", como:

```
Cloud name:  dxxxx1234
API Key:     123456789012345      <- NO se usa
API Secret:  ****************      <- NUNCA lo pongas en la web
```

> ⚠️ La **API Key** y la **API Secret** NO van en esta web. Con la Secret
> cualquiera podría borrar tu cuenta entera. El "Cloud name" y el nombre del
> preset (paso siguiente) sí son públicos por diseño.

---

## 2. Crear el "Upload preset" sin firmar

Esto es lo que permite subir desde el navegador sin backend.

1. En Cloudinary, arriba a la derecha, icono de engranaje → **Settings**.
2. Menú izquierdo → **Upload**.
3. Baja hasta **Upload presets** → **Add upload preset**.
4. Configura:
   - **Signing Mode:** `Unsigned`  ← imprescindible
   - **Upload preset name:** lo que quieras, p. ej. `boda_invitados`
     (apúntalo, es el segundo dato que pondrás en `config.js`)
   - **Folder:** `boda-toni-rocio`
   - **Return delete token:** `Enabled`  ← para que funcione el borrado de 10 min
5. Recomendado (opcional):
   - **Allowed formats:** `jpg, png, webp, heic, heif`
   - **Maximum file size:** `15000000` (15 MB)
6. **Save**.

---

## 3. Rellenar `config.js`

Abre `config.js` y cambia:

```js
cloudName:    "dxxxx1234",        // tu Cloud name del paso 1
uploadPreset: "boda_invitados",   // el nombre del preset del paso 2
date:         "30 de agosto de 2026",  // la fecha real de la boda
```

Deja `folder` igual que el Folder del preset (`boda-toni-rocio`).

---

## 4. Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub, p. ej. `boda-toni-rocio`.
2. Sube estos archivos a la raíz del repo:
   `index.html`, `styles.css`, `app.js`, `config.js`, `qr.html`, `README.md`.
3. En el repo: **Settings → Pages**.
4. En **Build and deployment → Source** elige `Deploy from a branch`.
5. **Branch:** `main`, carpeta `/ (root)` → **Save**.
6. Espera 1–2 min. Arriba aparece la dirección:
   `https://TUUSUARIO.github.io/boda-toni-rocio/`

Prueba a abrirla en el móvil.

---

## 5. Generar el QR

1. Abre `https://TUUSUARIO.github.io/boda-toni-rocio/qr.html`
2. Comprueba que la dirección de arriba es la de tu web y pulsa **Generar QR**.
3. **Imprime la página** (Ctrl/Cmd + P). Sale solo la tarjeta con los nombres,
   la fecha y el QR.
4. Pon una tarjeta en cada mesa.

---

## 6. Montar el álbum después de la boda

Todas las fotos están en Cloudinary, en **Media Library → carpeta
`boda-toni-rocio`**.

- Puedes descargarlas todas (seleccionar → Download) y montar el álbum, un
  vídeo o un PDF con lo que quieras.
- Si alguien firmó su nombre:
  - El **nombre del archivo** empieza por su nombre (`maria-lopez-...`), se ve
    en la cuadrícula de la Media Library.
  - Hay una **etiqueta** con su nombre: en la Media Library, filtra por esa
    etiqueta y tienes todas sus fotos de una.
  - El nombre completo (con tildes y espacios) está también en el *context*
    → `guest`.
- Para limpiar fotos que no quieras: selecciónalas en la Media Library y
  bórralas ahí.

---

## Cambiar textos o colores

- **Nombres, fecha, frase de bienvenida:** en `config.js`.
- **Colores y tipografías:** al principio de `styles.css`, en `:root`.
- **Minutos de borrado real:** `hardDeleteMinutes` en `config.js`.

## Límites conocidos

- Si un invitado borra los datos del navegador o cambia de móvil, pierde la
  lista de "sus" fotos (las fotos siguen en la colección para el álbum).
- El plan gratis de Cloudinary da 25 GB. Las fotos se reducen a 1920 px antes
  de subir (~300–600 KB cada una), así que caben miles.
