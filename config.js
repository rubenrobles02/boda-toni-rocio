/* =========================================================================
   CONFIGURACIÓN DE LA WEB  ·  Boda de Toñi y Rocío
   -------------------------------------------------------------------------
   Edita SOLO este archivo. Ninguno de estos datos es secreto: el "cloud
   name" y el nombre del "upload preset" son públicos por diseño.
   NUNCA pongas aquí la API Key ni la API Secret de Cloudinary.
   ========================================================================= */

window.BODA_CONFIG = {

  /* --- Cloudinary -------------------------------------------------------- */

  // "Cloud name" que aparece en el panel de Cloudinary (Dashboard).
  cloudName: "ihthgoin",

  // Nombre del "Upload preset" SIN FIRMAR que crearás en Cloudinary
  // (Settings → Upload → Add upload preset → Signing Mode: Unsigned).
  uploadPreset: "boda_invitados",

  // Carpeta dentro de Cloudinary donde se guardan todas las fotos.
  folder: "boda-toni-rocio",


  /* --- Textos de la boda ---------------------------------------------- */

  names: { a: "Toñi", b: "Rocío" },
  date: "30 de agosto de 2026",      // <-- CAMBIA por la fecha real
  welcomeLead: "nos casamos",


  /* --- Ajustes técnicos (puedes dejarlos como están) ----------------- */

  // Las fotos se reducen en el móvil antes de subir, para que vaya rápido.
  maxDimension: 1920,   // lado más largo en píxeles
  quality: 0.82,        // calidad JPEG (0–1)

  // Minutos durante los que una foto se puede BORRAR DEL TODO.
  // Pasado ese tiempo, "quitar" solo la esconde de la galería del invitado.
  hardDeleteMinutes: 10,
};
